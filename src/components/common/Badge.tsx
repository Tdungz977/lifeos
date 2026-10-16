import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue'
  className?: string
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className,
  dot = false,
}) => {
  const variants = {
    default: 'badge-neutral font-medium',
    slate: 'badge-neutral font-medium',
    indigo: 'badge-primary font-semibold',
    blue: 'badge-primary font-semibold',
    emerald: 'badge-success font-semibold',
    amber: 'badge-warning font-semibold',
    rose: 'badge-danger font-semibold',
  }

  const dotColors = {
    default: 'bg-[#9CA3AF]',
    slate: 'bg-[#9CA3AF]',
    indigo: 'bg-[#7255F7]',
    blue: 'bg-[#7255F7]',
    emerald: 'bg-[#10B981]',
    amber: 'bg-[#F59E0B]',
    rose: 'bg-[#EF4444]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border tracking-wide',
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  )
}
