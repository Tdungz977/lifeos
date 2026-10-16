export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type GoalType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'overdue'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type HabitFrequency = 'daily' | 'weekdays' | 'custom'
export type Mood = 'great' | 'good' | 'neutral' | 'low' | 'tired'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  timezone: string
  daily_intention: string | null
  preferred_week_start: string
  theme: string
  is_onboarded: boolean
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string | null
  category: string
  start_date: string
  target_date?: string | null
  goal_type: GoalType
  priority: Priority
  status: GoalStatus
  target_value: number
  current_value: number
  unit: string
  reflection_notes?: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  milestones?: GoalMilestone[]
  linked_tasks_count?: number
  completed_tasks_count?: number
}

export interface GoalMilestone {
  id: string
  goal_id: string
  user_id: string
  title: string
  target_date?: string | null
  is_completed: boolean
  completed_at?: string | null
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  goal_id?: string | null
  subject_id?: string | null
  title: string
  description?: string | null
  due_date: string
  start_time?: string | null
  end_time?: string | null
  estimated_duration: number
  actual_duration: number
  priority: Priority
  category: string
  status: TaskStatus
  notes?: string | null
  is_priority: boolean
  completed_at?: string | null
  created_at: string
  updated_at: string
  goal?: {
    id: string
    title: string
    category: string
  } | null
  subject?: {
    id: string
    name: string
  } | null
}

export interface Subject {
  id: string
  user_id: string
  name: string
  description?: string | null
  category: string
  target_outcome?: string | null
  target_date?: string | null
  progress: number
  resource_urls: { title: string; url: string }[]
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface StudySession {
  id: string
  user_id: string
  subject_id: string
  duration_minutes: number
  session_date: string
  notes?: string | null
  created_at: string
  subject?: {
    name: string
  }
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description?: string | null
  category: string
  frequency: HabitFrequency
  schedule_days: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  target_per_day: number
  start_date: string
  is_active: boolean
  created_at: string
  updated_at: string
  today_checked?: boolean
  current_streak?: number
  longest_streak?: number
}

export interface HabitCheckin {
  id: string
  habit_id: string
  user_id: string
  checkin_date: string
  value: number
  notes?: string | null
  created_at: string
}

export interface HealthLog {
  id: string
  user_id: string
  log_date: string
  sleep_hours?: number | null
  bedtime?: string | null
  wake_time?: string | null
  water_ml?: number | null
  steps?: number | null
  exercise_minutes?: number | null
  energy_level?: number | null // 1-10
  mood?: Mood | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface DailyReflection {
  id: string
  user_id: string
  reflection_date: string
  daily_intention?: string | null
  morning_note?: string | null
  evening_note?: string | null
  gratitude?: string | null
  created_at: string
  updated_at: string
}

export interface WeeklyReview {
  id: string
  user_id: string
  week_start_date: string
  week_end_date: string
  what_went_well?: string | null
  what_was_difficult?: string | null
  what_i_learned?: string | null
  goal_needs_attention?: string | null
  what_to_change?: string | null
  top_priorities?: string | null
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'dark' | 'light'
  week_start: 'monday' | 'sunday'
  pomodoro_work_mins: number
  pomodoro_break_mins: number
  daily_target_tasks: number
  water_target_ml: number
  sleep_target_hours: number
  steps_target: number
  notifications_enabled: boolean
}
