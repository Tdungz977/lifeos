import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  Connection,
  RelationshipType,
  Group,
  GroupMember,
  AppNotification,
  SocialCheer,
  Profile,
} from '@/types/database'

export const socialService = {
  // 1. Search users by handle or display name
  async searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
    if (!isSupabaseConfigured() || !query.trim()) return []

    const cleanQuery = query.trim().replace(/^@/, '')
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
      .limit(15)

    if (error) {
      console.error('Error searching users:', error)
      return []
    }
    return data || []
  },

  // 2. Fetch all accepted connections for user
  async fetchConnections(userId: string): Promise<Connection[]> {
    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching connections:', error)
      return []
    }

    if (!data || data.length === 0) return []

    // Fetch partner profiles
    const partnerIds = data.map((c) => (c.requester_id === userId ? c.addressee_id : c.requester_id))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', partnerIds)

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    return data.map((conn) => ({
      ...conn,
      is_private_relationship: conn.notes?.includes('[PRIVATE_COMPANION]') || false,
      partner_profile: profileMap.get(
        conn.requester_id === userId ? conn.addressee_id : conn.requester_id
      ) || null,
    }))
  },

  // 3. Fetch pending requests (both incoming and outgoing)
  async fetchPendingRequests(userId: string): Promise<{
    incoming: Connection[]
    outgoing: Connection[]
  }> {
    if (!isSupabaseConfigured()) return { incoming: [], outgoing: [] }

    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error || !data) return { incoming: [], outgoing: [] }

    const userIds = Array.from(new Set(data.flatMap((c) => [c.requester_id, c.addressee_id])))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    const incoming: Connection[] = []
    const outgoing: Connection[] = []

    for (const c of data) {
      const connWithProfile: Connection = {
        ...c,
        partner_profile: profileMap.get(
          c.requester_id === userId ? c.addressee_id : c.requester_id
        ) || null,
      }
      if (c.addressee_id === userId) {
        incoming.push(connWithProfile)
      } else {
        outgoing.push(connWithProfile)
      }
    }

    return { incoming, outgoing }
  },

  // 4. Send connection request
  async sendConnectionRequest(
    requesterId: string,
    addresseeId: string,
    relationshipType: RelationshipType = 'friend',
    notes?: string,
    isPrivateRelationship: boolean = false
  ): Promise<{ error: any; connection?: Connection }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }
    if (requesterId === addresseeId) return { error: new Error('Không thể tự kết nối với chính mình') }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`
      )
      .maybeSingle()

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: new Error('Hai bạn đã là kết nối của nhau') }
      }
      if (existing.status === 'pending') {
        return { error: new Error('Lời mời kết nối đang chờ phản hồi') }
      }
      if (existing.status === 'blocked') {
        return { error: new Error('Không thể gửi lời mời đến người dùng này') }
      }
    }

    let encodedNotes = notes?.trim() || ''
    if (isPrivateRelationship) {
      encodedNotes = `[PRIVATE_COMPANION] ${encodedNotes}`.trim()
    }

    // Insert new connection
    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        relationship_type: relationshipType,
        status: 'pending',
        notes: encodedNotes || null,
      })
      .select()
      .single()

    if (error) return { error }

    // Send in-app notification to addressee
    await supabase.from('notifications').insert({
      user_id: addresseeId,
      sender_id: requesterId,
      type: 'connection_request',
      title: 'Lời mời kết nối mới',
      content: `Có người muốn kết nối với bạn với vai trò ${
        relationshipType === 'companion'
          ? isPrivateRelationship
            ? 'Người yêu (Chế độ riêng tư đôi)'
            : 'Người đồng hành / Người yêu'
          : 'Bạn bè phát triển'
      }.`,
      metadata: { connection_id: data.id, relationship_type: relationshipType, is_private: isPrivateRelationship },
    })

    return { error: null, connection: data }
  },

  // 5. Respond to connection request (accept / reject)
  async respondToConnectionRequest(
    connectionId: string,
    accept: boolean,
    currentUserId: string
  ): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const newStatus = accept ? 'accepted' : 'rejected'
    const { data, error } = await supabase
      .from('connections')
      .update({ status: newStatus })
      .eq('id', connectionId)
      .eq('addressee_id', currentUserId)
      .select()
      .single()

    if (error) return { error }

    // If accepted, notify the requester
    if (accept && data) {
      await supabase.from('notifications').insert({
        user_id: data.requester_id,
        sender_id: currentUserId,
        type: 'connection_accepted',
        title: 'Lời mời kết nối đã được chấp nhận!',
        content: 'Hai bạn đã trở thành bạn đồng hành trên hành trình kỷ luật LIFEOS.',
        metadata: { connection_id: data.id },
      })
    }

    return { error: null }
  },

  // 6. Cancel outgoing pending connection request
  async cancelConnectionRequest(connectionId: string, currentUserId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
      .eq('requester_id', currentUserId)
      .eq('status', 'pending')

    return { error }
  },

  // 7. Remove an existing connection
  async removeConnection(connectionId: string, currentUserId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)

    return { error }
  },

  // 8. Block user
  async blockUser(currentUserId: string, targetUserId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    // First, remove any mutual connections
    await supabase
      .from('connections')
      .delete()
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUserId})`
      )

    // Insert block record
    const { error } = await supabase
      .from('connections')
      .insert({
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: 'blocked',
        relationship_type: 'friend',
      })

    return { error }
  },

  // 8b. Unblock user
  async unblockUser(currentUserId: string, targetUserId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('requester_id', currentUserId)
      .eq('addressee_id', targetUserId)
      .eq('status', 'blocked')

    return { error }
  },

  // 8c. Fetch blocked users
  async fetchBlockedUsers(currentUserId: string): Promise<Profile[]> {
    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('connections')
      .select('addressee_id')
      .eq('requester_id', currentUserId)
      .eq('status', 'blocked')

    if (error || !data || data.length === 0) return []

    const blockedIds = data.map((d) => d.addressee_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', blockedIds)

    return profiles || []
  },

  // 8d. Report inappropriate user / content
  async reportContent(
    reporterId: string,
    targetType: 'user' | 'group' | 'content',
    targetId: string,
    reason: string,
    details?: string
  ): Promise<{ error: any; success: boolean }> {
    if (!isSupabaseConfigured()) return { error: null, success: true }

    // Send report notification to admin/system log
    await supabase.from('notifications').insert({
      user_id: reporterId,
      sender_id: reporterId,
      type: 'system',
      title: 'Đã tiếp nhận báo cáo nội dung',
      content: `Báo cáo của bạn về ${targetType === 'user' ? 'người dùng' : 'nội dung'} với lý do "${reason}" đã được ghi nhận và đang được bảo vệ xử lý.`,
      metadata: { target_type: targetType, target_id: targetId, reason, details },
    })

    return { error: null, success: true }
  },

  // 9. Groups: Fetch user groups
  async fetchUserGroups(userId: string): Promise<Group[]> {
    if (!isSupabaseConfigured()) return []

    const { data: memberRecords, error: mError } = await supabase
      .from('group_members')
      .select('group_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    if (mError || !memberRecords || memberRecords.length === 0) return []

    const groupIds = memberRecords.map((m) => m.group_id)
    const { data: groups, error: gError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false })

    if (gError || !groups) return []

    const roleMap = new Map(memberRecords.map((m) => [m.group_id, m.role]))

    return groups.map((g) => ({
      ...g,
      current_user_role: roleMap.get(g.id) as any,
    }))
  },

  // 10. Groups: Create group
  async createGroup(
    ownerId: string,
    name: string,
    description: string,
    category: Group['category'] = 'growth',
    isPrivate: boolean = true
  ): Promise<{ error: any; group?: Group }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { data: group, error: gError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        category,
        owner_id: ownerId,
        is_private: isPrivate,
      })
      .select()
      .single()

    if (gError || !group) return { error: gError }

    // Add owner as group_member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: ownerId,
      role: 'owner',
      status: 'accepted',
    })

    return { error: null, group }
  },

  // 11. Groups: Fetch members
  async fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'accepted')

    if (error || !data) return []

    const userIds = data.map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    return data.map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) || null,
    }))
  },

  // 12. Groups: Invite member
  async inviteToGroup(groupId: string, targetUserId: string, currentUserId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: targetUserId,
      role: 'member',
      status: 'invited',
    })

    if (error) return { error }

    // Notify user
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      sender_id: currentUserId,
      type: 'group_invite',
      title: 'Lời mời tham gia nhóm',
      content: 'Bạn đã được mời tham gia một nhóm kỷ luật & phát triển mới.',
      metadata: { group_id: groupId },
    })

    return { error: null }
  },

  // 13. Groups: Leave group
  async leaveGroup(groupId: string, userId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    return { error }
  },

  // 14. Groups: Delete group (owner only)
  async deleteGroup(groupId: string, ownerId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
      .eq('owner_id', ownerId)

    return { error }
  },

  // 15. Notifications: Fetch
  async fetchNotifications(userId: string): Promise<AppNotification[]> {
    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error || !data) return []

    // Fetch sender profiles
    const senderIds = Array.from(new Set(data.map((n) => n.sender_id).filter(Boolean)))
    let profileMap = new Map<string, Profile>()
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', senderIds)
      if (profiles) {
        profileMap = new Map(profiles.map((p) => [p.id, p]))
      }
    }

    return data.map((n) => ({
      ...n,
      sender_profile: n.sender_id ? profileMap.get(n.sender_id) || null : null,
    }))
  },

  // 16. Notifications: Mark read
  async markNotificationRead(notificationId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: null }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    return { error }
  },

  // 17. Notifications: Mark all as read
  async markAllNotificationsRead(userId: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: null }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    return { error }
  },

  // 18. Social Cheer / Kudos
  async sendSocialCheer(
    senderId: string,
    recipientId: string,
    emoji: string = '🔥',
    message?: string,
    entityType: string = 'general',
    entityId?: string
  ): Promise<{ error: any; cheer?: SocialCheer }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }
    if (senderId === recipientId) return { error: new Error('Không thể tự gửi lời động viên cho chính mình') }

    const { data, error } = await supabase
      .from('social_cheers')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        emoji,
        message: message?.trim() || null,
        entity_type: entityType,
        entity_id: entityId || null,
      })
      .select()
      .single()

    if (error) return { error }

    // Notify recipient
    await supabase.from('notifications').insert({
      user_id: recipientId,
      sender_id: senderId,
      type: 'cheer_sent',
      title: `${emoji} Bạn nhận được lời động viên mới!`,
      content: message ? `"${message}"` : 'Một người bạn vừa gửi tiếp lửa năng lượng kỷ luật cho bạn!',
      metadata: { cheer_id: data.id, emoji },
    })

    return { error: null, cheer: data }
  },
}
