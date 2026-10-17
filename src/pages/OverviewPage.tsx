import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { useAuth } from '@/context/AuthContext'
import { QuickAddModal } from '@/components/modals/QuickAddModal'
import { ambientAudioService } from '@/services/ambientAudioService'
import { formatViDate } from '@/lib/utils'

interface PriorityTask {
  id: string
  title: string
  tag: string
  estimate: string
  completed: boolean
  isStar?: boolean
  completedAt?: string
}

interface RoutineItem {
  id: string
  title: string
  note: string
  completed: boolean
}

interface TimeBlock {
  id: string
  time: string
  category: 'plan' | 'deep' | 'break' | 'lunch' | 'meeting' | 'admin' | 'shutdown'
  categoryLabel?: string
  timeRange?: string
  title: string
  subtitle?: string
  completed?: boolean
  isActive?: boolean
  members?: string[]
  durationMinutes?: number
}

const INITIAL_PRIORITY_TASKS: PriorityTask[] = [
  {
    id: 'p1',
    title: 'Thiết kế UI Flow onboarding FinTech',
    tag: '#Design',
    estimate: 'Ước tính: 2h30m',
    completed: false,
    isStar: true,
  },
  {
    id: 'p2',
    title: 'Chuẩn bị slide cho buổi Design Review',
    tag: '#Presentation',
    estimate: 'Ước tính: 45m',
    completed: false,
  },
  {
    id: 'p3',
    title: 'Cập nhật tài liệu Design Tokens v2.4',
    tag: '#System',
    estimate: 'Ước tính: 1h30m',
    completed: false,
  },
  {
    id: 'p4',
    title: 'Duyệt pull request icons mới từ Agency',
    tag: '#Review',
    estimate: 'Đã xong lúc 08:45',
    completed: true,
    completedAt: '08:45',
  },
]

const INITIAL_ROUTINE_ITEMS: RoutineItem[] = [
  {
    id: 'r1',
    title: 'Đọc sách chuyên môn 20 phút',
    note: 'Atomic Habits',
    completed: true,
  },
  {
    id: 'r2',
    title: 'Viết nhật ký định hướng ngày (Morning Journal)',
    note: '3 ý chính',
    completed: true,
  },
  {
    id: 'r3',
    title: 'Kiểm tra email & tin nhắn theo mẻ (Batch check)',
    note: 'In-box Zero',
    completed: true,
  },
]

const INITIAL_TIME_BLOCKS: TimeBlock[] = [
  {
    id: 'b1',
    time: '08:00',
    category: 'plan',
    title: 'Lập kế hoạch ngày & Lọc hộp thư đến',
    subtitle: 'Xử lý 8 email quan trọng, cập nhật Notion sprint board',
    completed: true,
  },
  {
    id: 'b2',
    time: '09:00',
    category: 'deep',
    categoryLabel: 'Khối Deep Work #1',
    timeRange: '09:00 - 11:30 (2h30m)',
    title: 'Thiết kế UI Flow onboarding dự án FinTech',
    subtitle: 'Đang chạy Pomodoro lượt 3. Không kiểm tra Slack hay thông báo ngoài.',
    isActive: true,
  },
  {
    id: 'b3',
    time: '11:30',
    category: 'break',
    title: 'Nghỉ giãn cơ & Đi dạo nhẹ',
    subtitle: '30 phút',
  },
  {
    id: 'b4',
    time: '12:00',
    category: 'lunch',
    title: 'Bữa trưa & Nghỉ trưa không màn hình',
    subtitle: '12:00 - 13:30',
  },
  {
    id: 'b5',
    time: '13:30',
    category: 'meeting',
    categoryLabel: 'Họp & Đồng bộ',
    timeRange: '13:30 - 14:30',
    title: 'Design Review Sprint 14 với Engineering & Product',
    subtitle: 'Trình bày prototyping token styles, bàn giao assets Figma.',
    members: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAHgITtO2ClrTB1T-8mMp2THTA8aU9xPQYLpAYUIGsiO3E1Bxf3quUY1wph2Se8EBZ9e_qhGjfRmB-Rdv6UbcorhNQUrI060Y_PrdtmHKtVKm1ewoILO3Vxq4aSkEUtLpqXEvMaN_F28MhHGpVMYHXtBf_rruuWzfU_ZkIzCJGA6szfQ_0A-YKT-6vhnCellwCi4Yd04NQeV8fdrjuFuX7NN6miReiiZVt9hwtJHVl6J39qsDw6Jt1n',
    ],
  },
  {
    id: 'b6',
    time: '15:00',
    category: 'admin',
    categoryLabel: 'Tài liệu & Đề xuất',
    timeRange: '15:00 - 17:00',
    title: 'Soạn thảo tài liệu Design System Guidelines v2.4',
  },
  {
    id: 'b7',
    time: '17:30',
    category: 'shutdown',
    title: 'Nghi thức đóng ngày (Daily Shutdown Ritual) & Dọn dẹp tab',
    subtitle: '30 phút',
  },
]

