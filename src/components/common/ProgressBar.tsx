import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number // 0 to 100
  color?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'indigo',
  size = 'md',
  showLabel = false,
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, value))

  const colors = {
    indigo: 'bg-[#7255F7]',
    emerald: 'bg-[#10B981]',
    amber: 'bg-[#F59E0B]',
    blue: 'bg-[#7255F7]',
    rose: 'bg-[#EF4444]',
  }

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
          <span className="text-[#9CA3AF]">Tiến độ</span>
          <span className="text-[#F3F4F6] font-semibold">{clamped}%</span>
        </div>
      )}
      <div className={cn('w-full bg-[#12101D] rounded-full overflow-hidden border border-[#282538]', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colors[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
