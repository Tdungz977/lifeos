import React, { useState, useEffect } from 'react'
import {
  User,
  Database,
  Download,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Flame,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isFirebaseConfigured, activeFirebaseConfig } from '@/lib/firebase'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { AvatarPicker } from '@/components/common/AvatarPicker'
import { SupabaseConfigModal } from '@/components/common/SupabaseConfigModal'
import { FirebaseConfigModal } from '@/components/common/FirebaseConfigModal'

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, signOut, isConfigured } = useAuth()

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [growthGoal, setGrowthGoal] = useState(profile?.growth_goal || '')
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Ho_Chi_Minh')
  const [dailyIntention, setDailyIntention] = useState(profile?.daily_intention || '')
  const [theme, setTheme] = useState(profile?.theme || 'dark')
  const [weekStart, setWeekStart] = useState(profile?.preferred_week_start || 'monday')

  // Privacy Settings state
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>(
    profile?.privacy_settings?.profile_visibility || 'public'
  )
  const [shareHabits, setShareHabits] = useState(
    profile?.privacy_settings?.share_habits ?? true
  )
  const [shareGoals, setShareGoals] = useState(
    profile?.privacy_settings?.share_goals ?? true
  )
  const [shareTasks, setShareTasks] = useState(
    profile?.privacy_settings?.share_tasks ?? false
  )
  const [shareSchedule, setShareSchedule] = useState(
    profile?.privacy_settings?.share_schedule ?? false
  )
  const [allowCompare, setAllowCompare] = useState(
    profile?.privacy_settings?.allow_compare ?? true
  )

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showFirebaseModal, setShowFirebaseModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Sync state whenever profile is fetched or updated asynchronously
  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url || '')
      setDisplayName(profile.display_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setGrowthGoal(profile.growth_goal || '')
      setTimezone(profile.timezone || 'Asia/Ho_Chi_Minh')
      setDailyIntention(profile.daily_intention || '')
      setTheme(profile.theme || 'dark')
      setWeekStart(profile.preferred_week_start || 'monday')

      if (profile.privacy_settings) {
        setProfileVisibility(profile.privacy_settings.profile_visibility || 'public')
        setShareHabits(profile.privacy_settings.share_habits ?? true)
        setShareGoals(profile.privacy_settings.share_goals ?? true)
        setShareTasks(profile.privacy_settings.share_tasks ?? false)
        setShareSchedule(profile.privacy_settings.share_schedule ?? false)
        setAllowCompare(profile.privacy_settings.allow_compare ?? true)
      }
    }
  }, [profile])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '')
    const res = await updateProfile({
      avatar_url: avatarUrl || null,
      display_name: displayName.trim(),
      username: cleanUsername || null,
      bio: bio.trim() || null,
      growth_goal: growthGoal.trim() || null,
      timezone,
      daily_intention: dailyIntention.trim(),
      theme,
      preferred_week_start: weekStart,
      privacy_settings: {
        profile_visibility: profileVisibility,
        share_habits: shareHabits,
        share_goals: shareGoals,
        share_tasks: shareTasks,
        share_schedule: shareSchedule,
        allow_compare: allowCompare,
      },
    })
    setSaving(false)
    if (!res.error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } else {
      setSaveError(res.error.message || 'Không thể lưu thông tin hồ sơ.')
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
          {/* Avatar Picker */}
          <AvatarPicker
            currentAvatar={avatarUrl}
            displayName={displayName}
            onSelect={(url) => setAvatarUrl(url)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Họ và tên / Tên hiển thị"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ví dụ: Minh Hoàng"
              required
            />

            <Input
              label="Tên định danh duy nhất (@username)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ví dụ: alex_growth, hoang_discipline"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Giới thiệu ngắn (Bio)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Chia sẻ ngắn gọn về hành trình hoặc châm ngôn sống của bạn..."
              rows={2}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <Input
            label="Mục tiêu phát triển cá nhân dài hạn"
            value={growthGoal}
            onChange={(e) => setGrowthGoal(e.target.value)}
            placeholder="Ví dụ: Đạt IELTS 7.5 & Chạy Half-Marathon trong 6 tháng tới"
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

          {/* Privacy & Social Sharing Controls */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Quyền Riêng Tư & Chia Sẻ Dữ Liệu
            </h4>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Hiển thị hồ sơ</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'public', label: 'Công khai (@username)', desc: 'Ai cũng tìm thấy bạn' },
                  { value: 'friends', label: 'Chỉ bạn bè', desc: 'Chỉ các kết nối' },
                  { value: 'private', label: 'Riêng tư hoàn toàn', desc: 'Ẩn khỏi tìm kiếm' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all ${
                      profileVisibility === opt.value
                        ? 'bg-indigo-600/15 border-indigo-500 text-white'
                        : 'bg-[#101726]/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="profileVisibility"
                        value={opt.value}
                        checked={profileVisibility === opt.value}
                        onChange={() => setProfileVisibility(opt.value as any)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-200">{opt.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 pl-5">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#101726]/60 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <span>Chia sẻ Thói quen trong Growth Hub</span>
                <input
                  type="checkbox"
                  checked={shareHabits}
                  onChange={(e) => setShareHabits(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#101726]/60 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <span>Chia sẻ Mục tiêu trong Growth Hub</span>
                <input
                  type="checkbox"
                  checked={shareGoals}
                  onChange={(e) => setShareGoals(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#101726]/60 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <span>Cho phép so sánh (Compare Mode)</span>
                <input
                  type="checkbox"
                  checked={allowCompare}
                  onChange={(e) => setAllowCompare(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#101726]/60 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <span>Chia sẻ Nhiệm vụ hoàn thành</span>
                <input
                  type="checkbox"
                  checked={shareTasks}
                  onChange={(e) => setShareTasks(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu thông tin cài đặt!
              </span>
            )}
            {saveError && (
              <span className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4" /> {saveError}
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

      {/* Firebase Cloud Connection */}
      <Card className="border-[#F59E0B]/30">
        <CardHeader
          title="Kết Nối Nền Tảng Firebase Cloud"
          subtitle="Quản lý đồng bộ tài khoản, phiên đăng nhập và cơ sở dữ liệu Cloud Firestore"
          icon={<Flame className="w-4 h-4 text-[#F59E0B]" />}
        />
        <div className="space-y-4 text-xs">
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isFirebaseConfigured()
                ? 'bg-[#0E281F] border-[#10B981]/30 text-[#34D399]'
                : 'bg-[#2A1515] border-[#F59E0B]/30 text-[#FBBF24]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm text-[#F3F4F6]">
                  {isFirebaseConfigured() ? 'Firebase Cloud Đã Kết Nối' : 'Chưa Kết Nối Firebase Cloud'}
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  {isFirebaseConfigured()
                    ? `Dự án: "${activeFirebaseConfig.projectId}" • Đồng bộ tài khoản & Firestore trực tuyến.`
                    : 'Ứng dụng đang hoạt động ở chế độ Demo/Cục bộ. Bạn có thể kết nối dự án Firebase để đồng bộ đám mây.'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFirebaseModal(true)}
              className="border-[#F59E0B]/40 text-[#F3F4F6] hover:bg-[#F59E0B]/10 shrink-0 self-start sm:self-auto"
            >
              {isFirebaseConfigured() ? 'Đổi cấu hình Firebase' : 'Kết nối Firebase'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Account & Data Protection */}
      <Card className="border-indigo-900/40">
        <CardHeader
          title="Bảo Vệ Dữ Liệu & Phân Quyền Người Dùng"
          subtitle="Tiêu chuẩn an toàn dữ liệu, mã hóa và phiên làm việc"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        />
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Chính sách Row Level Security (RLS) đang bảo vệ dữ liệu của bạn</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Toàn bộ mục tiêu, nhiệm vụ, thói quen và lịch trình cá nhân được cô lập tuyệt đối ở tầng cơ sở dữ liệu. Không một người dùng nào khác có thể truy vấn dữ liệu của bạn trừ khi bạn chủ động cấp quyền chia sẻ (Share Permissions).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <div className="text-xs">
              <span className="text-slate-400">Tài khoản đang đăng nhập: </span>
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
        </div>
      </Card>

      <SupabaseConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />
      <FirebaseConfigModal isOpen={showFirebaseModal} onClose={() => setShowFirebaseModal(false)} />
    </div>
  )
}
