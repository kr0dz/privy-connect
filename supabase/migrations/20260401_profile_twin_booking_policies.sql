alter table if exists public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists instagram_url text,
  add column if not exists twitter_url text;

alter table if exists public.profiles enable row level security;

create policy if not exists "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy if not exists "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table if exists public.creator_twins enable row level security;

create policy if not exists "creator_twins_select_own"
  on public.creator_twins
  for select
  using (auth.uid() = creator_id);

create policy if not exists "creator_twins_insert_own"
  on public.creator_twins
  for insert
  with check (auth.uid() = creator_id);

create policy if not exists "creator_twins_update_own"
  on public.creator_twins
  for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

alter table if exists public.push_tokens enable row level security;

create policy if not exists "push_tokens_select_own"
  on public.push_tokens
  for select
  using (auth.uid() = user_id);

create policy if not exists "push_tokens_insert_own"
  on public.push_tokens
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "push_tokens_update_own"
  on public.push_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "video_calls_fan_book_available"
  on public.video_calls
  for update
  using (status = 'available' and auth.uid() is not null)
  with check (
    status = 'booked'
    and fan_id = auth.uid()
  );
