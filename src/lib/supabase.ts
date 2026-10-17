import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Check environment variables first, then localStorage fallback for easy setup in UI
const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('lifeos_supabase_url') : null
const localKey = typeof window !== 'undefined' ? localStorage.getItem('lifeos_supabase_anon_key') : null

export const activeSupabaseUrl = envUrl || localUrl || ''
export const activeSupabaseAnonKey = envKey || localKey || ''

export const isSupabaseConfigured = (): boolean => {
  if (!activeSupabaseUrl || !activeSupabaseAnonKey) return false
  const url = activeSupabaseUrl.trim().toLowerCase()
  const key = activeSupabaseAnonKey.trim()

  const isValidProtocol =
    url.startsWith('https://') ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')

  const isPlaceholder =
    url.includes('placeholder') ||
    url.includes('your_supabase_project_url') ||
    url.includes('your-project-id') ||
    key.includes('placeholder') ||
    key.includes('your_supabase_anon_key')

  return isValidProtocol && !isPlaceholder && key.length > 20
}

// Fallback dummy URL so createClient does not crash if user hasn't configured yet
const clientUrl = isSupabaseConfigured() ? activeSupabaseUrl : 'https://placeholder-lifeos.supabase.co'
const clientKey = isSupabaseConfigured() ? activeSupabaseAnonKey : 'placeholder-key'

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function saveSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lifeos_supabase_url', url.trim())
    localStorage.setItem('lifeos_supabase_anon_key', key.trim())
    window.location.reload()
  }
}

export function clearSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lifeos_supabase_url')
    localStorage.removeItem('lifeos_supabase_anon_key')
    window.location.reload()
  }
}
