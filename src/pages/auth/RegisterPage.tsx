import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Mail, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SupabaseConfigModal } from '@/components/common/SupabaseConfigModal'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { signUp, isConfigured } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showConfig, setShowConfig] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!isConfigured) {
      setShowConfig(true)
      return
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.')
      return
    }

    setLoading(true)
    const { error, data } = await signUp(email, password, fullName)
    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Đăng ký không thành công.')
    } else {
      if (data?.session) {
        // Direct auto-confirmed login
        navigate('/onboarding')
      } else {
        // Requires email verification
        setSuccessMsg(
          'Đăng ký thành công! Vui lòng kiểm tra hộp thư email của bạn để xác nhận tài khoản (hoặc tắt Confirm Email trong Supabase Auth Settings nếu đang test local).'
        )
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-xl shadow-indigo-900/40 border border-indigo-400/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Bắt đầu cùng LIFEOS</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Xây dựng thói quen, quản trị mục tiêu và tối ưu hóa năng suất mỗi ngày.
          </p>
        </div>

        <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100">Đăng ký tài khoản</h2>
            <p className="text-xs text-slate-400">Tạo tài khoản cá nhân riêng tư của bạn</p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-sm space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Hoàn tất đăng ký!</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{successMsg}</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                className="w-full mt-2"
              >
                Đến trang Đăng nhập
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
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

              <Input
                label="Mật khẩu"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="Xác nhận mật khẩu"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-semibold mt-2 shadow-lg shadow-indigo-950/50"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Đăng ký tài khoản
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>

      <SupabaseConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  )
}
