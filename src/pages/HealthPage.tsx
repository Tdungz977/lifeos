import React, { useState, useEffect, useCallback } from 'react'
import {
  HeartPulse,
  Moon,
  Droplets,
  Activity,
  Smile,
  Frown,
  Meh,
  Save,
  Plus,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { HealthLog, Mood } from '@/types/database'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatViDate } from '@/lib/utils'

export const HealthPage: React.FC = () => {
  const { user } = useAuth()
  const todayStr = new Date().toISOString().split('T')[0]

  const [todayLog, setTodayLog] = useState<Partial<HealthLog>>({
    log_date: todayStr,
    sleep_hours: 7.5,
    bedtime: '23:00',
    wake_time: '06:30',
    water_ml: 1500,
    steps: 6000,
    exercise_minutes: 30,
    energy_level: 8,
    mood: 'good',
    notes: '',
  })
  const [history, setHistory] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const fetchHealthLogs = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const startDate = format(subDays(new Date(), 14), 'yyyy-MM-dd')

      const { data } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', startDate)
        .order('log_date', { ascending: false })

      if (data) {
        setHistory(data)
        const current = data.find((l) => l.log_date === todayStr)
        if (current) {
          setTodayLog(current)
        }
      }
    } catch (err) {
      console.error('Error fetching health logs:', err)
    } finally {
      setLoading(false)
    }
  }, [user, todayStr])

  useEffect(() => {
    fetchHealthLogs()
  }, [fetchHealthLogs])

  const handleSaveLog = async () => {
    if (!user || !isSupabaseConfigured()) return
    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('health_logs')
        .upsert(
          {
            user_id: user.id,
            log_date: todayStr,
            sleep_hours: Number(todayLog.sleep_hours) || null,
            bedtime: todayLog.bedtime || null,
            wake_time: todayLog.wake_time || null,
            water_ml: Number(todayLog.water_ml) || null,
            steps: Number(todayLog.steps) || null,
            exercise_minutes: Number(todayLog.exercise_minutes) || null,
            energy_level: Number(todayLog.energy_level) || null,
            mood: todayLog.mood || null,
            notes: todayLog.notes || null,
          },
          { onConflict: 'user_id, log_date' }
        )
        .select()
        .single()

      if (!error && data) {
        setTodayLog(data)
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 2000)
        fetchHealthLogs()
      }
    } catch (err) {
      console.error('Error saving health log:', err)
    } finally {
      setSaving(false)
    }
  }

  const addWater = (amount: number) => {
    const nextVal = (Number(todayLog.water_ml) || 0) + amount
    setTodayLog({ ...todayLog, water_ml: nextVal })
  }

  const moodIcons: Record<Mood, { label: string; icon: any; color: string }> = {
    great: { label: 'Tuyệt vời', icon: Smile, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' },
    good: { label: 'Tốt', icon: Smile, color: 'text-blue-400 bg-blue-950/40 border-blue-800' },
    neutral: { label: 'Bình thường', icon: Meh, color: 'text-amber-400 bg-amber-950/40 border-amber-800' },
    low: { label: 'Hơi mệt', icon: Frown, color: 'text-rose-400 bg-rose-950/40 border-rose-800' },
    tired: { label: 'Kiệt sức', icon: Frown, color: 'text-purple-400 bg-purple-950/40 border-purple-800' },
  }

  // 7-day trend chart data
  const trendData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const item = history.find((h) => h.log_date === dateStr)
    return {
      date: format(d, 'EEE dd/MM', { locale: vi }),
      'Giấc ngủ (h)': item?.sleep_hours || 0,
      'Nước uống (L)': item?.water_ml ? item.water_ml / 1000 : 0,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Theo Dõi Thể Chất & Sức Khỏe</h1>
          <p className="text-xs text-slate-400 mt-1">
            Không gian ghi chép sức khỏe cá nhân, giấc ngủ, lượng nước và năng lượng hàng ngày.
          </p>
        </div>

        <Button
          onClick={handleSaveLog}
          isLoading={saving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          {savedSuccess ? 'Đã lưu thành công!' : 'Lưu nhật ký hôm nay'}
        </Button>
      </div>

      {/* Main Today Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sleep Card */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Giấc ngủ đêm qua</span>
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{todayLog.sleep_hours || 0}</span>
              <span className="text-xs text-slate-400">giờ / mục tiêu 8h</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="0.5"
              value={todayLog.sleep_hours || 7}
              onChange={(e) => setTodayLog({ ...todayLog, sleep_hours: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400 block">Đi ngủ</span>
                <input
                  type="time"
                  value={todayLog.bedtime || ''}
                  onChange={(e) => setTodayLog({ ...todayLog, bedtime: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-xs w-full"
                />
              </div>
              <div>
                <span className="text-slate-400 block">Thức dậy</span>
                <input
                  type="time"
                  value={todayLog.wake_time || ''}
                  onChange={(e) => setTodayLog({ ...todayLog, wake_time: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-xs w-full"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Water Intake Card */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Nước uống</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{todayLog.water_ml || 0}</span>
              <span className="text-xs text-slate-400">ml / mục tiêu 2000ml</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addWater(250)}
                className="flex-1 py-1 px-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-xs text-blue-300 font-semibold"
              >
                +250ml
              </button>
              <button
                type="button"
                onClick={() => addWater(500)}
                className="flex-1 py-1 px-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-xs text-blue-300 font-semibold"
              >
                +500ml
              </button>
            </div>
          </div>
        </Card>

        {/* Steps & Exercise Card */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vận động thể chất</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{todayLog.exercise_minutes || 0}</span>
              <span className="text-xs text-slate-400">phút tập</span>
              <span className="text-xs text-slate-400 ml-auto">
                {todayLog.steps || 0} bước
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Phút tập"
                value={todayLog.exercise_minutes || ''}
                onChange={(e) => setTodayLog({ ...todayLog, exercise_minutes: parseInt(e.target.value) || 0 })}
                className="bg-[#101726]/80 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              />
              <input
                type="number"
                placeholder="Số bước"
                value={todayLog.steps || ''}
                onChange={(e) => setTodayLog({ ...todayLog, steps: parseInt(e.target.value) || 0 })}
                className="bg-[#101726]/80 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              />
            </div>
          </div>
        </Card>

        {/* Energy Level (1-10) */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mức năng lượng</span>
            <HeartPulse className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{todayLog.energy_level || 5}</span>
              <span className="text-xs text-slate-400">/ 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={todayLog.energy_level || 5}
              onChange={(e) => setTodayLog({ ...todayLog, energy_level: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 text-center">
              {(todayLog.energy_level || 5) >= 8
                ? 'Tràn đầy năng lượng, sẵn sàng bứt phá'
                : (todayLog.energy_level || 5) >= 5
                ? 'Mức ổn định, tập trung đều đặn'
                : 'Cần nghỉ ngơi và sạc lại năng lượng'}
            </p>
          </div>
        </Card>
      </div>

      {/* Mood Selector & Wellness Note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Tâm Trạng & Cảm Xúc Hôm Nay"
            subtitle="Ghi nhận trạng thái tâm lý để nhận biết chu kỳ năng lượng"
          />
          <div className="grid grid-cols-5 gap-2 pt-1">
            {(Object.keys(moodIcons) as Mood[]).map((m) => {
              const Icon = moodIcons[m].icon
              const isSelected = todayLog.mood === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTodayLog({ ...todayLog, mood: m })}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? moodIcons[m].color + ' ring-2 ring-indigo-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{moodIcons[m].label}</span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Ghi Chú Sức Khỏe & Thể Trạng"
            subtitle="Dấu hiệu cơ thể, cảm giác sau khi tập hoặc triệu chứng mệt mỏi"
          />
          <textarea
            value={todayLog.notes || ''}
            onChange={(e) => setTodayLog({ ...todayLog, notes: e.target.value })}
            placeholder="Ví dụ: Hôm nay cảm thấy nhẹ nhõm sau khi chạy bộ, cần ngủ sớm trước 23h..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>
      </div>

      {/* 7-Day Trend Chart */}
      <Card>
        <CardHeader
          title="Xu Hướng Giấc Ngủ & Lượng Nước 7 Ngày Qua"
          subtitle="Đối chiếu dữ liệu để nhận biết quy luật sinh học của bản thân"
          icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
        />
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Bar dataKey="Giấc ngủ (h)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Nước uống (L)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
