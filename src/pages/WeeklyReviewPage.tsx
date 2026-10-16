import React, { useState, useEffect, useCallback } from 'react'
import {
  FileSpreadsheet,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Clock,
  HeartPulse,
} from 'lucide-react'
import { startOfWeek, endOfWeek, format, subWeeks, addWeeks } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { WeeklyReview } from '@/types/database'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { ProgressBar } from '@/components/common/ProgressBar'
import { formatViDate } from '@/lib/utils'

export const WeeklyReviewPage: React.FC = () => {
  const { user } = useAuth()
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date())

  const weekStart = startOfWeek(selectedWeekDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedWeekDate, { weekStartsOn: 1 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Real data metrics for this week
  const [completedTasksCount, setCompletedTasksCount] = useState(0)
  const [totalTasksCount, setTotalTasksCount] = useState(0)
  const [studyMinutes, setStudyMinutes] = useState(0)
  const [habitChecksCount, setHabitChecksCount] = useState(0)
  const [avgSleepHours, setAvgSleepHours] = useState<number | null>(null)
  const [goalsProgressedCount, setGoalsProgressedCount] = useState(0)

  // Form State
  const [review, setReview] = useState<Partial<WeeklyReview>>({
    week_start_date: weekStartStr,
    week_end_date: weekEndStr,
    what_went_well: '',
    what_was_difficult: '',
    what_i_learned: '',
    goal_needs_attention: '',
    what_to_change: '',
    top_priorities: '',
  })

  const loadWeeklyData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return

    try {
      // 1. Tasks in this week
      const { data: taskData } = await supabase
        .from('tasks')
        .select('status')
        .eq('user_id', user.id)
        .gte('due_date', weekStartStr)
        .lte('due_date', weekEndStr)

      if (taskData) {
        setTotalTasksCount(taskData.length)
        setCompletedTasksCount(taskData.filter((t) => t.status === 'completed').length)
      }

      // 2. Study minutes
      const { data: sessData } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('session_date', weekStartStr)
        .lte('session_date', weekEndStr)

      if (sessData) {
        const total = sessData.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)
        setStudyMinutes(total)
      }

      // 3. Habit check-ins
      const { count: hCount } = await supabase
        .from('habit_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('checkin_date', weekStartStr)
        .lte('checkin_date', weekEndStr)

      setHabitChecksCount(hCount || 0)

      // 4. Health logs (sleep avg)
      const { data: healthData } = await supabase
        .from('health_logs')
        .select('sleep_hours')
        .eq('user_id', user.id)
        .gte('log_date', weekStartStr)
        .lte('log_date', weekEndStr)

      if (healthData && healthData.length > 0) {
        const validSleep = healthData.filter((h) => h.sleep_hours !== null).map((h) => h.sleep_hours as number)
        if (validSleep.length > 0) {
          const avg = validSleep.reduce((a, b) => a + b, 0) / validSleep.length
          setAvgSleepHours(parseFloat(avg.toFixed(1)))
        } else {
          setAvgSleepHours(null)
        }
      } else {
        setAvgSleepHours(null)
      }

      // 5. Goals count
      const { count: gCount } = await supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'in_progress')

      setGoalsProgressedCount(gCount || 0)

      // 6. Existing review for this specific week
      const { data: existingReview } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartStr)
        .maybeSingle()

      if (existingReview) {
        setReview(existingReview)
      } else {
        setReview({
          week_start_date: weekStartStr,
          week_end_date: weekEndStr,
          what_went_well: '',
          what_was_difficult: '',
          what_i_learned: '',
          goal_needs_attention: '',
          what_to_change: '',
          top_priorities: '',
        })
      }
    } catch (err) {
      console.error('Error fetching weekly review:', err)
    }
  }, [user, weekStartStr, weekEndStr])

  useEffect(() => {
    loadWeeklyData()
  }, [loadWeeklyData])

  const handleSaveReview = async () => {
    if (!user || !isSupabaseConfigured()) return
    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('weekly_reviews')
        .upsert(
          {
            user_id: user.id,
            week_start_date: weekStartStr,
            week_end_date: weekEndStr,
            what_went_well: review.what_went_well,
            what_was_difficult: review.what_was_difficult,
            what_i_learned: review.what_i_learned,
            goal_needs_attention: review.goal_needs_attention,
            what_to_change: review.what_to_change,
            top_priorities: review.top_priorities,
          },
          { onConflict: 'user_id, week_start_date' }
        )
        .select()
        .single()

      if (!error && data) {
        setReview(data)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      }
    } catch (err) {
      console.error('Error saving weekly review:', err)
    } finally {
      setSaving(false)
    }
  }

  const completionPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header & Week Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Quy Trình Tổng Kết Tuần (Weekly Review)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tổng hợp dữ liệu tự động và tự vấn 6 câu hỏi định hướng cho tuần mới.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedWeekDate(subWeeks(selectedWeekDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs sm:text-sm font-bold text-white min-w-[170px] text-center">
            {formatViDate(weekStart, 'dd/MM')} - {formatViDate(weekEnd, 'dd/MM/yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedWeekDate(addWeeks(selectedWeekDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedWeekDate(new Date())}
          >
            Tuần này
          </Button>
        </div>
      </div>

      {/* Week Performance Cards based on actual data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Nhiệm vụ tuần</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {completedTasksCount} / {totalTasksCount}
              </span>
              <span className="text-xs font-bold text-indigo-400">{completionPct}%</span>
            </div>
            <ProgressBar value={completionPct} color="indigo" size="sm" />
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Thời lượng học tập</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-300 font-mono">
              {Math.floor(studyMinutes / 60)}h {studyMinutes % 60}p
            </div>
            <p className="text-xs text-slate-400 mt-1">Ghi nhận từ các phiên học</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Kỷ luật thói quen</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{habitChecksCount} lần</div>
            <p className="text-xs text-slate-400 mt-1">Tổng lượt check-in trong tuần</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Giấc ngủ trung bình</span>
            <HeartPulse className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-300 font-mono">
              {avgSleepHours ? `${avgSleepHours}h/đêm` : 'Chưa đủ data'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Dựa trên nhật ký thể chất</p>
          </div>
        </Card>
      </div>

      {/* 6 Guided Questions Form */}
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="1. Tuần này điều gì đã diễn ra tốt đẹp & đạt kết quả?"
            subtitle="Ghi nhận thành tựu và những việc bạn đã làm xuất sắc để duy trì năng lượng tích cực"
          />
          <textarea
            value={review.what_went_well || ''}
            onChange={(e) => setReview({ ...review, what_went_well: e.target.value })}
            placeholder="Những chiến thắng nhỏ, thói quen duy trì tốt, dự án tiến triển..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>

        <Card>
          <CardHeader
            title="2. Điều gì còn khó khăn hoặc gây cản trở sự tập trung?"
            subtitle="Phân tích nguyên nhân cội rễ một cách trung thực mà không tự phán xét bản thân"
          />
          <textarea
            value={review.what_was_difficult || ''}
            onChange={(e) => setReview({ ...review, what_was_difficult: e.target.value })}
            placeholder="Việc gì bị trì hoãn? Cơn xao nhãng đến từ đâu? Năng lượng giảm vào lúc nào?..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>

        <Card>
          <CardHeader
            title="3. Bạn đã học được bài học hoặc nhận thức gì mới?"
            subtitle="Đúc kết kinh nghiệm sống để tiến bộ hơn trong dài hạn"
          />
          <textarea
            value={review.what_i_learned || ''}
            onChange={(e) => setReview({ ...review, what_i_learned: e.target.value })}
            placeholder="Bài học về quản lý năng lượng, tư duy, phương pháp làm việc..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>

        <Card>
          <CardHeader
            title="4. Mục tiêu nào cần bạn dành nhiều sự quan tâm hơn?"
            subtitle="Kiểm tra lại mục tiêu quý / tháng đang bị bỏ quên hoặc chậm tiến độ"
          />
          <textarea
            value={review.goal_needs_attention || ''}
            onChange={(e) => setReview({ ...review, goal_needs_attention: e.target.value })}
            placeholder="Mục tiêu nào đang chậm tiến độ và cần hành động khẩn trương tuần tới?..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>

        <Card>
          <CardHeader
            title="5. Tuần tới bạn sẽ thay đổi điều gì để vận hành tốt hơn?"
            subtitle="1 hoặc 2 cải tiến cụ thể có thể thực hiện ngay lập tức"
          />
          <textarea
            value={review.what_to_change || ''}
            onChange={(e) => setReview({ ...review, what_to_change: e.target.value })}
            placeholder="Ví dụ: Tắt thông báo sau 21h, lên kế hoạch ngày từ tối hôm trước..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>

        <Card>
          <CardHeader
            title="6. 3 Ưu tiên lớn nhất cho tuần tiếp theo là gì?"
            subtitle="3 viên đá tảng cần giải quyết dứt điểm trong tuần mới"
          />
          <textarea
            value={review.top_priorities || ''}
            onChange={(e) => setReview({ ...review, top_priorities: e.target.value })}
            placeholder="1. Hoàn thành đề xuất dự án...&#10;2. Chạy bộ 3 buổi...&#10;3. Đọc hết chương 4 sách..."
            rows={3}
            className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>

        <div className="flex items-center justify-between pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Đã lưu báo cáo tổng kết tuần thành công!
            </span>
          )}
          <div className="ml-auto">
            <Button
              size="lg"
              onClick={handleSaveReview}
              isLoading={saving}
              leftIcon={<Save className="w-5 h-5" />}
            >
              Lưu báo cáo tổng kết tuần
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
