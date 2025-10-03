## Timeline Page (timeline.tsx)

Chronological, Instagram-like feed of newly created NFTs across the Go4 ecosystem. V1 focuses on user-generated Go4Snapps via the `get_timeline_go4snapps` view; a future iteration can unify canonical Go4s in the same feed.

---

### Why

- Surface new activity and creations to increase engagement and discovery
- Provide a single, unified view for Go4s and Go4Snapps
- Establish a scalable timeline foundation we can extend with filters, live updates, and social interactions

### Goals

- Show a reverse-chronological list/grid of new items (most recent first)
- V1: Show Go4Snapps from Supabase view
- V1: Pagination with Load more (offset-based)
- Future: Unify Go4s and Go4Snapps in one feed
- Lightweight item cards with image, creator, timestamp, and quick actions (view, share)
- SEO-friendly route at `/timeline`

### Non-goals (V1)

- Comments, likes/reactions, and follows
- Advanced filters (collections, creators, traits) — basic filter(s) may appear in V1.1+
- Real-time streaming updates — can be a follow-up using Supabase Realtime or polling
- Deep moderation flows — rely on existing visibility controls/flags

---

## Data model and contract

We source data from a Supabase SQL view: `public.get_timeline_go4snapps`.

Actual view definition (provided):

```sql
drop view if exists get_timeline_go4snapps;

create view public.get_timeline_go4snapps as
select
  go4snapp_id,
  created_at,
  ipfs_cid,
  ipfs_cid_updated_at,
  last_edition_number,
  last_offer_id,
  last_offer_created_at,
  author_id,
  title,
  description,
  processing_started_at,
  total_auction_offer_count,
  replied_to_post_at,
  processing_error
from public.go4snapps
order by last_offer_created_at desc nulls last, created_at desc nulls last, go4snapp_id desc;
```

Notes

- The view currently exposes Go4Snapps only (no join to profiles or Go4s)
- Ordering preference is baked into the view: recent offer, then creation time, then id
- Images can be resolved via IPFS gateway using `ipfs_cid`

RLS and security

- Grant `select` on the view to `anon` if public; otherwise restrict per product rules
- Ensure underlying table policies allow visibility consistent with the feed

---

## Pagination strategy

V1: Offset-based using the view’s ORDER BY

- Default page size: 24
- Use `.range(offset, offset + pageSize - 1)` in the client
- Maintain consistent ordering by not overriding the view’s sort

Future: Implement cursor-based keyset pagination via a Postgres function using `(last_offer_created_at, created_at, go4snapp_id)` for stability.

---

## Client integration plan

Types

```ts
// Prefer generated types from lib/database/database.types.ts
import type { Database } from '../database.types'

export type TimelineSnappRow = Database['public']['Views']['get_timeline_go4snapps']['Row']

// Optional: app-level normalized type (if you want to coerce nullables or compute helpers)
export type TimelineSnapp = TimelineSnappRow & {
  // e.g., computed image URL from ipfs_cid
  image_url?: string
}
```

Service

```ts
// lib/database/services/timeline.ts
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
```

Supabase client typing

- `lib/database/supabaseClient.ts` already uses the generated `Database` type; consume it via `getSupabaseClient()`
- The generated `Database['public']['Views']['get_timeline_go4snapps']` Row is available in `database.types.ts`
- Optionally add a helper to produce an image URL from `ipfs_cid` (e.g., `ipfs://` or gateway conversion)

Error and loading UX

- Reuse `components/ui/Toast.tsx` for transient errors
- Use skeletons for image cards during fetch

---

## UI/UX

Route and layout

- New page: `pages/timeline.tsx`
- Title: “Timeline — New Go4s and Go4Snapps”
- Meta: canonical `/timeline`, indexable, OpenGraph image (generic if needed)
- Grid layout: responsive 2–4 columns; use `next/image` for optimized images

Card content

- Image derived from `ipfs_cid` (square/cropped if needed)
- Badge: Go4Snapp
- Creator (author_id); optional enrichment later via profiles lookup
- Timestamp priority: `last_offer_created_at` if present, else `created_at`
- Optional title/description (truncate)
- Actions: View details (navigates to item page), Share

Image sources (by ipfs_cid)

- Generated (default/front): `https://can.seedsn.app/ipfs/{ipfs_cid}/go4snapp-generated.png`
- Source (back): `https://can.seedsn.app/ipfs/{ipfs_cid}/go4snapp-source.png`

Interactions

- Initial render SSR for SEO (or CSR if we prefer; SSR recommended)
- “Load more” button; optional infinite scroll after MVP
- Filter chip: All | Go4Snapps (Go4s to be added in a future iteration)

Image flip interaction

- Desktop/hover: show generated image by default; on hover the card spins to reveal the source image, and spins back on hover out
- Touch/click: tapping the image toggles the spin (generated -> source). Tapping again flips back to generated
- Keyboard: when the card/image is focused, pressing Enter/Space toggles the flip
- Reduced motion: respect `prefers-reduced-motion` — swap images with an instant change or a light fade instead of a spin
- Loading: preload the source image on hover (onMouseEnter) or when the card first intersects the viewport to reduce flip latency
- Reset: when the card unmounts or leaves the viewport, reset to the default (generated) state

