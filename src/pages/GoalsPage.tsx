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
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Goal } from '@/types/database'
import { getGoalsWithCounts } from '@/services/goalService'
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

export const GoalsPage: React.FC = () => {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
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
  const [category, setCategory] = useState('career')
  const [goalType, setGoalType] = useState('quarterly')
  const [priority, setPriority] = useState('high')
  const [targetDate, setTargetDate] = useState('')
  const [targetValue, setTargetValue] = useState('100')
  const [unit, setUnit] = useState('%')

  const fetchGoals = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
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

  const handleOpenCreate = () => {
    setEditingGoal(null)
    setTitle('')
    setDescription('')
    setCategory('career')
    setGoalType('quarterly')
    setPriority('high')
    setTargetDate('')
    setTargetValue('100')
    setUnit('%')
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
    setTargetDate(goal.target_date || '')
    setTargetValue(String(goal.target_value))
    setUnit(goal.unit || '%')
    setIsModalOpen(true)
  }

  const handleOpenDetail = (goalId: string) => {
    setDetailGoalId(goalId)
    setIsDetailOpen(true)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured()) return

    const payload = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      goal_type: goalType as any,
      priority: priority as any,
      target_date: targetDate || null,
      target_value: Number(targetValue) || 100,
      unit,
    }

    if (editingGoal) {
      await supabase
        .from('goals')
        .update(payload)
        .eq('id', editingGoal.id)
        .eq('user_id', user.id)
    } else {
      await supabase.from('goals').insert(payload)
    }

    setIsModalOpen(false)
    fetchGoals()
  }

  const handleDeleteGoal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Bạn có chắc chắn muốn xóa mục tiêu này? Tất cả mốc con và liên kết sẽ bị xóa.')) return
    if (!user || !isSupabaseConfigured()) return
    await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id)
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
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? 'Chỉnh Sửa Mục Tiêu' : 'Tạo Mục Tiêu Mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveGoal} className="space-y-3.5">
          <Input
            label="Tên mục tiêu *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Đạt chứng chỉ AWS Solutions Architect, Tiết kiệm 100 triệu..."
            required
            autoFocus
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Mô tả chi tiết / Lý do tại sao
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu này giúp ích gì cho cuộc sống của bạn?..."
              rows={2}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Lĩnh vực
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {GOAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Chu kỳ
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Mục tiêu Tháng</option>
                <option value="quarterly">Mục tiêu Quý</option>
                <option value="yearly">Mục tiêu Năm</option>
                <option value="weekly">Mục tiêu Tuần</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hạn đích hoàn thành"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingGoal ? 'Cập nhật' : 'Tạo mục tiêu'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
