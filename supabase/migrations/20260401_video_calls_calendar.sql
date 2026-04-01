create table if not exists public.video_calls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  fan_id uuid references public.profiles(id) on delete set null,
  start_time timestamptz not null,
  duration integer not null check (duration > 0),
  status text not null default 'available' check (status in ('available', 'booked', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists video_calls_creator_start_idx
  on public.video_calls (creator_id, start_time asc);

create index if not exists video_calls_start_idx
  on public.video_calls (start_time asc);

alter table public.video_calls enable row level security;

create policy if not exists "video_calls_creator_select_own"
  on public.video_calls
  for select
  using (auth.uid() = creator_id);

create policy if not exists "video_calls_creator_insert_own"
  on public.video_calls
  for insert
  with check (auth.uid() = creator_id);

create policy if not exists "video_calls_creator_update_own"
  on public.video_calls
  for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy if not exists "video_calls_creator_delete_own"
  on public.video_calls
  for delete
  using (auth.uid() = creator_id);

create policy if not exists "video_calls_fan_read_available"
  on public.video_calls
  for select
  using (status = 'available');
