import React, { useState, useEffect } from 'react'
import {
  Target,
  CheckCircle2,
  Calendar,
  Flag,
  CheckSquare,
  Plus,
  Trash2,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ProgressBar } from '@/components/common/ProgressBar'
import { Badge } from '@/components/common/Badge'
import { Goal, GoalMilestone, Task } from '@/types/database'
import { getGoalDetail, toggleMilestone, addMilestoneToGoal, updateGoal } from '@/services/goalService'
import { toggleTaskStatus, syncGoalProgress, createTask } from '@/services/taskService'
import { supabase } from '@/lib/supabase'
import { GOAL_STATUS_MAP } from '@/lib/constants'
import { formatViDate } from '@/lib/utils'

interface GoalDetailModalProps {
  goalId: string | null
  userId: string
  isOpen: boolean
  onClose: () => void
  onGoalUpdated: () => void
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goalId,
  userId,
  isOpen,
  onClose,
  onGoalUpdated,
}) => {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [milestones, setMilestones] = useState<GoalMilestone[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Sub-forms
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState('')
  const [reflection, setReflection] = useState('')
  const [savingReflection, setSavingReflection] = useState(false)
  const [reflectionSaved, setReflectionSaved] = useState(false)

  // Direct Task creation for this goal
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().split('T')[0])
  const [newTaskDuration, setNewTaskDuration] = useState('30')

  const loadData = async () => {
    if (!goalId || !userId) return
    try {
      setLoading(true)
      const detail = await getGoalDetail(goalId, userId)
      if (detail) {
        setGoal(detail)
        setMilestones(detail.milestones)
        setTasks(detail.linked_tasks)
        setReflection(detail.reflection_notes || '')
      }
    } catch (err) {
      console.error('Error loading goal detail:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && goalId) {
      loadData()
    }
  }, [isOpen, goalId])

  const handleToggleMilestone = async (m: GoalMilestone) => {
    const nextVal = !m.is_completed
    setMilestones((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, is_completed: nextVal } : item))
    )
    await toggleMilestone(m.id, nextVal, userId)
  }

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMilestoneTitle.trim() || !goalId) return
    const created = await addMilestoneToGoal(
      goalId,
      newMilestoneTitle,
      newMilestoneDate || null,
      userId
    )
    setMilestones((prev) => [...prev, created])
    setNewMilestoneTitle('')
    setNewMilestoneDate('')
  }

  const handleToggleTask = async (task: Task) => {
    const updated = await toggleTaskStatus(task, userId)
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    // Sync progress
    if (goalId) {
      const newPct = await syncGoalProgress(goalId, userId)
      if (newPct !== null && goal) {
        setGoal({ ...goal, current_value: newPct })
      }
    }
    onGoalUpdated()
  }

  const handleCreateTaskForGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !goalId) return

    try {
      const newTask = await createTask({
        user_id: userId,
        goal_id: goalId,
        title: newTaskTitle.trim(),
        due_date: newTaskDueDate,
        estimated_duration: parseInt(newTaskDuration) || 30,
        priority: 'high',
        category: goal?.category || 'general',
        status: 'pending',
        is_priority: false,
      })

      setTasks((prev) => [...prev, newTask])
      setIsAddingTask(false)
      setNewTaskTitle('')
      // Recalculate progress
      const newPct = await syncGoalProgress(goalId, userId)
      if (newPct !== null && goal) {
        setGoal({ ...goal, current_value: newPct })
      }
      onGoalUpdated()
    } catch (err) {
      console.error('Error creating task for goal:', err)
    }
  }

  const handleSaveReflection = async () => {
    if (!goalId) return
    setSavingReflection(true)
    await updateGoal(goalId, { reflection_notes: reflection }, userId)
    setSavingReflection(false)
    setReflectionSaved(true)
    setTimeout(() => setReflectionSaved(false), 2000)
    onGoalUpdated()
  }

  if (!goal) return null

  const statusConfig = GOAL_STATUS_MAP[goal.status] || GOAL_STATUS_MAP.in_progress
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <Target className="w-5 h-5 text-indigo-400" />
          <span className="truncate">{goal.title}</span>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-6 text-sm">
        {/* Meta badges & Target Date */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="indigo">{goal.category}</Badge>
            <Badge variant={goal.priority === 'urgent' ? 'rose' : goal.priority === 'high' ? 'amber' : 'slate'}>
              Ưu tiên {goal.priority}
            </Badge>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          {goal.target_date && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hạn chót: {formatViDate(goal.target_date, 'dd/MM/yyyy')}</span>
            </div>
          )}
        </div>

        {/* Progress Breakdown */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">
              Tiến độ tự động:{' '}
              <span className="text-indigo-400 font-bold">
                {tasks.length > 0
                  ? `${completedTasksCount}/${tasks.length} nhiệm vụ hoàn thành`
                  : `${goal.current_value}% (theo dõi thủ công)`}
              </span>
            </span>
            <span className="text-sm font-extrabold text-indigo-400">{goal.current_value}%</span>
          </div>
          <ProgressBar value={goal.current_value} color="indigo" size="md" />
        </div>

        {/* Milestones Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-emerald-400" /> Các Mốc Quan Trọng ({milestones.length})
            </h4>
          </div>

          <div className="space-y-1.5">
            {milestones.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Chưa có mốc con nào.</p>
            ) : (
              milestones.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMilestone(m)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        m.is_completed ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-600'
                      }`}
                    >
                      {m.is_completed && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <span className={m.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {m.title}
                    </span>
                  </div>
                  {m.target_date && (
                    <span className="text-[10px] text-slate-400">{formatViDate(m.target_date, 'dd/MM')}</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Milestone Form */}
          <form onSubmit={handleAddMilestone} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Thêm cột mốc mới..."
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={newMilestoneDate}
              onChange={(e) => setNewMilestoneDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button size="sm" variant="secondary" type="submit">
              Thêm mốc
            </Button>
          </form>
        </div>

        {/* Linked Actionable Tasks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-indigo-400" /> Nhiệm Vụ Liên Kết ({tasks.length})
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddingTask(!isAddingTask)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Thêm việc vào mục tiêu
            </Button>
          </div>

          {/* Add task inline form */}
          {isAddingTask && (
            <form
              onSubmit={handleCreateTaskForGoal}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/40 space-y-3 animate-fade-in"
            >
              <Input
                label="Tên nhiệm vụ"
                placeholder="Ví dụ: Đọc tài liệu chương 1, Làm bài tập trắc nghiệm..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Hạn hoàn thành"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Thời lượng ước tính
                  </label>
                  <select
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(e.target.value)}
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="15">15 phút</option>
                    <option value="30">30 phút</option>
                    <option value="45">45 phút</option>
                    <option value="60">1 giờ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsAddingTask(false)}>
                  Hủy
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Lưu nhiệm vụ
                </Button>
              </div>
            </form>
          )}

          {/* Tasks List */}
          <div className="space-y-1.5">
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Chưa có nhiệm vụ nào gắn với mục tiêu này. Hãy chia nhỏ mục tiêu thành các việc cụ thể để hệ thống tự động tính tiến độ!
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        task.status === 'completed'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-600 hover:border-indigo-400'
                      }`}
                    >
                      {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <span className={task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-mono">{formatViDate(task.due_date, 'dd/MM')}</span>
                    {task.estimated_duration && <span>{task.estimated_duration}p</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reflection Notes */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> Ghi Chú & Chiêm Nghiệm Về Mục Tiêu
          </h4>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Ghi lại chiến lược, những rào cản cần vượt qua, hoặc lý do tại sao mục tiêu này quan trọng đối với bạn..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-between items-center">
            {reflectionSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu chiêm nghiệm
              </span>
            )}
            <div className="ml-auto">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSaveReflection}
                isLoading={savingReflection}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Lưu ghi chú
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
