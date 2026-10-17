import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Sparkles,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SupabaseConfigModal } from '@/components/common/SupabaseConfigModal'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showConfig, setShowConfig] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)

    if (error) {
      const msg = error.message || ''
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.')
      } else if (msg.includes('Email not confirmed')) {
        setErrorMsg('Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư email của bạn.')
      } else if (msg.includes('Too many requests')) {
        setErrorMsg('Quá nhiều lần đăng nhập không thành công. Vui lòng đợi trong giây lát và thử lại.')
      } else {
        setErrorMsg(msg || 'Đăng nhập không thành công. Vui lòng thử lại.')
      }
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7255F7] to-indigo-500 shadow-xl shadow-indigo-900/40 border border-indigo-400/30 hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">LIFEOS</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Hệ điều hành quản lý mục tiêu, kế hoạch và kỷ luật cá nhân bền vững.
          </p>
        </div>

        {/* Login Card */}
        <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-slate-100">Đăng nhập tài khoản</h2>
              <p className="text-xs text-slate-400">Nhập email và mật khẩu để tiếp tục hệ thống</p>
            </div>
            <Link
              to="/register"
              className="text-xs font-semibold text-[#7255F7] hover:text-[#B2A2FA] transition-colors"
            >
              Đăng ký mới
            </Link>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="tenban@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoFocus
            />

            <div className="space-y-1">
              <Input
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
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
              <div className="flex justify-end pt-0.5">
                <Link
                  to="/reset-password"
                  className="text-[11px] text-slate-400 hover:text-[#B2A2FA] transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full shadow-lg shadow-[#7255F7]/25"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Đăng nhập vào LIFEOS
              </Button>
            </div>
          </form>

          {/* Quick Register Link */}
          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
            <span>Chưa có tài khoản? </span>
            <Link
              to="/register"
              className="font-bold text-[#7255F7] hover:text-[#B2A2FA] transition-colors inline-flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Đăng ký miễn phí ngay
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

      <SupabaseConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  )
}
