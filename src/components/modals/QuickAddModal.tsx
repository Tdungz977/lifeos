import React, { useState } from 'react'
import { CheckSquare, Target, Flame, GraduationCap, Check } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { GOAL_CATEGORIES, TASK_PRIORITIES } from '@/lib/constants'
import { createTask } from '@/services/taskService'
import { createGoal } from '@/services/goalService'
import { getLocalHabits, saveLocalHabits } from '@/services/habitService'

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
  const [goalCategory, setGoalCategory] = useState('personal')
  const [goalTargetDate, setGoalTargetDate] = useState('')
  const [goalType, setGoalType] = useState('monthly')

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
    setHabitName('')
    setSubjectName('')
    setSubjectOutcome('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setErrorMsg('Bạn cần đăng nhập để tạo mới dữ liệu.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (activeTab === 'task') {
        if (!taskTitle.trim()) throw new Error('Vui lòng nhập tên công việc')
        await createTask({
          user_id: user.id,
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
          user_id: user.id,
          title: goalTitle.trim(),
          category: goalCategory,
          target_date: goalTargetDate || null,
          goal_type: goalType as any,
          priority: 'high',
          current_value: 0,
          target_value: 100,
          unit: '%',
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
          user_id: user.id,
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
        const localHabits = getLocalHabits(user.id)
        saveLocalHabits(user.id, [payload, ...localHabits])

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
          user_id: user.id,
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
          const raw = localStorage.getItem(`lifeos_subjects_${user.id}`)
          const localSubs = raw ? JSON.parse(raw) : []
          localStorage.setItem(`lifeos_subjects_${user.id}`, JSON.stringify([payload, ...localSubs]))
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
      title="Thêm Nhanh Vào LIFEOS"
      description="Tạo nhanh mục tiêu, kế hoạch ngày, thói quen hoặc môn học"
      maxWidth="md"
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
            <>
              <Input
                label="Tên mục tiêu *"
                placeholder="Ví dụ: Đạt chứng chỉ AWS, Chạy marathon 21km..."
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                required
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Lĩnh vực
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
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
                    Chu kỳ mục tiêu
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Tuần</option>
                    <option value="monthly">Tháng</option>
                    <option value="quarterly">Quý</option>
                    <option value="yearly">Năm</option>
                  </select>
                </div>
              </div>
              <Input
                label="Ngày đích hoàn thành"
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
              />
            </>
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
