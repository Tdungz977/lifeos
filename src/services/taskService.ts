import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { db, isFirebaseConfigured } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore'
import { Task } from '@/types/database'

const LOCAL_STORAGE_TASKS_PREFIX = 'lifeos_tasks_'

/**
 * Get all tasks stored in localStorage for a user
 */
export function getLocalTasks(userId: string): Task[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_TASKS_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Error reading local tasks:', err)
    return []
  }
}

/**
 * Save tasks list to localStorage and dispatch event for cross-component sync
 */
export function saveLocalTasks(userId: string, tasks: Task[]): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_TASKS_PREFIX}${userId}`, JSON.stringify(tasks))
    window.dispatchEvent(new CustomEvent('tasks_updated', { detail: { userId } }))
  } catch (err) {
    console.error('Error saving local tasks:', err)
  }
}

/**
 * Create a new task with instant LocalStorage save & Cloud sync (Supabase/Firestore)
 */
export async function createTask(
  taskInput: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'actual_duration'> & { id?: string }
): Promise<Task> {
  const now = new Date().toISOString()
  const taskId = taskInput.id || crypto.randomUUID()
  const newTask: Task = {
    ...taskInput,
    id: taskId,
    actual_duration: 0,
    created_at: now,
    updated_at: now,
  }

  // 1. Immediately save to LocalStorage (Instant & Guaranteed)
  const localList = getLocalTasks(taskInput.user_id)
  const updatedLocal = [newTask, ...localList.filter((t) => t.id !== taskId)]
  saveLocalTasks(taskInput.user_id, updatedLocal)

  // 2. Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          id: newTask.id,
          user_id: newTask.user_id,
          title: newTask.title,
          description: newTask.description || null,
          due_date: newTask.due_date,
          start_time: newTask.start_time || null,
          end_time: newTask.end_time || null,
          priority: newTask.priority,
          category: newTask.category,
          estimated_duration: newTask.estimated_duration,
          goal_id: newTask.goal_id || null,
          is_priority: newTask.is_priority,
          status: newTask.status,
        })
        .select('*, goal:goals(id, title, category)')
        .single()

      if (!error && data) {
        const merged = { ...newTask, ...data }
        const current = getLocalTasks(taskInput.user_id)
        saveLocalTasks(taskInput.user_id, current.map((t) => (t.id === taskId ? merged : t)))
      }
    } catch (err) {
      console.warn('Supabase task insert failed, stored locally:', err)
    }
  }

  // 3. Sync to Firestore if Firebase is configured
  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'tasks', taskId)
      await setDoc(ref, {
        id: newTask.id,
        user_id: newTask.user_id,
        title: newTask.title,
        description: newTask.description || null,
        due_date: newTask.due_date,
        start_time: newTask.start_time || null,
        end_time: newTask.end_time || null,
        priority: newTask.priority,
        category: newTask.category,
        estimated_duration: newTask.estimated_duration,
        actual_duration: newTask.actual_duration,
        goal_id: newTask.goal_id || null,
        is_priority: newTask.is_priority,
        status: newTask.status,
        created_at: newTask.created_at,
        updated_at: newTask.updated_at,
      })
    } catch (err) {
      console.warn('Firestore task sync failed, kept in local storage:', err)
    }
  }

  // 4. Auto-sync linked goal progress
  if (newTask.goal_id) {
    syncGoalProgress(newTask.goal_id, newTask.user_id).catch(() => {})
  }

  return newTask
}

/**
 * Get tasks for a specific date (today)
 */
export async function getTodayTasks(userId: string, dateStr: string): Promise<Task[]> {
  if (!userId) return []
  let tasks: Task[] = getLocalTasks(userId).filter((t) => t.due_date === dateStr)

  // 1. Try Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(id, title, category)')
        .eq('user_id', userId)
        .eq('due_date', dateStr)
        .order('is_priority', { ascending: false })
        .order('start_time', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) {
        const localAll = getLocalTasks(userId)
        const localMap = new Map(localAll.map((t) => [t.id, t]))
        data.forEach((cloudTask) => {
          localMap.set(cloudTask.id, { ...localMap.get(cloudTask.id), ...cloudTask })
        })
        saveLocalTasks(userId, Array.from(localMap.values()))
        tasks = Array.from(localMap.values()).filter((t) => t.due_date === dateStr)
      }
    } catch (err) {
      console.warn('Supabase getTodayTasks error, using local:', err)
    }
  } else if (isFirebaseConfigured()) {
    // 2. Try Firestore if configured
    try {
      const q = query(
        collection(db, 'tasks'),
        where('user_id', '==', userId),
        where('due_date', '==', dateStr)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const cloudTasks: Task[] = []
        snap.forEach((d) => cloudTasks.push(d.data() as Task))
        const localAll = getLocalTasks(userId)
        const localMap = new Map(localAll.map((t) => [t.id, t]))
        cloudTasks.forEach((c) => localMap.set(c.id, { ...localMap.get(c.id), ...c }))
        saveLocalTasks(userId, Array.from(localMap.values()))
        tasks = Array.from(localMap.values()).filter((t) => t.due_date === dateStr)
      }
    } catch (err) {
      console.warn('Firestore getTodayTasks error, using local:', err)
    }
  }

  // 3. Fallback: Also check if Moon weekly plan has tasks for today if local list is empty
  if (tasks.length === 0) {
    try {
      const savedMoon = localStorage.getItem('lifeos_moon_weekly_plan_v1')
      if (savedMoon) {
        const parsed = JSON.parse(savedMoon)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const todayIdx = new Date().getDay() === 0 ? 0 : new Date().getDay()
          const todayPlanTasks = parsed.filter((t: any) => t.day_index === todayIdx)
          if (todayPlanTasks.length > 0) {
            const converted: Task[] = todayPlanTasks.map((t: any) => ({
              id: t.id,
              user_id: userId,
              title: t.title,
              description: t.location ? `Địa điểm: ${t.location}` : null,
              due_date: dateStr,
              start_time: t.time || null,
              end_time: null,
              priority: 'high',
              category: t.category || 'general',
              status: t.is_completed ? 'completed' : 'pending',
              estimated_duration: 60,
              actual_duration: 0,
              is_priority: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }))
            const localAll = getLocalTasks(userId)
            const map = new Map(localAll.map((item) => [item.id, item]))
            converted.forEach((item) => {
              if (!map.has(item.id)) map.set(item.id, item)
            })
            saveLocalTasks(userId, Array.from(map.values()))
            tasks = Array.from(map.values()).filter((t) => t.due_date === dateStr)
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return tasks.sort((a, b) => {
    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
    if (a.start_time) return -1
    if (b.start_time) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/**
 * Get overdue tasks (due before today, not completed/cancelled)
 */
export async function getOverdueTasks(userId: string, todayStr: string): Promise<Task[]> {
  if (!userId) return []
  let overdue = getLocalTasks(userId).filter(
    (t) => t.due_date < todayStr && t.status !== 'completed' && t.status !== 'cancelled'
  )

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(id, title, category)')
        .eq('user_id', userId)
        .lt('due_date', todayStr)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true })

      if (!error && data) {
        return data
      }
    } catch (err) {
      console.warn('Supabase getOverdueTasks error, using local:', err)
    }
  }

  return overdue.sort((a, b) => a.due_date.localeCompare(b.due_date))
}

/**
 * Get tasks within a date range (for Calendar)
 */
export async function getTasksByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Task[]> {
  if (!userId) return []
  let tasks = getLocalTasks(userId).filter(
    (t) => t.due_date >= startDate && t.due_date <= endDate
  )

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goal:goals(id, title, category)')
        .eq('user_id', userId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)

      if (!error && data && data.length > 0) {
        const localAll = getLocalTasks(userId)
        const map = new Map(localAll.map((t) => [t.id, t]))
        data.forEach((t) => map.set(t.id, { ...map.get(t.id), ...t }))
        saveLocalTasks(userId, Array.from(map.values()))
        tasks = Array.from(map.values()).filter(
          (t) => t.due_date >= startDate && t.due_date <= endDate
        )
      }
    } catch (err) {
      console.warn('Supabase getTasksByDateRange error, using local:', err)
    }
  }

  return tasks
}

/**
 * Toggle task completion status
 */
export async function toggleTaskStatus(task: Task, userId: string): Promise<Task> {
  const newStatus = task.status === 'completed' ? 'pending' : 'completed'
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null
  const now = new Date().toISOString()

  const updatedTask: Task = {
    ...task,
    status: newStatus,
    completed_at: completedAt,
    updated_at: now,
  }

  // 1. LocalStorage update
  const localList = getLocalTasks(userId)
  saveLocalTasks(
    userId,
    localList.map((t) => (t.id === task.id ? updatedTask : t))
  )

  // Also sync Moon Weekly Plan if item is present
  try {
    const savedMoon = localStorage.getItem('lifeos_moon_weekly_plan_v1')
    if (savedMoon) {
      const parsed = JSON.parse(savedMoon)
      let changed = false
      const updated = parsed.map((item: any) => {
        if (item.id === task.id) {
          changed = true
          return { ...item, is_completed: newStatus === 'completed' }
        }
        return item
      })
      if (changed) {
        localStorage.setItem('lifeos_moon_weekly_plan_v1', JSON.stringify(updated))
        window.dispatchEvent(new Event('moon_tasks_updated'))
      }
    }
  } catch {
    // ignore
  }

  // 2. Supabase sync
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: completedAt,
        })
        .eq('id', task.id)
        .eq('user_id', userId)
    } catch (err) {
      console.warn('Supabase toggle task failed:', err)
    }
  }

  // 3. Firestore sync
  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'tasks', task.id)
      await updateDoc(ref, {
        status: newStatus,
        completed_at: completedAt,
        updated_at: now,
      })
    } catch (err) {
      console.warn('Firestore toggle task failed:', err)
    }
  }

  // 4. Auto-sync linked goal
  if (task.goal_id) {
    syncGoalProgress(task.goal_id, userId).catch(() => {})
  }

  return updatedTask
}

/**
 * Reschedule task to a new date
 */
export async function rescheduleTask(taskId: string, newDateStr: string, userId: string): Promise<void> {
  const now = new Date().toISOString()
  const localList = getLocalTasks(userId)
  saveLocalTasks(
    userId,
    localList.map((t) => (t.id === taskId ? { ...t, due_date: newDateStr, updated_at: now } : t))
  )

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('tasks').update({ due_date: newDateStr }).eq('id', taskId).eq('user_id', userId)
    } catch (err) {
      console.warn('Supabase rescheduleTask failed:', err)
    }
  }

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'tasks', taskId)
      await updateDoc(ref, { due_date: newDateStr, updated_at: now })
    } catch (err) {
      console.warn('Firestore rescheduleTask failed:', err)
    }
  }
}

/**
 * Delete task
 */
export async function deleteTaskWithSync(task: Task, userId: string): Promise<void> {
  const localList = getLocalTasks(userId)
  saveLocalTasks(userId, localList.filter((t) => t.id !== task.id))

  try {
    const savedMoon = localStorage.getItem('lifeos_moon_weekly_plan_v1')
    if (savedMoon) {
      const parsed = JSON.parse(savedMoon)
      const filtered = parsed.filter((item: any) => item.id !== task.id)
      if (filtered.length !== parsed.length) {
        localStorage.setItem('lifeos_moon_weekly_plan_v1', JSON.stringify(filtered))
        window.dispatchEvent(new Event('moon_tasks_updated'))
      }
    }
  } catch {
    // ignore
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('tasks').delete().eq('id', task.id).eq('user_id', userId)
    } catch (err) {
      console.warn('Supabase deleteTask failed:', err)
    }
  }

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'tasks', task.id)
      await deleteDoc(ref)
    } catch (err) {
      console.warn('Firestore deleteTask failed:', err)
    }
  }

  if (task.goal_id) {
    syncGoalProgress(task.goal_id, userId).catch(() => {})
  }
}

/**
 * Recalculate and sync goal progress based on linked tasks
 */
export async function syncGoalProgress(goalId: string, userId: string): Promise<number | null> {
  try {
    const tasks = getLocalTasks(userId).filter((t) => t.goal_id === goalId)
    if (tasks.length === 0) return null
    const completed = tasks.filter((t) => t.status === 'completed').length
    const progressPct = Math.min(100, Math.max(0, Math.round((completed / tasks.length) * 100)))

    // Update goal in local storage if present
    const goalsKey = `lifeos_goals_${userId}`
    const rawGoals = localStorage.getItem(goalsKey)
    if (rawGoals) {
      try {
        const goals = JSON.parse(rawGoals)
        const updated = goals.map((g: any) =>
          g.id === goalId
            ? { ...g, current_value: progressPct, status: progressPct === 100 ? 'completed' : g.status }
            : g
        )
        localStorage.setItem(goalsKey, JSON.stringify(updated))
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      const updates: any = { current_value: progressPct }
      if (progressPct === 100) updates.status = 'completed'
      await supabase.from('goals').update(updates).eq('id', goalId).eq('user_id', userId)
    }

    return progressPct
  } catch (err) {
    console.error('Error syncing goal progress:', err)
    return null
  }
}
