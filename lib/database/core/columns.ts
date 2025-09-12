// Explicit column lists to replace select('*') where feasible.
// Start conservative (fields currently referenced in UI) and expand as needed.

export const LEADERBOARD_COLUMNS = [
  'author_id',
  'username',
  'name',
  'pfp_ipfs_cid',
  'rank_copies_sold',
  'rank_total_traded_value',
  'rank_total_badge_score',
  'rank_total_shadow_score',
  'rank_last_sale',
  'rank_fewest_copies_sold',
  'rank_queue_position',
  'total_sold',
  'total_badge_score',
  'total_shadow_score',
  'last_offerid',
  'last_offer_status',
  'last_sale_at',
  'xch_total_sales_amount',
  'xch_average_sales_amount',
  'xch_address',
].join(',')

export const QUEUE_COLUMNS = [
  'author_id',
  'username',
  'name',
  'rank_queue_position',
  'pfp_ipfs_cid',
  'last_nft_series_number',
  'last_offerid',
  'xch_address',
].join(',')

export const USER_PROFILE_COLUMNS = [
  'author_id',
  'username',
  'name',
  'description',
  'did_address',
  'last_offerid',
  'last_offer_status',
  'total_badge_score',
  'total_shadow_score',
  'rank_copies_sold',
  'rank_queue_position',
  'pfp_update_requested_at',
  'pfp_ipfs_cid',
  'xch_address',
].join(',')

export const OWNED_PFPS_COLUMNS = [
  'username',
  'pfp_username',
  'pfp_name',
  'pfp_ipfs_cid',
  'pfp_data_uri',
  'nft_id',
  'badge',
  'badge_score',
  'shadow_score',
  'rank_copies_sold',
  'edition_number',
].join(',')

export const OTHER_OWNERS_COLUMNS = [
  'username',
  'pfp_username',
  'pfp_name',
  'pfp_ipfs_cid',
  'pfp_author_id',
  'rank_copies_sold',
  'last_offerid',
  'last_offer_status',
  'owner_xch_address',
  'owner_did_address',
].join(',')

export const USERNAME_ONLY_COLUMNS = 'username'
