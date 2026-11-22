-- D-074: per-IP rate limiter used by the public booking form and admin login.
-- One row per (key, window). hit_rate_limit() adds 1 and returns false once the
-- window's count passes p_max. Safe to run more than once.
begin;

create table if not exists rate_limits (
  key text not null,
  bucket timestamptz not null,
  hits int not null,
  primary key (key, bucket)
);

alter table rate_limits enable row level security;

grant all on table rate_limits to service_role;

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

-- Only the server (service role) may call it; the public API roles may not.
revoke execute on function hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, int, int) to service_role;

commit;
