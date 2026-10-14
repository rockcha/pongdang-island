-- Apply after 12. One cast consumes exactly one bait, including failed casts.
begin;
create table public.fishing_baits (
 id text primary key,name text not null,description text not null,price integer not null check(price>0),
 image_path text not null,sort_order integer not null unique,
 common_bp integer not null check(common_bp>=0),rare_bp integer not null check(rare_bp>=0),
 epic_bp integer not null check(epic_bp>=0),mythic_bp integer not null check(mythic_bp>=0),
 failure_bp integer not null check(failure_bp>=0),
 check(common_bp+rare_bp+epic_bp+mythic_bp+failure_bp=10000)
);
insert into public.fishing_baits values
('bait','일반 미끼','기본 확률로 바다에 도전해요.',30,'/items/baits/normal.png',1,3000,1000,100,30,5870),
('bait_special','특수 미끼','실패 없이 최소 희귀 등급을 보장해요.',300,'/items/baits/special.png',2,0,9870,100,30,0),
('bait_safe','안전 미끼','기본 실패 확률을 20% 줄여요. (58.7% → 46.96%)',100,'/items/baits/safe.png',3,4174,1000,100,30,4696);
create table public.fishing_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,
 region_id text not null references public.regions(id),bait_id text not null references public.fishing_baits(id),
 rarity public.game_rarity,created_at timestamptz not null default now(),primary key(user_id,operation_id)
);
create index fishing_attempts_recent on public.fishing_attempts(user_id,created_at desc);
create table public.player_catch_counts (
 user_id uuid not null references auth.users(id) on delete cascade,rarity public.game_rarity not null,
 quantity integer not null check(quantity>0),primary key(user_id,rarity)
);
alter table public.fishing_baits enable row level security;
alter table public.fishing_attempts enable row level security;
alter table public.player_catch_counts enable row level security;
revoke all on public.fishing_baits,public.fishing_attempts,public.player_catch_counts from public,anon,authenticated;
grant select on public.fishing_baits,public.fishing_attempts,public.player_catch_counts to authenticated;
create policy baits_catalog_read on public.fishing_baits for select to authenticated using(true);
create policy attempts_owner_read on public.fishing_attempts for select to authenticated using(user_id=(select auth.uid()));
create policy catch_counts_owner_read on public.player_catch_counts for select to authenticated using(user_id=(select auth.uid()));

-- Pure resolver for deterministic boundary tests. Never exposed to clients.
create function app_private.resolve_fishing(p_bait_id text,p_roll integer) returns public.game_rarity
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 if p_roll<b.mythic_bp then return 'mythic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp then return 'epic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp then return 'rare'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp+b.common_bp then return 'common'; end if;
 return null;
end $$;
revoke all on function app_private.resolve_fishing(text,integer) from public,anon,authenticated;
create function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('baits',(select jsonb_agg(to_jsonb(b) order by b.sort_order) from public.fishing_baits b),
 'catches',coalesce((select jsonb_object_agg(rarity,quantity) from public.player_catch_counts where user_id=v_uid),'{}'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select operation_id,region_id,bait_id,rarity,created_at from public.fishing_attempts where user_id=v_uid order by created_at desc limit 10) a),'[]'::jsonb));
end $$;
create function app_private.buy_fishing_bait(p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); b public.fishing_baits; w public.player_wallets; prev public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into prev from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if prev.action<>'buy' or prev.item_id is distinct from ('fishing:'||p_bait_id) then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 if w.gold<b.price then raise exception 'INSUFFICIENT_GOLD'; end if;
 update public.player_wallets set gold=gold-b.price,
 inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(coalesce((inventory->>p_bait_id)::integer,0)+1)),updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','fishing:'||p_bait_id,-b.price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-b.price);
end $$;
create function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  return jsonb_build_object('attempt',to_jsonb(a),'replayed',true);
 end if;
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer);
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity) values(v_uid,p_operation_id,p_region_id,p_bait_id,v_rarity) returning * into a;
 if v_rarity is not null then
  insert into public.player_catch_counts(user_id,rarity,quantity) values(v_uid,v_rarity,1)
  on conflict(user_id,rarity) do update set quantity=public.player_catch_counts.quantity+1;
 end if;
 return jsonb_build_object('attempt',to_jsonb(a),'replayed',false);
end $$;
create function public.fishing_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.fishing_state()$$;
create function public.buy_fishing_bait(p_bait_id text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.buy_fishing_bait(p_bait_id,p_operation_id)$$;
create function public.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.cast_fishing(p_region_id,p_bait_id,p_operation_id)$$;
revoke all on function app_private.fishing_state(),public.fishing_state(),app_private.buy_fishing_bait(text,uuid),public.buy_fishing_bait(text,uuid),app_private.cast_fishing(text,text,uuid),public.cast_fishing(text,text,uuid) from public,anon;
grant execute on function app_private.fishing_state(),public.fishing_state(),app_private.buy_fishing_bait(text,uuid),public.buy_fishing_bait(text,uuid),app_private.cast_fishing(text,text,uuid),public.cast_fishing(text,text,uuid) to authenticated;
create or replace function app_private.trade_gold(p_operation_id uuid,p_action text,p_item_id text default null) returns jsonb
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
  v_price:=case p_item_id when 'bait' then 30 else 300 end;
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

notify pgrst,'reload schema';
commit;
