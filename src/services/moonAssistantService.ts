import { supabase } from '@/lib/supabase'
import { startOfWeek, addDays, format } from 'date-fns'

export type PeriodOfDay = 'morning' | 'afternoon' | 'evening'
export type DayOfWeekIndex = 1 | 2 | 3 | 4 | 5 | 6 | 0 // 1: Thứ 2, 2: Thứ 3, ..., 6: Thứ 7, 0: Chủ Nhật

export interface MoonWeeklyTask {
  id: string
  day_index: DayOfWeekIndex
  period: PeriodOfDay
  title: string
  time_range?: string
  location?: string
  category: 'study' | 'work' | 'personal' | 'health'
  is_completed: boolean
}

export interface MoonWeeklyPlan {
  id: string
  title: string
  created_at: string
  tasks: MoonWeeklyTask[]
}

export const DAY_NAMES: Record<DayOfWeekIndex, { full: string; short: string }> = {
  1: { full: 'Thứ Hai', short: 'T2' },
  2: { full: 'Thứ Ba', short: 'T3' },
  3: { full: 'Thứ Tư', short: 'T4' },
  4: { full: 'Thứ Năm', short: 'T5' },
  5: { full: 'Thứ Sáu', short: 'T6' },
  6: { full: 'Thứ Bảy', short: 'T7' },
  0: { full: 'Chủ Nhật', short: 'CN' },
}

export const PERIOD_NAMES: Record<PeriodOfDay, { label: string; icon: string; timeHint: string; color: string }> = {
  morning: { label: 'Sáng', icon: 'Sunrise', timeHint: '06:00 - 12:00', color: 'from-amber-500/10 to-orange-500/5 text-amber-300 border-amber-500/30' },
  afternoon: { label: 'Chiều', icon: 'Sun', timeHint: '12:00 - 18:00', color: 'from-blue-500/10 to-cyan-500/5 text-blue-300 border-blue-500/30' },
  evening: { label: 'Tối', icon: 'Moon', timeHint: '18:00 - 23:00', color: 'from-indigo-500/10 to-purple-500/5 text-indigo-300 border-indigo-500/30' },
}

/**
 * Intelligent Local Parser: analyzes schedule text and maps to Sáng, Chiều, Tối across 7 days
 */
