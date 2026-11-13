# RFC-005 — Booking form, server action, confirmation email

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | High | 004 | 006 | FR-6 – FR-13; J1, J2 |

## Summary
Users can reserve the slots they picked. The form collects their details and consent. A server action validates everything, inserts all hours **in one statement** (the DB constraint guarantees no double booking), and sends a plain-text confirmation email with a cancel link. If the email fails, the booking is still kept.

## Data flow
```
BookingForm (client, useActionState)
  └─ submit FormData{date, hours[], name, email, contact, dgroupLeader, consent}
     ─► book(roomId, prev, form)  "use server"
          1. parse + normalize (trim; email lowercased)
          2. validateBooking(input)            → {error}
          3. room = rooms where id and active   → {error:"This room is not available."}
          4. token = crypto.randomUUID()
          5. insert hours.map(h ⇒ row{…, cancel_token: token})   ← single statement
          6. revalidatePath(`/rooms/${roomId}`)
          7. error.code == "23505"             → {error: TAKEN}
             other error                        → throw
          8. try sendConfirmation(...) catch → log, emailed=false
          9. return {done:{summary, emailed, email}}
```

## Files
```
lib/rules.ts                  + BookingInput type + validateBooking()
lib/rules.test.ts             + validateBooking cases
lib/email.ts                  nodemailer Gmail transport + sendConfirmation()
app/rooms/[id]/actions.ts     "use server" book()
app/rooms/[id]/BookingForm.tsx extend RFC-004 shell: + <form action>, hidden date, fields, consent, submit, error/success
```

## Interfaces
```ts
// lib/rules.ts
export type BookingInput = { name: string; email: string; contact: string; dgroupLeader: string; consent: boolean; date: string; hours: number[] };
export function validateBooking(b: BookingInput, now?: Date): string | null;

// lib/email.ts
export async function sendConfirmation(b: { to: string; name: string; roomName: string; floor: number; date: string; hours: number[]; cancelToken: string }): Promise<void>;

// actions.ts
export type BookState = {
  error?: string;
  values?: { name: string; email: string; contact: string; dgroupLeader: string }; // echoed back on error
  done?: { summary: string; emailed: boolean; email: string };
};
export async function book(roomId: number, prev: BookState, form: FormData): Promise<BookState>;
```

### `validateBooking` rules (checked in this order; first failure wins)
| Check | Message |
|---|---|
| name blank | Please enter your name. |
| email not `^[^\s@]+@[^\s@]+\.[^\s@]+$` | Please enter a valid email address. |
| contact (spaces and dashes removed) not `^(09\|\+639)\d{9}$` | Please enter a valid PH mobile number (e.g. 0917 123 4567). |
| consent false | Please agree to the privacy notice. |
| date not `YYYY-MM-DD` | Please pick a date. |
| no hours | Please pick at least one time slot. |
| any hour not in `HOURS` | Invalid time slot. |
| hours not consecutive (after sorting) | Please pick time slots that are next to each other. |
| date < today or > today+30 (Manila) | You can book from today up to 30 days ahead. |
| date == today and min(hours) <= current Manila hour | That time slot has already started or passed. |

**No per-person hour cap** (PRD A3).

Other user-facing errors:
| Situation | Message |
|---|---|
| room missing or inactive | This room is not available. |
| `23505` on insert | Sorry, one of those slots was just taken. We've refreshed the times, so please pick another. (DESIGN.md §7) |

### Email (plain text only; user input is never rendered as HTML)
- From: `"CCF Room Booking" <GMAIL_USER>`
- Subject: `Room reserved: {room} — {formatDate(date)}`
- Body: greeting with the name, "confirmed", `Room: {name} (Floor {n})`, `When: {formatDate}, {formatRange}`, the cancel request with `{SITE_URL}/cancel/{token}`, and a sign-off.

