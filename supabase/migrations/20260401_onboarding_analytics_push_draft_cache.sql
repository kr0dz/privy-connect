-- PrivyLoop phase: onboarding, analytics, push, draft mode, AI cache

alter table if exists public.profiles
  add column if not exists onboarding_completed boolean not null default false;

alter table if exists public.messages
  add column if not exists status text not null default 'sent',
  add column if not exists sent boolean not null default true;

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  device text,
  created_at timestamptz not null default now()
);

create unique index if not exists push_tokens_token_idx on public.push_tokens(token);
create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  creator_id uuid,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_creator_created_idx on public.analytics_events(creator_id, created_at desc);
create index if not exists analytics_events_event_type_idx on public.analytics_events(event_type);

create table if not exists public.ai_response_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null,
  response text not null,
  creator_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create unique index if not exists ai_response_cache_hash_creator_idx on public.ai_response_cache(query_hash, creator_id);
create index if not exists ai_response_cache_expires_idx on public.ai_response_cache(expires_at);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text not null,
  role text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.get_creator_earnings_by_day(p_creator_id uuid, p_days int default 30)
returns table(day date, earnings numeric)
language sql
as $$
  select
    date(t.created_at) as day,
    coalesce(sum(t.amount), 0)::numeric as earnings
  from public.transactions t
  where t.user_id = p_creator_id
    and t.status = 'succeeded'
    and t.type = 'credit'
    and t.created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by date(t.created_at)
  order by day asc;
$$;

create or replace function public.get_top_content_types(p_creator_id uuid)
returns table(content_type text, total numeric)
language sql
as $$
  select
    coalesce(t.metadata->>'content_type', 'unknown') as content_type,
    coalesce(sum(t.amount), 0)::numeric as total
  from public.transactions t
  where t.user_id = p_creator_id
    and t.status = 'succeeded'
    and t.type = 'credit'
  group by coalesce(t.metadata->>'content_type', 'unknown')
  order by total desc;
$$;

create or replace function public.get_engagement_rate(p_creator_id uuid)
returns table(engagement_rate numeric)
language sql
as $$
  with sent as (
    select count(*)::numeric as sent_count
    from public.analytics_events
    where creator_id = p_creator_id
      and event_type = 'message_sent'
  ),
  unlocked as (
    select count(*)::numeric as unlocked_count
    from public.analytics_events
    where creator_id = p_creator_id
      and event_type in ('payment', 'content_unlocked')
  )
  select case
    when sent.sent_count = 0 then 0
    else round((unlocked.unlocked_count / sent.sent_count) * 100, 2)
  end as engagement_rate
  from sent, unlocked;
$$;
