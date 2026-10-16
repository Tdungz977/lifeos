import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Bot,
  Send,
  Calendar,
  Clock,
  MapPin,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  Sunrise,
  Sun,
  Moon as MoonIcon,
  BookOpen,
  Briefcase,
  Dumbbell,
  User,
  Filter,
  CheckSquare,
  AlertCircle,
  X,
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
  parseScheduleText,
  generateDefaultCollegeSchedule,
  generateCompanyWorkSchedule,
  syncMoonTasksToSupabase,
} from '@/services/moonAssistantService'

const STORAGE_KEY = 'lifeos_moon_weekly_plan_v1'

export const MoonAssistantPage: React.FC = () => {
  const { user } = useAuth()

  // State
  const [inputText, setInputText] = useState('')
  const [tasks, setTasks] = useState<MoonWeeklyTask[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedFilterPeriod, setSelectedFilterPeriod] = useState<PeriodOfDay | 'all'>('all')
  const [selectedDayTab, setSelectedDayTab] = useState<DayOfWeekIndex | 'all'>('all')

  // Modal for quick manual task addition
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTaskDay, setNewTaskDay] = useState<DayOfWeekIndex>(1)
  const [newTaskPeriod, setNewTaskPeriod] = useState<PeriodOfDay>('morning')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')
  const [newTaskLocation, setNewTaskLocation] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState<'study' | 'work' | 'personal' | 'health'>('study')

  // Load saved plan from localStorage or init with college template
  useEffect(() => {
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
      console.warn('Failed to load moon tasks from localStorage', e)
    }

    // Default template
    const defaultPlan = generateDefaultCollegeSchedule()
    setTasks(defaultPlan)
  }, [])

  // Save to localStorage on change and broadcast update
  useEffect(() => {
    if (tasks.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
        window.dispatchEvent(new Event('moon_tasks_updated'))
      } catch (e) {
        console.warn('Failed to save moon tasks to localStorage', e)
      }
    }
  }, [tasks])

  // Parse input from user
  const handleGeneratePlan = () => {
    if (!inputText.trim()) return

    setIsProcessing(true)
    setTimeout(() => {
      const parsedTasks = parseScheduleText(inputText)
      setTasks(parsedTasks)
      setIsProcessing(false)
      setInputText('')
      setSyncMessage({
        type: 'success',
        text: `Moon đã xử lý lịch của bạn thành ${parsedTasks.length} nhiệm vụ chia đều Sáng - Chiều - Tối!`,
      })
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      })
    }, 450)
  }

  // Load pre-made templates
  const handleLoadCollegeTemplate = () => {
    const list = generateDefaultCollegeSchedule()
    setTasks(list)
    setSyncMessage({ type: 'success', text: 'Đã nạp Thời khóa biểu Đại học mẫu!' })
  }

  const handleLoadWorkTemplate = () => {
    const list = generateCompanyWorkSchedule()
    setTasks(list)
    setSyncMessage({ type: 'success', text: 'Đã nạp Lịch làm việc Công ty mẫu!' })
  }

  // Toggle completion with green checkmark button
  const toggleTaskCompletion = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.is_completed
          if (nextState) {
            // Trigger micro celebration confetti
            confetti({
              particleCount: 25,
              spread: 45,
              origin: { y: 0.8 },
              colors: ['#10b981', '#34d399', '#6ee7b7'],
            })
          }
          return { ...t, is_completed: nextState }
        }
        return t
      })
    )
  }

  // Delete a task
  const deleteTask = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // Add custom task
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

    setTasks((prev) => [...prev, newTask])
    setNewTaskTitle('')
    setNewTaskTime('')
    setNewTaskLocation('')
    setShowAddModal(false)
  }

  // Sync to real Supabase database
  const handleSyncToSupabase = async () => {
    if (!user) {
      setSyncMessage({ type: 'error', text: 'Bạn cần đăng nhập để đồng bộ vào cơ sở dữ liệu Supabase!' })
      return
    }

    setIsSyncing(true)
    setSyncMessage(null)

    const res = await syncMoonTasksToSupabase(tasks, user.id)

    setIsSyncing(false)
    if (res.success) {
      setSyncMessage({
        type: 'success',
        text: `Đã đồng bộ thành công ${res.count} nhiệm vụ vào danh sách việc hôm nay & lịch LIFEOS!`,
      })
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      })
    } else {
      setSyncMessage({
        type: 'error',
        text: 'Có lỗi khi đồng bộ: ' + (res.error?.message || 'Vui lòng kiểm tra lại kết nối Supabase'),
      })
    }
  }

  // Statistics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.is_completed).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const morningCount = tasks.filter((t) => t.period === 'morning').length
  const afternoonCount = tasks.filter((t) => t.period === 'afternoon').length
  const eveningCount = tasks.filter((t) => t.period === 'evening').length

  // Days order: Thứ 2 (1) to Chủ Nhật (0)
  const orderedDays: DayOfWeekIndex[] = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Moon AI Persona Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-6 md:p-8 shadow-2xl shadow-indigo-950/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-900/50 border border-white/20">
                <MoonIcon className="w-9 h-9 text-white animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Trợ lý AI Moon
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium">
                    AI Calendar Coach
                  </span>
                </h1>
              </div>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                Xin chào! Tôi là <strong className="text-indigo-300 font-semibold">Moon</strong>. Bạn chỉ cần gửi thời khóa biểu học tập hoặc lịch làm việc ca công ty, tôi sẽ tự động phân loại thành bảng kế hoạch tuần <span className="text-amber-300 font-medium">Sáng</span> • <span className="text-blue-300 font-medium">Chiều</span> • <span className="text-indigo-300 font-medium">Tối</span> kèm nút tròn tích xanh tiện lợi!
              </p>
            </div>
          </div>

          {/* Quick Action Sync */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewTaskDay(1)
                setNewTaskPeriod('morning')
                setShowAddModal(true)
              }}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs font-semibold"
            >
              Thêm việc lẻ
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSyncToSupabase}
              isLoading={isSyncing}
              leftIcon={<UploadCloud className="w-4 h-4" />}
              className="text-xs font-bold shadow-lg shadow-indigo-950/60 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
            >
              Đồng bộ vào LIFEOS
            </Button>
          </div>
        </div>

        {/* Sync message alert banner */}
        {syncMessage && (
          <div
            className={`mt-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs md:text-sm ${
              syncMessage.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{syncMessage.text}</span>
            </div>
            <button
              onClick={() => setSyncMessage(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Input Schedule Box with Moon */}
      <Card className="p-5 md:p-6 border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              Gửi bảng lịch học hoặc lịch làm việc cho Moon:
            </label>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Chọn mẫu nhanh:</span>
              <button
                type="button"
                onClick={handleLoadCollegeTemplate}
                className="px-2.5 py-1 rounded-lg bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 hover:bg-indigo-900/50 hover:text-white transition-colors"
              >
                🎓 Đại học
              </button>
              <button
                type="button"
                onClick={handleLoadWorkTemplate}
                className="px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 hover:text-white transition-colors"
              >
                💼 Ca công ty
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Dán nội dung thời khóa biểu hoặc lịch làm việc tại đây...\nVí dụ:\nThứ 2: Sáng Toán Giải Tích 07:30 - 11:00 P.A201; Chiều Lập Trình Cơ Sở 13:30 - 16:30 Lab 3; Tối Ôn bài tập\nThứ 3: Sáng Tiếng Anh 08:00 - 11:30 P.B104; Chiều nghỉ; Tối Tập Gym 18:00 - 19:30\nThứ 4: Sáng Cấu Trúc Dữ Liệu 07:30 - 11:30; Chiều Part-time 13:30 - 17:30; Tối Họp nhóm 20h`}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Moon nhận diện tự động thứ trong tuần, buổi (sáng/chiều/tối), giờ giấc và phòng/địa điểm.
            </p>
            <Button
              variant="primary"
              onClick={handleGeneratePlan}
              isLoading={isProcessing}
              disabled={!inputText.trim()}
              leftIcon={<Send className="w-4 h-4" />}
              className="w-full sm:w-auto font-bold px-6 shadow-md shadow-indigo-900/40"
            >
              Moon ơi, tạo kế hoạch tuần!
            </Button>
          </div>
        </div>
      </Card>

      {/* Weekly Progress & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Total & Completed */}
        <Card className="p-4 bg-slate-900/60 border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-400">Tiến độ hoàn thành tuần</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white">{completedTasks}</span>
              <span className="text-xs text-slate-400 font-medium">/ {totalTasks} nhiệm vụ</span>
              <span className="text-xs font-bold text-emerald-400 ml-auto">{completionRate}%</span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Metric 2: Morning Session Count */}
        <button
          onClick={() => setSelectedFilterPeriod(selectedFilterPeriod === 'morning' ? 'all' : 'morning')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedFilterPeriod === 'morning'
              ? 'bg-amber-950/40 border-amber-500/60 ring-2 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <Sunrise className="w-4 h-4" />
              Buổi Sáng
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              {morningCount}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">06:00 - 12:00</p>
          <p className="text-[11px] text-slate-500 mt-1">Bấm để lọc nhiệm vụ buổi sáng</p>
        </button>

        {/* Metric 3: Afternoon Session Count */}
        <button
          onClick={() => setSelectedFilterPeriod(selectedFilterPeriod === 'afternoon' ? 'all' : 'afternoon')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedFilterPeriod === 'afternoon'
              ? 'bg-blue-950/40 border-blue-500/60 ring-2 ring-blue-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
              <Sun className="w-4 h-4" />
              Buổi Chiều
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
              {afternoonCount}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">12:00 - 18:00</p>
          <p className="text-[11px] text-slate-500 mt-1">Bấm để lọc nhiệm vụ buổi chiều</p>
        </button>

        {/* Metric 4: Evening Session Count */}
        <button
          onClick={() => setSelectedFilterPeriod(selectedFilterPeriod === 'evening' ? 'all' : 'evening')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedFilterPeriod === 'evening'
              ? 'bg-indigo-950/40 border-indigo-500/60 ring-2 ring-indigo-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
              <MoonIcon className="w-4 h-4" />
              Buổi Tối
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
              {eveningCount}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">18:00 - 23:00</p>
          <p className="text-[11px] text-slate-500 mt-1">Bấm để lọc nhiệm vụ buổi tối</p>
        </button>
      </div>

      {/* Filter Tabs for Day selection on mobile / tablet */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedDayTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDayTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Cả tuần (7 ngày)
          </button>
          {orderedDays.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDayTab(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDayTab === d
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {DAY_NAMES[d].full}
            </button>
          ))}
        </div>

        {selectedFilterPeriod !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFilterPeriod('all')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Hủy lọc buổi ({PERIOD_NAMES[selectedFilterPeriod].label}) ✕
          </Button>
        )}
      </div>

      {/* Main Weekly Schedule Grid (Bảng kế hoạch tuần Sáng - Chiều - Tối) */}
      <div
        className={`grid gap-4 ${
          selectedDayTab === 'all'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-7'
            : 'grid-cols-1 max-w-2xl mx-auto'
        }`}
      >
        {orderedDays
          .filter((d) => selectedDayTab === 'all' || selectedDayTab === d)
          .map((dayIdx) => {
            const dayTasks = tasks.filter((t) => t.day_index === dayIdx)
            const dayCompleted = dayTasks.filter((t) => t.is_completed).length
            const isToday =
              (new Date().getDay() === 0 ? 0 : (new Date().getDay() as DayOfWeekIndex)) === dayIdx

            return (
              <div
                key={dayIdx}
                className={`flex flex-col rounded-2xl bg-slate-900/70 border ${
                  isToday
                    ? 'border-indigo-500/60 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                    : 'border-slate-800/90'
                } overflow-hidden`}
              >
                {/* Column Day Header */}
                <div
                  className={`p-3.5 border-b flex items-center justify-between ${
                    isToday
                      ? 'bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900 border-indigo-500/40'
                      : 'bg-slate-950/50 border-slate-800/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-white">{DAY_NAMES[dayIdx].full}</span>
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500 text-white font-bold uppercase tracking-wider">
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {dayCompleted}/{dayTasks.length} việc xong
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setNewTaskDay(dayIdx)
                      setNewTaskPeriod('morning')
                      setShowAddModal(true)
                    }}
                    title="Thêm nhiệm vụ mới vào ngày này"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Body with 3 Distinct Slots: Sáng, Chiều, Tối */}
                <div className="p-2.5 space-y-3 flex-1 flex flex-col">
                  {(['morning', 'afternoon', 'evening'] as PeriodOfDay[])
                    .filter((p) => selectedFilterPeriod === 'all' || selectedFilterPeriod === p)
                    .map((period) => {
                      const periodMeta = PERIOD_NAMES[period]
                      const periodTasks = dayTasks.filter((t) => t.period === period)

                      return (
                        <div key={period} className="space-y-1.5 flex-1">
                          {/* Slot Header Banner */}
                          <div
                            className={`flex items-center justify-between px-2.5 py-1 rounded-lg border bg-gradient-to-r ${periodMeta.color} text-[11px] font-bold tracking-tight`}
                          >
                            <span className="flex items-center gap-1.5">
                              {period === 'morning' && <Sunrise className="w-3.5 h-3.5" />}
                              {period === 'afternoon' && <Sun className="w-3.5 h-3.5" />}
                              {period === 'evening' && <MoonIcon className="w-3.5 h-3.5" />}
                              {periodMeta.label}
                            </span>
                            <span className="text-[10px] opacity-80 font-mono">{periodMeta.timeHint}</span>
                          </div>

                          {/* List of Tasks in this Period */}
                          <div className="space-y-1.5 min-h-[48px]">
                            {periodTasks.length === 0 ? (
                              <div className="py-2 text-center border border-dashed border-slate-800/60 rounded-xl">
                                <span className="text-[11px] text-slate-500 italic">Trống</span>
                              </div>
                            ) : (
                              periodTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl border transition-all duration-200 ${
                                    task.is_completed
                                      ? 'bg-slate-950/40 border-slate-800/50 opacity-70'
                                      : 'bg-slate-900/90 border-slate-700/60 hover:border-slate-600 shadow-sm'
                                  }`}
                                >
                                  {/* THE CRITICAL USER FEATURE: Round Button with Green Checkmark */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleTaskCompletion(task.id, e)}
                                    title={task.is_completed ? 'Đánh dấu chưa hoàn thành' : 'Bấm tích xanh hoàn thành'}
                                    className={`shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                      task.is_completed
                                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/50 scale-105'
                                        : 'border-slate-500/80 hover:border-emerald-400 bg-slate-950/80 hover:bg-emerald-500/10'
                                    }`}
                                  >
                                    {task.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>

                                  {/* Task Info Content */}
                                  <div className="flex-1 min-w-0 pr-5">
                                    <h4
                                      className={`text-xs font-semibold leading-snug break-words transition-colors ${
                                        task.is_completed
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-100 group-hover:text-white'
                                      }`}
                                    >
                                      {task.title}
                                    </h4>

                                    {/* Meta pills: Time & Location */}
                                    {(task.time_range || task.location) && (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                                        {task.time_range && (
                                          <span className="inline-flex items-center gap-1 text-slate-400 font-mono">
                                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                                            {task.time_range}
                                          </span>
                                        )}
                                        {task.location && (
                                          <span className="inline-flex items-center gap-1 text-slate-400 truncate max-w-[120px]">
                                            <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                            {task.location}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Delete Task Button (appears on hover) */}
                                  <button
                                    type="button"
                                    onClick={(e) => deleteTask(task.id, e)}
                                    title="Xóa nhiệm vụ này"
                                    className="absolute top-2 right-2 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Thêm nhiệm vụ vào kế hoạch tuần
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tên môn học / Nhiệm vụ công việc *
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="VD: Toán Cao Cấp, Họp dự án, Đi tập Gym..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Ngày trong tuần
                  </label>
                  <select
                    value={newTaskDay}
                    onChange={(e) => setNewTaskDay(Number(e.target.value) as DayOfWeekIndex)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {orderedDays.map((d) => (
                      <option key={d} value={d}>
                        {DAY_NAMES[d].full}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Buổi trong ngày
                  </label>
                  <select
                    value={newTaskPeriod}
                    onChange={(e) => setNewTaskPeriod(e.target.value as PeriodOfDay)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="morning">Sáng (06:00 - 12:00)</option>
                    <option value="afternoon">Chiều (12:00 - 18:00)</option>
                    <option value="evening">Tối (18:00 - 23:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Khung giờ (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    placeholder="VD: 07:30 - 11:00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Địa điểm / Phòng
                  </label>
                  <input
                    type="text"
                    value={newTaskLocation}
                    onChange={(e) => setNewTaskLocation(e.target.value)}
                    placeholder="VD: Phòng A201, Online..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Lĩnh vực
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'study', label: 'Học tập', icon: BookOpen },
                    { id: 'work', label: 'Công việc', icon: Briefcase },
                    { id: 'health', label: 'Sức khỏe', icon: Dumbbell },
                    { id: 'personal', label: 'Cá nhân', icon: User },
                  ].map((cat) => {
                    const CatIcon = cat.icon
                    const isSelected = newTaskCategory === cat.id
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setNewTaskCategory(cat.id as any)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CatIcon className="w-4 h-4 mb-1" />
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold px-4">
                  Thêm vào lịch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
