-- PLACEHOLDER: replace with real rooms.
-- WARNING: truncate also DELETES ALL BOOKINGS. Never run this on a live site.
-- Safe to re-run while testing: ids restart at 1.

truncate rooms restart identity cascade;

insert into rooms (name, floor, size_sqm, pax, description, amenities) values
  ('Room 101', 1, 20, 10, 'PLACEHOLDER: small meeting room, replace with the real room.',
    array['Air conditioning','Whiteboard','Chairs and tables']),
  ('Room 102', 1, 30, 15, 'PLACEHOLDER: medium room, replace with the real room.',
    array['Air conditioning','Whiteboard','Chairs and tables','TV screen']),
  ('Room 103', 1, 45, 25, 'PLACEHOLDER: large room, replace with the real room.',
    array['Air conditioning','Whiteboard','Chairs and tables','TV screen','Sound system']),
  ('Room 201', 2, 20, 10, 'PLACEHOLDER: small meeting room, replace with the real room.',
    array['Air conditioning','Whiteboard','Chairs and tables']),
  ('Room 202', 2, 30, 15, 'PLACEHOLDER: medium room, replace with the real room.',
    array['Air conditioning','Whiteboard','Chairs and tables','TV screen']),
  ('Room 203', 2, 45, 25, 'PLACEHOLDER: large room, replace with the real room.',
    array['Air conditioning','Whiteboard','Chairs and tables','TV screen','Sound system']);
