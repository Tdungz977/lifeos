import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Profile } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: AuthError | Error | null; data?: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  completeOnboarding: (data: { displayName: string; timezone: string; dailyIntention?: string }) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const isConfigured = isSupabaseConfigured()

  // Fetch or create user profile
  const fetchProfile = async (userId: string, userMeta?: any) => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile row does not exist yet; create it safely
        const newProfile: Partial<Profile> = {
          id: userId,
          display_name: userMeta?.full_name || userMeta?.display_name || user?.email?.split('@')[0] || 'Chiến binh LIFEOS',
          timezone: 'Asia/Ho_Chi_Minh',
          daily_intention: 'Kỷ luật là tự do. Tập trung vào điều quan trọng nhất hôm nay.',
          is_onboarded: false,
        }
        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (!insertError && created) {
          setProfile(created)
        }
      } else if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata)
      } else {
        setLoading(false)
      }
    }).catch((err) => {
      console.warn('Initial session check failed:', err)
      setLoading(false)
    })

    // 2. Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.user_metadata)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isConfigured])

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return { error: new Error('Supabase chưa được cấu hình. Vui lòng kết nối Supabase.') }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!error && data.user) {
      setUser(data.user)
      setSession(data.session)
      await fetchProfile(data.user.id, data.user.user_metadata)
    }
    return { error }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!isConfigured) {
      return { error: new Error('Supabase chưa được cấu hình. Vui lòng kết nối Supabase.') }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
          display_name: displayName,
        },
      },
    })
    return { error, data }
  }

  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return { error: new Error('Supabase chưa được cấu hình. Vui lòng kết nối Supabase.') }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Chưa đăng nhập') }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
    }
    return { error }
  }

  const completeOnboarding = async (data: { displayName: string; timezone: string; dailyIntention?: string }) => {
    if (!user) return { error: new Error('Chưa đăng nhập') }
    const updates: Partial<Profile> = {
      display_name: data.displayName,
      timezone: data.timezone,
      daily_intention: data.dailyIntention || 'Kỷ luật và kiên trì từng ngày.',
      is_onboarded: true,
    }
    const res = await updateProfile(updates)
    if (!res.error) {
      // Also ensure default user_preferences row exists
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: 'dark',
          week_start: 'monday',
          daily_target_tasks: 5,
        })
    }
    return res
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        updateProfile,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
