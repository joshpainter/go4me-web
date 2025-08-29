import { createClient } from '@supabase/supabase-js'

// Lazy singleton pattern so build doesn't crash if env vars absent (e.g., preview without secrets)
let supabase = null

export function getSupabaseClient() {
  if (supabase) return supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Support multiple possible env var names (older docs vs new dashboard naming)
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== 'production') {
      const available = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_SUPABASE_'))
      console.warn('[Supabase] Missing env vars. Have:', available)
      console.warn(
        '[Supabase] Expect NEXT_PUBLIC_SUPABASE_URL and one of: NEXT_PUBLIC_SUPABASE_ANON_KEY | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
      )
    }
    return null
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  return supabase
}

export { supabase }
