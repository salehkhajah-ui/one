-- ONE — cloud sync v1 (Milestone 2)
-- One row per user holding their full setup payload. RLS keyed to auth.uid();
-- the publishable client key grants nothing without a signed-in session.
-- Normalized tables (docs/DATA_MODEL.md) arrive when server-side computation does.

create table if not exists public.user_setups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_setups enable row level security;

create policy "Users read own setup"
  on public.user_setups for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own setup"
  on public.user_setups for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own setup"
  on public.user_setups for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own setup"
  on public.user_setups for delete
  to authenticated
  using ((select auth.uid()) = user_id);
