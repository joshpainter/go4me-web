import { getSupabaseClient } from '../supabaseClient'
import type { Database } from '../database.types'

export type TimelineSnappRow = Database['public']['Views']['get_timeline_go4snapps']['Row']

const PAGE_SIZE = 24

export async function getTimelinePage(opts?: { page?: number; pageSize?: number }) {
  const supabase = getSupabaseClient()
  const pageSize = opts?.pageSize ?? PAGE_SIZE
  const page = opts?.page ?? 0
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error } = await supabase
    .from('get_timeline_go4snapps')
    .select('*')
    // rely on the view's intrinsic ORDER BY
    .range(from, to)

  if (error) throw error
  return (data ?? []) as TimelineSnappRow[]
}

export function snappImageUrls(ipfs_cid?: string | null) {
  if (!ipfs_cid) return { generated: undefined, source: undefined }
  return {
    generated: `https://can.seedsn.app/ipfs/${ipfs_cid}/go4snapp-generated.png`,
    source: `https://can.seedsn.app/ipfs/${ipfs_cid}/go4snapp-source.png`,
  }
}
