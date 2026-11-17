begin;
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check check (status in ('pending','booked','declined','cancelled'));
drop index if exists one_booking_per_slot;
create unique index one_booking_per_slot on bookings (room_id, date, hour) where status in ('pending','booked');
commit;
