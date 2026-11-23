-- RA Scheduler demo data
--
-- Made-up Resident Assistants with a mix of weekly availability and shift
-- preferences, for trying the app or taking screenshots. Nothing is
-- published: the schedule and publish_logs tables are left empty, so sign in
-- as an admin and press "Generate Schedule" to see the scheduler work.
--
-- Run after schema.sql, in the Supabase SQL editor. Safe to run more than once.
--
-- Friday evening is deliberately short-staffed (only one RA is available),
-- so generated schedules show the "understaffed" flag.

insert into public.ras (name) values
  ('Ada Testcase'),
  ('Ben Placeholder'),
  ('Cara Sample'),
  ('Dev Mockdata'),
  ('Eli Fixture'),
  ('Fay Dummy'),
  ('Gus Example'),
  ('Hana Demo')
on conflict (name) do nothing;

-- Weekly availability. day: 0 = Sunday ... 6 = Saturday.
-- Morning shifts only exist on Saturday and Sunday.
insert into public.availability (ra_id, day_of_week, shift_type)
select r.id, v.day, v.shift
from (values
  ('Ada Testcase',    1, 'evening'), ('Ada Testcase',    2, 'evening'),
  ('Ada Testcase',    3, 'evening'), ('Ada Testcase',    4, 'evening'),
  ('Ada Testcase',    6, 'morning'),

  ('Ben Placeholder', 0, 'evening'), ('Ben Placeholder', 1, 'evening'),
  ('Ben Placeholder', 3, 'evening'), ('Ben Placeholder', 6, 'evening'),
  ('Ben Placeholder', 0, 'morning'),

  ('Cara Sample',     2, 'evening'), ('Cara Sample',     3, 'evening'),
  ('Cara Sample',     4, 'evening'), ('Cara Sample',     6, 'evening'),
  ('Cara Sample',     6, 'morning'),

  ('Dev Mockdata',    0, 'evening'), ('Dev Mockdata',    1, 'evening'),
  ('Dev Mockdata',    2, 'evening'), ('Dev Mockdata',    4, 'evening'),

  ('Eli Fixture',     0, 'evening'), ('Eli Fixture',     3, 'evening'),
  ('Eli Fixture',     6, 'evening'), ('Eli Fixture',     0, 'morning'),
  ('Eli Fixture',     6, 'morning'),

  ('Fay Dummy',       1, 'evening'), ('Fay Dummy',       2, 'evening'),
  ('Fay Dummy',       4, 'evening'), ('Fay Dummy',       6, 'evening'),

  ('Gus Example',     0, 'evening'), ('Gus Example',     4, 'evening'),
  ('Gus Example',     5, 'evening'), ('Gus Example',     6, 'evening'),
  ('Gus Example',     0, 'morning'),

  ('Hana Demo',       0, 'evening'), ('Hana Demo',       1, 'evening'),
  ('Hana Demo',       2, 'evening'), ('Hana Demo',       3, 'evening'),
  ('Hana Demo',       6, 'morning')
) as v(name, day, shift)
join public.ras r on r.name = v.name
on conflict (ra_id, day_of_week, shift_type) do nothing;

-- Preferences: a subset of each RA's available slots (the app only allows
-- preferring a slot you are available for). Fay has no preferences.
insert into public.shift_preferences (ra_id, day_of_week, shift_type)
select r.id, v.day, v.shift
from (values
  ('Ada Testcase',    2, 'evening'),
  ('Ben Placeholder', 0, 'evening'),
  ('Ben Placeholder', 0, 'morning'),
  ('Cara Sample',     6, 'morning'),
  ('Dev Mockdata',    1, 'evening'),
  ('Eli Fixture',     6, 'evening'),
  ('Gus Example',     5, 'evening'),
  ('Hana Demo',       3, 'evening')
) as v(name, day, shift)
join public.ras r on r.name = v.name
on conflict (ra_id, day_of_week, shift_type) do nothing;
