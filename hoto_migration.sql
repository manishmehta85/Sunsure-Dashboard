-- HOTO / Wind-layout migration for the SunSure portal
-- 1) let projects carry a layout type
alter table public.projects add column if not exists layout text not null default 'normal';
-- ('normal' = task view, 'wind' = HOTO milestone tracker)

-- 2) storage for wind projects' WTG locations + milestones
create extension if not exists "pgcrypto";
create table if not exists public.hoto_locations (
  id         uuid primary key default gen_random_uuid(),
  project    text not null,          -- matches projects.name of the wind project
  wtg        text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  unique (project, wtg)
);
alter table public.hoto_locations enable row level security;
drop policy if exists "hoto_all" on public.hoto_locations;
-- Open policy to match how the app talks to Supabase today (anon client).
create policy "hoto_all" on public.hoto_locations for all using (true) with check (true);
alter publication supabase_realtime add table public.hoto_locations;
