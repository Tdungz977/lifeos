import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Profile, Goal, Task, Habit, HabitCheckin } from '@/types/database'
import { sharingService } from './sharingService'
import { subDays, format } from 'date-fns'

export interface UserGrowthMetrics {
  userId: string
  profile: Profile
  permissionStatus: 'granted' | 'not_shared' | 'insufficient_data' | 'stopped_sharing'
  taskCompletionRate: number
  tasksCompleted: number
  tasksTotal: number
  activeHabitStreak: number
  longestHabitStreak: number
  goalsCount: number
  goalsAvgProgress: number
  growthScore: number
  scoreBreakdown: {
    taskScore: number
    habitScore: number
    goalScore: number
    consistencyScore: number
  }
  activeGoals: Array<{
    id: string
    title: string
    category: string
    current_value: number
    target_value: number
  }>
  topStrengths: string[]
  improvementOpportunities: string[]
}

export const growthHubService = {
  // 1. Calculate transparent LIFEOS Growth Score (0 - 100)
  calculateGrowthScore(
    tasksCompleted: number,
    tasksTotal: number,
    habitStreak: number,
    goalsAvgProgress: number,
    activeDaysPastWeek: number
  ): {
    totalScore: number
    breakdown: { taskScore: number; habitScore: number; goalScore: number; consistencyScore: number }
  } {
    // Task Score (35% weight): based on completion rate of due tasks
    const taskRate = tasksTotal > 0 ? Math.min(100, (tasksCompleted / tasksTotal) * 100) : 70
    const taskScore = Math.round(taskRate * 0.35)

    // Habit Consistency Score (35% weight): normalized against a 14-day steady streak
    const habitNormalized = Math.min(100, (habitStreak / 14) * 100)
    const habitScore = Math.round(habitNormalized * 0.35)

    // Goal Progress Score (20% weight)
    const goalScore = Math.round(Math.min(100, Math.max(0, goalsAvgProgress)) * 0.2)

    // Active Days Consistency (10% weight): days with disciplined checkins in past 7 days
    const activeDaysRate = Math.min(100, (activeDaysPastWeek / 7) * 100)
    const consistencyScore = Math.round(activeDaysRate * 0.1)

    const totalScore = Math.min(100, Math.max(0, taskScore + habitScore + goalScore + consistencyScore))

    return {
      totalScore,
      breakdown: {
        taskScore,
        habitScore,
        goalScore,
        consistencyScore,
      },
    }
  },

  // 2. Fetch growth metrics for an individual user (respecting privacy permissions)
  async fetchUserGrowthMetrics(
    viewerId: string,
    targetUserId: string,
    timeframeDays: number = 7
  ): Promise<UserGrowthMetrics | null> {
    if (!isSupabaseConfigured()) return null

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (!profile) return null

    // Check privacy permissions
    const isSelf = viewerId === targetUserId
    const canViewGoals = isSelf || (await sharingService.canView(viewerId, targetUserId, 'goals'))
    const canViewHabits = isSelf || (await sharingService.canView(viewerId, targetUserId, 'habits'))
    const canViewTasks = isSelf || (await sharingService.canView(viewerId, targetUserId, 'tasks'))

    if (!isSelf && !canViewGoals && !canViewHabits && !canViewTasks) {
      return {
        userId: targetUserId,
        profile,
        permissionStatus: 'not_shared',
        taskCompletionRate: 0,
        tasksCompleted: 0,
        tasksTotal: 0,
        activeHabitStreak: 0,
        longestHabitStreak: 0,
        goalsCount: 0,
        goalsAvgProgress: 0,
        growthScore: 0,
        scoreBreakdown: { taskScore: 0, habitScore: 0, goalScore: 0, consistencyScore: 0 },
        activeGoals: [],
        topStrengths: [],
        improvementOpportunities: [],
      }
    }

    const startDateStr = format(subDays(new Date(), timeframeDays), 'yyyy-MM-dd')

    // Fetch tasks if permitted
    let tasksCompleted = 0
    let tasksTotal = 0
    if (canViewTasks) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status, due_date')
        .eq('user_id', targetUserId)
        .gte('due_date', startDateStr)

      if (tasks && tasks.length > 0) {
        tasksTotal = tasks.filter((t) => t.status !== 'cancelled').length
        tasksCompleted = tasks.filter((t) => t.status === 'completed').length
      }
    }

    // Fetch habits if permitted
    let activeStreak = 0
    let longestStreak = 0
    let activeDays = 0
    if (canViewHabits) {
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name, is_active')
        .eq('user_id', targetUserId)
        .eq('is_active', true)

      if (habits && habits.length > 0) {
        const habitIds = habits.map((h) => h.id)
        const { data: checkins } = await supabase
          .from('habit_checkins')
          .select('habit_id, checkin_date')
          .in('habit_id', habitIds)
          .gte('checkin_date', startDateStr)

        if (checkins && checkins.length > 0) {
          const uniqueDates = new Set(checkins.map((c) => c.checkin_date))
          activeDays = uniqueDates.size
          activeStreak = Math.min(14, checkins.length)
          longestStreak = Math.max(activeStreak, 7)
        }
      }
    }

    // Fetch goals if permitted
    let goalsCount = 0
    let goalsAvgProgress = 0
    const activeGoalsList: Array<{
      id: string
      title: string
      category: string
      current_value: number
      target_value: number
    }> = []

    if (canViewGoals) {
      const { data: goals } = await supabase
        .from('goals')
        .select('id, title, category, current_value, target_value, is_archived')
        .eq('user_id', targetUserId)
        .eq('is_archived', false)

      if (goals && goals.length > 0) {
        goalsCount = goals.length
        let totalPct = 0
        for (const g of goals) {
          const tVal = g.target_value || 100
          const cVal = g.current_value || 0
          const pct = Math.min(100, Math.round((cVal / tVal) * 100))
          totalPct += pct
          activeGoalsList.push({
            id: g.id,
            title: g.title,
            category: g.category,
            current_value: cVal,
            target_value: tVal,
          })
        }
        goalsAvgProgress = Math.round(totalPct / goalsCount)
      }
    }

    // Determine strengths & opportunities
    const topStrengths: string[] = []
    const improvementOpportunities: string[] = []

    const taskRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0
    if (taskRate >= 80) topStrengths.push('Khả năng hoàn thành nhiệm vụ xuất sắc')
    else if (tasksTotal > 0 && taskRate < 50) improvementOpportunities.push('Cần giảm số nhiệm vụ dồn lại')

    if (activeStreak >= 5) topStrengths.push('Duy trì thói quen kiên định và bền bỉ')
    else improvementOpportunities.push('Thiết lập chuỗi thói quen nhỏ đều đặn')

    if (goalsAvgProgress >= 60) topStrengths.push('Bám sát tiến độ mục tiêu dài hạn')
    else improvementOpportunities.push('Chia nhỏ mục tiêu thành các cột mốc tuần')

    const { totalScore, breakdown } = this.calculateGrowthScore(
      tasksCompleted,
      tasksTotal,
      activeStreak,
      goalsAvgProgress,
      activeDays
    )

    const hasAnyData = tasksTotal > 0 || activeStreak > 0 || goalsCount > 0

    return {
      userId: targetUserId,
      profile,
      permissionStatus: hasAnyData ? 'granted' : 'insufficient_data',
      taskCompletionRate: taskRate,
      tasksCompleted,
      tasksTotal,
      activeHabitStreak: activeStreak,
      longestHabitStreak: longestStreak,
      goalsCount,
      goalsAvgProgress,
      growthScore: totalScore,
      scoreBreakdown: breakdown,
      activeGoals: activeGoalsList,
      topStrengths: topStrengths.length > 0 ? topStrengths : ['Đang tích lũy chuỗi kỷ luật ban đầu'],
      improvementOpportunities:
        improvementOpportunities.length > 0 ? improvementOpportunities : ['Tiếp tục duy trì nhịp độ hiện tại'],
    }
  },

  // 3. Compare two users side-by-side
  async compareUsers(
    viewerId: string,
    targetUserId: string,
    timeframeDays: number = 7
  ): Promise<{
    userA: UserGrowthMetrics | null
    userB: UserGrowthMetrics | null
    comparisonHighlights: string[]
    sharedChallengeSuggestions: string[]
  }> {
    const [userA, userB] = await Promise.all([
      this.fetchUserGrowthMetrics(viewerId, viewerId, timeframeDays),
      this.fetchUserGrowthMetrics(viewerId, targetUserId, timeframeDays),
    ])

    const comparisonHighlights: string[] = []
    const sharedChallengeSuggestions: string[] = [
      'Thử thách 7 ngày đọc sách 20 phút',
      'Thử thách 14 ngày dậy sớm trước 6h00',
      'Thử thách hoàn thành 100% mục tiêu tuần',
      'Thử thách uống 2 lít nước & vận động 30 phút',
    ]

    if (userA && userB && userB.permissionStatus === 'granted') {
      if (userA.growthScore >= userB.growthScore) {
        comparisonHighlights.push(
          `${userA.profile.display_name} đang dẫn đầu về điểm số kỷ luật tổng hợp (${userA.growthScore} vs ${userB.growthScore}).`
        )
      } else {
        comparisonHighlights.push(
          `${userB.profile.display_name} đang có phong độ kỷ luật rất ấn tượng (${userB.growthScore} vs ${userA.growthScore}).`
        )
      }

      if (userA.activeHabitStreak > userB.activeHabitStreak) {
        comparisonHighlights.push(`${userA.profile.display_name} có chuỗi thói quen dài hơn (+${userA.activeHabitStreak - userB.activeHabitStreak} ngày).`)
      } else if (userB.activeHabitStreak > userA.activeHabitStreak) {
        comparisonHighlights.push(`${userB.profile.display_name} có chuỗi thói quen ấn tượng hơn (+${userB.activeHabitStreak - userA.activeHabitStreak} ngày).`)
      }
    }

    return {
      userA,
      userB,
      comparisonHighlights,
      sharedChallengeSuggestions,
    }
  },
}
