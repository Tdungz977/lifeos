import { supabase } from '@/lib/supabase'
import { Task } from '@/types/database'

export async function syncGoalProgress(goalId: string, userId: string): Promise<number | null> {
  try {
    // Count total tasks linked to this goal
    const { count: total, error: totalErr } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('goal_id', goalId)
      .eq('user_id', userId)

    if (totalErr || total === null || total === 0) return null

    // Count completed tasks linked to this goal
    const { count: completed, error: compErr } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('status', 'completed')

    if (compErr || completed === null) return null

    const progressPct = Math.min(100, Math.max(0, Math.round((completed / total) * 100)))

    // Update goal record
    const updates: any = {
      current_value: progressPct,
    }
    if (progressPct === 100) {
      updates.status = 'completed'
    } else {
      // If was completed and reopened
      const { data: g } = await supabase
        .from('goals')
        .select('status')
        .eq('id', goalId)
        .single()
      if (g?.status === 'completed' && progressPct < 100) {
        updates.status = 'in_progress'
      }
    }

    await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .eq('user_id', userId)

    return progressPct
  } catch (err) {
    console.error('Error syncing goal progress:', err)
    return null
  }
}

export async function getTodayTasks(userId: string, dateStr: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, goal:goals(id, title, category)')
    .eq('user_id', userId)
    .eq('due_date', dateStr)
    .order('is_priority', { ascending: false })
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getOverdueTasks(userId: string, todayStr: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, goal:goals(id, title, category)')
    .eq('user_id', userId)
    .lt('due_date', todayStr)
    .neq('status', 'completed')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function toggleTaskStatus(task: Task, userId: string): Promise<Task> {
  const newStatus = task.status === 'completed' ? 'pending' : 'completed'
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: newStatus,
      completed_at: completedAt,
    })
    .eq('id', task.id)
    .eq('user_id', userId)
    .select('*, goal:goals(id, title, category)')
    .single()

  if (error) throw error

  // Auto-sync linked goal
  if (task.goal_id) {
    await syncGoalProgress(task.goal_id, userId)
  }

  return data
}

export async function rescheduleTask(taskId: string, newDateStr: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ due_date: newDateStr })
    .eq('id', taskId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteTaskWithSync(task: Task, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', task.id)
    .eq('user_id', userId)

  if (error) throw error

  if (task.goal_id) {
    await syncGoalProgress(task.goal_id, userId)
  }
}
