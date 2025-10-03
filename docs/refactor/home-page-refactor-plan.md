# Home page refactor plan — unify views on a single backend view

Date: 2025-09-12
Owner: Web
Scope: `pages/home.tsx` only (no backend/schema changes in this pass)

## Goal

- All leaderboard tabs (views) on the home page should use one standardized data contract derived from the same Supabase view (`public.get_leaderboard`).
- Remove per-view object-shape branching and duplicated mapping/formatting logic.
- Keep rendering differences (badges/labels) purely presentational based on a single, consistent `user` shape.
- Note any fields that are not provided by the backend view but would be required to support current or future UI.

## Current state (summary)

- Data source for every tab is the same Supabase view: `get_leaderboard`.
  - File: `lib/database/services/leaderboard.ts`
    - `resolveLeaderboardQuery()` always queries `.from('get_leaderboard')`, with optional filters:
      - `view === 'queue'` → `not('rank_queue_position', 'is', null)`
      - `view === 'marmotRecovery'` → `eq('xch_address', 'xch120ywvwahucfptkeuzzdpdz5v0nnarq5vgw94g247jd5vswkn7rls35y2gc')`
    - Ordering is centralized in `lib/database/core/ordering.ts` and uses `rank_*` columns.
    - Selected columns are defined by `LEADERBOARD_COLUMNS` in `lib/database/core/columns.ts`.
- `pages/home.tsx` manually maps rows from `getServerSideProps`, `fetchFirst` effect, and `loadMore` to a local `User` type. That mapping logic is duplicated 3x and branches for the `queue` view.
- The UI shows small, view-specific badge rows but relies on overlapping fields across tabs.

## Backend contract: fields available vs. used

Supabase view row type: `Tables<'get_leaderboard'>` (see `lib/database/database.types.ts`). The home page uses the following fields (directly or to compute derived values):

- Identity and profile
  - `author_id`
  - `username`
  - `name` (display full name)
  - `pfp_ipfs_cid` (used to build `avatarUrl` and original `xPfpUrl`)
- Sales/values
  - `total_sold`
  - `xch_total_sales_amount` (used to compute total traded in XCH)
  - `xch_average_sales_amount` (used to compute average sale in XCH)
- Offer/market
  - `last_offerid`
  - `last_offer_status`
  - `last_sale_at`
- Ranks (server-side ordering + display rank badge)
  - `rank_copies_sold`
  - `rank_total_traded_value`
  - `rank_total_badge_score`
  - `rank_total_shadow_score`
  - `rank_last_sale`
  - `rank_fewest_copies_sold`
  - `rank_queue_position`
- Aggregate scores
  - `total_badge_score`
  - `total_shadow_score`
- Misc for view filters
  - `xch_address` (used server-side for Marmot Recovery filtering only)

All of the above are included by default in `LEADERBOARD_COLUMNS`. No field used by the current UI is missing from the backend view.

Potentially useful but currently unused fields that exist on the view:

- `total_aftermarket_trades`
- `total_auction_offer_count`

## Desired unified front-end data contract

Define a single, normalized shape for the home page, returned by one mapping function for all views (including `queue`). Suggested contract below; values not in the backend are marked as derived.

- id: string (from `author_id` or fallback to `username`)
- username: string
- fullName: string | null (from `name`)
- avatarUrl: string (derived from `pfp_ipfs_cid` + `username` → IPFS `...-go4me.png`, with fallback)
- xPfpUrl: string (derived from `pfp_ipfs_cid` + `username` → `...-x.png`, with fallback)
- totalSold: number (from `total_sold`)
- totalTradedXCH: number (derived from `xch_total_sales_amount` / `MOJO_PER_XCH`)
- totalRoyaltiesXCH: number (derived: 10% of traded)
- averageSaleXCH: number (derived from `xch_average_sales_amount` / `MOJO_PER_XCH`)
- lastOfferId: string | null (from `last_offerid`)
- lastOfferStatus: number | null (from `last_offer_status`)
- lastSaleAtMs: number | null (from `last_sale_at`)
- rankCopiesSold: number | null
- rankTotalTradedValue: number | null
- rankTotalBadgeScore: number | null
- rankTotalShadowScore: number | null
- rankLastSale: number | null
- rankFewestCopiesSold: number | null
- rankQueuePosition: number | null
- timeToNextMintSeconds: number (derived: `(rank_queue_position || 0) * QUEUE_SECONDS_PER_POSITION`)
- estimatedNextMintAtMs: number (derived: `Date.now() + timeToNextMintSeconds * 1000`)
- totalBadgeScore: number (from `total_badge_score`)
- totalShadowScore: number (from `total_shadow_score`)
- displayTotalTradedXCH: string (derived formatting)
- displayTotalRoyaltiesXCH: string (derived formatting)
- displayNextMintEta: string (derived formatting of `timeToNextMintSeconds`, e.g., "3m 20s")

Notes:

- Keep a single contract even for `queue` so the render path doesn’t branch on shape.
- All ranks remain available, but the server ordering from `ORDER_MAP` should make client re-sorting unnecessary, except as a defensive fallback.

## View-to-field matrix (what each tab needs)

- Total Editions Sold
  - Needs: `total_sold`, `xch_total_sales_amount`, `rank_copies_sold`, `last_offerid`, `last_offer_status`.
  - Optional/derived: `rank_queue_position` → `timeToNextMintSeconds` and `displayNextMintEta` for "Coming Soon" ETA.
