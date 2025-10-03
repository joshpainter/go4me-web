import { getSupabaseClient } from '../supabaseClient'
import { normaliseError } from '../core/errors'
import { buildOrSearch } from '../core/filters'
import { OWNED_PFPS_COLUMNS, OTHER_OWNERS_COLUMNS } from '../core/columns'
import type { Tables } from '../database.types'
import type { DatabaseResponse, PaginationOptions } from '../types'

export type OwnedPfpRow = Tables<'get_user_page_owned_pfps'>
export type OtherOwnerRow = Tables<'get_user_page_other_owners'>

export async function fetchUserPfps(
  view: 'owned',
  username: string,
  pagination: PaginationOptions,
  query?: string,
  countOnly?: boolean,
): Promise<DatabaseResponse<OwnedPfpRow[]>>
export async function fetchUserPfps(
  view: 'others',
  username: string,
  pagination: PaginationOptions,
  query?: string,
  countOnly?: boolean,
): Promise<DatabaseResponse<OtherOwnerRow[]>>
export async function fetchUserPfps(
  view: 'owned' | 'others',
  username: string,
  pagination: PaginationOptions,
  query?: string,
  countOnly = false,
): Promise<DatabaseResponse<(OwnedPfpRow | OtherOwnerRow)[]>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: [], error: { message: 'Supabase not initialised' }, count: 0 }
  try {
    const viewName = view === 'owned' ? 'get_user_page_owned_pfps' : 'get_user_page_other_owners'

    let selectOpts: string = view === 'owned' ? OWNED_PFPS_COLUMNS : OTHER_OWNERS_COLUMNS
    let headOpts: { count: 'exact'; head: true } | undefined = undefined
    if (countOnly) {
      selectOpts = 'username'
      headOpts = { count: 'exact', head: true }
    }

    let qb = supabase.from(viewName).select(selectOpts, headOpts).ilike('username', username)

    if (!countOnly) {
      qb = qb.range(pagination.from, pagination.to)
    }

    const or = buildOrSearch(['pfp_username', 'pfp_name'], query)
    if (or) qb = qb.or(or)

    const resp = await qb
    if (countOnly) {
      if (resp.error) return { data: [], error: normaliseError(resp.error), count: resp.count ?? 0 }
      return { data: [], error: null, count: resp.count ?? 0 }
    }
    if (resp.error) return { data: [], error: normaliseError(resp.error), count: resp.count ?? undefined }
    return {
      data: (resp.data as unknown as (OwnedPfpRow | OtherOwnerRow)[]) || [],
      error: null,
      count: resp.count ?? undefined,
    }
  } catch (e: unknown) {
    return { data: [], error: normaliseError(e) }
  }
}
