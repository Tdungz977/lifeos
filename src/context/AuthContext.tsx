import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  auth as firebaseAuth,
  db as firestore,
  isFirebaseConfigured,
} from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { Profile } from '@/types/database'

export interface AppUser {
  id: string
  uid?: string
  email?: string | null
  user_metadata?: {
    full_name?: string
    display_name?: string
    avatar_url?: string
  }
}

interface AuthContextType {
  user: AppUser | null
  session: any | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  backendType: 'firebase' | 'supabase' | 'local'
  signIn: (email: string, password: string) => Promise<{ error: Error | any | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | any | null; data?: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | any | null }>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  completeOnboarding: (data: {
    displayName: string
    timezone: string
    dailyIntention?: string
    avatarUrl?: string
    growthGoal?: string
  }) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_USER_KEY = 'lifeos_local_user'
const LOCAL_STORAGE_PROFILE_KEY = 'lifeos_local_profile'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const firebaseActive = isFirebaseConfigured()
  const supabaseActive = isSupabaseConfigured()

  const backendType: 'firebase' | 'supabase' | 'local' = firebaseActive
    ? 'firebase'
    : supabaseActive
    ? 'supabase'
    : 'local'

  const isConfigured = firebaseActive || supabaseActive

  // Fetch or create user profile
  const fetchProfile = async (userId: string, userMeta?: any): Promise<Profile | null> => {
    // 1. Firebase Firestore profile
    if (firebaseActive) {
      try {
        const ref = doc(firestore, 'profiles', userId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const loaded = snap.data() as Profile
          setProfile(loaded)
          return loaded
        } else {
          const initial: Profile = {
            id: userId,
            username: userMeta?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'warrior',
            display_name: userMeta?.full_name || 'Chiến binh LIFEOS',
            avatar_url: userMeta?.avatar_url || null,
            growth_goal: null,
            timezone: 'Asia/Ho_Chi_Minh',
            daily_intention: 'Kỷ luật là tự do. Tập trung vào điều quan trọng nhất hôm nay.',
            preferred_week_start: 'monday',
            theme: 'dark',
            is_onboarded: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          await setDoc(ref, initial)
          setProfile(initial)
          return initial
        }
      } catch (err) {
        console.warn('Firestore load profile error, using local fallback:', err)
      }
    }

    // 2. Supabase profile
    if (supabaseActive) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error && error.code === 'PGRST116') {
          const newProfile: Partial<Profile> = {
            id: userId,
            display_name: userMeta?.full_name || userMeta?.display_name || user?.email?.split('@')[0] || 'Chiến binh LIFEOS',
            timezone: 'Asia/Ho_Chi_Minh',
            daily_intention: 'Kỷ luật là tự do. Tập trung vào điều quan trọng nhất hôm nay.',
            is_onboarded: false,
          }
          const { data: created } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single()

          if (created) {
            setProfile(created)
            return created
          }
        } else if (data) {
          setProfile(data)
          return data
        }
      } catch (err) {
        console.error('Error fetching profile from Supabase:', err)
      }
    }

    // 3. Local fallback profile
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PROFILE_KEY}_${userId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setProfile(parsed)
        return parsed
      }
    } catch {
      // ignore
    }

    const defaultProfile: Profile = {
      id: userId,
      username: 'warrior',
      display_name: userMeta?.full_name || 'Chiến binh LIFEOS',
      avatar_url: null,
      growth_goal: 'Xây dựng kỷ luật thép và hoàn thành các mục tiêu năm',
      timezone: 'Asia/Ho_Chi_Minh',
      daily_intention: 'Kỷ luật là tự do. Tập trung vào điều quan trọng nhất hôm nay.',
      preferred_week_start: 'monday',
      theme: 'dark',
      is_onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProfile(defaultProfile)
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY}_${userId}`, JSON.stringify(defaultProfile))
    } catch {
      // ignore
    }
    return defaultProfile
  }

  // Monitor auth state depending on backend
  useEffect(() => {
    let unsubscribeFirebase: (() => void) | undefined
    let unsubscribeSupabase: (() => void) | undefined

    if (firebaseActive) {
      unsubscribeFirebase = onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const appUser: AppUser = {
            id: fbUser.uid,
            uid: fbUser.uid,
            email: fbUser.email,
            user_metadata: {
              full_name: fbUser.displayName || undefined,
              display_name: fbUser.displayName || undefined,
            },
          }
          setUser(appUser)
          setSession({ user: appUser })
          await fetchProfile(fbUser.uid, { full_name: fbUser.displayName })
        } else {
          setUser(null)
          setSession(null)
          setProfile(null)
        }
        setLoading(false)
      })
    } else if (supabaseActive) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata,
          }
          setUser(appUser)
          fetchProfile(session.user.id, session.user.user_metadata)
        } else {
          setUser(null)
          setLoading(false)
        }
      }).catch(() => {
        setLoading(false)
      })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session)
        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata,
          }
          setUser(appUser)
          await fetchProfile(session.user.id, session.user.user_metadata)
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      })
      unsubscribeSupabase = () => subscription.unsubscribe()
    } else {
      // Local Demo Mode
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
        if (saved) {
          const parsed: AppUser = JSON.parse(saved)
          setUser(parsed)
          setSession({ user: parsed })
          fetchProfile(parsed.id, parsed.user_metadata)
        } else {
          const demoUser: AppUser = {
            id: 'local-warrior-1',
            uid: 'local-warrior-1',
            email: 'user@lifeos.app',
            user_metadata: {
              full_name: 'Chiến binh LIFEOS',
              display_name: 'Chiến binh LIFEOS',
            },
          }
          setUser(demoUser)
          setSession({ user: demoUser })
          fetchProfile(demoUser.id, demoUser.user_metadata)
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }

    return () => {
      if (unsubscribeFirebase) unsubscribeFirebase()
      if (unsubscribeSupabase) unsubscribeSupabase()
    }
  }, [firebaseActive, supabaseActive])

  // Sign In
  const signIn = async (email: string, password: string) => {
    if (firebaseActive) {
      try {
        const res = await signInWithEmailAndPassword(firebaseAuth, email, password)
        const appUser: AppUser = {
          id: res.user.uid,
          uid: res.user.uid,
          email: res.user.email,
          user_metadata: { full_name: res.user.displayName || undefined },
        }
        setUser(appUser)
        setSession({ user: appUser })
        await fetchProfile(res.user.uid, { full_name: res.user.displayName })
        return { error: null }
      } catch (err: any) {
        return { error: err }
      }
    }

    if (supabaseActive) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && data.user) {
        const appUser: AppUser = {
          id: data.user.id,
          uid: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        }
        setUser(appUser)
        setSession(data.session)
        await fetchProfile(data.user.id, data.user.user_metadata)
      }
      return { error }
    }

    // Local mode
    const localUser: AppUser = {
      id: `user-${Date.now()}`,
      uid: `user-${Date.now()}`,
      email,
      user_metadata: { full_name: email.split('@')[0] },
    }
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(localUser))
    setUser(localUser)
    setSession({ user: localUser })
    await fetchProfile(localUser.id, localUser.user_metadata)
    return { error: null }
  }

  // Sign Up
  const signUp = async (email: string, password: string, displayName: string) => {
    if (firebaseActive) {
      try {
        const res = await createUserWithEmailAndPassword(firebaseAuth, email, password)
        await firebaseUpdateProfile(res.user, { displayName })
        const appUser: AppUser = {
          id: res.user.uid,
          uid: res.user.uid,
          email: res.user.email,
          user_metadata: { full_name: displayName },
        }
        setUser(appUser)
        setSession({ user: appUser })
        await fetchProfile(res.user.uid, { full_name: displayName })
        return { error: null, data: res.user }
      } catch (err: any) {
        return { error: err }
      }
    }

    if (supabaseActive) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName, display_name: displayName },
        },
      })
      return { error, data }
    }

    // Local mode
    const localUser: AppUser = {
      id: `user-${Date.now()}`,
      uid: `user-${Date.now()}`,
      email,
      user_metadata: { full_name: displayName },
    }
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(localUser))
    setUser(localUser)
    setSession({ user: localUser })
    await fetchProfile(localUser.id, localUser.user_metadata)
    return { error: null, data: localUser }
  }

  // Sign Out
  const signOut = async () => {
    if (firebaseActive) {
      try {
        await firebaseSignOut(firebaseAuth)
      } catch {
        // ignore
      }
    }
    if (supabaseActive) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  // Reset Password
  const resetPassword = async (email: string) => {
    if (firebaseActive) {
      try {
        await sendPasswordResetEmail(firebaseAuth, email)
        return { error: null }
      } catch (err: any) {
        return { error: err }
      }
    }
    if (supabaseActive) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error }
    }
    return { error: null }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.user_metadata)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Chưa đăng nhập') }

    const newProfile: Profile = {
      ...(profile || ({} as Profile)),
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // 1. Firebase Firestore
    if (firebaseActive) {
      try {
        const ref = doc(firestore, 'profiles', user.id)
        await updateDoc(ref, updates as any)
      } catch (err) {
        console.warn('Update doc in Firestore failed:', err)
      }
    }

    // 2. Supabase
    if (supabaseActive) {
      try {
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
      } catch (err) {
        console.warn('Update doc in Supabase failed:', err)
      }
    }

    // 3. Local state & storage
    setProfile(newProfile)
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY}_${user.id}`, JSON.stringify(newProfile))
    } catch {
      // ignore
    }

    return { error: null }
  }

  const completeOnboarding = async (data: {
    displayName: string
    timezone: string
    dailyIntention?: string
    avatarUrl?: string
    growthGoal?: string
  }) => {
    if (!user) return { error: new Error('Chưa đăng nhập') }
    const updates: Partial<Profile> = {
      display_name: data.displayName,
      avatar_url: data.avatarUrl || null,
      growth_goal: data.growthGoal || null,
      timezone: data.timezone,
      daily_intention: data.dailyIntention || 'Kỷ luật và kiên trì từng ngày.',
      is_onboarded: true,
    }
    return await updateProfile(updates)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured,
        backendType,
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
