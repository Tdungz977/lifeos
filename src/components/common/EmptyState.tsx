import React from 'react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-slate-800 bg-[#0c121e]/40',
        className
      )}
    >
      <div className="p-3.5 rounded-2xl bg-slate-800/60 text-slate-400 border border-slate-700/50 mb-4 inline-flex items-center justify-center shadow-inner">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-200 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mt-1.5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} leftIcon={actionIcon} variant="primary" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
