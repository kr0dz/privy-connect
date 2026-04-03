-- ============================================================
-- Coin Economy Expansion
-- ============================================================
-- 1. creator_content: price_coins, adult_only
-- 2. creator_twins:   adult_content flag
-- 3. profiles:        birthdate, loyalty_bonus_claimed, birthday_bonus_claimed_year
-- 4. promo_codes table
-- 5. content_unlocks table (track unlocked content per fan)
-- 6. RPCs: spend_coins_general, send_tip, apply_promo_code, check_loyalty_bonus
-- ============================================================

-- 1. creator_content additions
alter table if exists public.creator_content
  add column if not exists price_coins  integer,
  add column if not exists adult_only   boolean not null default false;

-- 2. creator_twins: adult_content flag
alter table if exists public.creator_twins
  add column if not exists adult_content boolean not null default false;

-- 3. profiles: birthdate and bonus tracking
alter table if exists public.profiles
  add column if not exists birthdate                  date,
  add column if not exists loyalty_bonus_claimed      boolean not null default false,
  add column if not exists birthday_bonus_claimed_year integer;

-- 4. promo_codes table
create table if not exists public.promo_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  bonus_coins  integer not null default 0,
  max_uses     integer,
  used_count   integer not null default 0,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- RLS for promo_codes
alter table public.promo_codes enable row level security;

drop policy if exists "promo_codes_read_authenticated" on public.promo_codes;
create policy "promo_codes_read_authenticated"
  on public.promo_codes for select
  to authenticated
  using (true);

-- 5. content_unlocks: tracks which fan unlocked which content
create table if not exists public.content_unlocks (
  id           uuid primary key default gen_random_uuid(),
  fan_id       uuid not null references auth.users(id) on delete cascade,
  content_id   uuid not null references public.creator_content(id) on delete cascade,
  coins_spent  integer not null default 0,
  created_at   timestamptz not null default now(),
  unique(fan_id, content_id)
);

alter table public.content_unlocks enable row level security;

drop policy if exists "content_unlocks_own" on public.content_unlocks;
create policy "content_unlocks_own"
  on public.content_unlocks for select
  to authenticated
  using (fan_id = auth.uid());

drop policy if exists "content_unlocks_insert_own" on public.content_unlocks;
create policy "content_unlocks_insert_own"
  on public.content_unlocks for insert
  to authenticated
  with check (fan_id = auth.uid());

