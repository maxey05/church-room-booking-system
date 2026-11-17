begin;

create table if not exists email_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('approval','decline')),
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

create index if not exists email_log_created_at on email_log (created_at desc);

alter table email_log enable row level security;

grant all on table email_log to service_role;
grant usage, select on sequence email_log_id_seq to service_role;

commit;
