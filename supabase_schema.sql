-- ============================================================
-- COMPLETE SCHEMA — paste ALL of this into Supabase SQL Editor
-- This is safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- 1. TABLES

create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  capacity   text,
  state      text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  title       text not null,
  responsible text,
  priority    text check (priority in ('High','Medium','Low')) default 'Medium',
  status      text check (status in ('Not Started','In Progress','Completed','On Hold')) default 'Not Started',
  target_date  date,
  revised_date date,
  completed_on date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists task_updates (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks(id) on delete cascade,
  remark     text not null,
  updated_by text,
  created_at timestamptz default now()
);

create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade unique,
  email      text not null,
  full_name  text,
  role       text check (role in ('admin','editor','viewer')) not null default 'viewer',
  created_at timestamptz default now()
);

-- 2. AUTO-UPDATE updated_at

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

-- 3. AUTO-CREATE viewer role on new signup

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_roles (user_id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- 4. ROW LEVEL SECURITY — enable

alter table projects    enable row level security;
alter table tasks       enable row level security;
alter table task_updates enable row level security;
alter table user_roles  enable row level security;

-- 5. DROP ALL OLD POLICIES (clean slate)

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
    where tablename in ('projects','tasks','task_updates','user_roles')
    and schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- 6. PROJECTS policies

create policy "projects_select" on projects
  for select to authenticated using (true);

create policy "projects_insert" on projects
  for insert to authenticated
  with check (
    exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','editor'))
  );

create policy "projects_update" on projects
  for update to authenticated
  using (
    exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','editor'))
  );

create policy "projects_delete" on projects
  for delete to authenticated
  using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- 7. TASKS policies

create policy "tasks_select" on tasks
  for select to authenticated using (true);

create policy "tasks_insert" on tasks
  for insert to authenticated
  with check (
    exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','editor'))
  );

create policy "tasks_update" on tasks
  for update to authenticated
  using (
    exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','editor'))
  );

create policy "tasks_delete" on tasks
  for delete to authenticated
  using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- 8. TASK_UPDATES policies

create policy "updates_select" on task_updates
  for select to authenticated using (true);

create policy "updates_insert" on task_updates
  for insert to authenticated with check (true);

create policy "updates_delete" on task_updates
  for delete to authenticated
  using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- 9. USER_ROLES policies

create policy "roles_select" on user_roles
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from user_roles ur2 where ur2.user_id = auth.uid() and ur2.role = 'admin')
  );

create policy "roles_insert" on user_roles
  for insert to authenticated
  with check (true);  -- trigger inserts on signup; admin inserts via service key

create policy "roles_update" on user_roles
  for update to authenticated
  using (
    exists (select 1 from user_roles ur2 where ur2.user_id = auth.uid() and ur2.role = 'admin')
  );

create policy "roles_delete" on user_roles
  for delete to authenticated
  using (
    exists (select 1 from user_roles ur2 where ur2.user_id = auth.uid() and ur2.role = 'admin')
  );

-- ============================================================
-- DONE — Now follow the steps below to create your admin user
-- ============================================================
