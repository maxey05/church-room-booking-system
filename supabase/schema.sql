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
  email text, contact text, expected_pax int, dgroup_leader text, notes text,   -- null for blocks
  cancel_token uuid not null default gen_random_uuid(),
  status text not null default 'booked' check (status in ('pending','booked','declined','cancelled','expired')),
  created_at timestamptz not null default now()
);

-- Partial: a cancelled row does not block booking the same slot again.
create unique index one_booking_per_slot on bookings (room_id, date, hour) where status in ('pending','booked');
create index bookings_date  on bookings (date);
create index bookings_token on bookings (cancel_token);

-- Single-row settings table (D-060). The app falls back to 3 if the row is missing.
create table settings (
  id boolean primary key default true check (id),
  daily_booking_limit int not null default 3 check (daily_booking_limit between 1 and 20)
);
insert into settings (id, daily_booking_limit) values (true, 3);

create table email_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('approval','decline','cancellation')),
  status text not null check (status in ('sent','failed','resent')),
  recipient_name text not null,
  recipient_email text not null,
  room_name text not null,
  floor int not null,
  booking_date date not null,
  hours int[] not null,
  error text,
  cancel_token uuid
);
create index email_log_created_at on email_log (created_at desc);

-- Per-IP rate limiter (D-074). One row per (key, window).
create table rate_limits (
  key text not null,
  bucket timestamptz not null,
  hits int not null,
  primary key (key, bucket)
);

create or replace function hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
as $$
declare
  v_bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into rate_limits as r (key, bucket, hits)
  values (p_key, v_bucket, 1)
  on conflict (key, bucket) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- About 1 call in 100 also clears windows older than 2 days, so the table stays small.
  if random() < 0.01 then
    delete from rate_limits where bucket < now() - interval '2 days';
  end if;

  return v_hits <= p_max;
end;
$$;

-- RLS on with no policies: the anon key can read and write nothing.
-- The app uses the service-role key on the server, which bypasses RLS.
alter table rooms    enable row level security;
alter table bookings enable row level security;
alter table settings enable row level security;
alter table email_log enable row level security;
alter table rate_limits enable row level security;

-- Newer Supabase projects do not grant new tables to the API roles automatically.
-- service_role bypasses RLS but still needs table and sequence privileges.
-- Nothing is granted to anon or authenticated on purpose.
grant all on table rooms, bookings, settings, email_log, rate_limits to service_role;
grant usage, select on sequence rooms_id_seq, bookings_id_seq, email_log_id_seq to service_role;

-- Only the server may call the limiter; the public API roles may not.
revoke execute on function hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, int, int) to service_role;
