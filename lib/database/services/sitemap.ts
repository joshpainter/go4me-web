import { getSupabaseClient } from '../supabaseClient'
import { clampRange } from '../core/pagination'
import { normaliseError } from '../core/errors'
import type { Tables } from '../database.types'
import type { DatabaseResponse, PaginationOptions } from '../types'

type UsernameRow = Pick<Tables<'get_leaderboard'>, 'username'>

export async function fetchUsernamesPage(pagination: PaginationOptions): Promise<DatabaseResponse<UsernameRow[]>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: [], error: { message: 'Supabase not initialised' } }
  try {
    const { from, to } = clampRange(pagination)
    const { data, error } = await supabase
      .from('get_leaderboard')
      .select('username')
      .not('username', 'is', null)
      .order('username', { ascending: true })
      .range(from, to)

    if (error) return { data: [], error: normaliseError(error) }
    return { data: (data || []) as UsernameRow[], error: null }
  } catch (e: unknown) {
    return { data: [], error: normaliseError(e) }
  }
}
