import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Mail,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { FirebaseConfigModal } from '@/components/common/FirebaseConfigModal'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { signUp, isConfigured } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showConfig, setShowConfig] = useState(false)

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' }
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1

    switch (score) {
      case 1:
        return { score: 25, label: 'Yếu', color: 'bg-rose-500' }
      case 2:
        return { score: 50, label: 'Trung bình', color: 'bg-amber-500' }
      case 3:
        return { score: 75, label: 'Khá mạnh', color: 'bg-blue-500' }
      case 4:
        return { score: 100, label: 'Rất an toàn', color: 'bg-emerald-500' }
      default:
        return { score: 10, label: 'Quá ngắn', color: 'bg-rose-500' }
    }
  }

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Vui lòng nhập định dạng email hợp lệ (ví dụ: tenban@gmail.com).')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu bảo mật phải có tối thiểu 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.')
      return
    }

    setLoading(true)
    const { error, data } = await signUp(email.trim(), password, fullName.trim())
    setLoading(false)

    if (error) {
      const msg = error.message || ''
      if (msg.includes('User already registered') || msg.includes('already exists') || msg.includes('email-already-in-use')) {
        setErrorMsg('Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng Quên mật khẩu.')
      } else if (msg.includes('Password should be at least') || msg.includes('weak-password')) {
        setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.')
      } else {
        setErrorMsg(msg || 'Đăng ký không thành công. Vui lòng thử lại.')
      }
    } else {
      if (data) {
        navigate('/onboarding')
      } else {
        setSuccessMsg(
          'Đăng ký tài khoản thành công! Vui lòng đăng nhập để bắt đầu trải nghiệm.'
        )
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7255F7] to-indigo-500 shadow-xl shadow-indigo-900/40 border border-indigo-400/30 hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Bắt đầu cùng LIFEOS</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Hệ thống quản trị mục tiêu, kỷ luật cá nhân và kết nối bạn bè cùng tiến bộ.
          </p>
        </div>

        {/* Register Card */}
        <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-slate-100">Đăng ký tài khoản</h2>
              <p className="text-xs text-slate-400">Tạo tài khoản cá nhân riêng tư của bạn</p>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-[#7255F7] hover:text-[#B2A2FA] transition-colors"
            >
              Đã có tài khoản?
            </Link>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg ? (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-sm space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>Hoàn tất đăng ký!</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{successMsg}</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                className="w-full mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Đến trang Đăng nhập ngay
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Họ và tên"
                placeholder="Ví dụ: Nguyễn Minh Hoàng"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
                autoFocus
              />

              <Input
                label="Email"
                type="email"
                placeholder="tenban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              {/* Password with visibility toggle */}
              <div className="space-y-1.5">
                <Input
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 6 ký tự..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />

                {/* Password strength meter */}
                {password && (
                  <div className="space-y-1 pt-1 animate-fade-in">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Độ mạnh mật khẩu:</span>
                      <span className="font-bold text-slate-200">{strength.label}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password with visibility toggle */}
              <Input
                label="Xác nhận mật khẩu"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full shadow-lg shadow-[#7255F7]/25"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Tạo tài khoản LIFEOS
                </Button>
              </div>
            </form>
          )}

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
            <span>Đã có tài khoản? </span>
            <Link to="/login" className="font-semibold text-[#7255F7] hover:text-[#B2A2FA] transition-colors">
              Đăng nhập ngay
            </Link>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Quay về trang chủ
          </Link>
        </div>
      </div>

      <FirebaseConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  )
}
