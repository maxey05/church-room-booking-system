# RFC-003 — Browse floors and room details

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | Low | 002 | 004 | FR-1, FR-2; J1 |

## Summary
A public home page with floor tabs and room cards, and a room detail page showing all of the room's info. These are server-rendered pages that read from the DB.

## Data flow
```
GET /?floor=N ─► app/page.tsx (server) ─► db().rooms where active and floor=N order by name ─► cards
GET /rooms/:id ─► app/rooms/[id]/page.tsx (server) ─► db().rooms where id and active ─► info panel (or 404)
```

## Files
```
app/page.tsx                   floor tabs + room card grid
app/rooms/[id]/page.tsx        room info panel (RFC-004 adds the schedule beside it)
app/rooms/[id]/not-found.tsx   "Room not found" + link home
```

## UI spec
- **Floor tabs:** `const FLOORS = [1, 2]` in `app/page.tsx` (comment: add 3–6 later). Tabs are `<Link href="/?floor=N">`. The active tab is styled and has `aria-current="page"`. Missing or invalid `floor` falls back to 1.
- **Room card:** a whole-card link to `/rooms/{id}` showing the photo (`<img loading="lazy">`, 4:3, `object-cover`) or the DESIGN.md §9 placeholder (soft `line` background with an inline-SVG room icon), then the name and "Up to {pax} pax · {size} m²". Missing parts are left out without stray separators.
- **Empty floor:** "No rooms on this floor yet."
- **Room page:** a "← Floor N rooms" back link, then the photo, name, and a definition list (Floor, Capacity, Size), the description, and amenities as chips. Missing fields are hidden. On wide screens this is the left column of a 1:2 grid, so RFC-004 can fill the right column.
- Cards are 1 column on phones, 2 on `md`, 3 on `lg` (DESIGN.md §4). Styling uses DESIGN.md tokens only.
- Next 16: `params` and `searchParams` are Promises. Use the global `PageProps<"/rooms/[id]">` type.

## Errors
- DB error: throw, which shows Next's error page.
- Unknown, inactive or non-numeric id: `notFound()`.

## Acceptance criteria
- **AC-3.1** `/` shows Floor 1 rooms by default. `/?floor=2` shows Floor 2. `/?floor=abc` shows Floor 1.
- **AC-3.2** Only `active` rooms appear, sorted by name.
- **AC-3.3** Each card links to `/rooms/{id}` and shows the photo or placeholder, name, pax and size without broken separators when one is missing.
- **AC-3.4** `/rooms/{id}` shows name, floor, capacity, size, description, amenities and photo, hiding any that are null or empty, with a back link to that room's floor.
- **AC-3.5** `/rooms/9999`, `/rooms/abc` and an inactive room's page show `app/rooms/[id]/not-found.tsx`.
- **AC-3.6** At 360px wide there is no horizontal scroll. Tabs and cards can be reached and used with the keyboard.
- **AC-3.7** `npm run lint` and `npm run build` pass.

## Test plan
**Automated:** `npm test` still passes (no new pure logic).
**Manual:**
1. Visit `/`, `/?floor=2` and `/?floor=abc` and check AC-3.1.
2. In Supabase, set Room 102 to `active=false`, reload, and confirm it's gone. Open `/rooms/<102's id>` and confirm 404. Set it back to active.
3. Set one room's `pax` to null and check the card text has no stray "·".
4. Open each seeded room and check that every field shows.
5. DevTools device mode at 360px: no horizontal scroll. Tab through the floor tabs and cards.

## Not applicable
Writes, auth, email, client state (all pages are server components).
