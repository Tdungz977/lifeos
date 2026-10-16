import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Mail, Lock, AlertCircle, ArrowRight, Database } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SupabaseConfigModal } from '@/components/common/SupabaseConfigModal'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { signIn, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showConfig, setShowConfig] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!isConfigured) {
      setShowConfig(true)
      return
    }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMsg('Email hoặc mật khẩu không chính xác.')
      } else {
        setErrorMsg(error.message || 'Đăng nhập không thành công.')
      }
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-xl shadow-indigo-900/40 border border-indigo-400/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">LIFEOS</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Hệ điều hành quản lý mục tiêu, kế hoạch và kỷ luật cá nhân bền vững.
          </p>
        </div>

        {/* Database Config Banner if not configured */}
        {!isConfigured && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Chưa kết nối Supabase project</span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold border border-amber-500/40 text-[11px]"
            >
              Cấu hình DB
            </button>
          </div>
        )}

        {/* Login Card */}
        <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100">Đăng nhập tài khoản</h2>
            <p className="text-xs text-slate-400">Nhập email và mật khẩu để tiếp tục hệ thống</p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Mật khẩu
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold mt-2 shadow-lg shadow-indigo-950/50"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Đăng nhập
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Security & Isolation statement */}
        <p className="text-center text-[11px] text-slate-400">
          Dữ liệu được bảo mật hoàn toàn riêng tư bằng Supabase Row Level Security (RLS).
        </p>
      </div>

      <SupabaseConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  )
}
