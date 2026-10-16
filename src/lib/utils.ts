import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday, isTomorrow, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date in friendly Vietnamese format
 */
export function formatViDate(date: string | Date | null | undefined, formatStr = 'dd/MM/yyyy'): string {
  if (!date) return ''
  const parsed = typeof date === 'string' ? parseISO(date) : date
  try {
    return format(parsed, formatStr, { locale: vi })
  } catch {
    return String(date)
  }
}

export function formatFriendlyDate(date: string | Date): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (isToday(parsed)) return 'Hôm nay'
  if (isYesterday(parsed)) return 'Hôm qua'
  if (isTomorrow(parsed)) return 'Ngày mai'
  return formatViDate(parsed, 'EEEE, dd/MM')
}

export function calculateProgress(current: number, target: number): number {
  if (!target || target <= 0) return 0
  const pct = Math.round((current / target) * 100)
  return Math.min(100, Math.max(0, pct))
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 14) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}
