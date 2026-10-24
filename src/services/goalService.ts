import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { db, isFirebaseConfigured } from '@/lib/firebase'
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { Goal, GoalMilestone, Task, Priority, GoalType, GoalStatus } from '@/types/database'
import { getLocalTasks } from './taskService'

export interface GoalDetail extends Goal {
  milestones: GoalMilestone[]
  linked_tasks: Task[]
  total_linked: number
  completed_linked: number
}

export interface CreateGoalInput {
  id?: string
  user_id: string
  title: string
  description?: string | null
  category: string
  goal_type: GoalType
  priority?: Priority
  target_date?: string | null
  start_date?: string | null
  target_value?: number
  current_value?: number
  unit?: string
  status?: GoalStatus
  is_archived?: boolean
  reflection_notes?: string | null
}

const LOCAL_STORAGE_GOALS_PREFIX = 'lifeos_goals_'

export function getLocalGoals(userId: string): Goal[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_GOALS_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Error reading local goals:', err)
    return []
  }
}

export function saveLocalGoals(userId: string, goals: Goal[]): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_GOALS_PREFIX}${userId}`, JSON.stringify(goals))
    window.dispatchEvent(new CustomEvent('goals_updated', { detail: { userId } }))
  } catch (err) {
    console.error('Error saving local goals:', err)
  }
}

/**
 * Create a new goal with guaranteed instant LocalStorage save & cloud sync
 */
export async function createGoal(
  goalInput: CreateGoalInput
): Promise<Goal> {
  const now = new Date().toISOString()
  const goalId = goalInput.id || crypto.randomUUID()
  const newGoal: Goal = {
    id: goalId,
    user_id: goalInput.user_id,
    title: goalInput.title,
    description: goalInput.description || null,
    category: goalInput.category,
    goal_type: goalInput.goal_type,
    priority: goalInput.priority || 'medium',
    target_date: goalInput.target_date || null,
    start_date: goalInput.start_date || now.split('T')[0],
    target_value: goalInput.target_value ?? 100,
    current_value: goalInput.current_value ?? 0,
    unit: goalInput.unit || '%',
    status: goalInput.status || 'in_progress',
    reflection_notes: goalInput.reflection_notes || null,
    is_archived: goalInput.is_archived ?? false,
    created_at: now,
    updated_at: now,
  }

  // 1. LocalStorage (Guaranteed & Instant)
  const localList = getLocalGoals(goalInput.user_id)
  const updatedList = [newGoal, ...localList.filter((g) => g.id !== goalId)]
  saveLocalGoals(goalInput.user_id, updatedList)

  // 2. Supabase sync if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          id: newGoal.id,
          user_id: newGoal.user_id,
          title: newGoal.title,
          description: newGoal.description || null,
          category: newGoal.category,
          goal_type: newGoal.goal_type,
          priority: newGoal.priority,
          target_date: newGoal.target_date || null,
          target_value: newGoal.target_value,
          current_value: newGoal.current_value,
          unit: newGoal.unit,
          status: newGoal.status,
          start_date: newGoal.start_date,
          is_archived: false,
        })
        .select()
        .single()

      if (!error && data) {
        const current = getLocalGoals(goalInput.user_id)
        saveLocalGoals(goalInput.user_id, current.map((g) => (g.id === goalId ? { ...newGoal, ...data } : g)))
      }
    } catch (err) {
      console.warn('Supabase createGoal failed, saved locally:', err)
    }
  }

  // 3. Firestore sync if Firebase configured
  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'goals', goalId)
      await setDoc(ref, {
        id: newGoal.id,
        user_id: newGoal.user_id,
        title: newGoal.title,
        description: newGoal.description || null,
        category: newGoal.category,
        goal_type: newGoal.goal_type,
        priority: newGoal.priority,
        target_date: newGoal.target_date || null,
        target_value: newGoal.target_value,
        current_value: newGoal.current_value,
        unit: newGoal.unit,
        status: newGoal.status,
        start_date: newGoal.start_date,
        is_archived: false,
        created_at: newGoal.created_at,
        updated_at: newGoal.updated_at,
      })
    } catch (err) {
      console.warn('Firestore createGoal failed, saved locally:', err)
    }
  }

  return newGoal
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<Goal>,
  userId: string
): Promise<Goal | null> {
  const localList = getLocalGoals(userId)
  const existing = localList.find((g) => g.id === goalId)
  if (!existing) return null

  const now = new Date().toISOString()
  const updatedGoal: Goal = {
    ...existing,
    ...updates,
    updated_at: now,
  }

  saveLocalGoals(
    userId,
    localList.map((g) => (g.id === goalId ? updatedGoal : g))
  )

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('goals').update(updates).eq('id', goalId).eq('user_id', userId)
    } catch (err) {
      console.warn('Supabase updateGoal failed:', err)
    }
  }

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'goals', goalId)
      await updateDoc(ref, { ...updates, updated_at: now })
    } catch (err) {
      console.warn('Firestore updateGoal failed:', err)
    }
  }

  return updatedGoal
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string, userId: string): Promise<void> {
  const localList = getLocalGoals(userId)
  saveLocalGoals(
    userId,
    localList.filter((g) => g.id !== goalId)
  )

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('goals').delete().eq('id', goalId).eq('user_id', userId)
    } catch (err) {
      console.warn('Supabase deleteGoal failed:', err)
    }
  }

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'goals', goalId)
      await deleteDoc(ref)
    } catch (err) {
      console.warn('Firestore deleteGoal failed:', err)
    }
  }
}

export async function getActiveGoals(userId: string): Promise<Goal[]> {
  if (!userId) return []
  let goals = getLocalGoals(userId).filter((g) => !g.is_archived)

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)

      if (!error && data && data.length > 0) {
        const localAll = getLocalGoals(userId)
        const map = new Map(localAll.map((g) => [g.id, g]))
        data.forEach((g) => map.set(g.id, { ...map.get(g.id), ...g }))
        saveLocalGoals(userId, Array.from(map.values()))
        goals = Array.from(map.values()).filter((g) => !g.is_archived)
      }
    } catch (err) {
      console.warn('Supabase getActiveGoals error:', err)
    }
  } else if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(db, 'goals'),
        where('user_id', '==', userId),
        where('is_archived', '==', false)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const cloudGoals: Goal[] = []
        snap.forEach((d) => cloudGoals.push(d.data() as Goal))
        const localAll = getLocalGoals(userId)
        const map = new Map(localAll.map((g) => [g.id, g]))
        cloudGoals.forEach((g) => map.set(g.id, { ...map.get(g.id), ...g }))
        saveLocalGoals(userId, Array.from(map.values()))
        goals = Array.from(map.values()).filter((g) => !g.is_archived)
      }
    } catch (err) {
      console.warn('Firestore getActiveGoals error:', err)
    }
  }

  return goals
}

export async function getGoalsWithCounts(userId: string): Promise<Goal[]> {
  if (!userId) return []
  let goals: Goal[] = getLocalGoals(userId).filter((g) => !g.is_archived)

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        goals = data
        saveLocalGoals(userId, data)
      }
    } catch (err) {
      console.warn('Supabase getGoalsWithCounts error:', err)
    }
  } else if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(db, 'goals'),
        where('user_id', '==', userId),
        where('is_archived', '==', false)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const cloudGoals: Goal[] = []
        snap.forEach((d) => cloudGoals.push(d.data() as Goal))
        goals = cloudGoals
        saveLocalGoals(userId, cloudGoals)
      }
    } catch (err) {
      console.warn('Firestore getGoalsWithCounts error:', err)
    }
  }

  // Calculate linked tasks counts from local tasks
  const localTasks = getLocalTasks(userId)
  const enriched = goals.map((goal) => {
    const linked = localTasks.filter((t) => t.goal_id === goal.id)
    const completed = linked.filter((t) => t.status === 'completed').length
    return {
      ...goal,
      linked_tasks_count: linked.length,
      completed_tasks_count: completed,
    }
  })

  return enriched
}

const LOCAL_STORAGE_MILESTONES_PREFIX = 'lifeos_goal_milestones_'

export function getLocalMilestones(userId: string): GoalMilestone[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MILESTONES_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Error reading local milestones:', err)
    return []
  }
}

export function saveLocalMilestones(userId: string, milestones: GoalMilestone[]): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MILESTONES_PREFIX}${userId}`, JSON.stringify(milestones))
  } catch (err) {
    console.error('Error saving local milestones:', err)
  }
}

