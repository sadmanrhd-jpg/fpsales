import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://ubiwpygjplsvcjsfzoxu.supabase.co'
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'sb_publishable_v0mtlfR8teOu-tDfkwMERQ_eagIJhYk'

const REMEMBER_KEY = 'food-pavilion-remember-session'
let persistSession = localStorage.getItem(REMEMBER_KEY) === 'true'

const authStorage = {
  getItem(key: string) {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    if (persistSession) {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  },
  removeItem(key: string) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export function setRememberSession(remember: boolean) {
  persistSession = remember
  if (remember) localStorage.setItem(REMEMBER_KEY, 'true')
  else localStorage.removeItem(REMEMBER_KEY)
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
  },
})
