import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, CheckCheck, Sparkles, UserPlus, Trophy, Flame } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { socialService } from '@/services/socialService'
import { AppNotification } from '@/types/database'
import { formatViDate } from '@/lib/utils'

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const loadNotifications = async () => {
    if (!user) return
    setLoading(true)
    const list = await socialService.fetchNotifications(user.id)
    setNotifications(list)
    setLoading(false)
  }

  useEffect(() => {
    loadNotifications()
    // Poll notifications every 60s
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [user])

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAllRead = async () => {
    if (!user) return
    await socialService.markAllNotificationsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleAcceptConnection = async (notification: AppNotification) => {
    if (!user || !notification.metadata?.connection_id) return
    await socialService.respondToConnectionRequest(notification.metadata.connection_id, true, user.id)
    await socialService.markNotificationRead(notification.id)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? { ...n, is_read: true, content: 'Đã chấp nhận lời mời kết nối thành công!' }
          : n
      )
    )
  }

  const handleDeclineConnection = async (notification: AppNotification) => {
    if (!user || !notification.metadata?.connection_id) return
    await socialService.respondToConnectionRequest(notification.metadata.connection_id, false, user.id)
    await socialService.markNotificationRead(notification.id)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? { ...n, is_read: true, content: 'Đã từ chối lời mời kết nối.' }
          : n
      )
    )
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return <UserPlus className="w-4 h-4 text-indigo-400" />
      case 'challenge_invite':
        return <Trophy className="w-4 h-4 text-amber-400" />
      case 'cheer_sent':
        return <Flame className="w-4 h-4 text-rose-400" />
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) loadNotifications()
        }}
        className="relative p-2 rounded-xl bg-[#191725] border border-[#282538] text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors cursor-pointer"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#13111C] border border-[#282538] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#282538] bg-[#191725]/60">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#F3F4F6]">Thông báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7255F7]/20 text-[#B2A2FA] border border-[#7255F7]/30">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-[#9CA3AF] hover:text-[#B2A2FA] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đã đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#282538]/50 scrollbar-thin">
            {loading ? (
              <div className="p-6 text-center text-xs text-[#9CA3AF]">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-[#9CA3AF]/40 mx-auto" />
                <p className="text-xs text-[#9CA3AF]">Chưa có thông báo nào.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors hover:bg-[#191725]/40 ${
                    !notif.is_read ? 'bg-[#7255F7]/5 border-l-2 border-[#7255F7]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#282538] flex items-center justify-center shrink-0 mt-0.5">
                      {getIconForType(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#EDEAF8] truncate">{notif.title}</h4>
                        <span className="text-[10px] text-[#9CA3AF] shrink-0">
                          {formatViDate(new Date(notif.created_at), 'dd/MM HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">{notif.content}</p>

                      {/* Connection request action buttons */}
                      {notif.type === 'connection_request' && !notif.is_read && notif.metadata?.connection_id && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleAcceptConnection(notif)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Đồng ý
                          </button>
                          <button
                            onClick={() => handleDeclineConnection(notif)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
