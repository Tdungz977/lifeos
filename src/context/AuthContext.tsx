import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'
import { Profile } from '@/types/database'

interface AuthContextType {
  user: FirebaseUser | any
  session: any
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null; data?: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
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

const LOCAL_STORAGE_USER_KEY = 'lifeos_local_auth_user'
const LOCAL_STORAGE_PROFILE_KEY = 'lifeos_local_auth_profile'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | any>(null)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const isConfigured = isFirebaseConfigured()

  // Load profile from Firestore or LocalStorage
  const loadProfile = async (uid: string, fallbackName?: string): Promise<Profile> => {
    let loaded: Profile | null = null

    if (isConfigured) {
      try {
        const ref = doc(db, 'profiles', uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          loaded = snap.data() as Profile
        } else {
          // create new profile in firestore
          const initial: Profile = {
            id: uid,
            username: fallbackName?.toLowerCase().replace(/\s+/g, '_') || 'user',
            display_name: fallbackName || 'Chiến binh FlowTime',
            avatar_url: null,
            timezone: 'Asia/Ho_Chi_Minh',
            daily_intention: 'Kỷ luật là tự do. Tập trung vào điều quan trọng nhất hôm nay.',
            preferred_week_start: 'monday',
            theme: 'dark',
            is_onboarded: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          await setDoc(ref, initial)
          loaded = initial
        }
      } catch (err) {
        console.warn('Firestore load profile error, using local fallback:', err)
      }
    }

    if (!loaded) {
      // Local fallback
      try {
        const stored = localStorage.getItem(`${LOCAL_STORAGE_PROFILE_KEY}_${uid}`)
        if (stored) {
          loaded = JSON.parse(stored)
        }
      } catch {
        // ignore
      }
    }

    const finalProfile: Profile = loaded || {
      id: uid,
      username: fallbackName?.toLowerCase().replace(/\s+/g, '_') || 'user',
      display_name: fallbackName || 'Chiến binh FlowTime',
      avatar_url: null,
      timezone: 'Asia/Ho_Chi_Minh',
      daily_intention: 'Kỷ luật là tự do. Tập trung vào điều quan trọng nhất hôm nay.',
      preferred_week_start: 'monday',
      theme: 'dark',
      is_onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setProfile(finalProfile)
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY}_${uid}`, JSON.stringify(finalProfile))
    } catch {
      // ignore
    }
    return finalProfile
  }

  // Monitor Auth State
  useEffect(() => {
    if (isConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser)
          setSession({ user: currentUser })
          await loadProfile(currentUser.uid, currentUser.displayName || currentUser.email?.split('@')[0])
        } else {
          setUser(null)
          setSession(null)
          setProfile(null)
        }
        setLoading(false)
      })
      return () => unsubscribe()
    } else {
      // Local demo session
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          setUser(parsed)
          setSession({ user: parsed })
          loadProfile(parsed.id || parsed.uid, parsed.displayName || parsed.email?.split('@')[0])
        } else {
          // Provide default active guest user so the user never sees empty blocking screens
          const defaultUser = {
            id: 'local-flow-user-1',
            uid: 'local-flow-user-1',
            email: 'user@flowtime.app',
            displayName: 'Linh Nguyễn',
            user_metadata: { full_name: 'Linh Nguyễn' },
          }
          setUser(defaultUser)
          setSession({ user: defaultUser })
          loadProfile(defaultUser.id, defaultUser.displayName)
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }
  }, [isConfigured])

  const signIn = async (email: string, password: string) => {
    if (isConfigured) {
      try {
        const res = await signInWithEmailAndPassword(auth, email, password)
        setUser(res.user)
        setSession({ user: res.user })
        await loadProfile(res.user.uid, res.user.displayName || email.split('@')[0])
        return { error: null }
      } catch (err: any) {
        return { error: err }
      }
    } else {
      // Local Auth
      const localUser = {
        id: `user-${Date.now()}`,
        uid: `user-${Date.now()}`,
        email,
        displayName: email.split('@')[0],
      }
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(localUser))
      setUser(localUser)
      setSession({ user: localUser })
      await loadProfile(localUser.id, localUser.displayName)
      return { error: null }
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    if (isConfigured) {
      try {
        const res = await createUserWithEmailAndPassword(auth, email, password)
        setUser(res.user)
        setSession({ user: res.user })
        await loadProfile(res.user.uid, displayName)
        return { error: null, data: res.user }
      } catch (err: any) {
        return { error: err }
      }
    } else {
      const localUser = {
        id: `user-${Date.now()}`,
        uid: `user-${Date.now()}`,
        email,
        displayName,
      }
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(localUser))
      setUser(localUser)
      setSession({ user: localUser })
      await loadProfile(localUser.id, displayName)
      return { error: null, data: localUser }
    }
  }

  const signOut = async () => {
    if (isConfigured) {
      try {
        await firebaseSignOut(auth)
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    if (isConfigured) {
      try {
        await sendPasswordResetEmail(auth, email)
        return { error: null }
      } catch (err: any) {
        return { error: err }
      }
    }
    return { error: null }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.uid || user.id, user.displayName)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Chưa đăng nhập') }
    const uid = user.uid || user.id

    const newProfile: Profile = {
      ...(profile || ({} as Profile)),
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (isConfigured) {
      try {
        const ref = doc(db, 'profiles', uid)
        await updateDoc(ref, updates as any)
      } catch (err) {
        console.warn('Update doc in Firestore failed, updating local state:', err)
      }
    }

    setProfile(newProfile)
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY}_${uid}`, JSON.stringify(newProfile))
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
    return await updateProfile({
      display_name: data.displayName,
      avatar_url: data.avatarUrl || null,
      growth_goal: data.growthGoal || null,
      timezone: data.timezone,
      daily_intention: data.dailyIntention || 'Kỷ luật và kiên trì từng ngày.',
      is_onboarded: true,
    })
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
