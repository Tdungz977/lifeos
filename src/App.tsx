import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

// Lazy loaded Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))

// Lazy loaded Application Pages
const OverviewPage = lazy(() => import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const MoonAssistantPage = lazy(() => import('@/pages/MoonAssistantPage').then((m) => ({ default: m.MoonAssistantPage })))
const GoalsPage = lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const TodayPage = lazy(() => import('@/pages/TodayPage').then((m) => ({ default: m.TodayPage })))
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const ProgressPage = lazy(() => import('@/pages/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const LearningPage = lazy(() => import('@/pages/LearningPage').then((m) => ({ default: m.LearningPage })))
const HealthPage = lazy(() => import('@/pages/HealthPage').then((m) => ({ default: m.HealthPage })))
const HabitsPage = lazy(() => import('@/pages/HabitsPage').then((m) => ({ default: m.HabitsPage })))
const WeeklyReviewPage = lazy(() => import('@/pages/WeeklyReviewPage').then((m) => ({ default: m.WeeklyReviewPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

// Lightweight Loading Indicator for smooth page transitions
const PageLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
    <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
    <span className="text-xs font-semibold text-slate-400 tracking-wider animate-pulse">
      Đang tải trang...
    </span>
  </div>
)

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* Application Main Layout */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/moon" element={<MoonAssistantPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/today" element={<TodayPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/learning" element={<LearningPage />} />
                <Route path="/health" element={<HealthPage />} />
                <Route path="/habits" element={<HabitsPage />} />
                <Route path="/weekly-review" element={<WeeklyReviewPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
