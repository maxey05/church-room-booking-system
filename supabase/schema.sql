create extension if not exists pgcrypto;

create table rooms (
  id serial primary key,
  name text not null,
  floor int not null check (floor between 1 and 6),
  size_sqm numeric, pax int, description text, photo_url text,
  amenities text[] not null default '{}',
  active boolean not null default true
);

-- One row per booked hour. Rows sharing cancel_token are one booking.
-- Admin blocks use kind = 'block'.
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

-- Partial: a cancelled row does not block booking the same slot again.
create unique index one_booking_per_slot on bookings (room_id, date, hour) where status = 'booked';
create index bookings_date  on bookings (date);
create index bookings_token on bookings (cancel_token);

-- RLS on with no policies: the anon key can read and write nothing.
-- The app uses the service-role key on the server, which bypasses RLS.
alter table rooms    enable row level security;
alter table bookings enable row level security;

-- Newer Supabase projects do not grant new tables to the API roles automatically.
-- service_role bypasses RLS but still needs table and sequence privileges.
-- Nothing is granted to anon or authenticated on purpose.
grant all on table rooms, bookings to service_role;
grant usage, select on sequence rooms_id_seq, bookings_id_seq to service_role;