- Total Traded Value
  - Needs: `xch_total_sales_amount`, `total_sold`, `rank_total_traded_value`, `last_offerid`, `last_offer_status`.
- Badge Score
  - Needs: `total_badge_score`, `rank_total_badge_score`.
- Shadow Score
  - Needs: `total_shadow_score`, `rank_total_shadow_score`.
- Rarest
  - Needs: `rank_fewest_copies_sold`, plus `total_sold` and traded totals for badges.
- Recent Trades
  - Needs: `last_sale_at`, `rank_last_sale`.
- Marmot Recovery Fund
  - Uses same fields as Total Editions Sold; server-side filter is by `xch_address`.
- Queue
  - Needs: `rank_queue_position`, `total_sold` (to show next edition number).
  - Derived: `timeToNextMintSeconds`, `estimatedNextMintAtMs`, `displayNextMintEta`.

All of these are already included by `LEADERBOARD_COLUMNS`.

## Deprecations and cleanup

- Remove references to average time to sell on Home:
  - Delete any remnants of `avgTimeToSellMs` and `displayAvgTime` in the Home user contract and UI; we will not surface this on the home page.
  - Do not add `avg_time_to_sell_ms` to `get_leaderboard` at this time.
- Remove references to `total_aftermarket_trades`; it’s unused by Home and not part of the unified contract.
- Remove references to `displayAverageSaleXCH`; it’s unused by Home and not part of the unified contract.
- Ensure queue ETA consistently uses 30 seconds per position:
  - Source of truth is `QUEUE_SECONDS_PER_POSITION = 30` (see `lib/constants.ts`).
  - Fix any stale comments that mention 10 seconds per position and align helper naming with the new derived fields.

## Gaps and potential backend additions

- Nothing required for the current UI after the above cleanup. If future UI needs additional aggregates, we can extend `LEADERBOARD_COLUMNS` and the view then.

## Refactor plan (no functional changes yet)

1. Centralize mapping and formatting

- Create a single mapper `mapLeaderboardRowToHomeUser(row)` (suggested location: `lib/database/services/mappers.ts` or co-locate in `leaderboard.ts`).
- Move shared formatters (`formatXCH`, `formatDuration`, `formatRelativeAgo`, `formatEtaFromQueue`) into a small `lib/format.ts` for reuse.
- Ensure the mapper returns the unified contract for all views, including `queue`.

2. Simplify `pages/home.tsx`

- Replace the three duplicated mapping blocks (SSR + `fetchFirst` + `loadMore`) with the shared mapper.
- Remove per-view user-shape branches; keep only presentational branching when rendering badges.
- Prefer server ordering (from `ORDER_MAP`) and drop client re-sorts, keeping a lightweight fallback only if needed.
- Extract a presentational `PfpCard` component (props: `{ user, view, rootHostForLinks }`).
  - Suggested location: `components/PfpCard.tsx`
  - Move the in-file `PfpFlipCard` functionality into this PfpCard component for reuse.
- Extract a tiny `PfpImage` or `buildPfpUrl(username, cid, variant)` utility shared by Home and the card.
- Plan for reuse on the Domain page:
  - In a follow-up PR, update `pages/domain.tsx` to use `PfpCard` so card UI is consistent across Home and Domain.
  - Keep layout-specific bits (grids, page headings, filters) in each page, but consolidate card markup and logic in the shared components.

3. Keep server contract stable

- No changes to Supabase schema in this pass.
- Keep `LEADERBOARD_COLUMNS` as the single source of truth and update only if we adopt additional, actually displayed data.

4. Optional future enhancement (separate PR)

- Add `avg_time_to_sell_ms` to `get_leaderboard` if we choose to display average time-to-sell on Home.
- Consider surfacing `total_aftermarket_trades` if a new "Activity" badge/tab is desired.

## Risks and mitigations

- Risk: silent regressions from removing client-side sort.
  - Mitigation: Verify that each tab’s server order matches visual rank (compare `#` badge to the expected `rank_*`).
- Risk: URL/state coupling when switching tabs/search.
  - Mitigation: Keep current shallow routing behavior; only refactor mapping/rendering.

## Acceptance checklist

- One unified `user` contract is used across all tabs.
- Mapping logic is defined once and reused.
- No missing data for any tab; badges/CTAs show the same information as before.
- Server-side ordering matches displayed ranks for all views.

## Verification plan

- Type-check and build.
- Manual QA per tab with a known dataset:
  - Check rank badge numbers and ordering consistency.
  - Verify images (front/back) render the same.
  - Verify CTA buttons appear only when `last_offer_status === 0` and link targets are unchanged.
  - Queue tab shows "Next Edition" and ETA with the same numbers as before.

## Appendix: Backend field checklist vs. selection

- Selection list (`LEADERBOARD_COLUMNS`) includes all fields used by Home today:
  - author_id, username, name, pfp_ipfs_cid,
  - rank_copies_sold, rank_total_traded_value, rank_total_badge_score, rank_total_shadow_score,
  - rank_last_sale, rank_fewest_copies_sold, rank_queue_position,
  - total_sold, total_badge_score, total_shadow_score,
  - last_offerid, last_offer_status, last_sale_at,
  - xch_total_sales_amount, xch_average_sales_amount,
  - xch_address (for Marmot Recovery filtering).
- No action needed unless we decide to display new metrics (e.g., avg time to sell).
