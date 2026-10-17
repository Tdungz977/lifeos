import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Menu, Calendar as CalendarIcon, Quote, Moon as MoonIcon, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
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
  const displayName = profile?.display_name || user?.user_metadata?.full_name || (user ? 'Chiến binh' : '')
  const intention = profile?.daily_intention || 'Tập trung vào điều quan trọng nhất hôm nay.'

  return (
    <header className="sticky top-0 z-20 surface-header px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left Greeting & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-lg bg-[#191725] border border-[#282538] text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold text-[#F3F4F6] tracking-tight">
              {user ? `${greeting}, ${displayName}!` : 'Chào mừng bạn đến với LIFEOS!'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#191725] text-[#9CA3AF] border border-[#282538]">
              <CalendarIcon className="w-3 h-3 text-[#7255F7]" />
              {formatViDate(today, 'EEEE, dd/MM/yyyy')}
            </span>
          </div>
          {intention && user && (
            <p className="hidden md:flex items-center gap-1.5 text-xs text-[#9CA3AF] mt-0.5 italic">
              <Quote className="w-3 h-3 shrink-0 text-[#7255F7]" />
              {intention}
            </p>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {!user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#EDEAF8] bg-[#191725] border border-[#282538] hover:bg-[#282538] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-[#7255F7]" />
              <span>Đăng nhập</span>
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#7255F7] to-indigo-600 hover:from-[#6245e8] hover:to-indigo-500 shadow-md shadow-[#7255F7]/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký</span>
            </Link>
          </div>
        ) : (
          <>
            <Link
              to="/moon"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#EDEAF8] bg-[#7255F7]/15 border border-[#7255F7]/35 hover:bg-[#7255F7]/25 hover:text-white transition-all shadow-sm"
            >
              <MoonIcon className="w-3.5 h-3.5 text-[#7255F7]" />
              <span>Trợ lý Moon 🌙</span>
            </Link>

            {/* In-app Notification Bell */}
            <NotificationDropdown />

            <Button
              onClick={onOpenQuickAdd}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              className="font-semibold shadow-md shadow-[#7255F7]/20"
            >
              <span className="hidden sm:inline">Tạo mới</span>
              <kbd className="hidden lg:inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-white/20 text-white font-mono">
                Ctrl K
              </kbd>
              <span className="sm:hidden">+</span>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
