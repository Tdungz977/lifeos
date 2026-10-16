import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Calendar,
  PieChart as PieChartIcon,
  Award,
  Clock,
  Target,
  Flame,
  AlertCircle,
  HelpCircle,
  GraduationCap,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { subDays, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Task, HabitCheckin, Goal, StudySession } from '@/types/database'
import { Card, CardHeader } from '@/components/common/Card'
import { ProgressBar } from '@/components/common/ProgressBar'
import { EmptyState } from '@/components/common/EmptyState'

const CATEGORY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

type RangeOption = 7 | 14 | 30 | 90

export const ProgressPage: React.FC = () => {
  const { user } = useAuth()
  const [rangeDays, setRangeDays] = useState<RangeOption>(7)
  const [tasks, setTasks] = useState<Task[]>([])
  const [checkins, setCheckins] = useState<HabitCheckin[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [overdueCount, setOverdueCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchAnalyticsData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const startDate = format(subDays(new Date(), rangeDays), 'yyyy-MM-dd')
      const todayStr = format(new Date(), 'yyyy-MM-dd')

      const [taskRes, checkinRes, goalRes, studyRes, overdueRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .gte('due_date', startDate),
        supabase
          .from('habit_checkins')
          .select('*')
          .eq('user_id', user.id)
          .gte('checkin_date', startDate),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false),
        supabase
          .from('study_sessions')
          .select('*, subject:subjects(name)')
          .eq('user_id', user.id)
          .gte('session_date', startDate),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lt('due_date', todayStr)
          .neq('status', 'completed')
          .neq('status', 'cancelled'),
      ])

      if (taskRes.data) setTasks(taskRes.data)
      if (checkinRes.data) setCheckins(checkinRes.data)
      if (goalRes.data) setGoals(goalRes.data)
      if (studyRes.data) setStudySessions(studyRes.data)
      setOverdueCount(overdueRes.count || 0)
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [user, rangeDays])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  // Aggregate daily timeline data
  const timelineData = Array.from({ length: rangeDays }).map((_, i) => {
    const d = subDays(new Date(), rangeDays - 1 - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const dayTasks = tasks.filter((t) => t.due_date === dateStr)
    const completedTasks = dayTasks.filter((t) => t.status === 'completed').length
    const dayCheckins = checkins.filter((c) => c.checkin_date === dateStr).length

    const dayStudyMins = studySessions
      .filter((s) => s.session_date === dateStr)
      .reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

    return {
      date: format(d, rangeDays <= 14 ? 'EEE dd/MM' : 'dd/MM', { locale: vi }),
      'Nhiệm vụ hoàn thành': completedTasks,
      'Tổng nhiệm vụ': dayTasks.length,
      'Thói quen xong': dayCheckins,
      'Thời gian học (giờ)': parseFloat((dayStudyMins / 60).toFixed(1)),
    }
  })

  // Category breakdown for tasks
  const categoryCounts: Record<string, number> = {}
  tasks.forEach((t) => {
    const cat = t.category || 'Chung'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })

  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name: name === 'work' ? 'Công việc' : name === 'study' ? 'Học tập' : name === 'health' ? 'Sức khỏe' : name === 'personal' ? 'Cá nhân' : name,
    value,
  }))

  // Metrics calculations from real data
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalStudyMinutes = studySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)
  const averageGoalProgress =
    goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.current_value || 0), 0) / goals.length) : 0

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Phân Tích Tiến Độ & Năng Suất</h1>
          <p className="text-xs text-slate-400 mt-1">
            Báo cáo trực quan hóa dựa trên 100% dữ liệu thực tế ghi nhận từ hệ thống LIFEOS.
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {([7, 14, 30, 90] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRangeDays(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                rangeDays === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 7 ? '7 ngày' : r === 14 ? '14 ngày' : r === 30 ? '30 ngày' : '90 ngày'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards with Methodology Explanations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Task Completion Rate */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tỷ lệ xong việc</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white">{taskCompletionRate}%</div>
            <ProgressBar value={taskCompletionRate} color="indigo" size="sm" />
            <p className="text-[10px] text-slate-400 pt-1">
              {completedTasks}/{totalTasks} việc trong {rangeDays} ngày
            </p>
          </div>
        </Card>

        {/* KPI 2: Total Study Time */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Thời gian học</span>
            <GraduationCap className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-300 font-mono">
              {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}p
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Từ {studySessions.length} phiên học tập
            </p>
          </div>
        </Card>

        {/* KPI 3: Habit Consistency */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Kỷ luật thói quen</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{checkins.length} lần</div>
            <p className="text-[10px] text-slate-400 mt-1">Tổng lượt check-in ghi nhận</p>
          </div>
        </Card>

        {/* KPI 4: Average Goal Progress */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tiến độ mục tiêu</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{averageGoalProgress}%</div>
            <p className="text-[10px] text-slate-400 mt-1">Trung bình của {goals.length} mục tiêu</p>
          </div>
        </Card>

        {/* KPI 5: Overdue Count */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Việc quá hạn</span>
            <AlertCircle className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {overdueCount} việc
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {overdueCount > 0 ? 'Cần sắp xếp lại lịch' : 'Không có việc trễ hạn'}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Biểu Đồ Xu Hướng Hoàn Thành Kế Hoạch Theo Ngày"
            subtitle="Số lượng nhiệm vụ hoàn thành so với tổng số lượng dự kiến đã lập"
            icon={<BarChart3 className="w-4 h-4 text-indigo-400" />}
          />

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  name="Nhiệm vụ hoàn thành"
                  dataKey="Nhiệm vụ hoàn thành"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDone)"
                />
                <Area
                  type="monotone"
                  name="Tổng nhiệm vụ"
                  dataKey="Tổng nhiệm vụ"
                  stroke="#475569"
                  strokeWidth={1}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Task Allocation by Category (1 col) */}
        <Card>
          <CardHeader
            title="Phân Bổ Theo Danh Mục"
            subtitle="Tỷ trọng công việc theo từng trụ cột"
            icon={<PieChartIcon className="w-4 h-4 text-indigo-400" />}
          />

          {pieData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">
              Chưa có dữ liệu danh mục trong chu kỳ này.
            </div>
          ) : (
            <div className="h-64 w-full flex flex-col justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {pieData.map((item, idx) => (
                  <span
                    key={item.name}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                    />
                    {item.name} ({item.value})
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Secondary Chart: Study Hours & Habits by Day */}
      <Card>
        <CardHeader
          title="Thời Lượng Học Tập & Check-in Thói Quen Theo Ngày"
          subtitle="Đối chiếu thời gian rèn luyện tri thức và số lượng thói quen duy trì"
          icon={<Clock className="w-4 h-4 text-purple-400" />}
        />

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Thời gian học (giờ)" fill="#818cf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Thói quen xong" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Calculation Transparency & Supportive Philosophy */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span>Phương pháp tính toán chỉ số và triết lý LIFEOS:</span>
        </div>
        <p>
          • <strong>Tỷ lệ hoàn thành</strong> = (Tổng nhiệm vụ có trạng thái Hoàn thành / Tổng số nhiệm vụ được lập) × 100%.
        </p>
        <p>
          • <strong>Tiến độ mục tiêu</strong> = Tự động tính theo tỷ lệ nhiệm vụ liên kết hoàn thành, hoặc điểm mốc thủ công.
        </p>
        <p className="text-indigo-300 pt-1">
          • <em>Một ngày chưa hoàn hảo không phải là thất bại. Điều cốt lõi là duy trì sự nhất quán và quay trở lại nhịp kỷ luật ngay ngày hôm sau!</em>
        </p>
      </div>
    </div>
  )
}
