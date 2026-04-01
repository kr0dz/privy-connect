alter table if exists public.profiles
  add column if not exists instagram_url text,
  add column if not exists twitter_url text;

create table if not exists public.creator_content (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('image', 'video', 'audio')),
  url text not null,
  title text not null,
  description text,
  price numeric not null default 0,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists creator_content_creator_id_idx
  on public.creator_content (creator_id, created_at desc);

alter table public.creator_content enable row level security;

create policy if not exists "creator_content_select_own"
  on public.creator_content
  for select
  using (auth.uid() = creator_id);

create policy if not exists "creator_content_insert_own"
  on public.creator_content
  for insert
  with check (auth.uid() = creator_id);

create policy if not exists "creator_content_update_own"
  on public.creator_content
  for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy if not exists "creator_content_delete_own"
  on public.creator_content
  for delete
  using (auth.uid() = creator_id);