### Form UI
- Fields: Name\*, Email\* (`type=email`), Contact number\* (`type=tel`, placeholder `0917 123 4567`), DGroup leader (optional), a consent checkbox\* with the text: *"I agree that my name, email and contact number will be stored and used only to manage this room booking, in line with the Data Privacy Act of 2012."* Each has a matching `autocomplete` value.
- The form is a single column. Required fields say "(required)" in the label text, not only with an asterisk (DESIGN.md §8). A summary of room, date and time range sits above the fields (DESIGN.md §4).
- The Reserve button uses the primary style: `brand` fill, 48px tall, full width on phones, in a **sticky bottom bar on phones**. It's disabled while pending or when nothing is picked, and reads "Reserving…" while pending.
- Errors show in `role="alert"`. Success replaces the form with a `role="status"` panel: "Room reserved!", the summary, and either "A confirmation email with a cancel link was sent to {email}." or "We couldn't send the confirmation email, but your booking is saved. Please screenshot this page."
- The form keeps typed values after an error. React 19 resets uncontrolled inputs after a form action, so every error return includes `values`, and each text input uses `defaultValue={state.values?.field}`. The reset then restores the submitted values. Consent and picked hours aren't echoed: `picked` is React state and survives on its own, and consent must be ticked again.

## Security and edge cases
- The server action is a public endpoint. Validation happens again on the server regardless of client state, and `roomId` is bound with `.bind(null, roomId)` and then re-checked against the DB.
- Race (J2): both users pass validation, and the second insert hits `23505`. All of its rows are rejected because it's one statement.
- The email failure is logged with `console.error("Confirmation email failed", e)` and doesn't throw.
- A day with all 15 hours free and consecutive is allowed (no cap).

## Acceptance criteria
- **AC-5.1** `validateBooking` follows the table above, in that order, and returns `null` for valid input. It's covered by `npm test`.
- **AC-5.2** The form has all 5 inputs with the labels, types, autocomplete and consent text above. It's a single column with the summary on top and a sticky, full-width 48px Reserve bar on phones, styled with DESIGN.md tokens.
- **AC-5.3** A valid submission inserts one row per hour, all sharing one `cancel_token`, with email lowercased and an empty leader stored as null.
- **AC-5.4** If any picked hour is taken, **no** rows are inserted, the TAKEN message shows, and the grid shows the slot as grey without a manual reload.
- **AC-5.5** The success panel shows room, floor, date and time range.
- **AC-5.6** The confirmation email arrives in plain text with the correct details and a working `/cancel/{token}` URL built from `SITE_URL`.
- **AC-5.7** With a wrong `GMAIL_APP_PASSWORD`, the booking is still saved, the success panel shows the "couldn't send" text, and the server log shows "Confirmation email failed".
- **AC-5.8** After an error, typed field values are still there.
- **AC-5.9** Tampered requests (hours 6 or 22, non-consecutive hours, a past date, inactive room id) are rejected on the server with the messages above.
- **AC-5.10** `lib/email.ts` is only imported from server code. `npm run lint` and `npm run build` pass.

## Test plan
**Automated (`npm test`, add to `lib/rules.test.ts`)**, with `now = 2026-11-13T02:30:00Z` (10:30 Manila) and a valid base input for 2026-11-14, hours [19,18]:
- base gives `null`; contact `+639171234567` gives `null`; contact `0917-123-4567` gives `null`
- bad email, contact `12345`, consent false, hours [], hours [6], hours [22], hours [9,11] each give their messages
- hours [7..21] (all 15) gives `null` (no cap)
- date `2026-11-12` and `2026-12-14` give the window message; `2026-12-13` gives `null`
- today with [10] gives "already started"; today with [11] gives `null`

**Manual:**
1. Book Room 101 tomorrow 7–9 PM with your own email: the panel shows, two rows exist in `bookings` with the same token, and the email arrives (AC-5.3, 5.5, 5.6).
2. **Race (J2):** open the same room and date in two tabs, pick the same free hour in both, submit tab A then tab B. B shows TAKEN, its grid greys the hour, and the DB has one row (AC-5.4).
3. Pick 2 PM and 3 PM in tab B where 3 PM was just taken by tab A: there are no rows for 2 PM from B (all or nothing).
4. Put a wrong app password in `.env.local`, restart, and book: check AC-5.7. Restore the password.
5. Submit with a bad phone number: the error shows and the other fields keep their values (AC-5.8).
6. DevTools: delete the `disabled` attribute on a taken tile and submit: TAKEN. Edit a checkbox value to `22` and submit: "Invalid time slot." (AC-5.9).

## Not applicable
Auth (public action by design), caching.
