import React, { useState } from 'react'
import {
  CheckSquare,
  Target,
  Flame,
  GraduationCap,
  Check,
  Briefcase,
  Wallet,
  HeartPulse,
  Sparkles,
  Users,
  Calendar,
  CalendarDays,
  Flag,
  Sliders,
  Plus,
} from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { GOAL_CATEGORIES, TASK_PRIORITIES } from '@/lib/constants'
import { createTask } from '@/services/taskService'
import { createGoal } from '@/services/goalService'
import { getLocalHabits, saveLocalHabits } from '@/services/habitService'

// Helpers for quick target date presets
const getEndOfWeekDate = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 0 : 7 - day
  const target = new Date(now)
  target.setDate(now.getDate() + diff)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getEndOfMonthDate = () => {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getEndOfQuarterDate = () => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const quarterEndMonth = Math.floor(currentMonth / 3) * 3 + 3
  const target = new Date(now.getFullYear(), quarterEndMonth, 0)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getThreeMonthsDate = () => {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getEndOfYearDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-12-31`
}

const CATEGORY_ITEMS = [
  {
    value: 'finance',
    label: 'Tài chính cá nhân',
    icon: Wallet,
    color: 'emerald',
    activeClass:
      'border-emerald-500 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-500/10',
    iconClass: 'text-emerald-400',
  },
  {
    value: 'career',
    label: 'Sự nghiệp & Việc làm',
    icon: Briefcase,
    color: 'blue',
    activeClass:
      'border-blue-500 bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/40 shadow-sm shadow-blue-500/10',
    iconClass: 'text-blue-400',
  },
  {
    value: 'health',
    label: 'Sức khỏe & Thể chất',
    icon: HeartPulse,
    color: 'rose',
    activeClass:
      'border-rose-500 bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40 shadow-sm shadow-rose-500/10',
    iconClass: 'text-rose-400',
  },
  {
    value: 'education',
    label: 'Học tập & Kỹ năng',
    icon: GraduationCap,
    color: 'indigo',
    activeClass:
      'border-indigo-500 bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40 shadow-sm shadow-indigo-500/10',
    iconClass: 'text-indigo-400',
  },
  {
    value: 'personal',
    label: 'Phát triển bản thân',
    icon: Sparkles,
    color: 'amber',
    activeClass:
      'border-amber-500 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40 shadow-sm shadow-amber-500/10',
    iconClass: 'text-amber-400',
  },
  {
    value: 'relationships',
    label: 'Mối quan hệ & Đời sống',
    icon: Users,
    color: 'purple',
    activeClass:
      'border-purple-500 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/40 shadow-sm shadow-purple-500/10',
    iconClass: 'text-purple-400',
  },
]

const GOAL_CYCLE_ITEMS = [
  { value: 'weekly', label: 'Tuần', icon: Calendar },
  { value: 'monthly', label: 'Tháng', icon: CalendarDays },
  { value: 'quarterly', label: 'Quý', icon: Target },
  { value: 'yearly', label: 'Năm', icon: Flag },
]

const PRIORITY_ITEMS = [
  {
    value: 'low',
    label: 'Thấp',
    dot: 'bg-slate-400',
    activeClass: 'border-slate-500 bg-slate-800 text-slate-200 ring-1 ring-slate-500/40',
  },
  {
    value: 'medium',
    label: 'Trung bình',
    dot: 'bg-blue-400',
    activeClass: 'border-blue-500 bg-blue-950/70 text-blue-300 ring-1 ring-blue-500/40',
  },
  {
    value: 'high',
    label: 'Cao',
    dot: 'bg-amber-400',
    activeClass: 'border-amber-500 bg-amber-950/70 text-amber-300 ring-1 ring-amber-500/40',
  },
  {
    value: 'urgent',
    label: 'Khẩn cấp',
    dot: 'bg-rose-500',
    activeClass: 'border-rose-500 bg-rose-950/70 text-rose-300 ring-1 ring-rose-500/40',
  },
]

const QUICK_UNITS = ['%', 'triệu VNĐ', 'VNĐ', 'cuốn', 'km', 'giờ', 'chiếc', 'ngày']

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  onItemAdded?: () => void
}

type TabType = 'task' | 'goal' | 'habit' | 'learning'

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onItemAdded }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('task')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Task state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0])
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskCategory, setTaskCategory] = useState('general')
  const [taskDuration, setTaskDuration] = useState('30')

  // Goal state
  const [goalTitle, setGoalTitle] = useState('')
  const [goalCategory, setGoalCategory] = useState('finance')
  const [goalTargetDate, setGoalTargetDate] = useState('')
  const [goalType, setGoalType] = useState('quarterly')
  const [goalPriority, setGoalPriority] = useState('high')
  const [goalTargetValue, setGoalTargetValue] = useState('100')
  const [goalUnit, setGoalUnit] = useState('%')

  // Habit state
  const [habitName, setHabitName] = useState('')
  const [habitCategory, setHabitCategory] = useState('health')
  const [habitFrequency, setHabitFrequency] = useState('daily')

  // Learning state
  const [subjectName, setSubjectName] = useState('')
  const [subjectCategory, setSubjectCategory] = useState('programming')
  const [subjectOutcome, setSubjectOutcome] = useState('')

  const resetForm = () => {
    setTaskTitle('')
    setGoalTitle('')
    setGoalTargetDate('')
    setGoalTargetValue('100')
    setGoalUnit('%')
    setHabitName('')
    setSubjectName('')
    setSubjectOutcome('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const activeUserId = user?.id || 'local-warrior-1'

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (activeTab === 'task') {
        if (!taskTitle.trim()) throw new Error('Vui lòng nhập tên công việc')
        await createTask({
          user_id: activeUserId,
          title: taskTitle.trim(),
          due_date: taskDueDate,
          priority: taskPriority as any,
          category: taskCategory,
          estimated_duration: parseInt(taskDuration) || 30,
          status: 'pending',
          is_priority: false,
        })
        setSuccessMsg('Đã tạo công việc thành công!')
      } else if (activeTab === 'goal') {
        if (!goalTitle.trim()) throw new Error('Vui lòng nhập tên mục tiêu')
        await createGoal({
          user_id: activeUserId,
          title: goalTitle.trim(),
          category: goalCategory,
          target_date: goalTargetDate || null,
          goal_type: goalType as any,
          priority: goalPriority as any,
          current_value: 0,
          target_value: Number(goalTargetValue) || 100,
          unit: goalUnit.trim() || '%',
          status: 'in_progress',
          start_date: new Date().toISOString().split('T')[0],
          is_archived: false,
        })
        setSuccessMsg('Đã tạo mục tiêu thành công!')
      } else if (activeTab === 'habit') {
        if (!habitName.trim()) throw new Error('Vui lòng nhập tên thói quen')
        const now = new Date().toISOString()
        const habitId = crypto.randomUUID()
        const payload = {
          id: habitId,
          user_id: activeUserId,
          name: habitName.trim(),
          description: null,
          category: habitCategory,
          frequency: habitFrequency as any,
          schedule_days: [0, 1, 2, 3, 4, 5, 6],
          target_per_day: 1,
          start_date: now.split('T')[0],
          is_active: true,
          created_at: now,
          updated_at: now,
        }
        const localHabits = getLocalHabits(activeUserId)
        saveLocalHabits(activeUserId, [payload, ...localHabits])

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('habits').insert(payload)
          } catch (e) {
            console.warn('Supabase insert habit failed:', e)
          }
        }
        setSuccessMsg('Đã tạo thói quen thành công!')
      } else if (activeTab === 'learning') {
        if (!subjectName.trim()) throw new Error('Vui lòng nhập môn học/kỹ năng')
        const now = new Date().toISOString()
        const subjectId = crypto.randomUUID()
        const payload = {
          id: subjectId,
          user_id: activeUserId,
          name: subjectName.trim(),
          category: subjectCategory,
          target_outcome: subjectOutcome.trim() || null,
          progress: 0,
          resource_urls: [],
          is_archived: false,
          created_at: now,
          updated_at: now,
        }
        try {
          const raw = localStorage.getItem(`lifeos_subjects_${activeUserId}`)
          const localSubs = raw ? JSON.parse(raw) : []
          localStorage.setItem(`lifeos_subjects_${activeUserId}`, JSON.stringify([payload, ...localSubs]))
        } catch {}

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('subjects').insert(payload)
          } catch (e) {
            console.warn('Supabase insert subject failed:', e)
          }
        }
        setSuccessMsg('Đã tạo môn học thành công!')
      }

      onItemAdded?.()
      setTimeout(() => {
        resetForm()
        onClose()
      }, 1000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'task', label: 'Công việc', icon: CheckSquare },
    { id: 'goal', label: 'Mục tiêu', icon: Target },
    { id: 'habit', label: 'Thói quen', icon: Flame },
    { id: 'learning', label: 'Học tập', icon: GraduationCap },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm()
        onClose()
      }}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Thêm Nhanh Vào LIFEOS</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tạo nhanh công việc, mục tiêu, thói quen hoặc môn học</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as TabType)
                  setErrorMsg('')
                  setSuccessMsg('')
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {activeTab === 'task' && (
            <>
              <Input
                label="Tên công việc *"
                placeholder="Ví dụ: Hoàn thiện kế hoạch quý, Tập thể dục 30p..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Hạn hoàn thành"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Thời lượng ước tính
                  </label>
                  <select
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(e.target.value)}
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="15">15 phút</option>
                    <option value="30">30 phút</option>
                    <option value="45">45 phút</option>
                    <option value="60">1 giờ</option>
                    <option value="90">1.5 giờ</option>
                    <option value="120">2 giờ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Danh mục
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="general">Chung</option>
                    <option value="work">Công việc</option>
                    <option value="study">Học tập</option>
                    <option value="health">Sức khỏe</option>
                    <option value="personal">Cá nhân</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {activeTab === 'goal' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Tên mục tiêu <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-indigo-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <input
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="Ví dụ: Mua iPhone 14 Pro, Tiết kiệm 50 triệu, Học IELTS 7.5..."
                    required
                    autoFocus
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Lĩnh vực */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Lĩnh vực cuộc sống
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORY_ITEMS.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = goalCategory === cat.value
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setGoalCategory(cat.value)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? cat.activeClass
                            : 'border-slate-800 bg-[#101726]/60 text-slate-400 hover:text-slate-200 hover:border-slate-700/80 hover:bg-slate-800/40'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/10 text-white' : 'bg-slate-800/60 ' + cat.iconClass
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Chu kỳ & Mức độ ưu tiên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Chu kỳ mục tiêu
                  </label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
                    {GOAL_CYCLE_ITEMS.map((c) => {
                      const Icon = c.icon
                      const isSelected = goalType === c.value
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setGoalType(c.value)}
                          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{c.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Mức độ ưu tiên
                  </label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
                    {PRIORITY_ITEMS.map((p) => {
                      const isSelected = goalPriority === p.value
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setGoalPriority(p.value)}
                          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? p.activeClass
                              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                          <span className="truncate">{p.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Chỉ số đo lường */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Chỉ số định lượng
                  </label>
                  <span className="text-[11px] text-slate-400">Đo lường tiến trình</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mục tiêu cần đạt</label>
                    <input
                      type="number"
                      min="1"
                      value={goalTargetValue}
                      onChange={(e) => setGoalTargetValue(e.target.value)}
                      placeholder="100"
                      className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Đơn vị đo lường</label>
                    <input
                      type="text"
                      value={goalUnit}
                      onChange={(e) => setGoalUnit(e.target.value)}
                      placeholder="%, triệu VNĐ, cuốn..."
                      className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-slate-500">Gợi ý:</span>
                  {QUICK_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setGoalUnit(u)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        goalUnit === u
                          ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 font-medium'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hạn đích hoàn thành */}
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Hạn đích hoàn thành
                  </label>
                  {goalTargetDate && (
                    <button
                      type="button"
                      onClick={() => setGoalTargetDate('')}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      Xóa hạn
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl px-3.5 py-2 text-sm text-slate-100 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-slate-500">Chọn nhanh:</span>
                  {[
                    { label: 'Cuối tuần', fn: getEndOfWeekDate },
                    { label: 'Cuối tháng', fn: getEndOfMonthDate },
                    { label: 'Cuối quý', fn: getEndOfQuarterDate },
                    { label: '3 tháng tới', fn: getThreeMonthsDate },
                    { label: 'Cuối năm', fn: getEndOfYearDate },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setGoalTargetDate(preset.fn())}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'habit' && (
            <>
              <Input
                label="Tên thói quen *"
                placeholder="Ví dụ: Đọc sách 20 trang, Uống 2L nước, Dậy lúc 6:00..."
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                required
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Danh mục
                  </label>
                  <select
                    value={habitCategory}
                    onChange={(e) => setHabitCategory(e.target.value)}
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="health">Sức khỏe</option>
                    <option value="productivity">Năng suất</option>
                    <option value="mindset">Tâm trí</option>
                    <option value="learning">Học tập</option>
                  </select>
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Tần suất
                  </label>
                  <select
                    value={habitFrequency}
                    onChange={(e) => setHabitFrequency(e.target.value)}
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">Mỗi ngày</option>
                    <option value="weekdays">Thứ 2 - Thứ 6</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {activeTab === 'learning' && (
            <>
              <Input
                label="Tên môn học / Kỹ năng *"
                placeholder="Ví dụ: TypeScript nâng cao, Tiếng Nhật N3, Docker..."
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
                autoFocus
              />
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Lĩnh vực
                </label>
                <select
                  value={subjectCategory}
                  onChange={(e) => setSubjectCategory(e.target.value)}
                  className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="programming">Lập trình & Kỹ thuật</option>
                  <option value="language">Ngoại ngữ</option>
                  <option value="business">Kinh doanh & Quản trị</option>
                  <option value="creative">Sáng tạo & Thiết kế</option>
                  <option value="general">Kiến thức tổng quát</option>
                </select>
              </div>
              <Input
                label="Mục tiêu kết quả kỳ vọng"
                placeholder="Ví dụ: Tự xây dựng được ứng dụng Fullstack hoàn chỉnh"
                value={subjectOutcome}
                onChange={(e) => setSubjectOutcome(e.target.value)}
              />
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                resetForm()
                onClose()
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              Tạo ngay
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