Empty state

- Friendly message: “No items yet. Be the first to create a Go4Snapp.”
- CTA to creation flows where applicable

Accessibility

- Semantic list/grid roles, alt text for images, keyboard navigation, focus styles

Performance

- Lazy-load below-the-fold images, use low-quality placeholders
- Avoid layout shift by fixing card aspect ratio
- Consider deferred loading of the source image until hover/touch (or first intersection) to minimize initial bandwidth
- Cache source images per ipfs_cid to avoid re-fetching on subsequent flips

Implementation sketch

```tsx
// Card internals: 3D flip container with two faces
// Respect prefers-reduced-motion and support keyboard/touch toggling

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => setReduced(mq.matches)
    handler()
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

export function TimelineSnappCard({ ipfs_cid, ...rest }: { ipfs_cid: string }) {
  const [flipped, setFlipped] = React.useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const generatedUrl = `https://can.seedsn.app/ipfs/${ipfs_cid}/go4snapp-generated.png`
  const sourceUrl = `https://can.seedsn.app/ipfs/${ipfs_cid}/go4snapp-source.png`

  const toggle = () => setFlipped((f) => !f)

  return (
    <div
      className="flip-wrap"
      onMouseEnter={() => !reducedMotion && setFlipped(true)}
      onMouseLeave={() => !reducedMotion && setFlipped(false)}
    >
      <button
        type="button"
        className="flip-inner"
        aria-pressed={flipped}
        onClick={toggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}
      >
        <img src={generatedUrl} alt="Generated Go4Snapp" className="flip-face front" />
        <img src={sourceUrl} alt="Source Go4Snapp" className="flip-face back" />
      </button>
      <style jsx>{`
        .flip-wrap {
          perspective: 1000px;
        }
        .flip-inner {
          position: relative;
          width: 100%;
          aspect-ratio: 1/1;
          border: 0;
          padding: 0;
          background: transparent;
          transform-style: preserve-3d;
          transition: transform 600ms ease;
        }
        .flip-inner[aria-pressed='true'] {
          transform: rotateY(180deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .flip-inner {
            transition: none;
          }
          .flip-inner[aria-pressed='true'] {
            transform: none;
          }
        }
        .flip-face {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          object-fit: cover;
        }
        .front {
          transform: rotateY(0deg);
        }
        .back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}
```

---

## SEO

- Route: `/timeline`
- Title/description set via `_document`/per-page head
- JSON-LD item list (optional) via `components/SEO/StructuredData.tsx`

---

## Analytics (optional V1)

- Track impressions and clicks per card, filter usage, and pagination events

---

## Acceptance criteria

- A new `/timeline` page renders a chronological feed of Go4Snapps based on the view’s ordering
- Items appear with `last_offer_created_at` recency first, then `created_at`, then id
- Pagination works via “Load more”; no hard crashes on empty or last page
- Errors are surfaced non-blockingly (toast) and are recoverable (retry)
- Basic filter: All | Go4Snapps (Go4s added later)
- The page is responsive and images are optimized
- Supabase view `get_timeline_go4snapps` exists and returns the documented columns
- RLS allows public read consistent with business rules
- Card image behavior: generated image shows by default; on hover it spins to show source, and spins back on hover out; on touch/click it toggles between the two
- Accessibility: keyboard toggling works; `prefers-reduced-motion` avoids spin (instant or fade swap)

---

## Implementation checklist

Backend (DB)

- [x] Create `public.get_timeline_go4snapps` view (matching provided definition)
- [x] Add `select` RLS policy for anonymous reads, or restrict per product rules
- [x] Ensure supporting indexes exist on source tables

Types and client

- [x] Add view to `lib/database/database.types.ts`
- [x] Ensure `supabaseClient` is typed with `Database`
- [x] Add `TimelineSnapp` type and `services/timeline.ts`

Frontend

- [ ] Create `pages/timeline.tsx` with SSR/CSR data fetching
- [ ] Implement `TimelineGrid` using existing `PfpCard` or a new shared card component
- [ ] Add filter controls and “Load more”
- [ ] Wire to toast for errors and skeletons for loading
- [ ] Add link to header/nav

QA

- [ ] Verify ordering, pagination, filters, empty and error states
- [ ] Basic lighthouse pass for performance/accessibility

---

## Open questions

- Do we want live updates in V1 via polling or Supabase Realtime? If yes, what cadence?
- Should Go4Snapps have separate visibility flags or moderation distinct from Go4s?
- Do we need per-collection filters immediately, or later?
- Image source of truth: do we standardize on a CDN path for consistent `next/image` behavior?
- When we unify Go4s: update the view or create a separate union view?

---

## Future enhancements

- Real-time updates with in-feed “New items” toast
- Rich interactions: likes, comments, saves
- Advanced filters (collections, creators, traits), search
- Creator highlights and featured rows
