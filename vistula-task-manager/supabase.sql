-- Run in Supabase: SQL Editor -> New query -> Run
-- Demonstration database with test data only.

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  completed boolean not null default false
);

alter table public.tasks enable row level security;

-- Public demo access (no authentication in this exercise)
create policy "public read"   on public.tasks for select to anon using (true);
create policy "public insert" on public.tasks for insert to anon with check (true);
create policy "public update" on public.tasks for update to anon using (true) with check (true);
create policy "public delete" on public.tasks for delete to anon using (true);
