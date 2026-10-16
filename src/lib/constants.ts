import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Calendar,
  Bot,
  TrendingUp,
  GraduationCap,
  HeartPulse,
  Flame,
  FileSpreadsheet,
  Settings,
} from 'lucide-react'

export const PRIMARY_NAVIGATION_ITEMS = [
  { id: 'overview', path: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'moon', path: '/moon', label: 'Trợ lý Moon 🌙', icon: Bot },
  { id: 'today', path: '/today', label: 'Kế hoạch hôm nay', icon: CheckSquare },
  { id: 'goals', path: '/goals', label: 'Mục tiêu', icon: Target },
  { id: 'calendar', path: '/calendar', label: 'Lịch', icon: Calendar },
]

export const SECONDARY_NAVIGATION_ITEMS = [
  { id: 'habits', path: '/habits', label: 'Thói quen', icon: Flame },
  { id: 'learning', path: '/learning', label: 'Học tập', icon: GraduationCap },
  { id: 'health', path: '/health', label: 'Sức khỏe', icon: HeartPulse },
  { id: 'progress', path: '/progress', label: 'Tiến độ', icon: TrendingUp },
  { id: 'weekly-review', path: '/weekly-review', label: 'Tổng kết tuần', icon: FileSpreadsheet },
]

export const NAVIGATION_ITEMS = [
  ...PRIMARY_NAVIGATION_ITEMS,
  ...SECONDARY_NAVIGATION_ITEMS,
  { id: 'settings', path: '/settings', label: 'Cài đặt', icon: Settings },
]

export const GOAL_CATEGORIES = [
  { value: 'education', label: 'Giáo dục & Học tập', color: 'indigo' },
  { value: 'career', label: 'Sự nghiệp & Công việc', color: 'blue' },
  { value: 'health', label: 'Sức khỏe & Thể chất', color: 'emerald' },
  { value: 'personal', label: 'Phát triển cá nhân', color: 'amber' },
  { value: 'finance', label: 'Tài chính cá nhân', color: 'purple' },
  { value: 'relationships', label: 'Mối quan hệ & Đời sống', color: 'rose' },
]

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Thấp', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' },
  { value: 'medium', label: 'Trung bình', badgeClass: 'bg-blue-950/60 text-blue-400 border-blue-800/50' },
  { value: 'high', label: 'Cao', badgeClass: 'bg-amber-950/60 text-amber-400 border-amber-800/50' },
  { value: 'urgent', label: 'Khẩn cấp', badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-800/50' },
]

export const GOAL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Chưa bắt đầu', color: 'text-slate-400 bg-slate-800/50 border-slate-700' },
  in_progress: { label: 'Đang thực hiện', color: 'text-blue-400 bg-blue-950/40 border-blue-800/50' },
  completed: { label: 'Hoàn thành', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
  paused: { label: 'Tạm dừng', color: 'text-amber-400 bg-amber-950/40 border-amber-800/50' },
  overdue: { label: 'Quá hạn', color: 'text-rose-400 bg-rose-950/40 border-rose-800/50' },
}

export const TASK_STATUS_MAP: Record<string, { label: string }> = {
  pending: { label: 'Chờ thực hiện' },
  in_progress: { label: 'Đang làm' },
  completed: { label: 'Đã hoàn thành' },
  cancelled: { label: 'Đã hủy' },
}
