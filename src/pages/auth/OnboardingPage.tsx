import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Compass, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { AvatarPicker } from '@/components/common/AvatarPicker'
import confetti from 'canvas-confetti'

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile, completeOnboarding } = useAuth()
  const [step, setStep] = useState(1)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [displayName, setDisplayName] = useState(
    profile?.display_name || user?.user_metadata?.full_name || 'Chiến binh'
  )
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh')
  const [growthGoal, setGrowthGoal] = useState('')
  const [dailyIntention, setDailyIntention] = useState(
    'Kỷ luật là tự do. Hoàn thành 3 mục tiêu quan trọng nhất mỗi ngày.'
  )
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFinish = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await completeOnboarding({
        displayName,
        avatarUrl,
        growthGoal,
        timezone,
        dailyIntention,
      })

      if (res.error) {
        setErrorMsg(res.error.message || 'Không thể lưu thông tin hồ sơ.')
        setLoading(false)
        return
      }

      // Fire victory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      })

      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi thiết lập.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-lg space-y-6 relative z-10 animate-fade-in">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-indigo-500' : s < step ? 'w-4 bg-indigo-900' : 'w-4 bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Chào mừng bạn đến với LIFEOS</h2>
                  <p className="text-xs text-slate-400">Hãy thiết lập ảnh đại diện, danh xưng và múi giờ làm việc</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <AvatarPicker
                  currentAvatar={avatarUrl}
                  displayName={displayName}
                  onSelect={(url) => setAvatarUrl(url)}
                />

                <Input
                  label="Tên hiển thị của bạn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Long"
                  required
                />

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Múi giờ
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
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!displayName.trim()}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Tiếp tục
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Mục Tiêu & Định Hướng Phát Triển</h2>
                  <p className="text-xs text-slate-400">Mục tiêu phát triển cá nhân dài hạn và tôn chỉ hành động</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Input
                  label="Mục tiêu phát triển cá nhân dài hạn"
                  value={growthGoal}
                  onChange={(e) => setGrowthGoal(e.target.value)}
                  placeholder="Ví dụ: Đạt IELTS 7.5 & Chạy Half-Marathon trong 6 tháng..."
                />

                <Input
                  label="Châm ngôn hành động (Daily Intention)"
                  value={dailyIntention}
                  onChange={(e) => setDailyIntention(e.target.value)}
                  placeholder="Ví dụ: Kỷ luật là tự do..."
                />

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-slate-400">Gợi ý dành cho bạn:</p>
                  {[
                    'Kỷ luật là tự do. Hoàn thành 3 việc quan trọng nhất.',
                    'Tiến bộ 1% mỗi ngày thay vì đòi hỏi hoàn hảo tức thì.',
                    'Tập trung vào hành động, không phân tâm bởi kết quả trước mắt.',
                  ].map((quote) => (
                    <button
                      key={quote}
                      type="button"
                      onClick={() => setDailyIntention(quote)}
                      className="w-full text-left p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-colors"
                    >
                      &ldquo;{quote}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Quay lại
                </Button>
                <Button onClick={() => setStep(3)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Tiếp tục
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Sẵn sàng kích hoạt LIFEOS</h2>
                  <p className="text-xs text-slate-400">Hệ sinh thái đã được cá nhân hóa cho bạn</p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <p>
                  <strong>Nguyên lý vận hành:</strong>
                </p>
                <p className="text-slate-400">
                  Đặt mục tiêu &rarr; Chia nhỏ nhiệm vụ &rarr; Lên lịch mỗi ngày &rarr; Thực thi &rarr; Theo dõi &rarr; Cải tiến.
                </p>
                <p className="text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Dữ liệu được cô lập bảo mật theo chuẩn Supabase RLS.
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Quay lại
                </Button>
                <Button
                  variant="primary"
                  onClick={handleFinish}
                  isLoading={loading}
                  rightIcon={<Sparkles className="w-4 h-4" />}
                >
                  Bắt đầu ngay
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
