import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { QuickAddModal } from '@/components/modals/QuickAddModal'
import { SupabaseConfigModal } from '@/components/common/SupabaseConfigModal'
import { PRIMARY_NAVIGATION_ITEMS, SECONDARY_NAVIGATION_ITEMS, SOCIAL_NAVIGATION_ITEMS } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { X, AlertTriangle, Sparkles, Settings, LogIn, UserPlus, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export const AppLayout: React.FC = () => {
  const { isConfigured, user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)

  // Global keyboard shortcut: Ctrl+K or Cmd+K opens QuickAddModal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setQuickAddOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative min-h-screen bg-[#090B12] text-[#F3F4F6] flex flex-col md:flex-row antialiased selection:bg-[#7255F7]/30 selection:text-[#EDEAF8] overflow-x-hidden">
      {/* Subtle Ambient Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft top-center purple glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-[#7255F7]/08 blur-[140px] rounded-full" />
      </div>

      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpenConfig={() => setConfigModalOpen(true)}
      />

      {/* Mobile Drawer Navigation */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-72 bg-[#110F1D] border-r border-[#282538] p-4 flex flex-col h-full z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[#282538]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#7255F7] flex items-center justify-center shadow-md shadow-[#7255F7]/25">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-[#F3F4F6] text-base tracking-tight">LIFEOS</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#191725] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider px-3 mb-1">Chính</div>
              {PRIMARY_NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#7255F7]/15 text-[#EDEAF8] border border-[#7255F7]/35'
                          : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#191725]'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              {/* Social Navigation Items */}
              <div className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider px-3 pt-3 mb-1 border-t border-[#282538]">
                Kết nối & Phát triển
              </div>
              {SOCIAL_NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-purple-500/15 text-purple-200 border border-purple-500/35 font-semibold'
                          : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#191725]'
                      )
                    }
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              <div className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider px-3 pt-3 mb-1 border-t border-[#282538]">Công cụ khác</div>
              {SECONDARY_NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-[#7255F7]/15 text-[#EDEAF8] border border-[#7255F7]/35'
                          : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#191725]'
                      )
                    }
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              <div className="pt-2 border-t border-[#282538] mt-2">
                <NavLink
                  to="/settings"
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#7255F7]/15 text-[#EDEAF8] border border-[#7255F7]/35'
                        : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#191725]'
                    )
                  }
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Cài đặt</span>
                </NavLink>
              </div>
            </nav>

            {/* Mobile Auth Bottom Box */}
            <div className="pt-3 border-t border-[#282538] space-y-2 mt-auto">
              {!user ? (
                <div className="grid grid-cols-2 gap-2">
                  <NavLink
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="py-2 px-3 rounded-xl bg-[#191725] border border-[#282538] text-xs font-semibold text-[#EDEAF8] flex items-center justify-center gap-1.5 hover:bg-[#282538]"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#7255F7]" />
                    <span>Đăng nhập</span>
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#7255F7] to-indigo-600 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đăng ký</span>
                  </NavLink>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#191725] border border-[#282538]">
                  <span className="text-xs text-[#9CA3AF] truncate max-w-[170px]">{user.email}</span>
                  <button
                    onClick={() => {
                      setMobileNavOpen(false)
                      signOut()
                    }}
                    className="p-1.5 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <Header
          onOpenQuickAdd={() => setQuickAddOpen(true)}
          onToggleMobileNav={() => setMobileNavOpen(true)}
        />

        {/* Page Outlet */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1680px] w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />
      <SupabaseConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />
    </div>
  )
}
