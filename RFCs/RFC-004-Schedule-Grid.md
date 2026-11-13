# RFC-004 — Date picker and slot grid

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | Medium | 003 | 005 | FR-3, FR-4, FR-5 |

## Summary
Add a date picker and an hourly slot grid to the room page. Slots that are booked, blocked or already started are greyed out and can't be selected. Users can select free slots (selection is local state only; RFC-005 submits it). The public page never gets booker identities.

## Data flow
```
GET /rooms/:id?date=YYYY-MM-DD
  page.tsx (server):
    today = manilaNow(); max = addDays(today.date, MAX_DAYS_AHEAD)
    date  = valid(param) && today.date <= param <= max ? param : today.date
    taken = db().bookings.select("hour").eq(room_id).eq(date).eq(status,'booked')   ← hour ONLY
    pastUntil = (date === today.date) ? today.hour : -1
  ─► <BookingForm key={date} roomId date taken pastUntil />  (client; owns `picked`)
        └─ <SlotGrid taken pastUntil picked onToggle />      (client; stateless)
```

## Files
```
app/rooms/[id]/page.tsx         + date form + right column with BookingForm
app/rooms/[id]/BookingForm.tsx  "use client"; holds `picked` state (useState<number[]>), renders SlotGrid + "Selected:" line.
                                RFC-004 builds only this shell; RFC-005 adds the fields and submit.
app/rooms/[id]/SlotGrid.tsx     "use client"; stateless; renders HOURS as checkbox tiles
```

## Interfaces
```ts
// BookingForm.tsx (RFC-004 shell)
export default function BookingForm(props: { roomId: number; date: string; taken: number[]; pastUntil: number }): JSX.Element

// SlotGrid.tsx
export default function SlotGrid(props: {
  taken: number[];        // hours with a live booking or block
  pastUntil: number;      // hours <= this are unavailable (-1 when date isn't today)
  picked: number[];       // owned by BookingForm
  onToggle: (h: number) => void;
}): JSX.Element
```
Each tile is a real `<button type="button" aria-pressed={selected}>` (DESIGN.md §8) labeled `formatHour(h)`, at least 44×44px. The states follow DESIGN.md §2:
- **Available:** surface background with a `line` border.
- **Selected:** `brand` fill, `brand-ink` text and a ✓ glyph, so the state doesn't rely on color alone.
- **Unavailable:** `disabled`, grey fill, muted strikethrough text, and a visually hidden " (taken)" for screen readers. Booked and blocked look the same to the public.

Focus ring is 2px `brand` with a 2px offset. The grid is 3 columns on phones and 5 on `lg`. Below the grid, when something is picked, it shows "Selected: {formatRange(picked)}". BookingForm renders one `<input type="hidden" name="hours" value={h}>` per picked hour, which RFC-005 submits.

Date form: a plain `GET` `<form>` with `<input type="date" name="date" min={today} max={max} defaultValue={date}>` and a **Show schedule** button. It doesn't need JavaScript to work.

## Edge cases
- `?date=` in the past, beyond 30 days, or badly formatted falls back to today. It never errors.
- `key={date}` on BookingForm clears the selection when the date changes.
- Opened at 23:00 Manila: every slot today is past and the grid is all grey. That's correct.
- Taken hours outside `HOURS` (data entered in the DB by hand) are simply not shown.

## Acceptance criteria
- **AC-4.1** The room page shows a date input (min today, max today+30, default today, Manila time) and a Show schedule button that reloads with `?date=`.
- **AC-4.2** The grid shows exactly 15 tiles, 7:00 AM through 9:00 PM.
- **AC-4.3** Hours with a `booked` row of either kind are greyed out, disabled and announced as "(taken)". Cancelled rows don't grey anything out.
- **AC-4.4** On today's date, hours `<= manilaNow().hour` are greyed out and disabled. On other dates they aren't.
- **AC-4.5** Invalid or out-of-window `?date=` shows today's schedule.
- **AC-4.6** The server query selects **only** `hour`. The page HTML and RSC payload contain no booker name, email or contact.
- **AC-4.7** Tiles are `<button aria-pressed>`. Free tiles toggle on click and with Space or Enter. Selected ones show the ✓. The "Selected:" line shows the range, and one hidden `hours` input exists per picked hour.
- **AC-4.8** The layout works at 360px with no page scroll. Tiles are 3 columns on phones, 5 on `lg`, each ≥ 44×44px, styled with DESIGN.md tokens only.
- **AC-4.9** `SlotGrid.tsx` holds no state. `BookingForm.tsx` owns `picked` and is keyed by date.
- **AC-4.10** `npm run lint` and `npm run build` pass.

## Test plan
**Automated:** `npm test` (the date and hour helpers from RFC-001 cover the date-window maths).
**Manual (seed some rows in the SQL Editor first):**
```sql
insert into bookings (room_id,date,hour,name,email) values (1, (now() at time zone 'Asia/Manila')::date + 1, 9,  'Secret Name','s@x.com');
insert into bookings (room_id,date,hour,name,kind)  values (1, (now() at time zone 'Asia/Manila')::date + 1, 10, 'Sunday Service','block');
insert into bookings (room_id,date,hour,name,status) values (1, (now() at time zone 'Asia/Manila')::date + 1, 11, 'Gone','cancelled');
```
1. Open `/rooms/1?date=<tomorrow>`: 9 and 10 AM are grey, 11 AM is free (AC-4.3).
2. View the page source and search for "Secret" and "s@x.com": no match (AC-4.6).
3. `/rooms/1` (today): past hours are grey (AC-4.4).
4. `/rooms/1?date=2000-01-01` and `?date=junk` show today (AC-4.5).
5. Keyboard: Tab to a tile, press Space, check that it turns selected (`aria-pressed="true"`, ✓ shown) and the "Selected:" line updates (AC-4.7).
6. Change the date and confirm the selection clears.
7. Clean up: `delete from bookings where name in ('Secret Name','Sunday Service','Gone');`

## Not applicable
Writes (RFC-005), auth, email.
