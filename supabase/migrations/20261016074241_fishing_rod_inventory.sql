-- Incremental migration: safe after the local baseline or an existing compatible remote schema.
-- Does not replace fishing RPCs. Temporary browser ownership is never imported.
begin;
create table if not exists public.fishing_rods(
 id text primary key, name text not null,
 price integer not null check(price between 0 and 1000000000 and price%2=0),
 region_id text references public.regions(id),
 failure_reduction_bp integer not null check(failure_reduction_bp between 0 and 10000),
 native_bonus_bp integer not null check(native_bonus_bp between 0 and 10000),
 check((id='basic')=(price=0)),check(native_bonus_bp=0 or region_id is not null)
);
insert into public.fishing_rods(id,name,price,region_id,failure_reduction_bp,native_bonus_bp) values
 ('basic','입문용 낚싯대',0,null,0,0),('bronze','청동 낚싯대',800,null,100,0),
 ('pongdang','퐁당 나무 낚싯대',1500,'pongdang',200,200),
 ('coral','산호꽃 낚싯대',1500,'coral',200,200),
 ('mistmoon','안개달 낚싯대',1500,'mistmoon',200,200),
 ('starruins','별잠 유물 낚싯대',1500,'starruins',200,200),
 ('dreamabyss','꿈실 낚싯대',1500,'dreamabyss',200,200),
 ('lunea','루네아의 축복',3000,'mistmoon',200,200),
 ('calm','잔물결 낚싯대',2000,null,300,0)
on conflict(id) do update set name=excluded.name,price=excluded.price,region_id=excluded.region_id,
 failure_reduction_bp=excluded.failure_reduction_bp,native_bonus_bp=excluded.native_bonus_bp;
create table if not exists public.player_fishing_rods(
 user_id uuid not null references auth.users(id) on delete cascade,
 rod_id text not null references public.fishing_rods(id),
 acquired_at timestamptz not null default now(),primary key(user_id,rod_id)
);
create table if not exists public.player_rod_loadouts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 equipped_rod_id text not null default 'basic',
 foreign key(user_id,equipped_rod_id) references public.player_fishing_rods(user_id,rod_id)
);
alter table public.fishing_rods enable row level security;
alter table public.player_fishing_rods enable row level security;
alter table public.player_rod_loadouts enable row level security;
revoke all on public.fishing_rods,public.player_fishing_rods,public.player_rod_loadouts from public,anon,authenticated;
grant select on public.fishing_rods,public.player_fishing_rods,public.player_rod_loadouts to authenticated;
drop policy if exists rods_catalog_read on public.fishing_rods;
create policy rods_catalog_read on public.fishing_rods for select to authenticated using(true);
drop policy if exists rods_owner_read on public.player_fishing_rods;
create policy rods_owner_read on public.player_fishing_rods for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists rod_loadout_owner_read on public.player_rod_loadouts;
create policy rod_loadout_owner_read on public.player_rod_loadouts for select to authenticated using(user_id=(select auth.uid()));

create or replace function app_private.fishing_rod_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 perform app_private.get_gold_wallet();
 -- All rod operations serialize on the existing wallet, before inventory/loadout.
 perform 1 from public.player_wallets where user_id=v_uid for update;
 insert into public.player_fishing_rods(user_id,rod_id) values(v_uid,'basic') on conflict do nothing;
 insert into public.player_rod_loadouts(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object(
  'owned',(select jsonb_agg(rod_id order by rod_id) from public.player_fishing_rods where user_id=v_uid),
  'selected',(select equipped_rod_id from public.player_rod_loadouts where user_id=v_uid),
  'catalog',(select jsonb_agg(to_jsonb(r) order by price,id) from public.fishing_rods r),
  'baits',coalesce((select jsonb_agg(to_jsonb(b) order by sort_order,id) from public.fishing_baits b),'[]'::jsonb)
 );
end $$;

create or replace function app_private.trade_fishing_rod(p_rod_id text,p_action text,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_rod public.fishing_rods;v_wallet public.player_wallets;
 v_previous public.gold_transactions;v_delta integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','sell') then raise exception 'INVALID_TRADE'; end if;
 perform app_private.fishing_rod_state();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>p_action or v_previous.item_id is distinct from 'rod:'||p_rod_id then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||app_private.fishing_rod_state()||jsonb_build_object('delta',0);
 end if;
 select * into v_rod from public.fishing_rods where id=p_rod_id for share;
 if not found then raise exception 'INVALID_ROD'; end if;
 if p_rod_id='basic' then raise exception 'STARTER_ROD_NOT_TRADEABLE'; end if;
 if p_action='buy' then
  if exists(select 1 from public.player_fishing_rods where user_id=v_uid and rod_id=p_rod_id) then raise exception 'ROD_ALREADY_OWNED'; end if;
  if v_wallet.gold<v_rod.price then raise exception 'INSUFFICIENT_GOLD'; end if;
  insert into public.player_fishing_rods(user_id,rod_id) values(v_uid,p_rod_id);
  v_delta:=-v_rod.price;
 else
  if not exists(select 1 from public.player_fishing_rods where user_id=v_uid and rod_id=p_rod_id) then raise exception 'ROD_NOT_OWNED'; end if;
  v_delta:=v_rod.price/2;
  if v_wallet.gold>1000000000-v_delta then raise exception 'GOLD_LIMIT'; end if;
  update public.player_rod_loadouts set equipped_rod_id='basic' where user_id=v_uid and equipped_rod_id=p_rod_id;
  delete from public.player_fishing_rods where user_id=v_uid and rod_id=p_rod_id;
 end if;
 update public.player_wallets set gold=gold+v_delta,updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
 values(v_uid,p_operation_id,p_action,'rod:'||p_rod_id,v_delta);
 return app_private.get_gold_wallet()||app_private.fishing_rod_state()||jsonb_build_object('delta',v_delta);
end $$;

create or replace function app_private.equip_fishing_rod(p_rod_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 perform app_private.fishing_rod_state();
 if not exists(select 1 from public.player_fishing_rods where user_id=v_uid and rod_id=p_rod_id) then raise exception 'ROD_NOT_OWNED'; end if;
 update public.player_rod_loadouts set equipped_rod_id=p_rod_id where user_id=v_uid;
 return app_private.fishing_rod_state();
end $$;

create or replace function public.fishing_rod_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.fishing_rod_state()$$;
create or replace function public.trade_fishing_rod(p_rod_id text,p_action text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.trade_fishing_rod(p_rod_id,p_action,p_operation_id)$$;
create or replace function public.equip_fishing_rod(p_rod_id text) returns jsonb language sql security invoker set search_path='' as $$select app_private.equip_fishing_rod(p_rod_id)$$;
revoke all on function app_private.fishing_rod_state(),public.fishing_rod_state(),app_private.trade_fishing_rod(text,text,uuid),public.trade_fishing_rod(text,text,uuid),app_private.equip_fishing_rod(text),public.equip_fishing_rod(text) from public,anon;
grant execute on function app_private.fishing_rod_state(),public.fishing_rod_state(),app_private.trade_fishing_rod(text,text,uuid),public.trade_fishing_rod(text,text,uuid),app_private.equip_fishing_rod(text),public.equip_fishing_rod(text) to authenticated;
notify pgrst,'reload schema';
commit;
