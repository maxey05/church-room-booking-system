# RFC-002 — Database schema and seed

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | Low | 001 | 003, 007 | §6 integrity, security; §7 data model |

## Summary
Create the Supabase project, the `rooms` and `bookings` tables, the **double-booking constraint**, row level security, and placeholder seed rooms for Floors 1–2.

## Technical approach
- SQL files in the repo, run by hand in **Supabase → SQL Editor** (no migration tool).
- **One row per booked hour.** The hours of a multi-hour booking share one `cancel_token`, and that token is the booking's identity everywhere else (email link, admin cancel, grouping).
- Admin blocks are `bookings` rows with `kind='block'`, so the same unique index protects them.
- RLS is on with **no policies**, so the anon key can't read or write anything. The app always uses the service role on the server (RFC-001 `db()`).

## Files
```
supabase/schema.sql   tables, indexes, RLS (run once)
supabase/seed.sql     placeholder rooms (re-runnable after truncate)
README.md             "Database setup" section: create project, run schema then seed, copy keys to .env.local
```

## Schema
```sql
create extension if not exists pgcrypto;

create table rooms (
  id serial primary key,
  name text not null,
  floor int not null check (floor between 1 and 6),
  size_sqm numeric, pax int, description text, photo_url text,
  amenities text[] not null default '{}',
  active boolean not null default true
);

create table bookings (
  id bigserial primary key,
  room_id int not null references rooms(id),
  date date not null,
  hour int not null check (hour between 0 and 23),
  kind text not null default 'booking' check (kind in ('booking','block')),
  name text not null,                -- booker name, or block label
  email text, contact text, dgroup_leader text,   -- null for blocks
  cancel_token uuid not null default gen_random_uuid(),
  status text not null default 'booked' check (status in ('booked','cancelled')),
  created_at timestamptz not null default now()
);

create unique index one_booking_per_slot on bookings (room_id, date, hour) where status = 'booked';
create index bookings_date  on bookings (date);
create index bookings_token on bookings (cancel_token);

alter table rooms    enable row level security;
alter table bookings enable row level security;
```
Seed: 3 placeholder rooms on floor 1 and 3 on floor 2 (`Room 101`–`103`, `201`–`203`) with realistic pax, size and amenities, and no photo. Mark it clearly as **PLACEHOLDER: replace with real rooms (PRD Q1)**.

## Edge cases and security
- A cancelled row doesn't block re-booking the same slot. That's why the index is partial.
- Rooms are never deleted; set `active=false` instead. That keeps old bookings' foreign keys valid.
- The hour range is checked loosely in the DB (0–23). Open hours are enforced in the app (RFC-005), so changing them needs no migration.

## Acceptance criteria
- **AC-2.1** `supabase/schema.sql` creates exactly the tables, checks, indexes and RLS above and runs cleanly on a fresh Supabase project.
- **AC-2.2** `supabase/seed.sql` inserts 6 placeholder rooms (3 per floor) marked PLACEHOLDER.
- **AC-2.3** Inserting a second `status='booked'` row for the same room, date and hour fails with Postgres error `23505`.
- **AC-2.4** After the first row is set to `cancelled`, the same slot can be inserted again.
- **AC-2.5** With only the anon key, `select * from bookings` returns no rows (RLS blocks it).
- **AC-2.6** `README.md` has a "Database setup" section with step-by-step instructions for a beginner.
- **AC-2.7** `.env.local` (not committed) holds the real URL, anon key and service-role key, and a quick `db().from('rooms').select()` from a scratch server route returns 6 rooms. Remove the scratch route afterwards.

## Test plan
**Manual, in Supabase SQL Editor** (paste and run, expect the result in the comments):
```sql
insert into bookings (room_id, date, hour, name) values (1, '2030-01-01', 9, 'A');   -- ok
insert into bookings (room_id, date, hour, name) values (1, '2030-01-01', 9, 'B');   -- ERROR 23505
update bookings set status='cancelled' where name='A';
insert into bookings (room_id, date, hour, name) values (1, '2030-01-01', 9, 'B');   -- ok
insert into bookings (room_id, date, hour, name, kind) values (1,'2030-01-01',10,'X','oops'); -- ERROR check
delete from bookings where date='2030-01-01';                                        -- clean up
```
**Manual, RLS:** in a browser console or curl, call `GET {URL}/rest/v1/bookings` with the anon key. Expect `[]`.
**Integration:** AC-2.7.

## Not applicable
UI, auth flows, caching, email.
