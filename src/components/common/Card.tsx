import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  elevated?: boolean
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  elevated = false,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl p-5 border text-[#F3F4F6] transition-all duration-200',
        elevated ? 'surface-elevated' : 'surface-card',
        hoverable && 'hover:border-[#7255F7]/40 hover:shadow-lg hover:shadow-[#7255F7]/05',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<{
  title: string | React.ReactNode
  subtitle?: string | React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}> = ({ title, subtitle, action, icon, className }) => {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-lg bg-[#7255F7]/10 border border-[#7255F7]/25 text-[#7255F7]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-base text-[#F3F4F6] tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