export async function getGoalDetail(goalId: string, userId: string): Promise<GoalDetail | null> {
  const localGoals = getLocalGoals(userId)
  const goal = localGoals.find((g) => g.id === goalId)

  if (isSupabaseConfigured()) {
    try {
      const { data: cloudGoal } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single()

      if (cloudGoal) {
        const [milestonesRes, tasksRes] = await Promise.all([
          supabase
            .from('goal_milestones')
            .select('*')
            .eq('goal_id', goalId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
          supabase
            .from('tasks')
            .select('*')
            .eq('goal_id', goalId)
            .eq('user_id', userId)
            .order('due_date', { ascending: true }),
        ])

        const milestones = milestonesRes.data || []
        const linkedTasks = tasksRes.data || []
        return {
          ...cloudGoal,
          milestones,
          linked_tasks: linkedTasks,
          total_linked: linkedTasks.length,
          completed_linked: linkedTasks.filter((t) => t.status === 'completed').length,
        }
      }
    } catch (err) {
      console.warn('Supabase getGoalDetail error:', err)
    }
  }

  if (!goal) return null

  const localTasks = getLocalTasks(userId).filter((t) => t.goal_id === goalId)
  const localMilestones = getLocalMilestones(userId).filter((m) => m.goal_id === goalId)
  return {
    ...goal,
    milestones: localMilestones,
    linked_tasks: localTasks,
    total_linked: localTasks.length,
    completed_linked: localTasks.filter((t) => t.status === 'completed').length,
  }
}

export async function toggleMilestone(milestoneId: string, isCompleted: boolean, userId: string): Promise<void> {
  const localList = getLocalMilestones(userId)
  saveLocalMilestones(
    userId,
    localList.map((m) =>
      m.id === milestoneId
        ? { ...m, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }
        : m
    )
  )

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('goal_milestones')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', milestoneId)
        .eq('user_id', userId)
    } catch (err) {
      console.warn('Supabase toggleMilestone error:', err)
    }
  }
}

export async function addMilestoneToGoal(
  goalId: string,
  title: string,
  targetDate: string | null,
  userId: string
): Promise<GoalMilestone> {
  const milestone: GoalMilestone = {
    id: crypto.randomUUID(),
    goal_id: goalId,
    user_id: userId,
    title: title.trim(),
    target_date: targetDate,
    is_completed: false,
    created_at: new Date().toISOString(),
  }

  const localList = getLocalMilestones(userId)
  saveLocalMilestones(userId, [...localList, milestone])

  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('goal_milestones')
        .insert({
          id: milestone.id,
          goal_id: goalId,
          user_id: userId,
          title: title.trim(),
          target_date: targetDate,
          is_completed: false,
        })
        .select()
        .single()
      if (data) return data
    } catch (err) {
      console.warn('Supabase addMilestoneToGoal error:', err)
    }
  }

  return milestone
}
