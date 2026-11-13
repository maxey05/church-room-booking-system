# RFC-006 — Self-service cancel link

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | Low | 005 | 008 | FR-14; J3 |

## Summary
The cancel URL from the confirmation email opens a page showing the booking with a **Cancel booking** button. Cancelling happens only on POST (the button press), **never just by opening the link**, because email security scanners open links automatically. The cancel function is shared so the admin can reuse it (RFC-008).

## Data flow
```
GET /cancel/:token ─► page.tsx (server)
   token not UUID → "not found" view
   rows = db().bookings where cancel_token=token and kind='booking' (+ room join)
   none → "not found" view
   all cancelled → "Already cancelled" view
   date < today (Manila) → "This booking has already passed" view (no button)
   else → details + <form action={cancelAction}> button
POST (server action) cancelAction(token) ─► cancelByToken(token) ─► revalidatePath room page ─► "Booking cancelled" view
```

## Files
```
lib/bookings.ts                 cancelByToken(token): Promise<number>  (shared with RFC-008)
app/cancel/[token]/page.tsx     the views above
app/cancel/[token]/actions.ts   "use server" cancelAction(token)
```

## Interfaces
```ts
// lib/bookings.ts (server only)
/** Sets status='cancelled' on every booked row with this token. Returns the number of rows changed. Does not check who is asking. Callers decide. */
export async function cancelByToken(token: string): Promise<number>;
```
`cancelAction(token)`: re-validates the token's UUID format, re-checks that the booking exists, is `kind='booking'` and isn't in the past, then calls `cancelByToken`, calls `revalidatePath('/rooms/{room_id}')`, and **redirects to `/cancel/{token}?done=1`**. The page shows the "after cancel" view when `done=1` **and** all rows are cancelled. Otherwise it picks a view by the table below.

## Views (each shows a link "Back to rooms")
| State | Heading | Content |
|---|---|---|
| not found or bad token | Booking not found | "This link is invalid or the booking no longer exists." |
| already cancelled | Already cancelled | Room, date, time |
| past | This booking has already passed | Room, date, time; no button |
| active | Cancel this booking? | Room (floor), date, time range, booker name; red **Cancel booking** button |
| after cancel | Booking cancelled | "The room is free again for others. Thank you!" |

## Security and edge cases
- The token is a random v4 UUID (122 bits), so it can't be guessed. Having the link is the authorization.
- Blocks (`kind='block'`) can't be cancelled through this public route, only by admins.
- A double click or two tabs: the second cancel changes 0 rows and shows "Already cancelled". No error.
- Email, contact and dgroup leader are **not** shown on this page (only the name), in case the link gets forwarded.

## Acceptance criteria
- **AC-6.1** `GET /cancel/{valid token}` shows the active view and **doesn't change** the DB.
- **AC-6.2** Pressing Cancel booking sets every row with that token to `cancelled` and shows the after-cancel view.
- **AC-6.3** The freed slots become selectable again on the room page right away.
- **AC-6.4** Unknown, malformed and block tokens show "Booking not found".
- **AC-6.5** A cancelled booking shows "Already cancelled". A past booking shows the past view with no button.
- **AC-6.6** The page never shows email, contact or dgroup leader.
- **AC-6.7** `lib/bookings.ts` exports `cancelByToken` and it's the only code path that sets `status='cancelled'`.
- **AC-6.8** `npm run lint` and `npm run build` pass.

## Test plan
**Automated:** `npm test` (no new pure logic).
**Manual:**
1. Make a 2-hour booking (RFC-005) and open the emailed link. Check the active view, and that the DB rows are still `booked` (AC-6.1).
2. Press Cancel: both rows become `cancelled` and the room page shows both slots free (AC-6.2, 6.3).
3. Reload the cancel URL: "Already cancelled" (AC-6.5).
4. `/cancel/not-a-uuid` and `/cancel/00000000-0000-4000-8000-000000000000`: not found (AC-6.4).
5. Insert a block row and open `/cancel/{its token}`: not found (AC-6.4).
6. Change a booking's date to yesterday in SQL and open its link: past view, no button (AC-6.5).
7. View the page source: no email or phone (AC-6.6).

## Not applicable
Auth (the token is the credential), caching.
