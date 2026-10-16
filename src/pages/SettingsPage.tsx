import React, { useState } from 'react'
import {
  Settings as SettingsIcon,
  User,
  Database,
  Download,
  Moon,
  Sun,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SupabaseConfigModal } from '@/components/common/SupabaseConfigModal'

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, signOut, isConfigured } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Ho_Chi_Minh')
  const [dailyIntention, setDailyIntention] = useState(profile?.daily_intention || '')
  const [theme, setTheme] = useState(profile?.theme || 'dark')
  const [weekStart, setWeekStart] = useState(profile?.preferred_week_start || 'monday')

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await updateProfile({
      display_name: displayName.trim(),
      timezone,
      daily_intention: dailyIntention.trim(),
      theme,
      preferred_week_start: weekStart,
    })
    setSaving(false)
    if (!res.error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    }
  }

  // Export personal data to JSON
  const handleExportData = async () => {
    if (!user || !isSupabaseConfigured()) {
      alert('Chưa kết nối Supabase hoặc chưa đăng nhập để xuất dữ liệu.')
      return
    }

    try {
      setExporting(true)
      const [tasksRes, goalsRes, habitsRes, healthRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('health_logs').select('*').eq('user_id', user.id),
      ])

      const fullData = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        profile,
        tasks: tasksRes.data || [],
        goals: goalsRes.data || [],
        habits: habitsRes.data || [],
        health_logs: healthRes.data || [],
      }

      const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Không thể xuất dữ liệu.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Cài Đặt Hệ Thống & Cá Nhân Hóa</h1>
        <p className="text-xs text-slate-400 mt-1">
          Quản lý thông tin hồ sơ, kết nối Supabase database, xuất sao lưu dữ liệu và tùy chỉnh giao diện.
        </p>
      </div>

      {/* Supabase Connection Status Card */}
      <Card className="border-indigo-900/40 bg-gradient-to-r from-[#0d1527] to-[#121c32]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Kết Nối Cơ Sở Dữ Liệu Supabase</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    isConfigured
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800'
                  }`}
                >
                  {isConfigured ? 'Đang hoạt động' : 'Chưa kết nối'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isConfigured
                  ? 'Ứng dụng đã liên kết với dự án Supabase PostgreSQL đám mây.'
                  : 'Cung cấp URL & Public Anon Key để đồng bộ dữ liệu người dùng thực tế.'}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfigModal(true)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Quản lý kết nối
          </Button>
        </div>
      </Card>

      {/* Profile Form Card */}
      <Card>
        <CardHeader
          title="Thông Tin Hồ Sơ Cá Nhân"
          subtitle="Tên hiển thị, múi giờ và châm ngôn nhắc nhở bản thân"
          icon={<User className="w-4 h-4" />}
        />

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Họ và tên / Tên hiển thị"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ví dụ: Minh Hoàng"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Múi giờ làm việc
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7 - Việt Nam)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                <option value="UTC">UTC (GMT+0)</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Ngày bắt đầu tuần
              </label>
              <select
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monday">Thứ Hai (Tiêu chuẩn)</option>
                <option value="sunday">Chủ Nhật</option>
              </select>
            </div>
          </div>

          <Input
            label="Châm ngôn hành động (Daily Intention)"
            value={dailyIntention}
            onChange={(e) => setDailyIntention(e.target.value)}
            placeholder="Ví dụ: Kỷ luật là tự do..."
          />

          <div className="flex items-center justify-between pt-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu thông tin cài đặt!
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Data Export & Backup */}
      <Card>
        <CardHeader
          title="Sao Lưu & Xuất Dữ Liệu Cá Nhân"
          subtitle="Tải toàn bộ dữ liệu nhiệm vụ, mục tiêu, thói quen và sức khỏe về máy"
          icon={<Download className="w-4 h-4" />}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-400 max-w-md">
            Dữ liệu của bạn thuộc về bạn. Bạn có thể xuất bản sao lưu định dạng JSON bất kỳ lúc nào để lưu trữ ngoại tuyến.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            isLoading={exporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Xuất file JSON
          </Button>
        </div>
      </Card>

      {/* Account & Logout */}
      <Card className="border-rose-950/40">
        <CardHeader
          title="Tài Khoản & Bảo Mật"
          subtitle="Email đang đăng nhập và phiên làm việc"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs">
            <span className="text-slate-400">Email tài khoản: </span>
            <span className="font-semibold text-slate-200">{user?.email || 'Chưa đăng nhập'}</span>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => signOut()}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Đăng xuất tài khoản
          </Button>
        </div>
      </Card>

      <SupabaseConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />
    </div>
  )
}
