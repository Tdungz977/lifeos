import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Target,
  Plus,
  BookOpen,
  Filter,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Task, Goal, Subject } from '@/types/database'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/common/Badge'
import { formatViDate } from '@/lib/utils'

type CalendarViewMode = 'month' | 'week' | 'day'

export const CalendarPage: React.FC = () => {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  // Quick task creation modal from calendar
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskStartTime, setNewTaskStartTime] = useState('09:00')
  const [newTaskDuration, setNewTaskDuration] = useState('30')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')

  const fetchCalendarData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const start = format(startOfWeek(startOfMonth(subMonths(currentDate, 1)), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const end = format(endOfWeek(endOfMonth(addMonths(currentDate, 1)), { weekStartsOn: 1 }), 'yyyy-MM-dd')

      const [taskRes, goalRes, subRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, goal:goals(id, title, category)')
          .eq('user_id', user.id)
          .gte('due_date', start)
          .lte('due_date', end),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false),
        supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false),
      ])

      if (taskRes.data) setTasks(taskRes.data)
      if (goalRes.data) setGoals(goalRes.data)
      if (subRes.data) setSubjects(subRes.data)
    } catch (err) {
      console.error('Error fetching calendar data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentDate, user])

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else setSelectedDate(subWeeks(selectedDate, 1))
  }

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else setSelectedDate(addWeeks(selectedDate, 1))
  }

  // Days generator for Monthly view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Days generator for Weekly view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const selectedDayTasks = tasks.filter((t) => t.due_date === selectedDateStr)
  const selectedDayGoals = goals.filter((g) => g.target_date === selectedDateStr)
  const selectedDaySubjects = subjects.filter((s) => s.target_date === selectedDateStr)

  const handleCreateTaskFromCalendar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !user || !isSupabaseConfigured()) return

    const { data } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: newTaskTitle.trim(),
        due_date: selectedDateStr,
        start_time: newTaskStartTime || null,
        estimated_duration: parseInt(newTaskDuration) || 30,
        priority: newTaskPriority as any,
        category: 'general',
        status: 'pending',
      })
      .select('*, goal:goals(id, title, category)')
      .single()

    if (data) {
      setTasks((prev) => [...prev, data])
      setIsTaskModalOpen(false)
      setNewTaskTitle('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Lịch Trình & Kế Hoạch Đa Chế Độ</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tổng quan thời gian theo Tháng, Tuần và Lịch trình chi tiết từng ngày.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode switch */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'month' ? 'Tháng' : mode === 'week' ? 'Tuần' : 'Ngày'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs sm:text-sm font-bold text-white capitalize min-w-[130px] text-center">
              {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Tuần' w, yyyy", { locale: vi })}
            </span>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentDate(new Date())
                setSelectedDate(new Date())
              }}
            >
              Hôm nay
            </Button>
          </div>
        </div>
      </div>

      {/* Main Views */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Area (2 cols): Calendar Grid (Month or Week) */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'month' && (
            <Card className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 pb-2 border-b border-slate-800">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 pt-2">
                {monthDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayTasks = tasks.filter((t) => t.due_date === dateStr)
                  const dayGoals = goals.filter((g) => g.target_date === dateStr)
                  const isSelected = isSameDay(day, selectedDate)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[80px] sm:min-h-[95px] p-1.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500 shadow-md'
                          : isToday
                          ? 'bg-slate-900 border-indigo-500/50'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span
                          className={`font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                            isToday ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {dayTasks.length} việc
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayGoals.map((g) => (
                          <div
                            key={g.id}
                            className="truncate text-[9px] px-1 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-semibold"
                          >
                            🎯 {g.title}
                          </div>
                        ))}
                        {dayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className={`truncate text-[9px] px-1 py-0.5 rounded border ${
                              t.status === 'completed'
                                ? 'bg-slate-800/40 text-slate-500 border-slate-800 line-through'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                            }`}
                          >
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <p className="text-[9px] text-slate-500 text-center">+{dayTasks.length - 2} việc</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {viewMode === 'week' && (
            <Card className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayTasks = tasks.filter((t) => t.due_date === dateStr)
                  const isSelected = isSameDay(day, selectedDate)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[220px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500 shadow-md'
                          : isToday
                          ? 'bg-slate-900 border-indigo-500/50'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-center pb-2 border-b border-slate-800">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          {format(day, 'EEE', { locale: vi })}
                        </p>
                        <p
                          className={`text-base font-bold mt-0.5 ${
                            isToday ? 'text-indigo-400' : 'text-slate-200'
                          }`}
                        >
                          {format(day, 'd')}
                        </p>
                      </div>

                      <div className="space-y-1.5 flex-1 py-2 overflow-y-auto">
                        {dayTasks.map((t) => (
                          <div
                            key={t.id}
                            className={`p-1.5 rounded text-[10px] border truncate ${
                              t.status === 'completed'
                                ? 'bg-slate-800/40 text-slate-500 border-slate-800 line-through'
                                : 'bg-slate-800/80 text-slate-200 border-slate-700'
                            }`}
                          >
                            {t.title}
                          </div>
                        ))}
                      </div>

                      <span className="text-[10px] text-slate-500 text-center font-mono">
                        {dayTasks.length} việc
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {viewMode === 'day' && (
            <Card className="p-5">
              <CardHeader
                title={`Lịch Trình Chi Tiết: ${formatViDate(selectedDate, 'EEEE, dd/MM/yyyy')}`}
                subtitle="Dòng thời gian các hoạt động được lên lịch"
                icon={<Clock className="w-4 h-4" />}
              />
              <div className="space-y-3 pt-2">
                {selectedDayTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Không có công việc nào trong ngày này.
                  </p>
                ) : (
                  selectedDayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-indigo-300 font-bold bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800/40">
                          {t.start_time || 'Cả ngày'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-100 text-sm">{t.title}</p>
                          {t.description && <p className="text-slate-400 text-[11px]">{t.description}</p>}
                        </div>
                      </div>
                      <Badge variant={t.status === 'completed' ? 'emerald' : 'slate'}>
                        {t.status === 'completed' ? 'Đã xong' : 'Chưa xong'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Area (1 col): Selected Day Agenda & Direct Task Creation */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={format(selectedDate, 'EEEE, dd/MM', { locale: vi })}
              subtitle={`Hạn định & Lịch trình (${selectedDayTasks.length} việc)`}
              icon={<CalendarIcon className="w-4 h-4" />}
              action={
                <Button
                  size="sm"
                  onClick={() => setIsTaskModalOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Thêm vào ngày này
                </Button>
              }
            />

            <div className="space-y-3">
              {/* Goals target date on this day */}
              {selectedDayGoals.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    🎯 Mục tiêu chiến lược đến hạn
                  </span>
                  {selectedDayGoals.map((g) => (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200"
                    >
                      <p className="font-bold">{g.title}</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5">Lĩnh vực: {g.category}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Subjects finishing on this day */}
              {selectedDaySubjects.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    📚 Môn học / Kỹ năng đến hạn
                  </span>
                  {selectedDaySubjects.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/50 text-xs text-purple-200"
                    >
                      <p className="font-bold">{s.name}</p>
                      <p className="text-[10px] text-purple-400 mt-0.5">Mục tiêu: {s.target_outcome || s.category}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-1.5">
                {selectedDayTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Chưa có công việc nào lên lịch cho ngày này. Bấm nút <strong>"Thêm vào ngày này"</strong> ở trên để tạo.
                  </p>
                ) : (
                  selectedDayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span
                          className={`font-semibold ${
                            t.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {t.title}
                        </span>
                        {t.start_time && (
                          <p className="text-[10px] text-slate-400 font-mono">Bắt đầu: {t.start_time}</p>
                        )}
                      </div>
                      <Badge variant={t.status === 'completed' ? 'emerald' : 'slate'}>
                        {t.status === 'completed' ? 'Xong' : 'Chờ'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Direct Task Creation Modal from Calendar */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={`Lên Lịch Công Việc: ${formatViDate(selectedDate, 'dd/MM/yyyy')}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateTaskFromCalendar} className="space-y-3.5">
          <Input
            label="Tên công việc *"
            placeholder="Ví dụ: Họp nhóm dự án, Luyện nói tiếng Anh..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={newTaskStartTime}
              onChange={(e) => setNewTaskStartTime(e.target.value)}
            />
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Thời lượng ước tính
              </label>
              <select
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
                <option value="45">45 phút</option>
                <option value="60">1 giờ</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Độ ưu tiên
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsTaskModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Lưu vào lịch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
