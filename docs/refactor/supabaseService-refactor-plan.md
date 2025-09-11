# supabaseService.ts Refactor Plan

## 1. Current State Overview

The service centralizes DB access with helper utilities (query sanitization, pagination, ordering) and exposes functions:

- fetchLeaderboard (multi-view logic + special marmotRecovery + queue)
- fetchUserProfile
- fetchUserPfps (owned/others, optional count)
- fetchUsernamesPage (sitemap)
  Uses generated Supabase types (Tables<...>) but still contains duplication and broad `select('*')` calls.

## 2. Goals

1. Improve maintainability (reduced duplication, clearer separation of concerns).
2. Increase type precision (view-specific row shapes, exported types for consumers, no `any`).
3. Optimize performance (narrow column selection, early exits, minimized round trips, optional caching hooks).
4. Provide consistent error + telemetry surface.
5. Easier future extension (adding new leaderboard views or collection filters with minimal boilerplate).

## 3. Key Issues / Smells

- Repeated `buildOrSearch` + inline `or()` logic per query.
- Repeated ordering maps (INITIAL vs PAGE) with similar structure.
- `select('*')` prevents column-level optimization and can increase payload size.
- Special-case logic (marmotRecovery) embedded directly in core function.
- No pluggable caching or in-memory LRU for highly requested pages (leaderboard page 1 / usernames pages).
- Mixed responsibilities: view resolution, filtering, ordering, and execution all in one function.
- No structured metrics (timings, row counts) returned for observability.
- Pagination validation scattered (clampRange only). No guard for negative window size requested by caller.

## 4. Target Architecture

Introduce a lightweight modular pipeline:

```
/ lib/database/
  services/
    leaderboard.ts
    profiles.ts
    collections.ts
    sitemap.ts
  core/
    client.ts (existing)
    pagination.ts
    filters.ts
    ordering.ts
    errors.ts
    cache.ts (optional LRU abstraction)
```

- Each domain service exports focused functions.
- Shared primitives (ordering maps, filter builders) isolated in `/core`.
- Optional small cache wrapper (keyed by function + serialized args) with TTL.

## 5. Step-by-Step Refactor Phases

Phase 1 (Safe Extraction)

- Extract ordering maps + helper utilities (`clampRange`, `sanitiseQuery`, `buildOrSearch`, `normaliseError`) into `core/`.
- Export row type aliases (e.g., `LeaderboardRow`, `QueueRow`, `UserProfileRow`).
- Replace `select('*')` with explicit column lists (start with currently used fields in UI).

Phase 2 (Decomposition)

- Split `fetchLeaderboard` into: `resolveLeaderboardQuery(view, options)` and `executeQuery(qb)`.
- Move marmotRecovery author id resolution into a helper `getMarmotAuthorIds()` (cached for short TTL e.g. 60s).
- Provide per-view column sets + ordering config objects.

Phase 3 (Enhanced Typing & API)

- Introduce discriminated union return type: `{ data, error, meta }` where `meta` includes `rowCount`, `durationMs`, `from`, `to`, `view`.
- Provide `fetchLeaderboardPage({ view, query, pagination, phase })` wrapper.
- Add generic `runViewQuery<RowType>(...)` util to centralize error normalization.

Phase 4 (Performance Optimizations)

- Column Narrowing: define `LEADERBOARD_COLUMNS_BASE`, `LEADERBOARD_COLUMNS_EXTENDED` (for future expansions).
- Only apply `.or()` when query length >= 2 chars to reduce executor overhead.
- Use `.abortSignal` (if migrating to Edge runtime / fetch-based) for request cancellation.
- Evaluate if marmotRecovery can be served via a dedicated materialized view.

Phase 5 (Caching & Observability)

- Implement opt-in in-memory LRU (size ~100 entries) for most-requested queries (e.g., first page of each view, sitemap usernames).
- Decorate service calls with timing capture.
- (Optional) Add a lightweight debug logger toggle via env (e.g. `NEXT_PUBLIC_DB_DEBUG`).

Phase 6 (Cleanup & Migration)

- Mark legacy functions with JSDoc `@deprecated` tags; provide new names.
- Update call sites (home/domain pages) to use new modular imports.
- Remove deprecated exports after a stabilization period.

## 6. Query Optimization Details

Leaderboard:

- Explicit columns: `author_id, username, name, pfp_ipfs_cid, total_sold, total_badge_score, total_shadow_score, rank_* needed, last_offerid, last_sale_at`.
- Queue view: restrict to fields the UI consumes (e.g., `username, name, rank_queue_position, pfp_ipfs_cid, last_offerid`).
  User PFP collections:
- Owned: specify only fields displayed (names, image CID, rank, badge/shadow scores if shown).
- Others: similar subset.

## 7. Type Safety Improvements

- Export `ServiceResult<Row>` = `DatabaseResponse<Row[]> & { meta: Meta }`.
- Use overload pattern but narrow view union via mapped type: `type ViewMap = { queue: QueueRow; totalSold: LeaderboardRow; ... }`.
- Create `type LeaderboardViewRow<V extends LeaderboardView> = ViewMap[V]`.

## 8. Error Handling Standardization

- Central `errors.ts` with `normaliseError(e: unknown): NormalizedError`.
- Include optional `original?: unknown` only in non-production.
- Distinguish between validation errors (bad input) vs transport (Supabase) vs internal.

## 9. Caching Strategy

- Simple LRU (Map + recency list) keyed by JSON.stringify of `{ fn, args }`.
- TTL per category: leaderboard first page 15s, queue 5s, sitemap usernames 12h.
- Expose `invalidateCache(predicate?)` for admin tasks / revalidation triggers.

## 10. Testing Strategy

- Add unit tests for helpers (`sanitiseQuery`, `buildOrSearch`, `clampRange`).
- Mock Supabase client (or wrap in adapter interface) for service-level tests.
- Snapshot tests for ordering config object to detect accidental changes.

## 11. Rollout Plan

1. Implement helpers + new service modules alongside existing file.
2. Add new API surface; update pages to consume it.
3. Add telemetry logging & verify in development.
4. Remove old exports and consolidate.
5. Final pass: tree-shake verification via build size comparison.

## 12. Future Enhancements

- Consider using RPC (Postgres functions) or materialized views for heavy aggregations.
- Introduce edge caching layer (Next.js Route Handlers) for public leaderboard endpoints.
- Add pagination cursors (author_id + ordering column) to reduce dependence on offset ranges for large data sets.
- Progressive enhancement: stream first chunk while fetching additional rows (React Server Components / partial rendering).

## 13. Success Metrics

- Bundle size: service layer < X KB gzip (track before/after).
- Average response time improvement for first leaderboard page (goal: -20%).
- Reduced data transferred per leaderboard request (goal: -30% via column narrowing).
- No `any` leaks in public service function signatures (TypeScript compile check).

## 14. Immediate Action Items

- [ ] Extract helpers into `core/`.
- [ ] Define per-view column sets & ordering config with types.
- [ ] Replace `select('*')` with explicit lists.
- [ ] Introduce `ViewMap` + generic row resolver.
- [ ] Add meta timing wrapper.
- [ ] Implement basic LRU for first-page caching.

---

This document can evolve as patterns stabilize; keep modifications small and incremental to maintain deploy velocity.
