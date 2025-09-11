import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

let supabase: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabase) return supabase
  supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  )
  return supabase
}

export { supabase }