export const OverviewPage: React.FC = () => {
  const { user, profile } = useAuth()
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Pomodoro States
  const [pomoMode, setPomoMode] = useState<'pomo' | 'short' | 'long'>('pomo')
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [pomoCycle, setPomoCycle] = useState(3)

  // Tasks and Lists
  const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>(INITIAL_PRIORITY_TASKS)
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>(INITIAL_ROUTINE_ITEMS)
  const [timeBlocks] = useState<TimeBlock[]>(INITIAL_TIME_BLOCKS)

  // Ambient Audio
  const [activeSound, setActiveSound] = useState<'rain' | 'cafe' | 'waves'>('rain')
  const [isPlayingSound, setIsPlayingSound] = useState(false)
  const [soundVolume, setSoundVolume] = useState(65)

  // Total circumference for circle ring (2 * PI * r = 2 * 3.14159 * 42 = 263.89)
  const totalCircumference = 263.89
  const progressRatio = (totalSeconds - remainingSeconds) / totalSeconds
  const strokeOffset = totalCircumference - progressRatio * totalCircumference

  // Pomodoro Timer Interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isTimerRunning) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning])

  const handleSwitchPomoMode = (mode: 'pomo' | 'short' | 'long') => {
    setIsTimerRunning(false)
    setPomoMode(mode)
    let secs = 25 * 60
    if (mode === 'short') secs = 5 * 60
    if (mode === 'long') secs = 15 * 60
    setTotalSeconds(secs)
    setRemainingSeconds(secs)
  }

  const handleResetTimer = () => {
    setIsTimerRunning(false)
    setRemainingSeconds(totalSeconds)
  }

  const formatTimerDisplay = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Task Checkbox Toggle
  const togglePriorityTask = (id: string) => {
    setPriorityTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const toggleRoutineItem = (id: string) => {
    setRoutineItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    )
  }

  // Ambient Audio Controls
  const toggleAmbientSound = (soundType?: 'rain' | 'cafe' | 'waves') => {
    const targetType = soundType || activeSound
    if (isPlayingSound && targetType === activeSound) {
      ambientAudioService.stop()
      setIsPlayingSound(false)
    } else {
      setActiveSound(targetType)
      ambientAudioService.play(targetType, soundVolume)
      setIsPlayingSound(true)
    }
  }

  const handleVolumeChange = (vol: number) => {
    setSoundVolume(vol)
    ambientAudioService.setVolume(vol)
  }

  useEffect(() => {
    return () => {
      ambientAudioService.stop()
    }
  }, [])

  const completedTasksCount = priorityTasks.filter((t) => t.completed).length
  const totalTasksCount = priorityTasks.length
  const routineDoneCount = routineItems.filter((r) => r.completed).length

  return (
    <div className="flex flex-col w-full bg-background min-h-screen text-on-surface antialiased -m-4 md:-m-8 p-4 md:p-8 animate-fade-in">
      <div className="flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
        {/* 1. Hero Widget / Focus Timer Bar */}
        <section className="relative overflow-hidden bg-surface-container-lowest rounded-xl shadow-md p-space-lg border border-slate-200/80">
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary/5 blur-3xl pointer-events-none"></div>
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-secondary-container/5 blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-lg">
            {/* Active Task Meta */}
            <div className="flex flex-col gap-space-xs max-w-xl">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-fixed text-secondary font-label-sm text-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                  Đang thực hiện
                </span>
                <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">
                  #Design
                </span>
                <span className="flex items-center gap-0.5 text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-body-sm">schedule</span>
                  còn ~2h
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                Thiết kế UI Flow onboarding dự án FinTech
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-1">
                Hoàn thiện 4 màn hình chính, rà soát hệ thống micro-interactions và flow xác thực danh tính eKYC.
              </p>
            </div>

            {/* Pomodoro Interactive Area */}
            <div className="flex flex-col sm:flex-row items-center gap-space-lg bg-surface-container-low px-space-lg py-space-md rounded-xl w-full xl:w-auto justify-between sm:justify-start border border-slate-200/60">
              {/* Mode switcher */}
              <div className="flex flex-col gap-space-sm items-center sm:items-start">
                <div className="inline-flex p-1 bg-surface-container-highest rounded-full text-on-surface-variant font-label-sm text-label-sm">
                  <button
                    onClick={() => handleSwitchPomoMode('pomo')}
                    className={`px-space-sm py-1 rounded-full transition-all cursor-pointer ${
                      pomoMode === 'pomo'
                        ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    Pomodoro
                  </button>
                  <button
                    onClick={() => handleSwitchPomoMode('short')}
                    className={`px-space-sm py-1 rounded-full transition-all cursor-pointer ${
                      pomoMode === 'short'
                        ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    Nghỉ ngắn (5m)
                  </button>
                  <button
                    onClick={() => handleSwitchPomoMode('long')}
                    className={`px-space-sm py-1 rounded-full transition-all cursor-pointer ${
                      pomoMode === 'long'
                        ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    Nghỉ dài (15m)
                  </button>
                </div>
                <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-body-sm text-secondary">check_circle</span>
                  <span>Chu kỳ {pomoCycle}/4 trước khi nghỉ dài</span>
                </div>
              </div>

              {/* Timer & Action Button */}
              <div className="flex items-center gap-space-md">
                {/* Circular Progress Ring with Digit */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-surface-container-high"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="5"
                    ></circle>
                    <circle
                      className="text-secondary transition-all duration-300"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="42"
                      stroke="currentColor"
                      strokeDasharray={totalCircumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      strokeWidth="5"
                    ></circle>
                  </svg>
                  <span className="absolute font-timer-mono text-headline-sm text-on-surface font-semibold tracking-tighter">
                    {formatTimerDisplay(remainingSeconds)}
                  </span>
                </div>

                {/* Start/Pause & Skip Controls */}
                <div className="flex flex-col gap-space-xs">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="flex items-center justify-center gap-space-xs h-10 px-space-lg rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:opacity-90 transition-all cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-title-md">
                      {isTimerRunning ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isTimerRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
                  </button>
                  <button
                    onClick={handleResetTimer}
                    className="flex items-center justify-center gap-1 text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm py-1 transition-colors cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-body-sm">skip_next</span>
                    <span>Bỏ qua</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Thẻ chỉ số nhanh (Metric Cards - 4 Cột) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Metric 1: Thời gian tập trung */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Thời gian tập trung
              </span>
              <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-title-md">timelapse</span>
              </div>
            </div>
            <div className="my-space-sm flex items-baseline justify-between">
              <span className="font-display-hero text-headline-lg text-on-surface font-bold tracking-tight">
                5.2<span className="font-title-md text-title-md font-normal text-on-surface-variant ml-1">giờ</span>
              </span>
              <span className="inline-flex items-center gap-0.5 px-space-xs py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-body-sm">arrow_upward</span>
                +18%
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span>Kế hoạch: 6.5h</span>
              <span className="font-semibold text-on-surface">80% chỉ tiêu</span>
            </div>
          </div>

          {/* Metric 2: Tác vụ hôm nay */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Tác vụ hôm nay
              </span>
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-title-md">task_alt</span>
              </div>
            </div>
            <div className="my-space-sm flex items-baseline justify-between">
              <span className="font-display-hero text-headline-lg text-on-surface font-bold tracking-tight">
                7<span className="font-title-md text-title-md font-normal text-on-surface-variant ml-1">/ 10 việc</span>
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">70%</span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
              <div className="bg-on-surface h-full rounded-full w-[70%]"></div>
            </div>
          </div>

          {/* Metric 3: Daily Streak */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Chuỗi tập trung
              </span>
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-title-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
              </div>
            </div>
            <div className="my-space-sm flex items-baseline justify-between">
              <span className="font-display-hero text-headline-lg text-on-surface font-bold tracking-tight">
                14<span className="font-title-md text-title-md font-normal text-on-surface-variant ml-1">ngày liên tiếp</span>
              </span>
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface font-semibold">
                Kỷ lục mới
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
              ))}
              <span className="font-body-sm text-body-sm text-on-surface-variant ml-1">Tuần hoàn hảo</span>
            </div>
          </div>

          {/* Metric 4: Focus Score */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Điểm hiệu suất
              </span>
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-title-md">auto_graph</span>
              </div>
            </div>
            <div className="my-space-sm flex items-baseline justify-between">
              <span className="font-display-hero text-headline-lg text-on-surface font-bold tracking-tight">
                92<span className="font-title-md text-title-md font-normal text-on-surface-variant ml-1">/100</span>
              </span>
              <span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed text-secondary font-label-sm text-label-sm font-semibold">
                Xuất sắc
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span>Ít sao nhãng (-42%)</span>
              <span className="text-on-surface font-semibold">Cấp 4 Flow</span>
            </div>
          </div>
        </section>

        {/* 3. Phần chính bố cục 2 cột (60% / 40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Cột trái (60% = 7/12 desktop): Time-Blocking Timeline */}
          <section className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md border border-slate-200/60">
            {/* Header & Date Controls */}
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                    Lịch trình Time-Blocking
                  </h3>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">
                    Hôm nay
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Phân bổ nhịp tập trung và phòng ngừa kiệt sức
                </p>
              </div>
              <div className="flex items-center gap-space-xs">
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-body-md">chevron_left</span>
                </button>
                <span className="font-label-md text-label-md text-on-surface px-space-xs font-semibold">
                  Hôm nay
                </span>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-body-md">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-space-md pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-secondary"></span>
                <span>Deep Work</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-surface-variant"></span>
                <span>Họp &amp; Đồng bộ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-surface-container-high"></span>
                <span>Nghỉ ngơi / Hồi phục</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-primary-container"></span>
                <span>Admin / Đề xuất</span>
              </div>
            </div>

            {/* Visual Timeline 08:00 to 18:00 */}
            <div className="relative mt-space-sm flex flex-col gap-space-md">
              {/* Indicator: Current Time (10:30) */}
              <div className="absolute left-12 right-0 top-[182px] z-30 flex items-center pointer-events-none">
                <div className="flex items-center gap-1 bg-secondary text-on-secondary px-space-xs py-0.5 rounded-full font-label-sm text-label-sm shadow-sm -ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-secondary animate-ping"></span>
                  <span>10:30 Hiện tại</span>
                </div>
                <div className="h-0.5 bg-secondary flex-grow opacity-80"></div>
              </div>

              {/* Slot 08:00 - 09:00 (Completed) */}
              <div className="flex items-start gap-space-md group">
                <span className="w-12 font-timer-mono font-medium text-body-sm text-on-surface-variant text-right pt-2">
                  08:00
                </span>
                <div className="flex-grow p-space-sm rounded-xl bg-surface-container-low transition-all border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2 h-2 rounded-full bg-outline"></span>
                      <span className="font-title-md text-title-md text-on-surface font-medium line-through opacity-70">
                        Lập kế hoạch ngày &amp; Lọc hộp thư đến
                      </span>
                    </div>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm">
                      Đã xong
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant pl-space-md opacity-60">
                    Xử lý 8 email quan trọng, cập nhật Notion sprint board
                  </p>
                </div>
              </div>

              {/* Slot 09:00 - 11:30 (Deep Work - Active Current) */}
              <div className="flex items-start gap-space-md">
                <span className="w-12 font-timer-mono font-medium text-body-sm text-secondary text-right pt-3 font-bold">
                  09:00
                </span>
                <div className="flex-grow p-space-md rounded-xl bg-secondary-fixed/50 shadow-sm transition-all relative overflow-hidden border border-secondary/30">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-secondary"></div>
                  <div className="flex items-start justify-between gap-space-sm pl-space-xs">
                    <div>
                      <div className="flex items-center gap-space-xs mb-1">
                        <span className="px-space-xs py-0.5 rounded bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold">
                          Khối Deep Work #1
                        </span>
                        <span className="font-body-sm text-body-sm text-secondary font-medium">
                          09:00 - 11:30 (2h30m)
                        </span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold">
                        Thiết kế UI Flow onboarding dự án FinTech
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Đang chạy Pomodoro lượt 3. Không kiểm tra Slack hay thông báo ngoài.
                      </p>
                    </div>
                    <span className="w-7 h-7 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-title-md animate-spin" style={{ animationDuration: '6s' }}>
                        sync
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Slot 11:30 - 12:00 (Break) */}
              <div className="flex items-start gap-space-md">
                <span className="w-12 font-timer-mono font-medium text-body-sm text-on-surface-variant text-right pt-2">
                  11:30
                </span>
                <div className="flex-grow p-space-sm rounded-xl bg-surface-container-high transition-all border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-body-md text-on-surface-variant">
                        self_improvement
                      </span>
                      <span className="font-title-md text-title-md text-on-surface font-medium">
                        Nghỉ giãn cơ &amp; Đi dạo nhẹ
                      </span>
                    </div>
                    <span className="text-on-surface-variant font-label-sm text-label-sm">30 phút</span>
                  </div>
                </div>
              </div>

              {/* Slot 12:00 - 13:30 (Lunch Break) */}
              <div className="flex items-start gap-space-md">
                <span className="w-12 font-timer-mono font-medium text-body-sm text-on-surface-variant text-right pt-2">
                  12:00
                </span>
                <div className="flex-grow p-space-sm rounded-xl bg-surface-container transition-all border border-slate-200/40">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-body-md">restaurant</span>
                      <span className="font-title-md text-title-md text-on-surface font-medium">
                        Bữa trưa &amp; Nghỉ trưa không màn hình
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm">12:00 - 13:30</span>
                  </div>
                </div>
              </div>

              {/* Slot 13:30 - 15:00 (Team Alignment) */}
              <div className="flex items-start gap-space-md">
                <span className="w-12 font-timer-mono font-medium text-body-sm text-on-surface-variant text-right pt-2">
                  13:30
                </span>
                <div className="flex-grow p-space-md rounded-xl bg-surface-container-low transition-all border border-slate-200/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-space-xs mb-1">
                        <span className="px-space-xs py-0.5 rounded bg-surface-variant text-on-surface font-label-sm text-label-sm font-semibold">
                          Họp &amp; Đồng bộ
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          13:30 - 14:30
                        </span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold">
                        Design Review Sprint 14 với Engineering &amp; Product
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Trình bày prototyping token styles, bàn giao assets Figma.
                      </p>
                    </div>
                    <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                      <img
                        alt="Member"
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container-lowest object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHgITtO2ClrTB1T-8mMp2THTA8aU9xPQYLpAYUIGsiO3E1Bxf3quUY1wph2Se8EBZ9e_qhGjfRmB-Rdv6UbcorhNQUrI060Y_PrdtmHKtVKm1ewoILO3Vxq4aSkEUtLpqXEvMaN_F28MhHGpVMYHXtBf_rruuWzfU_ZkIzCJGA6szfQ_0A-YKT-6vhnCellwCi4Yd04NQeV8fdrjuFuX7NN6miReiiZVt9hwtJHVl6J39qsDw6Jt1n"
                      />
                      <div className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-label-sm text-[10px] font-bold">
                        +3
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slot 15:00 - 17:30 (Deep Work #2) */}
              <div className="flex items-start gap-space-md">
                <span className="w-12 font-timer-mono font-medium text-body-sm text-on-surface-variant text-right pt-2">
                  15:00
                </span>
                <div className="flex-grow p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all border border-slate-200/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-space-xs mb-1">
                        <span className="px-space-xs py-0.5 rounded bg-primary-fixed text-primary-fixed-variant font-label-sm text-label-sm font-semibold">
                          Tài liệu &amp; Đề xuất
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          15:00 - 17:00
                        </span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold">
                        Soạn thảo tài liệu Design System Guidelines v2.4
                      </h4>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-body-md">
                      lock_clock
                    </span>
                  </div>
                </div>
              </div>

              {/* Slot 17:30 - 18:00 (Daily Shutdown) */}
              <div className="flex items-start gap-space-md">
                <span className="w-12 font-timer-mono font-medium text-body-sm text-on-surface-variant text-right pt-2">
                  17:30
                </span>
                <div className="flex-grow p-space-sm rounded-xl bg-surface-container-low transition-all border border-slate-200/40">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span className="font-title-md text-title-md text-on-surface font-medium">
                      Nghi thức đóng ngày (Daily Shutdown Ritual) &amp; Dọn dẹp tab
                    </span>
                    <span className="font-label-sm text-label-sm">30 phút</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-space-sm flex justify-center">
              <button
                onClick={() => setQuickAddOpen(true)}
                className="flex items-center gap-1 text-secondary font-label-md text-label-md hover:underline cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-body-md">add_circle</span>
                Thêm khối thời gian mới
              </button>
            </div>
          </section>

          {/* Cột phải (40% = 5/12 desktop): Priority Queue & Habits & Ambient Audio */}
          <section className="lg:col-span-5 flex flex-col gap-space-lg">
            {/* Priority Tasks Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md border border-slate-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                    Ưu tiên hôm nay
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-sm text-label-sm font-semibold">
                    {priorityTasks.filter((t) => !t.completed).length}
                  </span>
                </div>
                <button className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-title-md">tune</span>
                </button>
              </div>

              {/* Task List */}
              <div className="flex flex-col gap-space-xs">
                {priorityTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => togglePriorityTask(t.id)}
                    className={`flex items-start gap-space-sm p-space-sm rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200 ${
                      t.completed
                        ? 'opacity-60 bg-transparent'
                        : t.isStar
                        ? 'bg-surface-container-low'
                        : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <button
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        t.completed
                          ? 'bg-on-surface border-on-surface text-on-primary'
                          : t.isStar
                          ? 'border-secondary hover:bg-secondary/10'
                          : 'border-outline-variant hover:border-on-surface'
                      }`}
                      type="button"
                    >
                      {t.completed ? (
                        <span className="material-symbols-outlined text-label-sm font-bold">check</span>
                      ) : t.isStar ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                      ) : null}
                    </button>

                    <div className="flex flex-col flex-grow min-w-0">
                      <span
                        className={`font-title-md text-title-md text-on-surface truncate ${
                          t.completed ? 'line-through' : t.isStar ? 'font-semibold' : ''
                        }`}
                      >
                        {t.title}
                      </span>
                      <div className="flex items-center gap-space-xs mt-1">
                        <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-medium">
                          {t.tag}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {t.estimate}
                        </span>
                      </div>
                    </div>

                    {t.isStar && !t.completed && (
                      <span
                        className="material-symbols-outlined text-secondary text-title-md shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setQuickAddOpen(true)}
                className="w-full py-space-xs rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 cursor-pointer font-semibold"
                type="button"
              >
                <span className="material-symbols-outlined text-body-md">add</span>
                <span>Thêm việc cần làm</span>
              </button>
            </div>

            {/* Morning Routine Checklist Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md border border-slate-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-title-md text-secondary">wb_sunny</span>
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                    Thói quen buổi sáng
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  {routineDoneCount} / {routineItems.length} hoàn tất
                </span>
              </div>

              <div className="flex flex-col gap-space-xs">
                {routineItems.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => toggleRoutineItem(r.id)}
                    className="flex items-center justify-between p-space-xs rounded bg-surface-container-low text-on-surface cursor-pointer hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${
                          r.completed
                            ? 'bg-secondary text-on-secondary'
                            : 'border border-outline-variant bg-surface-container-lowest'
                        }`}
                      >
                        {r.completed && (
                          <span className="material-symbols-outlined text-label-sm font-bold">check</span>
                        )}
                      </span>
                      <span
                        className={`font-body-md text-body-md truncate ${
                          r.completed ? 'line-through text-on-surface-variant' : 'text-on-surface font-medium'
                        }`}
                      >
                        {r.title}
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant shrink-0 ml-2">
                      {r.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ambient Focus Sound Mini-Widget */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-sm border border-slate-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-title-md text-secondary">graphic_eq</span>
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                    Âm thanh nền tập trung
                  </h3>
                </div>
                <span
                  className={`px-space-xs py-0.5 rounded font-label-sm text-label-sm font-semibold ${
                    isPlayingSound
                      ? 'bg-secondary-fixed text-secondary'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {isPlayingSound ? 'Đang phát' : 'Đã dừng'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                <button
                  onClick={() => toggleAmbientSound('rain')}
                  className={`flex flex-col items-center justify-center p-space-sm rounded-xl transition-all cursor-pointer ${
                    activeSound === 'rain' && isPlayingSound
                      ? 'bg-secondary-fixed text-secondary ring-2 ring-secondary/50 font-semibold shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-title-md">rainy</span>
                  <span className="font-label-sm text-label-sm mt-1">Mưa rào nhẹ</span>
                </button>

                <button
                  onClick={() => toggleAmbientSound('cafe')}
                  className={`flex flex-col items-center justify-center p-space-sm rounded-xl transition-all cursor-pointer ${
                    activeSound === 'cafe' && isPlayingSound
                      ? 'bg-secondary-fixed text-secondary ring-2 ring-secondary/50 font-semibold shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-title-md">coffee</span>
                  <span className="font-label-sm text-label-sm mt-1">Quán cafe</span>
                </button>

                <button
                  onClick={() => toggleAmbientSound('waves')}
                  className={`flex flex-col items-center justify-center p-space-sm rounded-xl transition-all cursor-pointer ${
                    activeSound === 'waves' && isPlayingSound
                      ? 'bg-secondary-fixed text-secondary ring-2 ring-secondary/50 font-semibold shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-title-md">waves</span>
                  <span className="font-label-sm text-label-sm mt-1">Bạch âm</span>
                </button>
              </div>

              {/* Volume slider & pause bar */}
              <div className="flex items-center justify-between gap-space-md pt-space-xs mt-space-xs border-t border-surface-container-low">
                <button
                  className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
                  type="button"
                  onClick={() => handleVolumeChange(soundVolume === 0 ? 65 : 0)}
                  title="Âm lượng"
                >
                  <span className="material-symbols-outlined text-body-md">
                    {soundVolume === 0 ? 'volume_off' : 'volume_up'}
                  </span>
                </button>

                <div className="flex-grow flex items-center">
                  <input
                    className="w-full accent-secondary h-1.5 bg-surface-container-high rounded-lg cursor-pointer"
                    max="100"
                    min="0"
                    type="range"
                    value={soundVolume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  />
                </div>

                <button
                  onClick={() => toggleAmbientSound()}
                  className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center cursor-pointer"
                  type="button"
                  title={isPlayingSound ? 'Tạm dừng âm thanh' : 'Bật âm thanh'}
                >
                  <span className="material-symbols-outlined text-title-md">
                    {isPlayingSound ? 'pause' : 'play_arrow'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onItemAdded={() => {
          // refresh data if needed
        }}
      />
    </div>
  )
}
