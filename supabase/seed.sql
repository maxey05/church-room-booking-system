-- Real rooms for Floors 1-2 (names only).
-- size_sqm, pax, description and photo_url are empty on purpose: the site hides empty fields.
-- Fill them in later in Supabase: Table Editor > rooms.
-- WARNING: truncate also DELETES ALL BOOKINGS. Never run this on a live site.
-- Safe to re-run while testing: ids restart at 1.

truncate rooms restart identity cascade;

insert into rooms (name, floor) values
  ('G4', 1),
  ('G5', 1),
  ('Singles Lounge', 1),
  ('G7', 1),
  ('Room 1', 2),
  ('Room 2', 2),
  ('Room 3', 2),
  ('Room 4', 2),
  ('Room 5', 2),
  ('Room 6', 2),
  ('Room 7', 2),
  ('Room 8', 2),
  ('Room 9', 2),
  ('Room 10', 2),
  ('Room 11', 2);
