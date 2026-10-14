-- Apply after 01~07. Browser balances are intentionally not imported.
begin;
create table public.player_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 gold integer not null default 0 check(gold between 0 and 1000000000),
 inventory jsonb not null default '{}' check(jsonb_typeof(inventory)='object'),
 test_claimed boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.gold_transactions (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 action text not null check(action in ('charge','buy','sell')),
 item_id text,
 delta integer not null,
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
create table app_private.gold_settings (
 id boolean primary key default true check(id),
 test_charge_enabled boolean not null default true
);
insert into app_private.gold_settings(id) values(true);
alter table app_private.gold_settings enable row level security;
revoke all on app_private.gold_settings from public,anon,authenticated;
alter table public.player_wallets enable row level security;
alter table public.gold_transactions enable row level security;
revoke all on public.player_wallets,public.gold_transactions from public,anon,authenticated;
grant select on public.player_wallets,public.gold_transactions to authenticated;
create policy wallet_owner_read on public.player_wallets for select to authenticated using(user_id=(select auth.uid()));
create policy ledger_owner_read on public.gold_transactions for select to authenticated using(user_id=(select auth.uid()));

create function app_private.get_gold_wallet() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid;
 return jsonb_build_object('gold',v_wallet.gold,'inventory',v_wallet.inventory,'testClaimed',v_wallet.test_claimed,'testEnabled',(select test_charge_enabled from app_private.gold_settings where id));
end $$;
create function app_private.trade_gold(p_operation_id uuid,p_action text,p_item_id text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets; v_previous public.gold_transactions; v_delta integer; v_count integer; v_price integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or p_action is null or p_action not in ('charge','buy','sell') then raise exception 'INVALID_TRADE'; end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>p_action or v_previous.item_id is distinct from p_item_id then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if p_action='charge' then
  if p_item_id is not null then raise exception 'INVALID_TRADE'; end if;
  if not coalesce((select test_charge_enabled from app_private.gold_settings where id),false) then raise exception 'TEST_CHARGE_DISABLED'; end if;
  if v_wallet.test_claimed then raise exception 'TEST_CHARGE_ALREADY_CLAIMED'; end if;
  v_delta:=1000;
 else
  if p_item_id is null or p_item_id not in ('bait','shell') then raise exception 'INVALID_ITEM'; end if;
  v_count:=coalesce((v_wallet.inventory->>p_item_id)::integer,0);
  v_price:=case p_item_id when 'bait' then 100 else 300 end;
  if p_action='buy' then
   if v_wallet.gold<v_price then raise exception 'INSUFFICIENT_GOLD'; end if;
   v_delta:=-v_price; v_count:=v_count+1;
  else
   if v_count<1 then raise exception 'INSUFFICIENT_INVENTORY'; end if;
   v_delta:=v_price*6/10; v_count:=v_count-1;
  end if;
  v_wallet.inventory:=jsonb_set(v_wallet.inventory,array[p_item_id],to_jsonb(v_count));
 end if;
 if v_wallet.gold+v_delta>1000000000 then raise exception 'GOLD_LIMIT'; end if;
 update public.player_wallets set gold=gold+v_delta,inventory=v_wallet.inventory,test_claimed=test_claimed or p_action='charge',updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,p_action,p_item_id,v_delta);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',v_delta);
end $$;
create function public.get_gold_wallet() returns jsonb language sql security invoker set search_path='' as $$select app_private.get_gold_wallet()$$;
create function public.trade_gold(p_operation_id uuid,p_action text,p_item_id text default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.trade_gold(p_operation_id,p_action,p_item_id)$$;
revoke all on function app_private.get_gold_wallet(),public.get_gold_wallet(),app_private.trade_gold(uuid,text,text),public.trade_gold(uuid,text,text) from public,anon;
grant execute on function app_private.get_gold_wallet(),public.get_gold_wallet(),app_private.trade_gold(uuid,text,text),public.trade_gold(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;