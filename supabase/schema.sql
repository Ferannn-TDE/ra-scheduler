-- RA Scheduler database schema
--
-- NOTE: This file was reconstructed from how the app code uses the database
-- (src/pages/*.tsx, src/utils/*.ts). It is not an export of the original
-- Supabase project, so column types, constraints and policies may differ from
-- the live database. Review it before running it against a real project.
--
-- Access model the app assumes:
--   * Resident Assistants sign in by name only and use the public `anon` role.
--   * Admins sign in with Supabase Auth (email + password) and use the
--     `authenticated` role. Every authenticated user is treated as an admin,
--     so turn OFF public sign-ups in Supabase Auth and create admins by hand.
--
-- Because RA sessions are not authenticated, the database cannot tell one RA
-- from another. The anon policies below are as narrow as the name-only login
-- allows; see "Known limitations" in the README.
--
-- Run this in the Supabase SQL editor on a new project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Resident Assistants. Created on first login by name.
create table if not exists public.ras (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  schedule_url text,                      -- public URL of an uploaded class timetable
  created_at   timestamptz not null default now()
);

-- Weekly availability template: one row per (RA, weekday, shift) they can work.
create table if not exists public.availability (
  id          uuid primary key default gen_random_uuid(),
  ra_id       uuid not null references public.ras (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  shift_type  text not null check (shift_type in ('morning', 'evening')),
  status      text not null default 'available' check (status in ('available')),
  unique (ra_id, day_of_week, shift_type)
);

-- Weekly preferences: the subset of available slots an RA would like to work.
create table if not exists public.shift_preferences (
  id          uuid primary key default gen_random_uuid(),
  ra_id       uuid not null references public.ras (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  shift_type  text not null check (shift_type in ('morning', 'evening')),
  unique (ra_id, day_of_week, shift_type)
);

-- Published schedule: one row per RA per shift.
create table if not exists public.schedule (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  shift_type text not null check (shift_type in ('morning', 'evening')),
  ra_id      uuid not null references public.ras (id) on delete cascade,
  unique (date, shift_type, ra_id)
);

create index if not exists schedule_date_idx on public.schedule (date);

-- Audit trail of schedule publishes.
create table if not exists public.publish_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid not null,            -- auth.users.id of the publishing admin
  admin_name     text not null,
  semester_start date not null,
  semester_end   date not null,
  published_at   timestamptz not null default now(),
  check (semester_end >= semester_start)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.ras               enable row level security;
alter table public.availability      enable row level security;
alter table public.shift_preferences enable row level security;
alter table public.schedule          enable row level security;
alter table public.publish_logs      enable row level security;

-- ras: anyone can look up names (login) and register; RAs can set their
-- timetable URL. Admins have full access.
create policy "ras: read"           on public.ras for select to anon, authenticated using (true);
create policy "ras: register"       on public.ras for insert to anon with check (true);
create policy "ras: set timetable"  on public.ras for update to anon using (true) with check (true);
create policy "ras: admin all"      on public.ras for all to authenticated using (true) with check (true);

-- RAs may only change the timetable URL, not names or ids.
revoke update on public.ras from anon;
grant update (schedule_url) on public.ras to anon;

-- availability / shift_preferences: RAs replace their own template
-- (delete + insert); admins read everything when generating a schedule.
create policy "availability: read"   on public.availability for select to anon, authenticated using (true);
create policy "availability: insert" on public.availability for insert to anon with check (true);
create policy "availability: delete" on public.availability for delete to anon using (true);
create policy "availability: admin"  on public.availability for all to authenticated using (true) with check (true);

create policy "preferences: read"   on public.shift_preferences for select to anon, authenticated using (true);
create policy "preferences: insert" on public.shift_preferences for insert to anon with check (true);
create policy "preferences: delete" on public.shift_preferences for delete to anon using (true);
create policy "preferences: admin"  on public.shift_preferences for all to authenticated using (true) with check (true);

-- schedule: everyone can read the published roster; only admins write it.
create policy "schedule: read"  on public.schedule for select to anon, authenticated using (true);
create policy "schedule: admin" on public.schedule for all to authenticated using (true) with check (true);

-- publish_logs: admins only.
create policy "publish_logs: admin" on public.publish_logs for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage: uploaded class timetables
-- ---------------------------------------------------------------------------

-- The app reads files through public URLs, so the bucket is public.
-- (You can also create it in the dashboard: Storage > New bucket > "schedule", Public.)
insert into storage.buckets (id, name, public)
values ('schedule', 'schedule', true)
on conflict (id) do nothing;

-- RAs upload new files; they cannot overwrite or delete existing ones.
create policy "schedule bucket: upload"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'schedule');

create policy "schedule bucket: admin manage"
  on storage.objects for all to authenticated
  using (bucket_id = 'schedule') with check (bucket_id = 'schedule');
