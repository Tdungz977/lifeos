import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2, Sparkles } from 'lucide-react'

export const ProtectedRoute: React.FC = () => {
  const { user, profile, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center gap-3 text-slate-300">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Đang xác thực hệ thống...</span>
        </div>
      </div>
    )
  }

  // If Supabase is configured, enforce strict Supabase Auth login
  if (isConfigured && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If profile exists and user has not onboarded, redirect to onboarding (except if already on /onboarding)
  if (user && profile && !profile.is_onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
