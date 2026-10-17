import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { updatePassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import confetti from 'canvas-confetti'

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const { resetPassword, isConfigured } = useAuth()

  // Mode: request link vs set new password
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  // Request link state
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // New password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  useEffect(() => {
    // Check URL query/hash for recovery params
    const search = window.location.search
    const hash = window.location.hash
    if (search.includes('mode=resetPassword') || hash.includes('type=recovery')) {
      setIsRecoveryMode(true)
    }
  }, [])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    setLoading(true)
    const { error } = await resetPassword(email.trim())
    setLoading(false)
    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Không thể gửi email đặt lại mật khẩu.')
    } else {
      setSubmitted(true)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.')
      return
    }

    setUpdating(true)
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword)
      }

      setUpdateSuccess(true)
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } })
      setTimeout(() => {
        navigate('/')
      }, 1800)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật mật khẩu.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-xl shadow-indigo-900/40 border border-indigo-400/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {isRecoveryMode ? 'Thiết lập mật khẩu mới' : 'Đặt lại mật khẩu'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {isRecoveryMode
              ? 'Nhập mật khẩu mới an toàn cho tài khoản LIFEOS của bạn.'
              : 'Nhập địa chỉ email của bạn để nhận liên kết khôi phục mật khẩu.'}
          </p>
        </div>

        <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isRecoveryMode ? (
            updateSuccess ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-100">Đổi mật khẩu thành công!</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mật khẩu tài khoản đã được cập nhật. Hệ thống đang chuyển hướng bạn về Trang chủ...
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <Input
                  label="Mật khẩu mới"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  autoFocus
                />

                <Input
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold shadow-lg shadow-indigo-950/50 mt-2"
                  isLoading={updating}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Cập nhật mật khẩu
                </Button>
              </form>
            )
          ) : submitted ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-100">Kiểm tra hộp thư email</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong>. Vui lòng kiểm tra hòm thư của bạn.
              </p>
              <Link to="/login" className="inline-block mt-4">
                <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Quay lại đăng nhập
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <Input
                label="Email của bạn"
                type="email"
                placeholder="tenban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-semibold shadow-lg shadow-indigo-950/50"
                isLoading={loading}
              >
                Gửi liên kết khôi phục
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại trang Đăng nhập</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
