import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Menu, Calendar as CalendarIcon, LogIn, UserPlus, Focus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { formatViDate, getGreeting } from '@/lib/utils'
import { NotificationDropdown } from '@/components/common/NotificationDropdown'

interface HeaderProps {
  onOpenQuickAdd: () => void
  onToggleMobileNav: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenQuickAdd, onToggleMobileNav }) => {
  const { user, profile } = useAuth()
  const today = new Date()
  const greeting = getGreeting()
  const displayName = profile?.display_name || user?.user_metadata?.full_name || (user ? 'Linh' : 'Bạn')
  const [isFocusMode, setIsFocusMode] = useState(false)

  const toggleFullScreenFocus = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFocusMode(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFocusMode(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-4 md:px-space-lg h-16 flex items-center justify-between border-b border-slate-200/60">
      {/* Left Greeting & Mobile Toggle */}
      <div className="flex items-center gap-space-md">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
          type="button"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
            {user ? `${greeting}, ${displayName}` : 'Chào mừng bạn đến với FlowTime!'}
          </span>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-body-sm">calendar_today</span>
            <span>{formatViDate(today, 'EEEE, dd MMMM')}</span>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-space-md">
        {!user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-secondary" />
              <span>Đăng nhập</span>
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-primary hover:opacity-90 shadow-sm transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Quick Add Button */}
            <button
              onClick={onOpenQuickAdd}
              className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:opacity-90 transition-all cursor-pointer font-semibold"
              type="button"
            >
              <span className="material-symbols-outlined text-title-md">add</span>
              <span className="hidden sm:inline">Thêm việc</span>
            </button>

            {/* Focus Mode & Notification Controls */}
            <div className="flex items-center gap-space-xs">
              <button
                onClick={toggleFullScreenFocus}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isFocusMode
                    ? 'bg-secondary text-white'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
                title="Chế độ tập trung toàn màn hình"
                type="button"
              >
                <span className="material-symbols-outlined text-title-md">center_focus_strong</span>
              </button>

              {/* Notification Dropdown */}
              <NotificationDropdown />
            </div>

            <div className="h-6 w-px bg-surface-container-high"></div>

            {/* User Profile Badge */}
            <Link to="/settings" className="flex items-center gap-space-sm pl-space-xs group cursor-pointer">
              {profile?.avatar_url ? (
                <img
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                  src={profile.avatar_url}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-bold text-xs ring-1 ring-secondary/30">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden xl:flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-secondary transition-colors">
                  {displayName}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                  {profile?.growth_goal || 'Product Designer'}
                </span>
              </div>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
