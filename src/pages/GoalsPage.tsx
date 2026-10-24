import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Target,
  Calendar,
  Trash2,
  Edit2,
  Search,
  CheckSquare,
  Loader2,
  AlertTriangle,
  Briefcase,
  Wallet,
  HeartPulse,
  GraduationCap,
  Sparkles,
  Users,
  Check,
  Flame,
  Flag,
  Sliders,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Goal, GoalStatus } from '@/types/database'
import {
  getGoalsWithCounts,
  createGoal,
  updateGoal,
  deleteGoal,
} from '@/services/goalService'
import { GoalDetailModal } from '@/components/goals/GoalDetailModal'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { ProgressBar } from '@/components/common/ProgressBar'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import { GOAL_CATEGORIES, GOAL_STATUS_MAP } from '@/lib/constants'
import { formatViDate } from '@/lib/utils'

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

const STATUS_ITEMS: { value: GoalStatus; label: string }[] = [
  { value: 'not_started', label: 'Chưa bắt đầu' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'paused', label: 'Tạm dừng' },
]

const QUICK_UNITS = ['%', 'triệu VNĐ', 'VNĐ', 'cuốn', 'km', 'giờ', 'chiếc', 'ngày']

export const GoalsPage: React.FC = () => {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('finance')
  const [goalType, setGoalType] = useState('quarterly')
  const [priority, setPriority] = useState('high')
  const [status, setStatus] = useState<GoalStatus>('in_progress')
  const [targetDate, setTargetDate] = useState('')
  const [targetValue, setTargetValue] = useState('100')
  const [unit, setUnit] = useState('%')

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getGoalsWithCounts(user.id)
      setGoals(data)
    } catch (err) {
      console.error('Error fetching goals:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // Listen for cross-component goal updates
  useEffect(() => {
    const handleUpdate = () => {
      fetchGoals()
    }
    window.addEventListener('goals_updated', handleUpdate)
    return () => {
      window.removeEventListener('goals_updated', handleUpdate)
    }
  }, [fetchGoals])

  const handleOpenCreate = () => {
    setEditingGoal(null)
    setTitle('')
    setDescription('')
    setCategory('finance')
    setGoalType('quarterly')
    setPriority('high')
    setStatus('in_progress')
    setTargetDate('')
    setTargetValue('100')
    setUnit('%')
    setSaveError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (goal: Goal, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingGoal(goal)
    setTitle(goal.title)
    setDescription(goal.description || '')
    setCategory(goal.category)
    setGoalType(goal.goal_type)
    setPriority(goal.priority)
    setStatus(goal.status || 'in_progress')
    setTargetDate(goal.target_date || '')
    setTargetValue(String(goal.target_value ?? 100))
    setUnit(goal.unit || '%')
    setSaveError(null)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (goalId: string) => {
    setDetailGoalId(goalId)
    setIsDetailOpen(true)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setSaveError('Vui lòng nhập tên mục tiêu')
      return
    }
    if (!user) {
      setSaveError('Vui lòng đăng nhập để lưu mục tiêu')
      return
    }

    try {
      setIsSaving(true)
      setSaveError(null)

      const payload = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        goal_type: goalType as any,
        priority: priority as any,
        target_date: targetDate || null,
        target_value: Number(targetValue) || 100,
        unit: unit.trim() || '%',
        ...(editingGoal ? { status } : {}),
      }

      let savedGoal: Goal | null = null
      if (editingGoal) {
        savedGoal = await updateGoal(editingGoal.id, payload, user.id)
      } else {
        savedGoal = await createGoal(payload)
      }

      if (savedGoal) {
        const goalWithCounts = {
          ...savedGoal,
          linked_tasks_count: editingGoal?.linked_tasks_count || 0,
          completed_tasks_count: editingGoal?.completed_tasks_count || 0,
        }
        setGoals((prev) =>
          editingGoal
            ? prev.map((g) => (g.id === savedGoal!.id ? goalWithCounts : g))
            : [goalWithCounts, ...prev]
        )
      }

      setIsModalOpen(false)
      setTitle('')
      setDescription('')
      setTargetDate('')
      fetchGoals()
    } catch (err: any) {
      console.error('Error saving goal:', err)
      setSaveError(err.message || 'Không thể lưu mục tiêu. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGoal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Bạn có chắc chắn muốn xóa mục tiêu này? Tất cả mốc con và liên kết sẽ bị xóa.')) return
    if (!user) return

    await deleteGoal(id, user.id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || g.status === selectedStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Hệ Thống Quản Lý Mục Tiêu</h1>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Đặt mục tiêu, chia nhỏ nhiệm vụ, theo dõi tiến độ tự động qua từng nhiệm vụ hoàn thành.
          </p>
        </div>
        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Thêm mục tiêu mới
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Tìm kiếm mục tiêu theo từ khóa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-initial bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả lĩnh vực</option>
            {GOAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 sm:flex-initial bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(GOAL_STATUS_MAP).map(([val, item]) => (
              <option key={val} value={val}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-8 h-8 text-indigo-400" />}
          title={goals.length === 0 ? 'Chưa có mục tiêu nào' : 'Không tìm thấy mục tiêu phù hợp'}
          description={
            goals.length === 0
              ? 'Bắt đầu bằng việc đặt ra 1 mục tiêu quan trọng trong tháng hoặc quý này.'
              : 'Hãy thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc.'
          }
          actionLabel={goals.length === 0 ? 'Tạo mục tiêu đầu tiên' : undefined}
          onAction={goals.length === 0 ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => {
            const statusConfig = GOAL_STATUS_MAP[goal.status] || GOAL_STATUS_MAP.in_progress
            const hasLinkedTasks = (goal.linked_tasks_count || 0) > 0

            return (
              <Card
                key={goal.id}
                onClick={() => handleOpenDetail(goal.id)}
                className="flex flex-col justify-between hover:border-indigo-500/40 cursor-pointer transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="indigo">{goal.category}</Badge>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white mt-1.5 group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {goal.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEdit(goal, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        title="Chỉnh sửa mục tiêu"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteGoal(goal.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="Xóa mục tiêu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{goal.description}</p>
                  )}

                  {/* Progress section */}
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-800/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        {hasLinkedTasks ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                            {goal.completed_tasks_count}/{goal.linked_tasks_count} việc xong
                          </>
                        ) : (
                          'Tiến độ thủ công'
                        )}
                      </span>
                      <span className="font-extrabold text-indigo-400">{goal.current_value}%</span>
                    </div>
                    <ProgressBar value={goal.current_value} color="indigo" size="sm" />
                  </div>
                </div>

                {/* Footer Details */}
                <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  {goal.target_date ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Hạn: {formatViDate(goal.target_date, 'dd/MM/yyyy')}
                    </span>
                  ) : (
                    <span>Chưa đặt hạn</span>
                  )}

                  <span className="text-indigo-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Xem chi tiết &rarr;
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Goal Detail Modal */}
      {user && (
        <GoalDetailModal
          goalId={detailGoalId}
          userId={user.id}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onGoalUpdated={fetchGoals}
        />
      )}

      {/* Goal Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSaveError(null)
        }}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {editingGoal ? 'Chỉnh Sửa Mục Tiêu' : 'Tạo Mục Tiêu Mới'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {editingGoal
                  ? 'Cập nhật lộ trình, chỉ số định lượng và kế hoạch hành động'
                  : 'Xác định mục tiêu rõ ràng, định lượng hóa và kiên định theo đuổi'}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveGoal} className="space-y-4 pt-1">
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Tên mục tiêu */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Tên mục tiêu <span className="text-rose-400">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-indigo-400">
                <Target className="w-4 h-4" />
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Mua iPhone 14 Pro, Tiết kiệm 50 triệu, Học IELTS 7.5..."
                required
                autoFocus
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Lĩnh vực cuộc sống */}
          <div className="space-y-2 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Lĩnh vực cuộc sống
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_ITEMS.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? cat.activeClass
                        : 'border-slate-800 bg-[#101726]/60 text-slate-400 hover:text-slate-200 hover:border-slate-700/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Chu kỳ */}
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
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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

            {/* Mức độ ưu tiên */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mức độ ưu tiên
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
                {PRIORITY_ITEMS.map((p) => {
                  const isSelected = priority === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? p.activeClass
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                      <span className="truncate">{p.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Chỉ số đo lường & Định lượng */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Chỉ số đo lường mục tiêu
              </label>
              <span className="text-[11px] text-slate-400">Định lượng hóa tiến trình</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Mục tiêu cần đạt</label>
                <input
                  type="number"
                  min="1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="100"
                  className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Đơn vị đo lường</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="%, triệu VNĐ, cuốn, km..."
                  className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* Quick unit chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-slate-500">Gợi ý đơn vị:</span>
              {QUICK_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    unit === u
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
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Hạn đích hoàn thành
              </label>
              {targetDate && (
                <button
                  type="button"
                  onClick={() => setTargetDate('')}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Xóa hạn
                </button>
              )}
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl px-3.5 py-2 text-sm text-slate-100 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {/* Quick date presets */}
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
                  onClick={() => setTargetDate(preset.fn())}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trạng thái tiến độ (Chỉ hiện khi chỉnh sửa) */}
          {editingGoal && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Trạng thái tiến độ
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_ITEMS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center cursor-pointer ${
                      status === s.value
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40'
                        : 'bg-[#101726]/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mô tả chi tiết / Lý do tại sao */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Mô tả chi tiết / Lý do tại sao (Why)
              </label>
              <span className="text-[11px] text-slate-400 italic">Động lực hành động</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu này giúp ích gì cho cuộc sống của bạn? Tại sao bạn bắt buộc phải đạt được nó?..."
              rows={2}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false)
                setSaveError(null)
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              leftIcon={
                isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingGoal ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )
              }
              className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 px-5"
            >
              {isSaving ? 'Đang lưu...' : (editingGoal ? 'Lưu cập nhật' : 'Tạo mục tiêu')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
