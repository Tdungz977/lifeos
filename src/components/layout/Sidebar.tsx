import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  LogOut,
  Database,
  User as UserIcon,
  Settings,
  LogIn,
  UserPlus,
} from 'lucide-react'
import { PRIMARY_NAVIGATION_ITEMS, SECONDARY_NAVIGATION_ITEMS, SOCIAL_NAVIGATION_ITEMS } from '@/lib/constants'
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
        'hidden md:flex flex-col h-screen sticky top-0 bg-surface-container-lowest text-on-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-300 z-30 select-none border-r border-slate-200/80',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-slate-200/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 shadow-md shadow-secondary/25">
            <span className="material-symbols-outlined text-white text-xl">timelapse</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-on-surface text-base">FlowTime</span>
              <span className="text-[10px] text-secondary tracking-wider font-bold uppercase">Focus System</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
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
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70'
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
              isConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-amber-500 animate-pulse'
            )}
          />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        {PRIMARY_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group cursor-pointer',
                  isActive
                    ? 'bg-surface-container-low text-on-surface font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-medium'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}

        {/* Social & Growth Section */}
        {!collapsed && (
          <div className="pt-3 pb-1 px-3">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Kết nối & Phát triển
            </span>
          </div>
        )}
        {SOCIAL_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 group cursor-pointer',
                  isActive
                    ? 'bg-secondary-fixed/40 text-secondary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-medium'
                )
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-105 text-secondary" />
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

      {/* FlowTime Daily Goal Widget */}
      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-space-sm border-t border-slate-800/60 pt-3">
          <div className="p-space-md rounded-xl bg-surface-container-low border border-slate-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-title-md text-secondary">timelapse</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Mục tiêu ngày
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-bold">68%</span>
            </div>
            <div className="flex items-baseline justify-between mb-space-xs">
              <span className="font-title-md text-title-md text-on-surface font-bold">5.5h</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">/ 8h tập trung</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full w-[68%]"></div>
            </div>
          </div>
          <div className="flex items-center justify-between px-space-xs text-on-surface-variant font-body-sm">
            <span className="font-label-sm text-label-sm">FlowTime v2.4</span>
            <span className="flex items-center gap-space-xs font-label-sm text-label-sm font-semibold text-secondary">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>Sẵn sàng
            </span>
          </div>
        </div>
      )}

      {/* User Profile / Auth Footer */}
      <div className="p-3 border-t border-slate-200/80">
        {!user ? (
          collapsed ? (
            <NavLink
              to="/login"
              title="Đăng nhập tài khoản"
              className="w-10 h-10 rounded-xl bg-secondary-fixed/40 border border-secondary/30 text-secondary hover:bg-secondary-fixed flex items-center justify-center transition-all mx-auto cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
            </NavLink>
          ) : (
            <div className="p-3 rounded-2xl bg-surface-container-low border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-on-surface truncate">Chưa đăng nhập</p>
                  <p className="text-[10px] text-on-surface-variant truncate">Đồng bộ dữ liệu của bạn</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <NavLink
                  to="/login"
                  className="py-1.5 px-2 rounded-lg text-center text-xs font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <LogIn className="w-3 h-3 text-secondary" />
                  <span>Đăng nhập</span>
                </NavLink>
                <NavLink
                  to="/register"
                  className="py-1.5 px-2 rounded-lg text-center text-xs font-semibold text-white bg-primary hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Đăng ký</span>
                </NavLink>
              </div>
            </div>
          )
        ) : (
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-xl bg-surface-container-low border border-slate-200/80',
              collapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
                ) : (
                  initials || <UserIcon className="w-4 h-4" />
                )}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-on-surface truncate">{displayName}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{user?.email}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={() => signOut()}
                title="Đăng xuất"
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
