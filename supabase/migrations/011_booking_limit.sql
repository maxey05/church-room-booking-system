-- D-060: admin-adjustable daily booking limit per person. Safe to run more than once.
begin;

create table if not exists settings (
  id boolean primary key default true check (id),
  daily_booking_limit int not null default 3 check (daily_booking_limit between 1 and 20)
);

insert into settings (id, daily_booking_limit) values (true, 3)
on conflict (id) do nothing;

alter table settings enable row level security;

grant all on table settings to service_role;

commit;
