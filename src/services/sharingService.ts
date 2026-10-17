import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { PrivacySettings, SharePermission, ShareEntityType, ShareTargetType } from '@/types/database'

export const sharingService = {
  // 1. Update user's personal privacy settings
  async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    // First fetch existing privacy settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('privacy_settings')
      .eq('id', userId)
      .single()

    const currentSettings = profile?.privacy_settings || {
      profile_visibility: 'public',
      share_habits: true,
      share_goals: true,
      share_tasks: false,
      share_schedule: false,
      allow_compare: true,
    }

    const merged = { ...currentSettings, ...settings }

    const { error } = await supabase
      .from('profiles')
      .update({ privacy_settings: merged })
      .eq('id', userId)

    return { error }
  },

  // 2. Grant explicit sharing permission
  async grantPermission(
    ownerId: string,
    entityType: ShareEntityType,
    targetType: ShareTargetType,
    targetId?: string | null,
    entityId?: string | null
  ): Promise<{ error: any; permission?: SharePermission }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { data, error } = await supabase
      .from('share_permissions')
      .insert({
        owner_id: ownerId,
        entity_type: entityType,
        target_type: targetType,
        target_id: targetId || null,
        entity_id: entityId || null,
        permission_level: 'view',
        is_active: true,
      })
      .select()
      .single()

    return { error, permission: data }
  },

  // 3. Revoke sharing permission
  async revokePermission(permissionId: string, ownerId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase
      .from('share_permissions')
      .delete()
      .eq('id', permissionId)
      .eq('owner_id', ownerId)

    return { error }
  },

  // 4. List my active sharing permissions with target profile / group info
  async listMyPermissions(ownerId: string): Promise<SharePermission[]> {
    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('share_permissions')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error || !data) return []

    // Fetch user profiles for specific_user targets
    const targetUserIds = data
      .filter((p) => p.target_type === 'specific_user' && p.target_id)
      .map((p) => p.target_id as string)

    // Fetch group details for group targets
    const targetGroupIds = data
      .filter((p) => p.target_type === 'group' && p.target_id)
      .map((p) => p.target_id as string)

    let profileMap = new Map<string, any>()
    if (targetUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', targetUserIds)
      if (profiles) profileMap = new Map(profiles.map((p) => [p.id, p]))
    }

    let groupMap = new Map<string, any>()
    if (targetGroupIds.length > 0) {
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .in('id', targetGroupIds)
      if (groups) groupMap = new Map(groups.map((g) => [g.id, g]))
    }

    return data.map((perm) => ({
      ...perm,
      target_profile: perm.target_id ? profileMap.get(perm.target_id) || null : null,
      target_group: perm.target_id ? groupMap.get(perm.target_id) || null : null,
    }))
  },

  // 5. Check if user can view target user's entity
  async canView(viewerId: string, ownerId: string, entityType: 'habits' | 'goals' | 'tasks' | 'schedule'): Promise<boolean> {
    if (viewerId === ownerId) return true
    if (!isSupabaseConfigured()) return false

    // Fetch target user's privacy settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('privacy_settings')
      .eq('id', ownerId)
      .single()

    const settings: PrivacySettings | undefined = profile?.privacy_settings

    if (!settings) return false

    // If profile is completely private
    if (settings.profile_visibility === 'private') return false

    // Check entity category flag
    if (entityType === 'habits' && !settings.share_habits) return false
    if (entityType === 'goals' && !settings.share_goals) return false
    if (entityType === 'tasks' && !settings.share_tasks) return false
    if (entityType === 'schedule' && !settings.share_schedule) return false

    // If viewer must be friend
    if (settings.profile_visibility === 'friends') {
      const { data: connection } = await supabase
        .from('connections')
        .select('id')
        .eq('status', 'accepted')
        .or(
          `and(requester_id.eq.${viewerId},addressee_id.eq.${ownerId}),and(requester_id.eq.${ownerId},addressee_id.eq.${viewerId})`
        )
        .maybeSingle()

      return !!connection
    }

    return true
  },

  // 6. Fetch all friends who have shared their schedule/calendar with viewer
  async fetchUsersWhoSharedWithMe(
    viewerId: string,
    entityType: 'schedule' | 'tasks' | 'goals' | 'habits' = 'schedule'
  ): Promise<any[]> {
    if (!isSupabaseConfigured()) return []

    // 1. Get accepted connections
    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`)
      .eq('status', 'accepted')

    if (!connections || connections.length === 0) return []

    const friendUserIds = connections.map((c) =>
      c.requester_id === viewerId ? c.addressee_id : c.requester_id
    )

    // 2. Fetch profiles of these friends who enabled share_schedule in privacy_settings
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendUserIds)

    if (!profiles) return []

    // Filter by privacy settings or explicit share permissions
    const eligibleProfiles = profiles.filter((p) => {
      const ps = p.privacy_settings
      if (!ps) return false
      if (ps.profile_visibility === 'private') return false
      if (entityType === 'schedule') return ps.share_schedule === true
      if (entityType === 'tasks') return ps.share_tasks === true
      if (entityType === 'goals') return ps.share_goals === true
      if (entityType === 'habits') return ps.share_habits === true
      return false
    })

    return eligibleProfiles
  },

  // 7. Fetch shared tasks / schedule events for an owner
  async fetchSharedScheduleTasks(
    viewerId: string,
    ownerId: string,
    startDateStr: string,
    endDateStr: string
  ): Promise<any[]> {
    if (!isSupabaseConfigured()) return []

    const canViewSchedule = await this.canView(viewerId, ownerId, 'schedule')
    const canViewTasks = await this.canView(viewerId, ownerId, 'tasks')

    if (!canViewSchedule && !canViewTasks) return []

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, goal:goals(id, title, category)')
      .eq('user_id', ownerId)
      .gte('due_date', startDateStr)
      .lte('due_date', endDateStr)
      .order('start_time', { ascending: true })

    if (error || !tasks) return []
    return tasks
  },
}
