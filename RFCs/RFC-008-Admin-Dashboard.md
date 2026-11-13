# RFC-008 — Admin day grid, cancel, block, list

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | High | 006, 007 | 009 | FR-16, FR-17, FR-18, FR-19; J4, J5 |

## Summary
The admin's main screen is a **day grid** of all active rooms (rows, grouped by floor) × hours (columns) for a chosen date, with full booking details, cancel buttons, and a form to **block** time. A second page **lists** upcoming bookings with filters.

## Data flow
```
GET /admin?date=D ─► requireAdmin() ─► rooms (active, order floor,name) + bookings where date=D and status='booked'
                   ─► groupByToken() ─► grid cells
POST cancelAdmin(token)        ─► requireAdmin() ─► cancelByToken(token) (RFC-006) ─► revalidate /admin + /rooms/{id}
POST blockSlots(prev, form)    ─► requireAdmin() ─► validate ─► insert rows kind='block' sharing one token ─► 23505 → error
GET /admin/list?from&to&room&leader ─► requireAdmin() ─► filtered bookings ─► groupByToken() ─► table
```

## Files
```
app/admin/page.tsx          day grid + date picker + BlockForm
app/admin/BlockForm.tsx     "use client"; useActionState(blockSlots)
app/admin/actions.ts        "use server" cancelAdmin(token), blockSlots(prev, form)
app/admin/list/page.tsx     filter form (GET) + bookings table
```

## UI spec
**Day grid (`/admin`)**
- Date input (no min or max; admins can look at past days), defaulting to today (Manila). Plus "‹ Prev day" and "Next day ›" links.
- A table with a sticky first column (room name and floor) and one column per hour in `HOURS`. It scrolls horizontally *inside its own container* on phones.
- A booking spans its consecutive hours as one cell (`colSpan = hours.length`) showing name, contact, email (`mailto:`) and leader. To avoid mis-clicks, cancelling is a two-step action that works without JavaScript: a `<details><summary>Cancel…</summary>` that reveals a red **Confirm cancel** button inside `<form action={cancelAdmin.bind(null, token)}>`.
- A block cell is styled differently (striped or amber) with its label and a **Remove block** button (same cancel action).
- Free cells are empty.
- Summary line: "{n} bookings · {m} blocks on {formatDate}".

**Block form**: Room (select of active rooms), Date (defaults to the grid date), From hour (select of HOURS), To hour (select of HOURS+1, must be greater than From), Label (required, for example "Sunday Service"). Submit "Block".
- Validation: room is active, date is `YYYY-MM-DD`, `OPEN_HOUR <= from < to <= CLOSE_HOUR`, label not blank (≤ 80 characters).
- Insert rows `hour = from … to-1`, `kind='block'`, `name=label`, one shared `cancel_token`, in **one statement**.
- `23505` gives "Some of those hours are already booked. Cancel those bookings first, then block." Nothing is inserted.
- Success: revalidate, and show "Blocked {room}, {formatRange}" in `role="status"`.

**List (`/admin/list`)**
- GET filter form: From (default today), To (default today+30), Room (all or one), Leader (text, case-insensitive contains, `ilike '%x%'` with `%` and `_` escaped).
- Shows only `kind='booking'` and `status='booked'`, sorted by date, room and first hour, grouped with `groupByToken`.
- Columns: Date, Time (formatRange), Room (floor), Name, Contact, Email, Leader. Shows "No bookings match." when empty. **On phones the table becomes a stack of cards** (DESIGN.md §6).
- Grid cell styles follow DESIGN.md §2 admin states: booked uses `brand-soft` with the name, and a block is hatched or amber with its label.
- Limited to 500 groups, with a note when that limit is hit.

## Security and edge cases
- `requireAdmin()` is the **first line** of every page and every action in this RFC.
- Admin cancel goes through the same `cancelByToken` as RFC-006 (AC-6.7).
- Blocking a time that overlaps an existing booking is refused. The admin cancels the booking first (they have the booker's contact details to warn them).
- Rooms with no bookings still show as empty rows.

## Acceptance criteria
- **AC-8.1** `/admin` shows every active room × 15 hours for the chosen date (default today), with Prev and Next day links.
- **AC-8.2** Bookings show as one merged cell over their hours with name, contact, email and leader. Blocks are styled differently and show their label.
- **AC-8.3** Cancel and Remove block set the token's rows to `cancelled` through `cancelByToken`. The grid and the public room page both update.
- **AC-8.4** The block form validates as described. A valid block inserts one row per hour with `kind='block'` and a shared token. The public grid greys those hours.
- **AC-8.5** Blocking over an existing booking gives the overlap message and inserts no rows.
- **AC-8.6** `/admin/list` filters by date range, room and leader (case-insensitive) and shows the specified columns, grouped per booking.
- **AC-8.7** Every page and action in this RFC rejects non-admins (calling an action while logged out redirects or fails and changes no data).
- **AC-8.8** At 360px the grid scrolls inside its container (sticky room column) and the page itself doesn't scroll sideways. `/admin/list` shows cards instead of a table on phones.
- **AC-8.9** `npm run lint` and `npm run build` pass.

## Test plan
**Automated:** `npm test`. If the block validation is pulled out as a pure `validateBlock(input)` in `lib/rules.ts`, add tests for from ≥ to, to > 22, blank label, and label over 80 characters.
**Manual (logged in as an admin):**
1. Make 2 public bookings tomorrow (RFC-005) in different rooms. Open `/admin?date=<tomorrow>`: both are shown with details and the 2-hour one is merged (AC-8.1, 8.2).
2. Block Room 203 tomorrow 7–12 "Sunday Service": the grid shows the block, the public `/rooms/{203}?date=` has 7–11 AM grey (AC-8.4).
3. Try to block over one of the bookings: overlap message, and the DB is unchanged (AC-8.5).
4. Cancel a booking from the grid: it disappears and the public grid frees it (AC-8.3). Remove the block the same way.
5. `/admin/list`: filter by room, then by leader using different capitalization, then by a narrow date range (AC-8.6).
6. Log out, then replay a cancel POST from DevTools (copy as fetch): no DB change (AC-8.7).
7. 360px viewport: AC-8.8.

## Not applicable
Email (no admin emails sent in the MVP), caching.
