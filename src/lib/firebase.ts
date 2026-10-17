import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
  measurementId?: string
}

// Default project config for tesst-cb1eb
const defaultProjectConfig: FirebaseConfig = {
  apiKey: 'AIzaSyAVY0bqNsD80rwL_RpDoWSlOqoOZi8z3cg',
  authDomain: 'tesst-cb1eb.firebaseapp.com',
  projectId: 'tesst-cb1eb',
  storageBucket: 'tesst-cb1eb.firebasestorage.app',
  messagingSenderId: '465084326793',
  appId: '1:465084326793:web:a9e2247a5d4c19fb93f758',
  measurementId: 'G-DT41TZP6XF',
}

// 1. Read environment variables from .env
const envConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultProjectConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultProjectConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultProjectConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultProjectConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultProjectConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultProjectConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultProjectConfig.measurementId,
}

// 2. Read runtime config from localStorage
const getStoredConfig = (): FirebaseConfig | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('lifeos_firebase_config')
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return null
}

const localConfig = getStoredConfig()

export const activeFirebaseConfig: FirebaseConfig = {
  apiKey: localConfig?.apiKey || envConfig.apiKey,
  authDomain: localConfig?.authDomain || envConfig.authDomain,
  projectId: localConfig?.projectId || envConfig.projectId,
  storageBucket: localConfig?.storageBucket || envConfig.storageBucket,
  messagingSenderId: localConfig?.messagingSenderId || envConfig.messagingSenderId,
  appId: localConfig?.appId || envConfig.appId,
  measurementId: localConfig?.measurementId || envConfig.measurementId,
}

export const isFirebaseConfigured = (): boolean => {
  const c = activeFirebaseConfig
  return Boolean(
    c.apiKey &&
    c.projectId &&
    c.appId &&
    !c.apiKey.includes('placeholder') &&
    !c.projectId.includes('placeholder')
  )
}

// Fallback dummy config to prevent initializeApp crashing if user hasn't added keys yet
const fallbackDummyConfig: FirebaseConfig = {
  apiKey: 'AIzaSyDemoPlaceholderKeyForLocalLifeOS123',
  authDomain: 'lifeos-app-demo.firebaseapp.com',
  projectId: 'lifeos-app-demo',
  storageBucket: 'lifeos-app-demo.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef1234567890',
}

const effectiveConfig: FirebaseConfig = isFirebaseConfigured()
  ? activeFirebaseConfig
  : fallbackDummyConfig

export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(effectiveConfig)

export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)

// Safe Analytics initialization
export let analytics: any = null
if (typeof window !== 'undefined' && isFirebaseConfigured() && effectiveConfig.measurementId) {
  import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app)
      }
    }).catch(() => {})
  }).catch(() => {})
}

export function saveFirebaseConfig(config: FirebaseConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lifeos_firebase_config', JSON.stringify(config))
    window.location.reload()
  }
}

export function clearFirebaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lifeos_firebase_config')
    window.location.reload()
  }
}