-- ============================================================
-- RPC: spend_coins_general
-- Reusable function for any coin deduction with transaction log.
-- ============================================================
create or replace function public.spend_coins_general(
  p_fan_id        uuid,
  p_creator_id    uuid,
  p_amount        integer,
  p_type          text,   -- 'message', 'content_unlock', 'tip'
  p_ref_id        uuid    default null,  -- message_id / content_id
  p_description   text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fan_balance  numeric;
  v_fan_wallet   uuid;
  v_creator_wallet uuid;
begin
  -- Ensure caller is the fan
  if auth.uid() <> p_fan_id then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  end if;

  -- Lock and read fan balance
  select wallet_balance into v_fan_balance
  from public.profiles
  where id = p_fan_id
  for update;

  if v_fan_balance is null or v_fan_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient coins');
  end if;

  -- Deduct from fan
  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where id = p_fan_id;

  -- Credit creator
  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + p_amount
  where id = p_creator_id;

  -- Fan wallet lookup
  select id into v_fan_wallet from public.wallets where user_id = p_fan_id limit 1;
  select id into v_creator_wallet from public.wallets where user_id = p_creator_id limit 1;

  -- Transaction record: fan debit
  begin
    if v_fan_wallet is not null then
      insert into public.transactions (wallet_id, user_id, amount, currency, status, type, provider, provider_ref, metadata)
      values (
        v_fan_wallet,
        p_fan_id,
        -p_amount,
        'coins',
        'succeeded',
        'debit',
        'manual',
        p_ref_id::text,
        jsonb_build_object(
          'transaction_type', p_type,
          'creator_id', p_creator_id,
          'description', coalesce(p_description, p_type)
        )
      );
    end if;
  exception when others then null;
  end;

  -- Transaction record: creator credit
  begin
    if v_creator_wallet is not null then
      insert into public.transactions (wallet_id, user_id, amount, currency, status, type, provider, provider_ref, metadata)
      values (
        v_creator_wallet,
        p_creator_id,
        p_amount,
        'coins',
        'succeeded',
        'credit',
        'manual',
        p_ref_id::text,
        jsonb_build_object(
          'transaction_type', p_type,
          'fan_id', p_fan_id,
          'description', coalesce(p_description, p_type)
        )
      );
    end if;
  exception when others then null;
  end;

  -- Analytics
  begin
    insert into public.analytics_events (user_id, creator_id, event_type, metadata)
    values (
      p_fan_id,
      p_creator_id,
      p_type,
      jsonb_build_object('coins', p_amount, 'ref_id', p_ref_id, 'description', p_description)
    );
  exception when others then null;
  end;

  return jsonb_build_object('ok', true, 'new_balance', v_fan_balance - p_amount);
end;
$$;

grant execute on function public.spend_coins_general(uuid, uuid, integer, text, uuid, text) to authenticated;

-- ============================================================
-- RPC: send_tip
-- Convenience wrapper over spend_coins_general for tips.
-- ============================================================
create or replace function public.send_tip(
  p_fan_id     uuid,
  p_creator_id uuid,
  p_amount     integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() <> p_fan_id then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  return public.spend_coins_general(
    p_fan_id,
    p_creator_id,
    p_amount,
    'tip',
    null,
    'Tip to creator'
  );
end;
$$;

grant execute on function public.send_tip(uuid, uuid, integer) to authenticated;

-- ============================================================
-- RPC: unlock_content_coins
-- Unlocks a specific content item for a fan.
-- ============================================================
create or replace function public.unlock_content_coins(
  p_fan_id     uuid,
  p_content_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content      record;
  v_already_unlocked boolean;
  v_result       jsonb;
begin
  if auth.uid() <> p_fan_id then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  -- Load content
  select id, creator_id, price_coins, adult_only
  into v_content
  from public.creator_content
  where id = p_content_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Content not found');
  end if;

  if v_content.price_coins is null or v_content.price_coins <= 0 then
    return jsonb_build_object('ok', true, 'free', true);
  end if;

  -- Check if already unlocked
  select exists(
    select 1 from public.content_unlocks
    where fan_id = p_fan_id and content_id = p_content_id
  ) into v_already_unlocked;

  if v_already_unlocked then
    return jsonb_build_object('ok', true, 'already_unlocked', true);
  end if;

  -- Spend coins
  v_result := public.spend_coins_general(
    p_fan_id,
    v_content.creator_id,
    v_content.price_coins,
    'content_unlock',
    p_content_id,
    'Content unlock'
  );

  if not (v_result->>'ok')::boolean then
    return v_result;
  end if;

  -- Record unlock
  insert into public.content_unlocks (fan_id, content_id, coins_spent)
  values (p_fan_id, p_content_id, v_content.price_coins)
  on conflict (fan_id, content_id) do nothing;

  return jsonb_build_object('ok', true, 'coins_spent', v_content.price_coins);
end;
$$;

grant execute on function public.unlock_content_coins(uuid, uuid) to authenticated;

-- ============================================================
-- RPC: apply_promo_code
-- Validates and applies a promo code for bonus coins.
-- ============================================================
create or replace function public.apply_promo_code(
  p_user_id uuid,
  p_code    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo     record;
  v_fan_wallet uuid;
begin
  if auth.uid() <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  -- Fetch promo
  select id, bonus_coins, max_uses, used_count, expires_at
  into v_promo
  from public.promo_codes
  where lower(code) = lower(trim(p_code))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Codigo no valido.');
  end if;

  -- Check expiry
  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'El codigo ha expirado.');
  end if;

  -- Check max_uses
  if v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses then
    return jsonb_build_object('ok', false, 'error', 'El codigo ha alcanzado el limite de usos.');
  end if;

  -- Add coins to user
  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + v_promo.bonus_coins
  where id = p_user_id;

  -- Increment used_count
  update public.promo_codes
  set used_count = used_count + 1
  where id = v_promo.id;

  -- Wallet lookup
  select id into v_fan_wallet from public.wallets where user_id = p_user_id limit 1;

  -- Transaction
  begin
    if v_fan_wallet is not null then
      insert into public.transactions (wallet_id, user_id, amount, currency, status, type, provider, provider_ref, metadata)
      values (
        v_fan_wallet,
        p_user_id,
        v_promo.bonus_coins,
        'coins',
        'succeeded',
        'credit',
        'promo',
        p_code,
        jsonb_build_object('transaction_type', 'promotion_bonus', 'code', p_code, 'coins', v_promo.bonus_coins)
      );
    end if;
  exception when others then null;
  end;

  -- Analytics
  begin
    insert into public.analytics_events (user_id, creator_id, event_type, metadata)
    values (
      p_user_id,
      null,
      'promo_code_used',
      jsonb_build_object('code', p_code, 'coins', v_promo.bonus_coins)
    );
  exception when others then null;
  end;

  return jsonb_build_object('ok', true, 'bonus_coins', v_promo.bonus_coins);
end;
$$;

grant execute on function public.apply_promo_code(uuid, text) to authenticated;

-- ============================================================
-- RPC: check_loyalty_bonus
-- Grants bonus coins when cumulative spending reaches threshold.
-- ============================================================
create or replace function public.check_loyalty_bonus(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_spent  numeric;
  v_threshold    constant integer := 500;
  v_bonus        constant integer := 100;
  v_already_claimed boolean;
  v_fan_wallet   uuid;
begin
  if auth.uid() <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  select loyalty_bonus_claimed
  into v_already_claimed
  from public.profiles
  where id = p_user_id;

  if v_already_claimed then
    return jsonb_build_object('ok', false, 'already_claimed', true);
  end if;

  -- Sum coins spent (negative transactions of type coins)
  select coalesce(sum(abs(t.amount)), 0)
  into v_total_spent
  from public.transactions t
  where t.user_id = p_user_id
    and t.currency = 'coins'
    and t.type = 'debit'
    and t.status = 'succeeded';

  if v_total_spent < v_threshold then
    return jsonb_build_object('ok', false, 'progress', v_total_spent, 'threshold', v_threshold);
  end if;

  -- Grant bonus
  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + v_bonus,
      loyalty_bonus_claimed = true
  where id = p_user_id;

  select id into v_fan_wallet from public.wallets where user_id = p_user_id limit 1;

  begin
    if v_fan_wallet is not null then
      insert into public.transactions (wallet_id, user_id, amount, currency, status, type, provider, provider_ref, metadata)
      values (
        v_fan_wallet,
        p_user_id,
        v_bonus,
        'coins',
        'succeeded',
        'credit',
        'promo',
        'loyalty_bonus',
        jsonb_build_object('transaction_type', 'loyalty_bonus', 'coins', v_bonus, 'coins_spent', v_total_spent)
      );
    end if;
  exception when others then null;
  end;

  return jsonb_build_object('ok', true, 'bonus_coins', v_bonus);
end;
$$;

grant execute on function public.check_loyalty_bonus(uuid) to authenticated;

-- ============================================================
-- RPC: apply_birthday_bonus
-- Used by the birthday-bonus cron Edge Function (service role).
-- ============================================================
create or replace function public.apply_birthday_bonus(
  p_user_id  uuid,
  p_coins    integer,
  p_year     integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + p_coins,
      birthday_bonus_claimed_year = p_year
  where id = p_user_id;
end;
$$;

-- Only service role can call this (cron function uses service key)
revoke execute on function public.apply_birthday_bonus(uuid, integer, integer) from public;
revoke execute on function public.apply_birthday_bonus(uuid, integer, integer) from authenticated;
