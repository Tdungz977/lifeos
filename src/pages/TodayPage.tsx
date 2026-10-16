import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckSquare,
  Clock,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Trash2,
  Star,
  Target,
  ArrowRight,
  Filter,
  CalendarDays,
  Moon as MoonIcon,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Task, Goal } from '@/types/database'
import {
  getTodayTasks,
  getOverdueTasks,
  toggleTaskStatus,
  rescheduleTask,
  deleteTaskWithSync,
} from '@/services/taskService'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import { TASK_PRIORITIES } from '@/lib/constants'
import { formatViDate } from '@/lib/utils'

export const TodayPage: React.FC = () => {
  const { user } = useAuth()
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [tasks, setTasks] = useState<Task[]>([])
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'created'>('time')

  // Create Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('general')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('30')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [isPriority, setIsPriority] = useState(false)

  // Reschedule Modal State
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null)
  const [newDueDate, setNewDueDate] = useState(tomorrowStr)

  // Pomodoro Timer State
  const [pomoMinutes, setPomoMinutes] = useState(25)
  const [pomoSeconds, setPomoSeconds] = useState(0)
  const [isPomoRunning, setIsPomoRunning] = useState(false)
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work')

  const loadData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [todayData, overdueData, goalsData] = await Promise.all([
        getTodayTasks(user.id, todayStr),
        getOverdueTasks(user.id, todayStr),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('is_archived', false),
      ])

      setTasks(todayData)
      setOverdueTasks(overdueData)
      if (goalsData.data) setGoals(goalsData.data)
    } catch (err) {
      console.error('Error fetching today tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [user, todayStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Pomodoro timer effect
  useEffect(() => {
    let timer: any = null
    if (isPomoRunning) {
      timer = setInterval(() => {
        if (pomoSeconds > 0) {
          setPomoSeconds((prev) => prev - 1)
        } else if (pomoMinutes > 0) {
          setPomoMinutes((prev) => prev - 1)
          setPomoSeconds(59)
        } else {
          setIsPomoRunning(false)
          if (pomoMode === 'work') {
            alert('🎉 Hoàn thành phiên Pomodoro 25 phút! Hãy đứng dậy nghỉ 5 phút.')
            setPomoMode('break')
            setPomoMinutes(5)
            setPomoSeconds(0)
          } else {
            alert('⏰ Hết giờ nghỉ! Bắt đầu phiên làm việc tiếp theo.')
            setPomoMode('work')
            setPomoMinutes(25)
            setPomoSeconds(0)
          }
        }
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isPomoRunning, pomoMinutes, pomoSeconds, pomoMode])

  const handleToggleTask = async (task: Task) => {
    if (!user) return
    // Optimistic toggle
    const optimisticStatus = task.status === 'completed' ? 'pending' : 'completed'
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: optimisticStatus } : t))
    )
    setOverdueTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: optimisticStatus } : t))
    )

    await toggleTaskStatus(task, user.id)
  }

  const handleDeleteTask = async (task: Task) => {
    if (!user || !confirm('Bạn có chắc chắn muốn xóa công việc này?')) return
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    setOverdueTasks((prev) => prev.filter((t) => t.id !== task.id))
    await deleteTaskWithSync(task, user.id)
  }

  const handleReschedule = async () => {
    if (!user || !reschedulingTask) return
    await rescheduleTask(reschedulingTask.id, newDueDate, user.id)
    setOverdueTasks((prev) => prev.filter((t) => t.id !== reschedulingTask.id))
    if (newDueDate === todayStr) {
      loadData()
    }
    setReschedulingTask(null)
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured()) return

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: todayStr,
        start_time: startTime || null,
        end_time: endTime || null,
        priority: priority as any,
        category,
        estimated_duration: parseInt(estimatedDuration) || 30,
        goal_id: selectedGoalId || null,
        is_priority: isPriority,
        status: 'pending',
      })
      .select('*, goal:goals(id, title, category)')
      .single()

    if (!error && data) {
      setTasks((prev) => [...prev, data])
      setIsModalOpen(false)
      setTitle('')
      setDescription('')
      setStartTime('')
      setEndTime('')
      setIsPriority(false)
    }
  }

  // Filter tasks
  let displayTasks = tasks.filter((t) => {
    if (statusFilter === 'pending') return t.status !== 'completed'
    if (statusFilter === 'completed') return t.status === 'completed'
    return true
  })

  if (categoryFilter !== 'all') {
    displayTasks = displayTasks.filter((t) => t.category === categoryFilter)
  }

  // Sort tasks
  displayTasks.sort((a, b) => {
    if (sortBy === 'priority') {
      const pMap = { urgent: 4, high: 3, medium: 2, low: 1 }
      return pMap[b.priority] - pMap[a.priority]
    }
    if (sortBy === 'time') {
      if (a.start_time && !b.start_time) return -1
      if (!a.start_time && b.start_time) return 1
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
    }
    return 0
  })

  // Separate scheduled (with time) vs unscheduled
  const scheduledTasks = displayTasks.filter((t) => Boolean(t.start_time))
  const unscheduledTasks = displayTasks.filter((t) => !t.start_time)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Kế Hoạch & Thực Thi Hôm Nay</h1>
          <p className="text-xs text-slate-400 mt-1">
            Không trì hoãn. Lên lịch cụ thể, thực thi dứt điểm và theo dõi thời gian thực tế.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/moon"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-500/40 hover:bg-indigo-900/50 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <MoonIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Trợ lý Moon 🌙</span>
          </Link>
          <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Thêm công việc
          </Button>
        </div>
      </div>

      {/* Overdue Tasks Alert Banner */}
      {overdueTasks.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              Bạn có {overdueTasks.length} công việc chưa hoàn thành từ các ngày trước
            </span>
            <span className="text-[11px] text-rose-400 italic">
              Không tự động chuyển ngày — bạn cần chủ động sắp xếp lại
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 rounded-lg bg-rose-950/50 border border-rose-900/60"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-slate-200">{task.title}</span>
                  <span className="text-[10px] text-rose-400 font-mono">
                    Hạn cũ: {formatViDate(task.due_date, 'dd/MM')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReschedulingTask(task)
                      setNewDueDate(todayStr)
                    }}
                    className="h-7 text-xs border-rose-700/60 text-rose-200 hover:bg-rose-900/40"
                  >
                    Dời sang hôm nay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReschedulingTask(task)
                      setNewDueDate(tomorrowStr)
                    }}
                    className="h-7 text-xs border-rose-700/60 text-rose-200 hover:bg-rose-900/40"
                  >
                    Dời ngày mai
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pomodoro Focus Card */}
      <Card className="bg-gradient-to-r from-[#0d1527] to-[#121c32] border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-300">
                  Pomodoro Timer
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {pomoMode === 'work' ? 'Tập trung sâu (25p)' : 'Nghỉ giải lao (5p)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chia thời gian thành các khối 25 phút để tối đa hóa hiệu suất làm việc.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-center md:self-auto">
            <span className="text-3xl font-extrabold font-mono text-white tracking-wider">
              {String(pomoMinutes).padStart(2, '0')}:{String(pomoSeconds).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant={isPomoRunning ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setIsPomoRunning(!isPomoRunning)}
                leftIcon={isPomoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              >
                {isPomoRunning ? 'Tạm dừng' : 'Bắt đầu'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPomoRunning(false)
                  setPomoMinutes(pomoMode === 'work' ? 25 : 5)
                  setPomoSeconds(0)
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5">
          {(['all', 'pending', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab === 'all'
                ? `Tất cả (${tasks.length})`
                : tab === 'pending'
                ? `Chờ làm (${tasks.filter((t) => t.status !== 'completed').length})`
                : `Đã xong (${tasks.filter((t) => t.status === 'completed').length})`}
            </button>
          ))}
        </div>

        {/* Category & Sort controls */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#101726]/80 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="work">Công việc</option>
            <option value="study">Học tập</option>
            <option value="health">Sức khỏe</option>
            <option value="personal">Cá nhân</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#101726]/80 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="time">Sắp xếp: Theo giờ</option>
            <option value="priority">Sắp xếp: Độ ưu tiên</option>
          </select>
        </div>
      </div>

      {/* Task Sections */}
      {displayTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8 text-indigo-400" />}
          title="Không có công việc nào trong danh sách"
          description="Lên kế hoạch các công việc cần làm cho hôm nay để giữ vững kỷ luật."
          actionLabel="Tạo công việc mới"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Section 1: Scheduled Tasks (Timeline) */}
          {scheduledTasks.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Lịch Trình Có Giờ Cụ Thể ({scheduledTasks.length})
              </h3>
              <div className="space-y-2">
                {scheduledTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggleTask(task)}
                    onDelete={() => handleDeleteTask(task)}
                    onReschedule={() => setReschedulingTask(task)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Unscheduled Tasks */}
          {unscheduledTasks.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5" /> Công Việc Trong Ngày ({unscheduledTasks.length})
              </h3>
              <div className="space-y-2">
                {unscheduledTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggleTask(task)}
                    onDelete={() => handleDeleteTask(task)}
                    onReschedule={() => setReschedulingTask(task)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm Công Việc Mới"
        maxWidth="md"
      >
        <form onSubmit={handleSaveTask} className="space-y-3.5">
          <Input
            label="Tên công việc *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Thiết kế Database, Chạy bộ 3km..."
            required
            autoFocus
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Ghi chú thêm
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chi tiết yêu cầu..."
              rows={2}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ bắt đầu (tùy chọn)"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Thời lượng ước tính
              </label>
              <select
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="15">15 phút</option>
                <option value="25">25 phút (1 Pomodoro)</option>
                <option value="45">45 phút</option>
                <option value="60">1 giờ</option>
                <option value="90">1.5 giờ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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

          {/* Goal Link */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Liên kết tới mục tiêu chiến lược
            </label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Không liên kết --</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} ({g.category})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPriority}
              onChange={(e) => setIsPriority(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300">Chọn làm 1 trong 3 việc ưu tiên hàng đầu hôm nay</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Lưu công việc
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={Boolean(reschedulingTask)}
        onClose={() => setReschedulingTask(null)}
        title="Dời Lịch Công Việc"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Chọn ngày mới cho công việc: <strong>{reschedulingTask?.title}</strong>
          </p>

          <Input
            label="Ngày thực hiện mới"
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setReschedulingTask(null)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleReschedule}>
              Xác nhận dời lịch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const TaskItem: React.FC<{
  task: Task
  onToggle: () => void
  onDelete: () => void
  onReschedule: () => void
}> = ({ task, onToggle, onDelete, onReschedule }) => {
  const isDone = task.status === 'completed'

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
        isDone
          ? 'bg-slate-950/40 border-white/[0.04] opacity-55'
          : 'bg-slate-900/80 border-white/[0.08] hover:border-indigo-500/40 hover:bg-slate-900 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
            isDone
              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/40'
              : 'border-slate-500 hover:border-emerald-400 bg-slate-950 hover:bg-emerald-500/10'
          }`}
        >
          {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
        </button>

        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold text-slate-100 ${isDone ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </span>
            {task.is_priority && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Ưu tiên
              </span>
            )}
          </div>
          {task.goal && (
            <span className="text-[11px] text-indigo-400 flex items-center gap-1">
              <Target className="w-3 h-3" /> {task.goal.title}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {task.start_time && (
          <span className="text-xs text-indigo-300 font-mono bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
            {task.start_time}
          </span>
        )}
        {task.estimated_duration && (
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {task.estimated_duration}p
          </span>
        )}
        <Badge
          variant={
            task.priority === 'urgent' ? 'rose' : task.priority === 'high' ? 'amber' : 'slate'
          }
        >
          {task.priority}
        </Badge>
        <button
          onClick={onReschedule}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
          title="Dời ngày"
        >
          <CalendarDays className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          title="Xóa công việc"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
