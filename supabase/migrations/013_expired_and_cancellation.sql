begin;

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check check (status in ('pending','booked','declined','cancelled','expired'));

alter table email_log drop constraint if exists email_log_kind_check;
alter table email_log add constraint email_log_kind_check check (kind in ('approval','decline','cancellation'));

update bookings
set status = 'expired'
where kind = 'booking'
  and status = 'pending'
  and cancel_token in (
    select cancel_token
    from bookings
    where kind = 'booking' and status = 'pending'
    group by cancel_token
    having min(date + make_interval(hours => hour)) <= (now() at time zone 'Asia/Manila')
  );

update bookings
set contact = '0' || substr(contact, 4)
where contact ~ '^\+639[0-9]{9}$';

commit;
