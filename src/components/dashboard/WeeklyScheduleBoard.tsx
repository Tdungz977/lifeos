import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  MapPin,
  Check,
  Plus,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Sunrise,
  Sun,
  Moon as MoonIcon,
  ArrowRight,
  BookOpen,
  Briefcase,
  Dumbbell,
  User,
  X,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { useAuth } from '@/context/AuthContext'
import {
  PeriodOfDay,
  DayOfWeekIndex,
  MoonWeeklyTask,
  DAY_NAMES,
  PERIOD_NAMES,
  generateDefaultCollegeSchedule,
  syncMoonTasksToSupabase,
} from '@/services/moonAssistantService'

const STORAGE_KEY = 'lifeos_moon_weekly_plan_v1'
const UPDATE_EVENT = 'moon_tasks_updated'

interface WeeklyScheduleBoardProps {
  className?: string
  defaultView?: 'all' | 'today'
}

export const WeeklyScheduleBoard: React.FC<WeeklyScheduleBoardProps> = ({
  className = '',
  defaultView = 'all',
}) => {
  const { user } = useAuth()
  const todayIdx = (new Date().getDay() === 0 ? 0 : (new Date().getDay() as DayOfWeekIndex))

  const [tasks, setTasks] = useState<MoonWeeklyTask[]>([])
  const [selectedDayTab, setSelectedDayTab] = useState<DayOfWeekIndex | 'all'>(
    defaultView === 'today' ? todayIdx : 'all'
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Quick Add Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTaskDay, setNewTaskDay] = useState<DayOfWeekIndex>(todayIdx)
  const [newTaskPeriod, setNewTaskPeriod] = useState<PeriodOfDay>('morning')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')
  const [newTaskLocation, setNewTaskLocation] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState<'study' | 'work' | 'personal' | 'health'>('study')

  // Calculate actual calendar dates for the current week (Monday to Sunday)
  const weekDates = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDay()
    const diffToMonday = (currentDay + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)

    const map: Record<number, { dayNum: number; monthNum: number; dateStr: string }> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dayIdx = ((i + 1) % 7) as DayOfWeekIndex
      const dayNum = d.getDate()
      const monthNum = d.getMonth() + 1
      map[dayIdx] = {
        dayNum,
        monthNum,
        dateStr: `${dayNum < 10 ? '0' : ''}${dayNum}/${monthNum < 10 ? '0' : ''}${monthNum}`,
      }
    }
    return map
  }, [])

  // Load tasks from localStorage
  const loadTasks = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed)
          return
        }
      }
    } catch (e) {
      console.warn('Failed to load moon tasks', e)
    }
    const defaults = generateDefaultCollegeSchedule()
    setTasks(defaults)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadTasks()

    const handleStorageChange = () => loadTasks()
    window.addEventListener(UPDATE_EVENT, handleStorageChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener(UPDATE_EVENT, handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [loadTasks])

  // Save and notify
  const updateAndPersistTasks = (updater: (prev: MoonWeeklyTask[]) => MoonWeeklyTask[]) => {
    setTasks((prev) => {
      const updated = updater(prev)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event(UPDATE_EVENT))
      } catch (e) {
        console.warn('Failed to save moon tasks', e)
      }
      return updated
    })
  }

  // Toggle completion with round green checkmark
  const toggleTaskCompletion = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()

    updateAndPersistTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.is_completed
          if (nextState) {
            confetti({
              particleCount: 25,
              spread: 45,
              origin: { y: 0.7 },
              colors: ['#10B981', '#34D399', '#7255F7'],
            })
          }
          return { ...t, is_completed: nextState }
        }
        return t
      })
    )
  }

  // Delete task
  const deleteTask = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    updateAndPersistTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // Create manual task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const newTask: MoonWeeklyTask = {
      id: `moon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day_index: newTaskDay,
      period: newTaskPeriod,
      title: newTaskTitle.trim(),
      time_range: newTaskTime.trim() || undefined,
      location: newTaskLocation.trim() || undefined,
      category: newTaskCategory,
      is_completed: false,
    }

    updateAndPersistTasks((prev) => [...prev, newTask])
    setNewTaskTitle('')
    setNewTaskTime('')
    setNewTaskLocation('')
    setShowAddModal(false)
  }

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    if (!user) {
      setSyncStatus({
        type: 'error',
        text: 'Vui lòng đăng nhập hoặc cấu hình Supabase để đồng bộ lên Cloud.',
      })
      return
    }

    setIsSyncing(true)
    setSyncStatus(null)

    const res = await syncMoonTasksToSupabase(tasks, user.id)
    setIsSyncing(false)

    if (res.success) {
      setSyncStatus({
        type: 'success',
        text: `Đã đồng bộ thành công ${res.count} công việc lên cơ sở dữ liệu Supabase!`,
      })
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
    } else {
      setSyncStatus({
        type: 'error',
        text: 'Có lỗi khi đồng bộ: ' + (res.error?.message || 'Kiểm tra cấu hình Supabase'),
      })
    }
  }

  const orderedDays: DayOfWeekIndex[] = [1, 2, 3, 4, 5, 6, 0]

  // Filter tasks based on view mode
  const currentViewTasks =
    selectedDayTab === 'all' ? tasks : tasks.filter((t) => t.day_index === selectedDayTab)
  const currentCompleted = currentViewTasks.filter((t) => t.is_completed).length
  const completionPercent =
    currentViewTasks.length > 0 ? Math.round((currentCompleted / currentViewTasks.length) * 100) : 0

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'work':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#93C5FD] bg-[#1E293B]/70 px-1.5 py-0.5 rounded border border-[#334155] font-medium">
            <Briefcase className="w-2.5 h-2.5" /> Việc
          </span>
        )
      case 'health':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#34D399] bg-[#0E281F]/70 px-1.5 py-0.5 rounded border border-[#10B981]/30 font-medium">
            <Dumbbell className="w-2.5 h-2.5" /> Khỏe
          </span>
        )
      case 'personal':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#C084FC] bg-[#2E1065]/60 px-1.5 py-0.5 rounded border border-[#7255F7]/30 font-medium">
            <User className="w-2.5 h-2.5" /> Cá nhân
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#B2A2FA] bg-[#191725] px-1.5 py-0.5 rounded border border-[#7255F7]/30 font-medium">
            <BookOpen className="w-2.5 h-2.5" /> Học tập
          </span>
        )
    }
  }

  return (
    <Card className={`p-4 sm:p-5 lg:p-6 bg-[#191725] border border-[#282538] rounded-2xl ${className}`}>
      {/* 1. Header Bar: SaaS Header with Clear Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#282538]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7255F7] flex items-center justify-center text-white shrink-0 shadow-sm shadow-[#7255F7]/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[#F3F4F6] tracking-tight">
                Kế Hoạch Tuần
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#7255F7]/15 text-[#B2A2FA] border border-[#7255F7]/30 font-medium">
                Sáng • Chiều • Tối
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Phân loại bởi <strong className="text-[#B2A2FA] font-semibold">Trợ lý Moon</strong> — Tích chọn hoàn thành từng nhiệm vụ.
            </p>
          </div>
        </div>

        {/* View Switchers & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented View Switcher */}
          <div className="p-0.5 rounded-xl bg-[#12101D] border border-[#282538] flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedDayTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDayTab === 'all'
                  ? 'bg-[#7255F7] text-white shadow-sm font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <span>Cả tuần</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDayTab(todayIdx)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDayTab === todayIdx
                  ? 'bg-[#7255F7] text-white shadow-sm font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <span>Hôm nay</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewTaskDay(selectedDayTab === 'all' ? todayIdx : selectedDayTab)
              setNewTaskPeriod('morning')
              setShowAddModal(true)
            }}
            leftIcon={<Plus className="w-3.5 h-3.5 text-[#10B981]" />}
            className="text-xs font-semibold h-8"
          >
            Thêm việc
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncToSupabase}
            isLoading={isSyncing}
            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            className="text-xs font-semibold h-8"
          >
            Đồng bộ Cloud
          </Button>

          <Link to="/moon">
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs font-semibold h-8 text-[#B2A2FA] hover:text-white"
            >
              Trợ lý Moon
            </Button>
          </Link>
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncStatus && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            syncStatus.type === 'success'
              ? 'bg-[#0E281F] border-[#10B981]/30 text-[#34D399]'
              : 'bg-[#2A1515] border-[#EF4444]/30 text-[#F87171]'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            )}
            <span>{syncStatus.text}</span>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-[#9CA3AF] hover:text-white p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Progress & Day Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-2">
        {/* Overall Completion Progress */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#9CA3AF]">
            Tiến độ:{' '}
            <strong className="text-[#10B981] font-bold">{currentCompleted}</strong>/{currentViewTasks.length} nhiệm vụ
          </span>
          <div className="w-24 sm:w-36 h-2 bg-[#12101D] rounded-full overflow-hidden border border-[#282538]">
            <div
              className="h-full bg-[#10B981] transition-all duration-300 rounded-full"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="font-mono text-[#9CA3AF] font-semibold">{completionPercent}%</span>
        </div>

        {/* Day Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDayTab('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedDayTab === 'all'
                ? 'bg-[#7255F7] text-white'
                : 'bg-[#12101D] border border-[#282538] text-[#9CA3AF] hover:text-white'
            }`}
          >
            Tất cả 7 ngày
          </button>

          {orderedDays.map((d) => {
            const isSelected = selectedDayTab === d
            const isToday = todayIdx === d
            const dateInfo = weekDates[d]
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDayTab(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#7255F7] text-white'
                    : 'bg-[#12101D] border border-[#282538] text-[#9CA3AF] hover:text-white'
                }`}
              >
                <span>{DAY_NAMES[d].short}</span>
                {dateInfo && (
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-[#6B7280]'}`}>
                    {dateInfo.dateStr}
                  </span>
                )}
                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Board Content */}
      <div className="pt-3">
        {selectedDayTab !== 'all' ? (
          /* ======================================================== */
          /* Single Day View: 3 Clean Columns (Sáng, Chiều, Tối)      */
          /* ======================================================== */
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-[#12101D] p-3 rounded-xl border border-[#282538]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#7255F7]/15 border border-[#7255F7]/30 flex items-center justify-center text-[#B2A2FA] font-bold text-xs">
                  {DAY_NAMES[selectedDayTab].short}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
                    {DAY_NAMES[selectedDayTab].full}
                    {weekDates[selectedDayTab] && (
                      <span className="text-[11px] font-mono text-[#9CA3AF]">
                        ({weekDates[selectedDayTab].dateStr})
                      </span>
                    )}
                    {todayIdx === selectedDayTab && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 font-bold uppercase">
                        Hôm nay
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayTab('all')}
                className="text-xs text-[#B2A2FA] hover:text-white font-medium cursor-pointer"
              >
                Xem lưới 7 ngày &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['morning', 'afternoon', 'evening'] as PeriodOfDay[]).map((period) => {
                const meta = PERIOD_NAMES[period]
                const periodTasks = tasks.filter(
                  (t) => t.day_index === selectedDayTab && t.period === period
                )

                return (
                  <div
                    key={period}
                    className="rounded-xl bg-[#12101D] border border-[#282538] p-3 flex flex-col space-y-2.5"
                  >
                    {/* Period Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#282538] text-xs font-bold text-[#F3F4F6]">
                      <span className="flex items-center gap-1.5">
                        {period === 'morning' && <Sunrise className="w-3.5 h-3.5 text-[#F59E0B]" />}
                        {period === 'afternoon' && <Sun className="w-3.5 h-3.5 text-[#38BDF8]" />}
                        {period === 'evening' && <MoonIcon className="w-3.5 h-3.5 text-[#B2A2FA]" />}
                        Buổi {meta.label}
                      </span>
                      <span className="text-[11px] font-mono text-[#9CA3AF]">{meta.timeHint}</span>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-2 min-h-[120px] flex-1">
                      {periodTasks.length === 0 ? (
                        <div className="py-6 text-center rounded-lg border border-dashed border-[#282538]">
                          <span className="text-xs text-[#6B7280] italic">Trống</span>
                        </div>
                      ) : (
                        periodTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`group relative flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                              task.is_completed
                                ? 'bg-[#191725]/50 border-[#282538]/60 opacity-60'
                                : 'bg-[#191725] border-[#282538] hover:border-[#7255F7]/40 shadow-sm'
                            }`}
                          >
                            {/* Round Green Checkmark */}
                            <button
                              type="button"
                              onClick={(e) => toggleTaskCompletion(task.id, e)}
                              title={task.is_completed ? 'Đánh dấu chưa xong' : 'Bấm hoàn thành'}
                              className={`shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                task.is_completed
                                  ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm'
                                  : 'border-[#4B4562] hover:border-[#10B981] bg-[#12101D]'
                              }`}
                            >
                              {task.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div className="flex-1 min-w-0 pr-4">
                              <h4
                                title={task.title}
                                className={`text-xs font-semibold leading-relaxed line-clamp-2 break-words ${
                                  task.is_completed
                                    ? 'line-through text-[#6B7280]'
                                    : 'text-[#F3F4F6]'
                                }`}
                              >
                                {task.title}
                              </h4>

                              {(task.time_range || task.location) && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-[#9CA3AF]">
                                  {task.time_range && (
                                    <span className="inline-flex items-center gap-1 font-mono">
                                      <Clock className="w-3 h-3 text-[#9CA3AF]" />
                                      {task.time_range}
                                    </span>
                                  )}
                                  {task.location && (
                                    <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
                                      <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                                      {task.location}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => deleteTask(task.id, e)}
                              title="Xóa việc"
                              className="absolute top-2 right-2 p-1 rounded text-[#6B7280] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Inline Add */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskDay(selectedDayTab as DayOfWeekIndex)
                        setNewTaskPeriod(period)
                        setShowAddModal(true)
                      }}
                      className="w-full py-1.5 rounded-lg border border-dashed border-[#282538] hover:border-[#7255F7]/40 text-xs font-medium text-[#9CA3AF] hover:text-[#B2A2FA] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm việc</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 7-Day Week Matrix: Clean 7-Column Layout                 */
          /* ======================================================== */
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="grid grid-cols-7 gap-2.5 min-w-[880px] lg:min-w-0">
              {orderedDays.map((dayIdx) => {
                const dayTasks = tasks.filter((t) => t.day_index === dayIdx)
                const dayCompleted = dayTasks.filter((t) => t.is_completed).length
                const isToday = todayIdx === dayIdx
                const dateInfo = weekDates[dayIdx]
                const dayPercent = dayTasks.length > 0 ? Math.round((dayCompleted / dayTasks.length) * 100) : 0

                return (
                  <div
                    key={dayIdx}
                    className={`flex flex-col rounded-xl bg-[#12101D] border ${
                      isToday
                        ? 'border-[#7255F7] ring-1 ring-[#7255F7]/40'
                        : 'border-[#282538]'
                    } overflow-hidden`}
                  >
                    {/* Day Column Header */}
                    <div
                      className={`px-2.5 py-2 border-b border-[#282538] flex items-center justify-between ${
                        isToday ? 'bg-[#7255F7]/10' : 'bg-[#151222]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-[#F3F4F6] truncate">
                            {DAY_NAMES[dayIdx].short}
                          </span>
                          {dateInfo && (
                            <span className="text-[10px] font-mono text-[#9CA3AF]">
                              {dateInfo.dateStr}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isToday && (
                            <span className="px-1 py-0.2 rounded text-[8px] bg-[#10B981] text-white font-extrabold uppercase">
                              Nay
                            </span>
                          )}
                          <span className="text-[10px] text-[#9CA3AF] font-mono">
                            {dayCompleted}/{dayTasks.length}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setNewTaskDay(dayIdx)
                          setNewTaskPeriod('morning')
                          setShowAddModal(true)
                        }}
                        title="Thêm nhiệm vụ"
                        className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-[#282538] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Day Slots */}
                    <div className="p-2 space-y-2 flex-1 flex flex-col">
                      {(['morning', 'afternoon', 'evening'] as PeriodOfDay[]).map((period) => {
                        const meta = PERIOD_NAMES[period]
                        const periodTasks = dayTasks.filter((t) => t.period === period)

                        return (
                          <div key={period} className="space-y-1 flex-1">
                            {/* Session Tag */}
                            <div className="flex items-center justify-between text-[10px] font-semibold text-[#9CA3AF] px-1">
                              <span className="flex items-center gap-1">
                                {period === 'morning' && <Sunrise className="w-2.5 h-2.5 text-[#F59E0B]" />}
                                {period === 'afternoon' && <Sun className="w-2.5 h-2.5 text-[#38BDF8]" />}
                                {period === 'evening' && <MoonIcon className="w-2.5 h-2.5 text-[#B2A2FA]" />}
                                {meta.label}
                              </span>
                            </div>

                            {/* Task Cards */}
                            <div className="space-y-1.5 min-h-[44px]">
                              {periodTasks.length === 0 ? (
                                <div className="py-2 text-center rounded border border-dashed border-[#282538]/60">
                                  <span className="text-[9px] text-[#6B7280] italic">Trống</span>
                                </div>
                              ) : (
                                periodTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className={`group relative flex items-start gap-2 p-2 rounded-lg border transition-all ${
                                      task.is_completed
                                        ? 'bg-[#191725]/50 border-[#282538]/60 opacity-60'
                                        : 'bg-[#191725] border-[#282538] hover:border-[#7255F7]/40 shadow-sm'
                                    }`}
                                  >
                                    {/* Round Green Checkmark */}
                                    <button
                                      type="button"
                                      onClick={(e) => toggleTaskCompletion(task.id, e)}
                                      title={task.is_completed ? 'Đánh dấu chưa xong' : 'Bấm hoàn thành'}
                                      className={`shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                        task.is_completed
                                          ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm'
                                          : 'border-[#4B4562] hover:border-[#10B981] bg-[#12101D]'
                                      }`}
                                    >
                                      {task.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
                                    </button>

                                    <div className="flex-1 min-w-0 pr-3">
                                      <h4
                                        title={task.title}
                                        className={`text-xs font-medium leading-relaxed line-clamp-2 break-words ${
                                          task.is_completed
                                            ? 'line-through text-[#6B7280]'
                                            : 'text-[#F3F4F6]'
                                        }`}
                                      >
                                        {task.title}
                                      </h4>

                                      {task.time_range && (
                                        <div className="mt-0.5 text-[9px] font-mono text-[#9CA3AF]">
                                          {task.time_range.split(' - ')[0]}
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => deleteTask(task.id, e)}
                                      title="Xóa việc"
                                      className="absolute top-1 right-1 p-0.5 rounded text-[#6B7280] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#191725] border border-[#282538] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#282538]">
              <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#10B981]" />
                Thêm nhiệm vụ vào kế hoạch tuần
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#9CA3AF] hover:text-white p-1 rounded-lg hover:bg-[#282538]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#F3F4F6] block mb-1">
                  Tên nhiệm vụ / Môn học *
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="VD: Toán Giải Tích, Báo cáo tiến độ..."
                  className="w-full px-3 py-2 rounded-xl bg-[#12101D] border border-[#282538] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#F3F4F6] block mb-1">
                    Thứ trong tuần
                  </label>
                  <select
                    value={newTaskDay}
                    onChange={(e) => setNewTaskDay(Number(e.target.value) as DayOfWeekIndex)}
                    className="w-full px-3 py-2 rounded-xl bg-[#12101D] border border-[#282538] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                  >
                    {orderedDays.map((d) => (
                      <option key={d} value={d}>
                        {DAY_NAMES[d].full}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#F3F4F6] block mb-1">
                    Buổi trong ngày
                  </label>
                  <select
                    value={newTaskPeriod}
                    onChange={(e) => setNewTaskPeriod(e.target.value as PeriodOfDay)}
                    className="w-full px-3 py-2 rounded-xl bg-[#12101D] border border-[#282538] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                  >
                    <option value="morning">Sáng (06:00 - 12:00)</option>
                    <option value="afternoon">Chiều (12:00 - 18:00)</option>
                    <option value="evening">Tối (18:00 - 23:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#F3F4F6] block mb-1">
                    Khung giờ (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    placeholder="VD: 07:30 - 11:00"
                    className="w-full px-3 py-2 rounded-xl bg-[#12101D] border border-[#282538] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#F3F4F6] block mb-1">
                    Địa điểm / Phòng
                  </label>
                  <input
                    type="text"
                    value={newTaskLocation}
                    onChange={(e) => setNewTaskLocation(e.target.value)}
                    placeholder="VD: Phòng A201, Zoom..."
                    className="w-full px-3 py-2 rounded-xl bg-[#12101D] border border-[#282538] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#F3F4F6] block mb-1">
                  Nhóm phân loại
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'study', label: 'Học tập' },
                      { id: 'work', label: 'Công việc' },
                      { id: 'health', label: 'Sức khỏe' },
                      { id: 'personal', label: 'Cá nhân' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewTaskCategory(cat.id)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        newTaskCategory === cat.id
                          ? 'bg-[#7255F7] border-[#7255F7] text-white shadow-sm'
                          : 'bg-[#12101D] border-[#282538] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#282538]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-semibold px-4">
                  Thêm vào kế hoạch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
