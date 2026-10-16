import { supabase } from '@/lib/supabase'
import { Goal, GoalMilestone, Task } from '@/types/database'

export interface GoalDetail extends Goal {
  milestones: GoalMilestone[]
  linked_tasks: Task[]
  total_linked: number
  completed_linked: number
}

export async function getGoalsWithCounts(userId: string): Promise<Goal[]> {
  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!goals) return []

  // Fetch linked task counts for each goal
  const enriched = await Promise.all(
    goals.map(async (goal) => {
      const { count: total } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('goal_id', goal.id)
        .eq('user_id', userId)

      const { count: completed } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('goal_id', goal.id)
        .eq('user_id', userId)
        .eq('status', 'completed')

      return {
        ...goal,
        linked_tasks_count: total || 0,
        completed_tasks_count: completed || 0,
      }
    })
  )

  return enriched
}

export async function getGoalDetail(goalId: string, userId: string): Promise<GoalDetail | null> {
  const { data: goal, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single()

  if (error || !goal) return null

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
  const completedCount = linkedTasks.filter((t) => t.status === 'completed').length

  return {
    ...goal,
    milestones,
    linked_tasks: linkedTasks,
    total_linked: linkedTasks.length,
    completed_linked: completedCount,
  }
}

export async function toggleMilestone(milestoneId: string, isCompleted: boolean, userId: string): Promise<void> {
  const { error } = await supabase
    .from('goal_milestones')
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', milestoneId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function addMilestoneToGoal(
  goalId: string,
  title: string,
  targetDate: string | null,
  userId: string
): Promise<GoalMilestone> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .insert({
      goal_id: goalId,
      user_id: userId,
      title: title.trim(),
      target_date: targetDate,
      is_completed: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
