import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Habit, HabitCheckin } from '@/types/database'
import { format, subDays, getDay, parseISO } from 'date-fns'

export interface HabitWithStats extends Habit {
  current_streak: number
  longest_streak: number
  completion_rate: number
  total_checkins: number
  recent_checkins: string[] // ISO date strings
}

const LOCAL_HABITS_PREFIX = 'lifeos_habits_'
const LOCAL_CHECKINS_PREFIX = 'lifeos_habit_checkins_'

export function getLocalHabits(userId: string): Habit[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = localStorage.getItem(`${LOCAL_HABITS_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Error reading local habits:', err)
    return []
  }
}

export function saveLocalHabits(userId: string, habits: Habit[]): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(`${LOCAL_HABITS_PREFIX}${userId}`, JSON.stringify(habits))
  } catch (err) {
    console.error('Error saving local habits:', err)
  }
}

export function getLocalCheckins(userId: string): HabitCheckin[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = localStorage.getItem(`${LOCAL_CHECKINS_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Error reading local habit checkins:', err)
    return []
  }
}

export function saveLocalCheckins(userId: string, checkins: HabitCheckin[]): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(`${LOCAL_CHECKINS_PREFIX}${userId}`, JSON.stringify(checkins))
  } catch (err) {
    console.error('Error saving local habit checkins:', err)
  }
}

/**
 * Calculate accurate streak taking into account scheduled days (e.g. weekdays only)
 */
export function calculateStreaks(
  habit: Habit,
  checkinDates: Set<string>,
  todayStr: string
): { currentStreak: number; longestStreak: number } {
  const scheduleDays = habit.schedule_days && habit.schedule_days.length > 0
    ? habit.schedule_days
    : [0, 1, 2, 3, 4, 5, 6] // default all days

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  const today = parseISO(todayStr)
  const todayDayOfWeek = getDay(today)
  const isTodayScheduled = scheduleDays.includes(todayDayOfWeek)
  const isTodayChecked = checkinDates.has(todayStr)

  let checkDay = today
  if (isTodayScheduled && !isTodayChecked) {
    // If today is scheduled but not yet checked, look backwards starting from yesterday
    checkDay = subDays(today, 1)
  }

  // Count backwards for current streak
  for (let i = 0; i < 365; i++) {
    const date = subDays(checkDay, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = getDay(date)

    if (scheduleDays.includes(dayOfWeek)) {
      if (checkinDates.has(dateStr)) {
        currentStreak++
      } else {
        break // Streak broken
      }
    }
  }

  // Calculate longest streak from all historical dates (up to 90 days lookback)
  for (let i = 90; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = getDay(date)

    if (scheduleDays.includes(dayOfWeek)) {
      if (checkinDates.has(dateStr)) {
        tempStreak++
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
      } else {
        tempStreak = 0
      }
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(currentStreak, longestStreak),
  }
}

export async function getHabitsWithStats(userId: string, todayStr: string): Promise<HabitWithStats[]> {
  if (!userId) return []
  let habits = getLocalHabits(userId).filter((h) => h.is_active)
  let checkins = getLocalCheckins(userId)

  if (isSupabaseConfigured()) {
    try {
      const { data: cloudHabits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (cloudHabits && cloudHabits.length > 0) {
        habits = cloudHabits
        saveLocalHabits(userId, cloudHabits)
      }

      const { data: cloudCheckins } = await supabase
        .from('habit_checkins')
        .select('*')
        .eq('user_id', userId)

      if (cloudCheckins && cloudCheckins.length > 0) {
        checkins = cloudCheckins
        saveLocalCheckins(userId, cloudCheckins)
      }
    } catch (err) {
      console.warn('Supabase getHabitsWithStats error, using local fallback:', err)
    }
  }

  const checkinsByHabit: Record<string, Set<string>> = {}
  checkins.forEach((c) => {
    if (!checkinsByHabit[c.habit_id]) {
      checkinsByHabit[c.habit_id] = new Set()
    }
    checkinsByHabit[c.habit_id].add(c.checkin_date)
  })

  return habits.map((habit) => {
    const datesSet = checkinsByHabit[habit.id] || new Set()
    const { currentStreak, longestStreak } = calculateStreaks(habit, datesSet, todayStr)
    const isTodayChecked = datesSet.has(todayStr)

    // Last 30 days completion rate
    let scheduledDaysCount = 0
    let checkedCount = 0
    const sched = habit.schedule_days || [0, 1, 2, 3, 4, 5, 6]

    for (let i = 0; i < 30; i++) {
      const d = subDays(parseISO(todayStr), i)
      const dStr = format(d, 'yyyy-MM-dd')
      if (sched.includes(getDay(d))) {
        scheduledDaysCount++
        if (datesSet.has(dStr)) {
          checkedCount++
        }
      }
    }

    const rate = scheduledDaysCount > 0 ? Math.round((checkedCount / scheduledDaysCount) * 100) : 0

    return {
      ...habit,
      today_checked: isTodayChecked,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      completion_rate: rate,
      total_checkins: datesSet.size,
      recent_checkins: Array.from(datesSet),
    }
  })
}
