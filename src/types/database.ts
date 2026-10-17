export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type GoalType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'overdue'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type HabitFrequency = 'daily' | 'weekdays' | 'custom'
export type Mood = 'great' | 'good' | 'neutral' | 'low' | 'tired'

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private'
  share_habits: boolean
  share_goals: boolean
  share_tasks: boolean
  share_schedule: boolean
  allow_compare: boolean
}

export interface Profile {
  id: string
  display_name: string | null
  username?: string | null
  avatar_url: string | null
  bio?: string | null
  growth_goal?: string | null
  privacy_settings?: PrivacySettings | null
  timezone: string
  daily_intention: string | null
  preferred_week_start: string
  theme: string
  is_onboarded: boolean
  created_at: string
  updated_at: string
}

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'blocked'
export type RelationshipType = 'friend' | 'companion' | 'teammate'

export interface Connection {
  id: string
  requester_id: string
  addressee_id: string
  status: ConnectionStatus
  relationship_type: RelationshipType
  notes?: string | null
  created_at: string
  updated_at: string
  partner_profile?: Profile | null
  is_private_relationship?: boolean
}

export interface SocialReport {
  id: string
  reporter_id: string
  target_type: 'user' | 'group' | 'content'
  target_id: string
  reason: string
  details?: string | null
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
  target_user?: Profile | null
}

export interface Group {
  id: string
  name: string
  description?: string | null
  avatar_url?: string | null
  category: 'growth' | 'study' | 'workout' | 'challenge' | 'work'
  owner_id: string
  is_private: boolean
  created_at: string
  updated_at: string
  member_count?: number
  current_user_role?: 'owner' | 'admin' | 'member' | null
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  status: 'invited' | 'accepted' | 'rejected'
  joined_at: string
  profile?: Profile | null
}

export type ShareEntityType = 'goals' | 'habits' | 'tasks' | 'schedule' | 'specific_goal' | 'specific_habit'
export type ShareTargetType = 'public' | 'all_friends' | 'specific_user' | 'group'

export interface SharePermission {
  id: string
  owner_id: string
  entity_type: ShareEntityType
  entity_id?: string | null
  target_type: ShareTargetType
  target_id?: string | null
  permission_level: 'view' | 'cheer'
  is_active: boolean
  created_at: string
  target_profile?: Profile | null
  target_group?: Group | null
}

export type ChallengeType = 'personal' | 'pair' | 'group'
export type ChallengeStatus = 'active' | 'completed' | 'cancelled'

export interface Challenge {
  id: string
  creator_id: string
  title: string
  description?: string | null
  category: 'habit' | 'task' | 'reading' | 'workout' | 'study'
  target_metric: string
  target_value: number
  unit: string
  start_date: string
  end_date: string
  challenge_type: ChallengeType
  group_id?: string | null
  status: ChallengeStatus
  rules_note?: string | null
  created_at: string
  updated_at: string
  participants?: ChallengeParticipant[]
}

export interface ChallengeParticipant {
  id: string
  challenge_id: string
  user_id: string
  status: 'invited' | 'joined' | 'declined' | 'completed'
  current_progress: number
  is_completed: boolean
  completed_at?: string | null
  joined_at: string
  profile?: Profile | null
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'group_invite'
  | 'challenge_invite'
  | 'cheer_sent'
  | 'system'

export interface AppNotification {
  id: string
  user_id: string
  sender_id?: string | null
  type: NotificationType
  title: string
  content: string
  metadata?: Record<string, any>
  is_read: boolean
  created_at: string
  sender_profile?: Profile | null
}

export interface SocialCheer {
  id: string
  sender_id: string
  recipient_id: string
  entity_type?: 'general' | 'goal' | 'habit' | 'challenge' | 'weekly_review' | null
  entity_id?: string | null
  emoji: string
  message?: string | null
  created_at: string
  sender_profile?: Profile | null
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
