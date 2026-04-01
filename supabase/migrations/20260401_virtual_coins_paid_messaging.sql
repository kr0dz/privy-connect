alter table if exists public.profiles
  add column if not exists wallet_balance numeric not null default 0;

alter table if exists public.creator_twins
  add column if not exists paid_messaging_enabled boolean not null default false,
  add column if not exists message_price_coins integer not null default 5;

alter table if exists public.messages
  add column if not exists coins_spent integer;

create or replace function public.handle_welcome_coins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + 20
  where id = new.id;

  begin
    insert into public.analytics_events (user_id, creator_id, event_type, metadata)
    values (
      new.id,
      null,
      'welcome_bonus',
      jsonb_build_object('coins', 20, 'reason', 'new_user_bonus')
    );
  exception when others then
    null;
  end;

  begin
    insert into public.transactions (
      wallet_id,
      user_id,
      amount,
      currency,
      status,
      type,
      provider,
      provider_ref,
      metadata
    )
    select
      w.id,
      new.id,
      20,
      'coins',
      'succeeded',
      'credit',
      'promo',
      'welcome_bonus',
      jsonb_build_object('transaction_type', 'welcome_bonus', 'coins', 20)
    from public.wallets w
    where w.user_id = new.id
    limit 1;
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_profiles_welcome_coins on public.profiles;
create trigger trg_profiles_welcome_coins
after insert on public.profiles
for each row
execute function public.handle_welcome_coins();

create or replace function public.spend_message_coins(
  p_fan_id uuid,
  p_creator_id uuid,
  p_amount integer,
  p_message_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  if auth.uid() is null or auth.uid() <> p_fan_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select wallet_balance
  into v_balance
  from public.profiles
  where id = p_fan_id
  for update;

  if coalesce(v_balance, 0) < p_amount then
    raise exception 'INSUFFICIENT_COINS';
  end if;

  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) - p_amount
  where id = p_fan_id;

  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + p_amount
  where id = p_creator_id;

  if p_message_id is not null then
    update public.messages
    set coins_spent = p_amount
    where id = p_message_id;
  end if;

  begin
    insert into public.analytics_events (user_id, creator_id, event_type, metadata)
    values (
      p_fan_id,
      p_creator_id,
      'message_spent',
      jsonb_build_object('coins', p_amount, 'message_id', p_message_id)
    );

    insert into public.analytics_events (user_id, creator_id, event_type, metadata)
    values (
      p_creator_id,
      p_creator_id,
      'message_earned',
      jsonb_build_object('coins', p_amount, 'message_id', p_message_id, 'fan_id', p_fan_id)
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('ok', true, 'coins', p_amount);
end;
$$;

grant execute on function public.spend_message_coins(uuid, uuid, integer, uuid) to authenticated;
