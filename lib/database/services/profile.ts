import { getSupabaseClient } from '../supabaseClient'
import { normaliseError } from '../core/errors'
import { USER_PROFILE_COLUMNS } from '../core/columns'
import type { Tables } from '../database.types'
import type { DatabaseResponse } from '../types'

export type UserProfileRow = Tables<'get_user_page_info'>

export async function fetchUserProfile(username: string): Promise<DatabaseResponse<UserProfileRow | null>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not initialised' } }
  try {
    const { data, error } = await supabase
      .from('get_user_page_info')
      .select(USER_PROFILE_COLUMNS)
      .ilike('username', username)
      .maybeSingle()

    if (error) return { data: null, error: normaliseError(error) }
    return { data: (data as unknown as UserProfileRow) ?? null, error: null }
  } catch (e: any) {
    return { data: null, error: normaliseError(e) }
  }
}
