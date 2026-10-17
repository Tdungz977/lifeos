import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Challenge, ChallengeParticipant, ChallengeType, Profile } from '@/types/database'

export const challengeService = {
  // 1. Fetch all challenges for user (where user is creator or participant)
  async fetchUserChallenges(userId: string): Promise<Challenge[]> {
    if (!isSupabaseConfigured()) return []

    // Fetch participant records for this user
    const { data: partRecords, error: pError } = await supabase
      .from('challenge_participants')
      .select('challenge_id')
      .eq('user_id', userId)

    const challengeIds = (partRecords || []).map((p) => p.challenge_id)

    // Query challenges where creator is user OR in participant list
    let query = supabase.from('challenges').select('*')
    if (challengeIds.length > 0) {
      query = query.or(`creator_id.eq.${userId},id.in.(${challengeIds.join(',')})`)
    } else {
      query = query.eq('creator_id', userId)
    }

    const { data: challenges, error: cError } = await query.order('created_at', { ascending: false })

    if (cError || !challenges || challenges.length === 0) return []

    // Fetch participants for all retrieved challenges
    const allChallengeIds = challenges.map((c) => c.id)
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('*')
      .in('challenge_id', allChallengeIds)

    // Fetch user profiles for participants
    const userIds = Array.from(new Set((participants || []).map((p) => p.user_id)))
    let profileMap = new Map<string, Profile>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
      if (profiles) {
        profileMap = new Map(profiles.map((p) => [p.id, p]))
      }
    }

    const participantMap = new Map<string, ChallengeParticipant[]>()
    for (const p of participants || []) {
      const pWithProfile: ChallengeParticipant = {
        ...p,
        profile: profileMap.get(p.user_id) || null,
      }
      const existing = participantMap.get(p.challenge_id) || []
      existing.push(pWithProfile)
      participantMap.set(p.challenge_id, existing)
    }

    return challenges.map((c) => ({
      ...c,
      participants: participantMap.get(c.id) || [],
    }))
  },

  // 2. Create new challenge (personal, 1-on-1, or group)
  async createChallenge(
    creatorId: string,
    params: {
      title: string
      description?: string
      category: Challenge['category']
      targetMetric: string
      targetValue: number
      unit: string
      startDate: string
      endDate: string
      challengeType: ChallengeType
      invitedUserIds?: string[]
      groupId?: string
      rulesNote?: string
    }
  ): Promise<{ error: any; challenge?: Challenge }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { data: challenge, error: cError } = await supabase
      .from('challenges')
      .insert({
        creator_id: creatorId,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        category: params.category,
        target_metric: params.targetMetric,
        target_value: params.targetValue,
        unit: params.unit,
        start_date: params.startDate,
        end_date: params.endDate,
        challenge_type: params.challengeType,
        group_id: params.groupId || null,
        rules_note: params.rulesNote?.trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (cError || !challenge) return { error: cError }

    // Add creator as joined participant
    await supabase.from('challenge_participants').insert({
      challenge_id: challenge.id,
      user_id: creatorId,
      status: 'joined',
      current_progress: 0,
      is_completed: false,
    })

    // If there are invited users (e.g. 1-1 friend or group members)
    if (params.invitedUserIds && params.invitedUserIds.length > 0) {
      const inviteRecords = params.invitedUserIds
        .filter((uid) => uid !== creatorId)
        .map((uid) => ({
          challenge_id: challenge.id,
          user_id: uid,
          status: 'invited',
          current_progress: 0,
          is_completed: false,
        }))

      if (inviteRecords.length > 0) {
        await supabase.from('challenge_participants').insert(inviteRecords)

        // Send notifications to each invited user
        const notifInserts = inviteRecords.map((r) => ({
          user_id: r.user_id,
          sender_id: creatorId,
          type: 'challenge_invite',
          title: '🔥 Thử thách kỷ luật mới!',
          content: `Bạn được mời tham gia thử thách: "${params.title}". Hãy cùng bứt phá giới hạn!`,
          metadata: { challenge_id: challenge.id },
        }))

        await supabase.from('notifications').insert(notifInserts)
      }
    }

    return { error: null, challenge }
  },

  // 3. Respond to challenge invite (join / decline)
  async respondToInvite(
    challengeId: string,
    userId: string,
    accept: boolean
  ): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const newStatus = accept ? 'joined' : 'declined'
    const { error } = await supabase
      .from('challenge_participants')
      .update({ status: newStatus })
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)

    return { error }
  },

  // 4. Update participant progress in challenge
  async recordProgress(
    challengeId: string,
    userId: string,
    addedValue: number
  ): Promise<{ error: any; isCompleted?: boolean }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    // Fetch challenge target value
    const { data: challenge } = await supabase
      .from('challenges')
      .select('target_value')
      .eq('id', challengeId)
      .single()

    const targetValue = challenge?.target_value || 10

    // Fetch participant current progress
    const { data: participant } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single()

    const currentProg = Number(participant?.current_progress || 0)
    const newProg = Math.max(0, currentProg + addedValue)
    const isCompleted = newProg >= targetValue

    const { error } = await supabase
      .from('challenge_participants')
      .update({
        current_progress: newProg,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)

    return { error, isCompleted }
  },

  // 5. Cancel or finish challenge
  async updateChallengeStatus(
    challengeId: string,
    creatorId: string,
    status: 'completed' | 'cancelled'
  ): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase chưa cấu hình') }

    const { error } = await supabase
      .from('challenges')
      .update({ status })
      .eq('id', challengeId)
      .eq('creator_id', creatorId)

    return { error }
  },
}
