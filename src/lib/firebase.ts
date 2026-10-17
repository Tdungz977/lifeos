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

// Check environment variables first
const envConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
}

// LocalStorage fallback for runtime configuration via UI
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
  apiKey: envConfig.apiKey || localConfig?.apiKey || '',
  authDomain: envConfig.authDomain || localConfig?.authDomain || '',
  projectId: envConfig.projectId || localConfig?.projectId || '',
  storageBucket: envConfig.storageBucket || localConfig?.storageBucket || '',
  messagingSenderId: envConfig.messagingSenderId || localConfig?.messagingSenderId || '',
  appId: envConfig.appId || localConfig?.appId || '',
  measurementId: envConfig.measurementId || localConfig?.measurementId || '',
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

// Default dummy config so initializeApp does not crash if user hasn't input keys yet
const effectiveConfig: FirebaseConfig = isFirebaseConfigured()
  ? activeFirebaseConfig
  : {
      apiKey: 'AIzaSyDemoPlaceholderKeyForLocalLifeOS123',
      authDomain: 'lifeos-app-demo.firebaseapp.com',
      projectId: 'lifeos-app-demo',
      storageBucket: 'lifeos-app-demo.appspot.com',
      messagingSenderId: '123456789012',
      appId: '1:123456789012:web:abcdef1234567890',
    }

export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(effectiveConfig)

export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)

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
