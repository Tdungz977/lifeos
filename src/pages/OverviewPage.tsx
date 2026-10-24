import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Target,
  CheckCircle2,
  ArrowRight,
  Flame,
  AlertTriangle,
  Plus,
  CheckSquare,
  Star,
  BookOpen,
  Dumbbell,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Task, Goal, Habit } from '@/types/database'
import { toggleTaskStatus, getOverdueTasks, getTodayTasks } from '@/services/taskService'
import { getGoalsWithCounts } from '@/services/goalService'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { WeeklyScheduleBoard } from '@/components/dashboard/WeeklyScheduleBoard'
import { formatViDate, getGreeting } from '@/lib/utils'
import { MoonWeeklyTask, DayOfWeekIndex } from '@/services/moonAssistantService'
import confetti from 'canvas-confetti'

interface DashboardTask {
  id: string
  title: string
  status: 'pending' | 'completed'
  priority?: string
  start_time?: string | null
  category?: string
  notes?: string
  is_priority?: boolean
  isFromMoon?: boolean
  goal?: { id: string; title: string; category?: string } | null
}

export const OverviewPage: React.FC = () => {
  const { user, profile } = useAuth()
  const [todayStr] = useState(() => new Date().toISOString().split('T')[0])
  const greeting = getGreeting()
  const displayName = profile?.display_name || user?.user_metadata?.full_name || 'Bạn'

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])

  const loadDashboardData = useCallback(async () => {
    let resolvedTasks: DashboardTask[] = []
    let resolvedOverdue: Task[] = []
    let resolvedGoals: Goal[] = []
    let resolvedHabits: Habit[] = []

    if (user) {
      try {
        setLoading(true)
        // 1. Fetch Today's Tasks from taskService (Hybrid Local & Cloud)
        const taskData = await getTodayTasks(user.id, todayStr)

        if (taskData && taskData.length > 0) {
          resolvedTasks = taskData.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status as 'pending' | 'completed',
            priority: t.priority,
            start_time: t.start_time,
            category: t.category,
            notes: t.notes || undefined,
            is_priority: t.is_priority,
            goal: t.goal,
            isFromMoon: false,
          }))
        }

        // 2. Fetch Overdue Tasks
        const overdues = await getOverdueTasks(user.id, todayStr)
        resolvedOverdue = overdues

        // 3. Fetch Active Goals with progress
        const goalsData = await getGoalsWithCounts(user.id)
        resolvedGoals = goalsData

        // 4. Fetch Habits (is_active = true)
        const { data: habitsData } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (habitsData) {
          const { data: checkins } = await supabase
            .from('habit_checkins')
            .select('habit_id')
            .eq('user_id', user.id)
            .eq('checkin_date', todayStr)

          const checkedIds = new Set(checkins?.map((c) => c.habit_id))
          resolvedHabits = habitsData.map((h) => ({
            ...h,
            today_checked: checkedIds.has(h.id),
          }))
        }
      } catch (err) {
        console.error('Error loading cloud dashboard data:', err)
      }
    }

    // Single Source of Truth Fallback:
    // If no tasks were returned from Cloud (or Supabase is offline/unconfigured),
    // resolve tasks from the active Weekly Plan in localStorage for today.
    // This fixes the bug where Overview shows 0/0 while the weekly plan shows tasks!
    if (resolvedTasks.length === 0) {
      try {
        const savedMoon = localStorage.getItem('lifeos_moon_weekly_plan_v1')
        if (savedMoon) {
          const parsed = JSON.parse(savedMoon)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const todayIdx = (new Date().getDay() === 0 ? 0 : new Date().getDay()) as DayOfWeekIndex
            const todayPlanTasks = parsed.filter((t: MoonWeeklyTask) => t.day_index === todayIdx)

            resolvedTasks = todayPlanTasks.map((t: MoonWeeklyTask) => ({
              id: t.id,
              title: t.title,
              status: t.is_completed ? 'completed' : 'pending',
              priority: 'high',
              start_time: t.time_range ? t.time_range.split(' - ')[0] : null,
              category: t.category,
              notes: t.location,
              is_priority: true,
              isFromMoon: true,
            }))
          }
        }
      } catch (e) {
        console.warn('Failed to parse local weekly plan tasks', e)
      }
    }

    setTasks(resolvedTasks)
    setOverdueTasks(resolvedOverdue)
    setGoals(resolvedGoals)
    setHabits(resolvedHabits)
    setLoading(false)
  }, [user, todayStr])

  useEffect(() => {
    loadDashboardData()

    // Listen to weekly schedule board changes to keep Dashboard in sync in real-time
    const handlePlanUpdate = () => loadDashboardData()
    window.addEventListener('moon_tasks_updated', handlePlanUpdate)
    window.addEventListener('storage', handlePlanUpdate)

    return () => {
      window.removeEventListener('moon_tasks_updated', handlePlanUpdate)
      window.removeEventListener('storage', handlePlanUpdate)
    }
  }, [loadDashboardData])

  // Toggle task completion directly from Dashboard Top 3 list
  const handleToggleTask = async (task: DashboardTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'

    // Optimistic state update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    )

    if (nextStatus === 'completed') {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#10B981', '#34D399', '#7255F7'],
      })
    }

    if (task.isFromMoon) {
      // Sync toggle with localStorage and broadcast event
      try {
        const saved = localStorage.getItem('lifeos_moon_weekly_plan_v1')
        if (saved) {
          const parsed: MoonWeeklyTask[] = JSON.parse(saved)
          const updated = parsed.map((t) =>
            t.id === task.id ? { ...t, is_completed: nextStatus === 'completed' } : t
          )
          localStorage.setItem('lifeos_moon_weekly_plan_v1', JSON.stringify(updated))
          window.dispatchEvent(new Event('moon_tasks_updated'))
        }
      } catch (e) {
        console.warn('Failed to update local task state', e)
      }
    } else if (user && isSupabaseConfigured()) {
      // Sync toggle with Supabase Cloud
      await toggleTaskStatus(task as unknown as Task, user.id)
      if (task.goal) {
        const refreshedGoals = await getGoalsWithCounts(user.id)
        setGoals(refreshedGoals)
      }
    }
  }

  // Calculations for real progress (no hard-coded numbers)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const pendingTasks = totalTasks - completedTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const checkedHabitsCount = habits.filter((h) => h.today_checked).length

  // Filter top 3 priority tasks for today (uncompleted first, priority first)
  const priorityTasks = [...tasks]
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1
      }
      return 0
    })
    .slice(0, 3)

  return (
    <div className="space-y-6 w-full max-w-[1440px] mx-auto pb-16">
      {/* ======================================================== */}
      {/* 1. Lời chào, ngày hiện tại và các hành động nhanh       */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#191725] border border-[#282538]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold text-[#F3F4F6] tracking-tight">
              {greeting}, {displayName}!
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#7255F7]/15 text-[#B2A2FA] border border-[#7255F7]/30 font-medium inline-flex items-center gap-1.5">
              {loading && <Loader2 className="w-3 h-3 animate-spin text-[#B2A2FA]" />}
              {formatViDate(todayStr, 'EEEE, dd/MM/yyyy')}
            </span>
          </div>
          {profile?.daily_intention ? (
            <p className="text-xs text-[#B2A2FA] italic mt-1">&ldquo;{profile.daily_intention}&rdquo;</p>
          ) : (
            <p className="text-xs text-[#9CA3AF] mt-1">Tập trung vào điều quan trọng nhất hôm nay.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/today">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Thêm việc
            </Button>
          </Link>
          <Link to="/habits">
            <Button variant="outline" size="sm" leftIcon={<Flame className="w-3.5 h-3.5 text-[#F59E0B]" />}>
              Thói quen
            </Button>
          </Link>
          <Link to="/moon">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#B2A2FA]" />}
            >
              Trợ lý Moon
            </Button>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Ba thẻ tổng quan: Nhiệm vụ, Mục tiêu, Thói quen        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Nhiệm vụ hôm nay */}
        <Card className="p-4 bg-[#191725] border border-[#282538] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#9CA3AF]">Nhiệm vụ hôm nay</div>
            <div className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
              <span>{completedTasks}/{totalTasks}</span>
              <span className="text-xs font-semibold text-[#10B981]">({completionRate}%)</span>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              {pendingTasks > 0 ? `Còn ${pendingTasks} việc cần làm` : 'Đã hoàn tất tất cả!'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#0E281F] border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        {/* Card 2: Mục tiêu đang thực hiện */}
        <Card className="p-4 bg-[#191725] border border-[#282538] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#9CA3AF]">Mục tiêu chiến lược</div>
            <div className="text-xl font-bold text-[#F3F4F6]">
              {goals.length} mục tiêu
            </div>
            <Link to="/goals" className="text-[11px] text-[#B2A2FA] hover:underline flex items-center gap-1">
              Xem tiến độ chi tiết &rarr;
            </Link>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1C1835] border border-[#7255F7]/30 flex items-center justify-center text-[#7255F7] shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </Card>

        {/* Card 3: Thói quen kỷ luật */}
        <Card className="p-4 bg-[#191725] border border-[#282538] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#9CA3AF]">Thói quen kỷ luật</div>
            <div className="text-xl font-bold text-[#F3F4F6]">
              {checkedHabitsCount}/{habits.length || 0}
            </div>
            <Link to="/habits" className="text-[11px] text-[#F59E0B] hover:underline flex items-center gap-1">
              Check-in chuỗi kỷ luật &rarr;
            </Link>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#2A1D0B] border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Overdue Warning Alert (chỉ hiển thị nếu có việc quá hạn thực tế) */}
      {overdueTasks.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#2A1515] border border-[#EF4444]/35 flex items-center justify-between text-xs text-[#F87171]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span>
              Bạn có <strong>{overdueTasks.length}</strong> công việc chưa xong từ các ngày trước.
            </span>
          </div>
          <Link
            to="/today"
            className="px-2.5 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-white font-semibold text-[11px] border border-[#EF4444]/40"
          >
            Sắp xếp lại &rarr;
          </Link>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3 & 4. Danh sách 3 Nhiệm Vụ Ưu Tiên & Tiến Độ Trong Ngày  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column (3 cols): Top 3 Nhiệm Vụ Ưu Tiên */}
        <Card className="lg:col-span-3 p-5 bg-[#191725] border border-[#282538]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#282538] mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#7255F7]/15 text-[#B2A2FA]">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F3F4F6] tracking-tight">
                  3 Nhiệm Vụ Ưu Tiên Hôm Nay
                </h3>
                <p className="text-xs text-[#9CA3AF]">Tập trung hoàn thành dứt điểm</p>
              </div>
            </div>

            <Link to="/today">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Xem tất cả ({totalTasks})
              </Button>
            </Link>
          </div>

          <div className="space-y-2.5">
            {priorityTasks.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-[#12101D] border border-dashed border-[#282538] text-[#9CA3AF] text-xs">
                Chưa có công việc nào cho hôm nay.
                <div className="mt-2.5">
                  <Link to="/today">
                    <Button variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Thêm công việc đầu tiên
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              priorityTasks.map((task) => {
                const isDone = task.status === 'completed'
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-[#12101D]/60 border-[#282538]/60 opacity-60'
                        : 'bg-[#12101D] border-[#282538] hover:border-[#7255F7]/40 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      {/* Round Green Checkmark Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        title={isDone ? 'Đánh dấu chưa xong' : 'Bấm hoàn thành'}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isDone
                            ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm'
                            : 'border-[#4B4562] hover:border-[#10B981] bg-[#191725]'
                        }`}
                      >
                        {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>

                      <div className="min-w-0">
                        <p
                          title={task.title}
                          className={`text-xs md:text-sm font-semibold leading-relaxed line-clamp-2 break-words ${
                            isDone ? 'line-through text-[#6B7280]' : 'text-[#F3F4F6]'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.goal && (
                          <span className="text-[10px] text-[#B2A2FA] flex items-center gap-1 mt-0.5 truncate">
                            <Target className="w-2.5 h-2.5 shrink-0" /> {task.goal.title}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.start_time && (
                        <span className="text-[11px] text-[#9CA3AF] font-mono bg-[#191725] px-2 py-0.5 rounded border border-[#282538]">
                          {task.start_time}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#7255F7]/15 text-[#B2A2FA] border border-[#7255F7]/30">
                        {task.category === 'work' ? 'Việc' : task.category === 'health' ? 'Khỏe' : 'Học'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Right Column (2 cols): 4. Tiến Độ Công Việc Trong Ngày */}
        <Card className="lg:col-span-2 p-5 bg-[#191725] border border-[#282538] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#282538] mb-4">
              <div className="p-1.5 rounded-lg bg-[#10B981]/15 text-[#10B981]">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F3F4F6] tracking-tight">
                  Tiến Độ Trong Ngày
                </h3>
                <p className="text-xs text-[#9CA3AF]">Theo dõi mức độ hoàn thành</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-[#F3F4F6]">{completionRate}%</span>
                  <span className="text-xs text-[#9CA3AF] ml-1.5 font-medium">đã hoàn thành</span>
                </div>
                <span className="text-xs font-mono text-[#9CA3AF]">
                  {completedTasks}/{totalTasks} việc
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-[#12101D] rounded-full overflow-hidden border border-[#282538]">
                <div
                  className="h-full bg-[#10B981] transition-all duration-300 rounded-full"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-[#12101D] border border-[#282538] space-y-0.5">
                  <div className="text-[11px] text-[#9CA3AF]">Đã hoàn thành</div>
                  <div className="text-base font-bold text-[#10B981]">{completedTasks}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#12101D] border border-[#282538] space-y-0.5">
                  <div className="text-[11px] text-[#9CA3AF]">Còn chờ xử lý</div>
                  <div className="text-base font-bold text-[#F3F4F6]">{pendingTasks}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#282538] mt-4">
            <Link
              to="/today"
              className="text-xs text-[#B2A2FA] hover:text-white font-medium flex items-center justify-between"
            >
              <span>Vào trang thực thi hôm nay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* 5. Kế Hoạch Tuần (Weekly Schedule Board)                 */}
      {/* ======================================================== */}
      <WeeklyScheduleBoard defaultView="all" />

      {/* ======================================================== */}
      {/* 6. Thông tin học tập và sức khỏe ở khu vực tiếp theo     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module Học Tập & Phát Triển */}
        <Card className="p-5 bg-[#191725] border border-[#282538]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#282538] mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#7255F7]/15 text-[#B2A2FA]">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F3F4F6] tracking-tight">Học Tập & Kỹ Năng</h3>
                <p className="text-xs text-[#9CA3AF]">Phát triển kiến thức liên tục</p>
              </div>
            </div>
            <Link to="/learning">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Xem lộ trình
              </Button>
            </Link>
          </div>

          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Duy trì tối thiểu 30-45 phút mỗi ngày để đọc tài liệu, thực hành code hoặc ghi chú kiến thức mới.
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <Link to="/learning">
              <Button variant="outline" size="sm" className="text-xs">
                Mở ghi chú học tập
              </Button>
            </Link>
          </div>
        </Card>

        {/* Module Sức Khỏe & Thể Chất */}
        <Card className="p-5 bg-[#191725] border border-[#282538]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#282538] mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#10B981]/15 text-[#34D399]">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F3F4F6] tracking-tight">Sức Khỏe & Cân Bằng</h3>
                <p className="text-xs text-[#9CA3AF]">Nền tảng của kỷ luật bền vững</p>
              </div>
            </div>
            <Link to="/health">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Xem nhật ký
              </Button>
            </Link>
          </div>

          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Cân bằng giữa công việc và phục hồi: uống đủ 2L nước, vận động thể chất và ngủ đủ 7-8 tiếng.
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <Link to="/health">
              <Button variant="outline" size="sm" className="text-xs">
                Theo dõi thể chất
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
