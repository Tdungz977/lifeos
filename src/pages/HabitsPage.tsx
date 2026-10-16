import React, { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  Plus,
  CheckCircle2,
  Calendar,
  Trash2,
  Award,
  Sparkles,
  TrendingUp,
  History,
  Edit2,
  Check,
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { HabitWithStats, getHabitsWithStats } from '@/services/habitService'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/common/Badge'
import { ProgressBar } from '@/components/common/ProgressBar'
import { EmptyState } from '@/components/common/EmptyState'
import confetti from 'canvas-confetti'

export const HabitsPage: React.FC = () => {
  const { user } = useAuth()
  const todayStr = new Date().toISOString().split('T')[0]

  const [habits, setHabits] = useState<HabitWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedHabitForHistory, setSelectedHabitForHistory] = useState<HabitWithStats | null>(null)

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('health')
  const [frequency, setFrequency] = useState('daily')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0])

  // Last 14 days for the check-in matrix
  const past14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i)
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: format(d, 'EEE', { locale: vi }),
      dayNum: format(d, 'd'),
    }
  })

  const loadHabits = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getHabitsWithStats(user.id, todayStr)
      setHabits(data)
    } catch (err) {
      console.error('Error fetching habits with stats:', err)
    } finally {
      setLoading(false)
    }
  }, [user, todayStr])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  const handleToggleCheckin = async (habitId: string, checkinDate: string) => {
    if (!user || !isSupabaseConfigured()) return

    const targetHabit = habits.find((h) => h.id === habitId)
    const isChecked = targetHabit?.recent_checkins.includes(checkinDate)

    if (isChecked) {
      await supabase
        .from('habit_checkins')
        .delete()
        .eq('habit_id', habitId)
        .eq('checkin_date', checkinDate)
        .eq('user_id', user.id)
    } else {
      if (checkinDate === todayStr) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        })
      }
      await supabase.from('habit_checkins').insert({
        habit_id: habitId,
        user_id: user.id,
        checkin_date: checkinDate,
      })
    }

    loadHabits()
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setCategory('health')
    setFrequency('daily')
    setSelectedDays([1, 2, 3, 4, 5, 6, 0])
    setIsModalOpen(true)
  }

  const handleOpenEdit = (habit: HabitWithStats) => {
    setEditingId(habit.id)
    setName(habit.name)
    setDescription(habit.description || '')
    setCategory(habit.category)
    setFrequency(habit.frequency)
    setSelectedDays(habit.schedule_days || [1, 2, 3, 4, 5, 6, 0])
    setIsModalOpen(true)
  }

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured()) return

    const payload = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      category,
      frequency: frequency as any,
      schedule_days: selectedDays,
      is_active: true,
    }

    if (editingId) {
      await supabase.from('habits').update(payload).eq('id', editingId).eq('user_id', user.id)
    } else {
      await supabase.from('habits').insert(payload)
    }

    setIsModalOpen(false)
    loadHabits()
  }

  const handleDeleteHabit = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thói quen này? Lịch sử check-in sẽ được gỡ bỏ.')) return
    if (!user || !isSupabaseConfigured()) return
    await supabase.from('habits').delete().eq('id', id).eq('user_id', user.id)
    loadHabits()
  }

  const toggleDaySelection = (dayNum: number) => {
    if (selectedDays.includes(dayNum)) {
      if (selectedDays.length === 1) return // Keep at least one day
      setSelectedDays(selectedDays.filter((d) => d !== dayNum))
    } else {
      setSelectedDays([...selectedDays, dayNum])
    }
  }

  const dayLabels = [
    { num: 1, label: 'T2' },
    { num: 2, label: 'T3' },
    { num: 3, label: 'T4' },
    { num: 4, label: 'T5' },
    { num: 5, label: 'T6' },
    { num: 6, label: 'T7' },
    { num: 0, label: 'CN' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Theo Dõi Thói Quen & Chuỗi Kỷ Luật</h1>
          <p className="text-xs text-slate-400 mt-1">
            Đo lường sự kiên trì qua chuỗi liên tục (Streaks) và phục hồi thói quen tích cực mà không tự phán xét.
          </p>
        </div>

        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Thêm thói quen mới
        </Button>
      </div>

      {/* Habits Stat Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Tổng số thói quen đang rèn luyện
          </div>
          <div className="text-2xl font-bold text-white">{habits.length} thói quen</div>
        </Card>

        <Card>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Chuỗi kỷ luật dài nhất hiện tại
          </div>
          <div className="text-2xl font-bold text-amber-400 flex items-center gap-1.5">
            <Flame className="w-6 h-6 fill-amber-400" />
            {Math.max(0, ...habits.map((h) => h.current_streak))} ngày liên tục
          </div>
        </Card>

        <Card>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Tỷ lệ duy trì trung bình 30 ngày
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {habits.length > 0
              ? Math.round(
                  habits.reduce((acc, h) => acc + h.completion_rate, 0) / habits.length
                )
              : 0}
            %
          </div>
        </Card>
      </div>

      {/* Main Habits Check-in Matrix */}
      <Card>
        <CardHeader
          title="Lưới Check-in Kỷ Luật (14 Ngày Gần Nhất)"
          subtitle="Nhấn vào các ô để hoàn thành hoặc xem chi tiết lịch sử"
          icon={<Flame className="w-4 h-4 text-amber-400" />}
        />

        {habits.length === 0 ? (
          <EmptyState
            icon={<Flame className="w-8 h-8 text-amber-400" />}
            title="Chưa có thói quen nào"
            description="Tạo thói quen đầu tiên: Đọc sách 20 trang, Uống 2L nước, Dậy sớm lúc 6h..."
            actionLabel="Tạo thói quen ngay"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3 min-w-[200px]">Thói quen</th>
                  <th className="py-3 px-3 text-center">Chuỗi hiện tại</th>
                  <th className="py-3 px-3 text-center">Tỷ lệ 30 ngày</th>
                  {past14Days.map((d) => (
                    <th key={d.date} className="py-2.5 px-1.5 text-center">
                      <div className="text-[10px] text-slate-400 uppercase">{d.label}</div>
                      <div className="text-[11px] font-bold text-slate-200 mt-0.5">{d.dayNum}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {habits.map((habit) => {
                  return (
                    <tr key={habit.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-100 text-sm">{habit.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                            {habit.category}
                          </span>
                          {habit.description && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              {habit.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Current & Longest Streak */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-extrabold text-amber-400 text-sm">
                          <Flame className="w-4 h-4 fill-amber-400" />
                          <span>{habit.current_streak}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Kỷ lục: {habit.longest_streak}</div>
                      </td>

                      {/* Completion Rate 30 days */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-200">{habit.completion_rate}%</span>
                      </td>

                      {/* 14 Check-in boxes */}
                      {past14Days.map((d) => {
                        const isChecked = habit.recent_checkins.includes(d.date)
                        const isToday = d.date === todayStr

                        return (
                          <td key={d.date} className="py-3 px-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCheckin(habit.id, d.date)}
                              className={`w-6 h-6 rounded-md border inline-flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                                  : isToday
                                  ? 'bg-slate-900 border-amber-500/40 hover:border-amber-400 text-transparent'
                                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )
                      })}

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedHabitForHistory(habit)}
                            className="p-1.5 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                            title="Xem lịch sử đầy đủ"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(habit)}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            title="Sửa thói quen"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                            title="Xóa thói quen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Positive Psychology Mindset Callout */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
        <div>
          <p className="font-semibold text-slate-200">Nguyên tắc phục hồi thói quen (Never Miss Twice):</p>
          <p className="text-slate-400 mt-0.5">
            Bỏ lỡ một ngày là sự cố ngẫu nhiên, nhưng bỏ lỡ ngày thứ hai liên tiếp là khởi đầu cho một thói quen xấu mới. Hãy khôi phục ngay ngày hôm sau mà không cần mang cảm giác tội lỗi!
          </p>
        </div>
      </div>

      {/* Habit Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Chỉnh Sửa Thói Quen' : 'Thêm Thói Quen Mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveHabit} className="space-y-4">
          <Input
            label="Tên thói quen *"
            placeholder="Ví dụ: Đọc sách 20 trang, Chạy bộ 2km, Thiền định 10p..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Lợi ích / Ghi chú
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thói quen này mang lại thay đổi gì cho bạn?..."
              rows={2}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Lĩnh vực
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="health">Sức khỏe & Thể chất</option>
              <option value="productivity">Năng suất & Công việc</option>
              <option value="mindset">Tâm trí & Cảm xúc</option>
              <option value="learning">Học tập & Đọc sách</option>
            </select>
          </div>

          {/* Schedule days selector */}
          <div className="space-y-2 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Các ngày áp dụng trong tuần
            </label>
            <div className="flex gap-2">
              {dayLabels.map((d) => {
                const isSelected = selectedDays.includes(d.num)
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDaySelection(d.num)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingId ? 'Cập nhật' : 'Lưu thói quen'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Habit History Modal */}
      {selectedHabitForHistory && (
        <Modal
          isOpen={Boolean(selectedHabitForHistory)}
          onClose={() => setSelectedHabitForHistory(null)}
          title={`Lịch Sử: ${selectedHabitForHistory.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <div>
                <span className="text-slate-400">Chuỗi hiện tại</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">
                  {selectedHabitForHistory.current_streak} ngày
                </p>
              </div>
              <div>
                <span className="text-slate-400">Chuỗi kỷ lục</span>
                <p className="text-lg font-bold text-indigo-400 mt-0.5">
                  {selectedHabitForHistory.longest_streak} ngày
                </p>
              </div>
              <div>
                <span className="text-slate-400">Tổng check-in</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {selectedHabitForHistory.total_checkins} lần
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-slate-300">Các ngày check-in gần đây:</span>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-lg bg-slate-950 border border-slate-800">
                {selectedHabitForHistory.recent_checkins.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-mono"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="secondary" onClick={() => setSelectedHabitForHistory(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
