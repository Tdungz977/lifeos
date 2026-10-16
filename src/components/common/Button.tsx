import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#090B12] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer'

    const variants = {
      primary:
        'bg-[#7255F7] hover:bg-[#6144E3] text-white shadow-md shadow-[#7255F7]/25 focus:ring-[#7255F7] border border-[#8B74F9]/40',
      secondary:
        'bg-[#191725] hover:bg-[#211E31] text-[#F3F4F6] border border-[#282538] hover:border-[#3C3655] focus:ring-[#7255F7]',
      outline:
        'border border-[#282538] hover:bg-[#191725] hover:border-[#7255F7]/40 text-[#F3F4F6] focus:ring-[#7255F7]',
      ghost:
        'hover:bg-[#191725] text-[#9CA3AF] hover:text-[#F3F4F6] focus:ring-[#7255F7]',
      danger:
        'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md shadow-[#EF4444]/25 focus:ring-[#EF4444] border border-red-400/30',
    }

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-3.5 py-2 gap-2 h-9.5',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