export function parseScheduleText(text: string): MoonWeeklyTask[] {
  const lines = text.split(/\n|;|\./).map((l) => l.trim()).filter(Boolean)
  const result: MoonWeeklyTask[] = []

  let currentDay: DayOfWeekIndex = 1

  const dayPatterns: { regex: RegExp; day: DayOfWeekIndex }[] = [
    { regex: /(thứ\s*2|thứ\s*hai|\bt2\b|\bmon\b)/i, day: 1 },
    { regex: /(thứ\s*3|thứ\s*ba|\bt3\b|\btue\b)/i, day: 2 },
    { regex: /(thứ\s*4|thứ\s*tư|\bt4\b|\bwed\b)/i, day: 3 },
    { regex: /(thứ\s*5|thứ\s*năm|\bt5\b|\bthu\b)/i, day: 4 },
    { regex: /(thứ\s*6|thứ\s*sáu|\bt6\b|\bfri\b)/i, day: 5 },
    { regex: /(thứ\s*7|thứ\s*bảy|\bt7\b|\bsat\b)/i, day: 6 },
    { regex: /(chủ\s*nhật|\bcn\b|\bsun\b)/i, day: 0 },
  ]

  for (const line of lines) {
    // Check if line indicates a day
    for (const dp of dayPatterns) {
      if (dp.regex.test(line)) {
        currentDay = dp.day
        break
      }
    }

    // Determine period: Sáng / Chiều / Tối
    let period: PeriodOfDay = 'morning'
    const lower = line.toLowerCase()

    if (
      lower.includes('chiều') ||
      lower.includes('afternoon') ||
      lower.includes('ca chiều') ||
      /\b(12|13|14|15|16|17)h/i.test(lower) ||
      /\b(12|13|14|15|16|17):/i.test(lower) ||
      /tiết\s*(5|6|7|8|9)/i.test(lower)
    ) {
      period = 'afternoon'
    } else if (
      lower.includes('tối') ||
      lower.includes('đêm') ||
      lower.includes('evening') ||
      lower.includes('ca tối') ||
      /\b(18|19|20|21|22|23)h/i.test(lower) ||
      /\b(18|19|20|21|22|23):/i.test(lower)
    ) {
      period = 'evening'
    } else if (
      lower.includes('sáng') ||
      lower.includes('morning') ||
      lower.includes('ca sáng') ||
      /\b(6|7|8|9|10|11)h/i.test(lower) ||
      /\b(06|07|08|09|10|11):/i.test(lower) ||
      /tiết\s*(1|2|3|4)/i.test(lower)
    ) {
      period = 'morning'
    }

    // Extract time range (e.g. 7h30 - 11h, 08:00 - 12:00, 14h-18h)
    const timeMatch = line.match(/(\d{1,2}(?:h|:)\d{0,2}\s*(?:-|–|đến|to)\s*\d{1,2}(?:h|:)\d{0,2})/i)
    const timeRange = timeMatch ? timeMatch[0].trim() : undefined

    // Extract location / room (e.g. phòng A201, cơ sở 2, Q1)
    const locMatch = line.match(/(?:phòng|room|tại|p\.)\s*([a-zA-Z0-9\-_.]+)/i)
    const location = locMatch ? locMatch[0].trim() : undefined

    // Clean up title
    let title = line
      .replace(timeMatch ? timeMatch[0] : '', '')
      .replace(locMatch ? locMatch[0] : '', '')
      .replace(/(thứ\s*[2-7]|thứ\s*hai|thứ\s*ba|thứ\s*tư|thứ\s*năm|thứ\s*sáu|thứ\s*bảy|chủ\s*nhật|\bt[2-7]\b|\bcn\b)/gi, '')
      .replace(/:\s*|-|\(|\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Determine category
    let category: 'study' | 'work' | 'personal' | 'health' = 'study'
    if (lower.includes('làm') || lower.includes('công ty') || lower.includes('ca làm') || lower.includes('work') || lower.includes('họp')) {
      category = 'work'
    } else if (lower.includes('gym') || lower.includes('chạy') || lower.includes('bơi') || lower.includes('thể thao')) {
      category = 'health'
    } else if (lower.includes('học') || lower.includes('tiết') || lower.includes('toán') || lower.includes('anh') || lower.includes('tin')) {
      category = 'study'
    } else {
      category = 'personal'
    }

    if (title.length > 2 && !title.toLowerCase().startsWith('lịch') && !title.toLowerCase().startsWith('thời khóa biểu')) {
      result.push({
        id: `moon-task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        day_index: currentDay,
        period,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        time_range: timeRange,
        location,
        category,
        is_completed: false,
      })
    }
  }

  // If result is empty or too short, return fallback structured week
  if (result.length === 0) {
    return generateDefaultCollegeSchedule()
  }

  return result
}

/**
 * Pre-made templates for one-click schedule generation
 */
export function generateDefaultCollegeSchedule(): MoonWeeklyTask[] {
  return [
    // Thứ 2
    { id: '1', day_index: 1, period: 'morning', title: 'Toán Cao Cấp / Giải Tích 2', time_range: '07:30 - 11:00', location: 'Phòng A201', category: 'study', is_completed: false },
    { id: '2', day_index: 1, period: 'afternoon', title: 'Thực hành Lập Trình Cơ Sở', time_range: '13:30 - 16:30', location: 'Lab Máy 3', category: 'study', is_completed: false },
    { id: '3', day_index: 1, period: 'evening', title: 'Tự học & Làm bài tập Giải Tích', time_range: '19:30 - 21:30', location: 'Tại nhà', category: 'study', is_completed: false },

    // Thứ 3
    { id: '4', day_index: 2, period: 'morning', title: 'Tiếng Anh Học Thuật (IELTS)', time_range: '08:00 - 11:30', location: 'Phòng B104', category: 'study', is_completed: false },
    { id: '5', day_index: 2, period: 'afternoon', title: 'Nghỉ ngơi & Đọc sách chuyên ngành', time_range: '14:00 - 16:00', location: 'Thư viện', category: 'personal', is_completed: false },
    { id: '6', day_index: 2, period: 'evening', title: 'Tập Gym / Chạy bộ thể chất', time_range: '18:00 - 19:15', location: 'Phòng Gym', category: 'health', is_completed: false },

    // Thứ 4
    { id: '7', day_index: 3, period: 'morning', title: 'Cấu Trúc Dữ Liệu & Giải Thuật', time_range: '07:30 - 11:30', location: 'Hội trường C', category: 'study', is_completed: false },
    { id: '8', day_index: 3, period: 'afternoon', title: 'Làm việc Part-time / Dự án', time_range: '13:30 - 17:30', location: 'Văn phòng', category: 'work', is_completed: false },
    { id: '9', day_index: 3, period: 'evening', title: 'Họp nhóm môn Lập Trình', time_range: '20:00 - 21:30', location: 'Google Meet', category: 'study', is_completed: false },

    // Thứ 5
    { id: '10', day_index: 4, period: 'morning', title: 'Kiến Trúc Máy Tính & Hệ Điều Hành', time_range: '08:00 - 11:30', location: 'Phòng A302', category: 'study', is_completed: false },
    { id: '11', day_index: 4, period: 'afternoon', title: 'Làm bài tập lớn & đồ án môn', time_range: '14:00 - 17:00', location: 'Thư viện', category: 'study', is_completed: false },
    { id: '12', day_index: 4, period: 'evening', title: 'Tự học tiếng Anh Speaking', time_range: '19:30 - 21:00', location: 'Tại nhà', category: 'study', is_completed: false },

    // Thứ 6
    { id: '13', day_index: 5, period: 'morning', title: 'Mạng Máy Tính Căn Bản', time_range: '07:30 - 11:00', location: 'Phòng B202', category: 'study', is_completed: false },
    { id: '14', day_index: 5, period: 'afternoon', title: 'Làm việc Part-time / Thực tập', time_range: '13:30 - 17:30', location: 'Công ty', category: 'work', is_completed: false },
    { id: '15', day_index: 5, period: 'evening', title: 'Chạy bộ thể lực & Thư giãn', time_range: '18:00 - 19:30', location: 'Công viên', category: 'health', is_completed: false },

    // Thứ 7
    { id: '16', day_index: 6, period: 'morning', title: 'Kỹ Năng Giao Tiếp & Thuyết Trình', time_range: '08:30 - 11:00', location: 'Hội trường B', category: 'study', is_completed: false },
    { id: '17', day_index: 6, period: 'afternoon', title: 'Nghiên cứu công nghệ mới / Side Project', time_range: '14:00 - 17:00', location: 'Quán cafe', category: 'personal', is_completed: false },
    { id: '18', day_index: 6, period: 'evening', title: 'Gặp gỡ bạn bè & Thư giãn cuối tuần', time_range: '19:00 - 22:00', location: '', category: 'personal', is_completed: false },

    // Chủ Nhật
    { id: '19', day_index: 0, period: 'morning', title: 'Dọn dẹp phòng & Giặt đồ tuần', time_range: '08:00 - 10:00', location: 'Nhà', category: 'personal', is_completed: false },
    { id: '20', day_index: 0, period: 'afternoon', title: 'Xem lại bài học & Chuẩn bị giáo trình tuần tới', time_range: '14:30 - 16:30', location: 'Bàn học', category: 'study', is_completed: false },
    { id: '21', day_index: 0, period: 'evening', title: 'Weekly Review cùng LIFEOS & Lên kế hoạch tuần mới', time_range: '20:00 - 21:00', location: 'LIFEOS App', category: 'personal', is_completed: false },
  ]
}

export function generateCompanyWorkSchedule(): MoonWeeklyTask[] {
  return [
    { id: 'w1', day_index: 1, period: 'morning', title: 'Họp giao ban tuần & Xử lý email tồn', time_range: '08:30 - 11:30', location: 'Phòng họp chính', category: 'work', is_completed: false },
    { id: 'w2', day_index: 1, period: 'afternoon', title: 'Thực thi các task dự án ưu tiên', time_range: '13:30 - 17:30', location: 'Bàn làm việc', category: 'work', is_completed: false },
    { id: 'w3', day_index: 1, period: 'evening', title: 'Nấu ăn tối & Đi bộ nhẹ 30 phút', time_range: '18:30 - 20:00', location: 'Khu dân cư', category: 'health', is_completed: false },

    { id: 'w4', day_index: 2, period: 'morning', title: 'Triển khai công việc chuyên môn', time_range: '08:30 - 12:00', location: 'Văn phòng', category: 'work', is_completed: false },
    { id: 'w5', day_index: 2, period: 'afternoon', title: 'Họp tiến độ khách hàng / Đối tác', time_range: '14:00 - 16:30', location: 'Zoom / Meet', category: 'work', is_completed: false },
    { id: 'w6', day_index: 2, period: 'evening', title: 'Khóa học nâng cao kỹ năng (Online)', time_range: '19:30 - 21:30', location: 'Bàn học tại nhà', category: 'study', is_completed: false },

    { id: 'w7', day_index: 3, period: 'morning', title: 'Làm việc tập trung sâu (Deep Work)', time_range: '08:30 - 11:30', location: 'Văn phòng', category: 'work', is_completed: false },
    { id: 'w8', day_index: 3, period: 'afternoon', title: 'Review báo cáo & tài liệu kỹ thuật', time_range: '13:30 - 17:00', location: 'Văn phòng', category: 'work', is_completed: false },
    { id: 'w9', day_index: 3, period: 'evening', title: 'Tập Gym / Thể thao rèn sức bền', time_range: '18:00 - 19:30', location: 'Phòng tập', category: 'health', is_completed: false },

    { id: 'w10', day_index: 4, period: 'morning', title: 'Giải quyết các vấn đề phát sinh dự án', time_range: '08:30 - 12:00', location: 'Văn phòng', category: 'work', is_completed: false },
    { id: 'w11', day_index: 4, period: 'afternoon', title: 'Hoàn thiện tài liệu bàn giao đợt 1', time_range: '13:30 - 17:30', location: 'Văn phòng', category: 'work', is_completed: false },
    { id: 'w12', day_index: 4, period: 'evening', title: 'Đọc sách phát triển tư duy quản lý', time_range: '20:00 - 21:30', location: 'Phòng khách', category: 'study', is_completed: false },

    { id: 'w13', day_index: 5, period: 'morning', title: 'Hoàn tất các hạng mục còn lại trong tuần', time_range: '08:30 - 11:30', location: 'Văn phòng', category: 'work', is_completed: false },
    { id: 'w14', day_index: 5, period: 'afternoon', title: 'Họp tổng kết tuần bộ phận & Báo cáo', time_range: '14:00 - 16:30', location: 'Phòng họp 2', category: 'work', is_completed: false },
    { id: 'w15', day_index: 5, period: 'evening', title: 'Thư giãn cuối tuần / Ăn tối cùng đồng nghiệp', time_range: '18:30 - 21:30', location: 'Nhà hàng', category: 'personal', is_completed: false },

    { id: 'w16', day_index: 6, period: 'morning', title: 'Chạy bộ sáng & Ăn sáng nhẹ', time_range: '07:00 - 09:00', location: 'Hồ nước', category: 'health', is_completed: false },
    { id: 'w17', day_index: 6, period: 'afternoon', title: 'Tự do sáng tạo & Sở thích cá nhân', time_range: '14:00 - 17:00', location: 'Nhà', category: 'personal', is_completed: false },
    { id: 'w18', day_index: 6, period: 'evening', title: 'Xem phim & Nghỉ ngơi trọn vẹn', time_range: '19:30 - 22:00', location: 'Nhà', category: 'personal', is_completed: false },

    { id: 'w19', day_index: 0, period: 'morning', title: 'Chăm sóc gia đình & Dọn dẹp nhà cửa', time_range: '08:30 - 11:00', location: 'Nhà', category: 'personal', is_completed: false },
    { id: 'w20', day_index: 0, period: 'afternoon', title: 'Chuẩn bị trang phục & Kế hoạch tuần tới', time_range: '15:00 - 17:00', location: 'Nhà', category: 'personal', is_completed: false },
    { id: 'w21', day_index: 0, period: 'evening', title: 'Weekly Review cùng Moon trên LIFEOS', time_range: '20:00 - 21:00', location: 'LIFEOS App', category: 'study', is_completed: false },
  ]
}

/**
 * Sync Moon's generated weekly tasks into Supabase `tasks` table for real execution
 */
export async function syncMoonTasksToSupabase(
  tasks: MoonWeeklyTask[],
  userId: string,
  referenceDate = new Date()
): Promise<{ success: boolean; count: number; error?: any }> {
  try {
    const monday = startOfWeek(referenceDate, { weekStartsOn: 1 })

    // Map day_index (1=T2, 2=T3, ..., 6=T7, 0=CN) to real date string
    const dayOffsetMap: Record<DayOfWeekIndex, number> = {
      1: 0, // Thứ 2 = monday + 0
      2: 1, // Thứ 3 = monday + 1
      3: 2, // Thứ 4 = monday + 2
      4: 3, // Thứ 5 = monday + 3
      5: 4, // Thứ 6 = monday + 4
      6: 5, // Thứ 7 = monday + 5
      0: 6, // Chủ Nhật = monday + 6
    }

    const tasksToInsert = tasks.map((t) => {
      const taskDate = addDays(monday, dayOffsetMap[t.day_index])
      const dueDateStr = format(taskDate, 'yyyy-MM-dd')

      // Extract start_time if time_range has one
      let startTime = null
      if (t.time_range) {
        const m = t.time_range.match(/^(\d{1,2})[h:](\d{0,2})/i)
        if (m) {
          const hh = m[1].padStart(2, '0')
          const mm = (m[2] || '00').padEnd(2, '0')
          startTime = `${hh}:${mm}`
        }
      }

      const noteContent = [
        t.time_range ? `Khung giờ: ${t.time_range}` : null,
        t.location ? `Địa điểm: ${t.location}` : null,
        `Buổi: ${t.period === 'morning' ? 'Sáng' : t.period === 'afternoon' ? 'Chiều' : 'Tối'}`,
      ].filter(Boolean).join(' • ')

      return {
        user_id: userId,
        title: t.title,
        description: noteContent,
        due_date: dueDateStr,
        start_time: startTime,
        priority: 'high',
        category: t.category,
        status: t.is_completed ? 'completed' : 'pending',
        notes: `Tạo tự động bởi Trợ lý AI Moon 🌙`,
      }
    })

    const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select()

    if (error) throw error

    return { success: true, count: data?.length || tasksToInsert.length }
  } catch (err: any) {
    console.error('Error syncing Moon tasks to database:', err)
    return { success: false, count: 0, error: err }
  }
}
