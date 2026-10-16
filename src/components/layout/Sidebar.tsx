import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, Sparkles, LogOut, Database, User as UserIcon, Settings } from 'lucide-react'
import { PRIMARY_NAVIGATION_ITEMS, SECONDARY_NAVIGATION_ITEMS } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  onOpenConfig: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed, onOpenConfig }) => {
  const { user, profile, signOut, isConfigured } = useAuth()
  const [showMore, setShowMore] = useState(false)

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Chiến binh'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 surface-sidebar transition-all duration-300 z-30 select-none border-r border-slate-800/80',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-[#282538]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-[#7255F7] flex items-center justify-center shrink-0 shadow-md shadow-[#7255F7]/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-[#F3F4F6] text-base">LIFEOS</span>
              <span className="text-[10px] text-[#B2A2FA] tracking-wider font-bold uppercase">Personal System</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#191725] transition-colors cursor-pointer"
          title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Database Connection Pill */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenConfig}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
            isConfigured
              ? 'bg-[#0E281F] border-[#10B981]/30 text-[#34D399] hover:bg-[#0E281F]/80'
              : 'bg-[#2A1D0B] border-[#F59E0B]/30 text-[#FBBF24] hover:bg-[#2A1D0B]/80'
          )}
        >
          <Database className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && (
            <span className="truncate">
              {isConfigured ? 'Supabase đã kết nối' : 'Kết nối Supabase DB'}
            </span>
          )}
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0 ml-auto',
              isConfigured ? 'bg-[#10B981] shadow-sm shadow-[#10B981]' : 'bg-[#F59E0B] animate-pulse'
            )}
          />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
        {PRIMARY_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group cursor-pointer',
                  isActive
                    ? 'bg-[#7255F7]/15 text-[#EDEAF8] border border-[#7255F7]/35 font-semibold shadow-sm'
                    : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#191725] border border-transparent font-medium'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}

        {/* Collapsible Secondary Tools */}
        {!collapsed && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <span>Công cụ khác</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', showMore && 'rotate-180')} />
            </button>
          </div>
        )}

        {(showMore || collapsed) &&
          SECONDARY_NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.id}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all duration-150 group cursor-pointer',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-transparent text-white border border-indigo-500/40 font-bold shadow-sm shadow-indigo-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent font-medium'
                  )
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}

        <div className="pt-2 border-t border-white/[0.07] mt-2">
          <NavLink
            to="/settings"
            title={collapsed ? 'Cài đặt' : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group cursor-pointer',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-transparent text-white border border-indigo-500/40 font-bold shadow-sm shadow-indigo-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent font-medium'
              )
            }
          >
            <Settings className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            {!collapsed && <span className="truncate">Cài đặt</span>}
          </NavLink>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800/80">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                initials || <UserIcon className="w-4 h-4" />
              )}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => signOut()}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
