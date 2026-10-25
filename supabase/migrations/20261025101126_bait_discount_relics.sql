begin;
alter table public.fishing_relics drop constraint relic_effect_shape;
alter table public.fishing_relics add constraint relic_effect_shape check ((((effect_kind = 'none'::text) AND (effect_value = (0)::numeric)) OR ((effect_kind = ANY (ARRAY['fuel_active_slots'::text, 'bait_active_slots'::text])) AND (((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'personal_bait_hours'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (2)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (4)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (8)::numeric)))) OR ((effect_kind = 'fishing_wait_seconds'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = 0.5)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (1)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (2)::numeric)))) OR ((effect_kind = 'trap_seconds_per_bait'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (30)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (90)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (180)::numeric)))) OR ((effect_kind = 'boat_discount_gold'::text) AND (((rarity = 'rare'::game_rarity) AND (effect_value = (50)::numeric)) OR ((rarity = 'epic'::game_rarity) AND (effect_value = (150)::numeric)) OR ((rarity = 'mythic'::game_rarity) AND (effect_value = (400)::numeric))))) or (effect_kind='bait_discount_gold' and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2))));


CREATE OR REPLACE FUNCTION app_private.buy_fishing_bait(p_bait_id text, p_operation_id uuid, p_expected_price integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); b public.fishing_baits; w public.player_wallets; prev public.gold_transactions; v_price integer;
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
 if b.price is null then raise exception 'BAIT_NOT_FOR_SALE'; end if;
 v_price:=greatest(1,b.price-app_private.relic_bonus('bait_discount_gold')::integer);
 if p_expected_price is not null and p_expected_price<>v_price then raise exception 'BAIT_PRICE_CHANGED';end if;
 if w.gold<v_price then raise exception 'INSUFFICIENT_GOLD';end if;
 update public.player_wallets set gold=gold-v_price,
 inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(coalesce((inventory->>p_bait_id)::integer,0)+1)),updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','fishing:'||p_bait_id,-v_price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-v_price);
end $function$;

CREATE OR REPLACE FUNCTION app_private.fishing_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_region text;v_discount integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 v_discount:=app_private.relic_bonus('bait_discount_gold')::integer;
 return jsonb_build_object('regionId',v_region,'regionName',(select name from public.regions where id=v_region),
 'successChanceBp',10000,'mechanicsVersion',2,
 'prepared',(select app_private.prepared_fishing_payload(p) from app_private.prepared_fishing_casts p where user_id=v_uid and finished_at is null and expires_at>clock_timestamp()),
 'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region)||jsonb_build_object('base_price',b.price,'price',case when b.price is null then null else greatest(1,b.price-v_discount) end,'priceDiscountGold',case when b.price is null then 0 else b.price-greatest(1,b.price-v_discount) end,'baseSuccessChanceBp',10000,'successChanceBp',10000,'mechanicsVersion',2) order by b.sort_order) from public.fishing_baits b));
end $function$;

CREATE OR REPLACE FUNCTION app_private.trade_gold(p_operation_id uuid, p_action text, p_item_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_wallet public.player_wallets;v_previous public.gold_transactions;v_delta integer;v_count integer;v_price integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('charge','buy','sell') then raise exception 'INVALID_TRADE';end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>p_action or v_previous.item_id is distinct from p_item_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 if p_action='charge' then
  if p_item_id is not null then raise exception 'INVALID_TRADE';end if;
  if not coalesce((select test_charge_enabled from app_private.gold_settings where id),false) then raise exception 'TEST_CHARGE_DISABLED';end if;
  if v_wallet.test_claimed then raise exception 'TEST_CHARGE_ALREADY_CLAIMED';end if;
  v_delta:=1000;
 else
  if p_item_id is null or p_item_id not in ('bait','shell') then raise exception 'INVALID_ITEM';end if;
  v_count:=coalesce((v_wallet.inventory->>p_item_id)::integer,0);
  v_price:=case when p_item_id='bait' then (select price from public.fishing_baits where id='bait') else 300 end;
  if v_price is null then raise exception 'INVALID_ITEM';end if;
  if p_action='buy' then
   if p_item_id='bait' then v_price:=greatest(1,v_price-app_private.relic_bonus('bait_discount_gold')::integer);end if;
   if v_wallet.gold<v_price then raise exception 'INSUFFICIENT_GOLD';end if;
   v_delta:=-v_price;v_count:=v_count+1;
  else
   if v_count<1 then raise exception 'INSUFFICIENT_INVENTORY';end if;
   v_delta:=v_price*6/10;v_count:=v_count-1;
  end if;
  v_wallet.inventory:=jsonb_set(v_wallet.inventory,array[p_item_id],to_jsonb(v_count));
 end if;
 if v_wallet.gold+v_delta>1000000000 then raise exception 'GOLD_LIMIT';end if;
 update public.player_wallets set gold=gold+v_delta,inventory=v_wallet.inventory,test_claimed=test_claimed or p_action='charge',updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,p_action,p_item_id,v_delta);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',v_delta);
end $function$;


-- Preserve existing clients; quote-aware clients explicitly confirm unit price.
create or replace function app_private.buy_fishing_bait(p_bait_id text,p_operation_id uuid) returns jsonb
language sql security definer set search_path='' as $$ select app_private.buy_fishing_bait(p_bait_id,p_operation_id,null::integer) $$;
create function public.buy_fishing_bait_at_price(p_bait_id text,p_operation_id uuid,p_expected_price integer) returns jsonb
language sql security invoker set search_path='' as $$ select app_private.buy_fishing_bait(p_bait_id,p_operation_id,p_expected_price) $$;
revoke all on function app_private.buy_fishing_bait(text,uuid,integer),public.buy_fishing_bait_at_price(text,uuid,integer) from public,anon;
grant execute on function app_private.buy_fishing_bait(text,uuid,integer),public.buy_fishing_bait_at_price(text,uuid,integer) to authenticated;
notify pgrst,'reload schema';
-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('abundant-conch','풍요의 소라고둥','미끼생산소 동시 가동 가능 횟수 +1 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/abundant-conch_thumbnail.png',true,'bait_active_slots',1,1300),
('current-piercing-needle','물살을 가르는 바늘','낚시 대기 시간 1초 단축 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/current-piercing-needle_thumbnail.png',true,'fishing_wait_seconds',1,1300),
('eternal-water-clock','영원의 물시계','나만의 미끼 생산소 최대 제작 시간 +8시간 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/eternal-water-clock_thumbnail.png',true,'personal_bait_hours',8,3000),
('fish-calling-bell','물고기를 부르는 방울','통발 미끼당 대기 시간 30초 단축 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/fish-calling-bell_thumbnail.png',true,'trap_seconds_per_bait',30,200),
('golden-anchor-seal','황금 닻 인장','배 구매 가격 150골드 할인 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/golden-anchor-seal_thumbnail.png',true,'boat_discount_gold',150,1300),
('instant-fishing-hook','찰나를 낚는 낚싯바늘','낚시 대기 시간 2초 단축 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/instant-fishing-hook_thumbnail.png',true,'fishing_wait_seconds',2,3000),
('ocean-seed','바다가 품은 씨앗','미끼생산소 동시 가동 가능 횟수 +2 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/ocean-seed_thumbnail.png',true,'bait_active_slots',2,3000),
('old-captain-seal','낡은 선장의 인장','배 구매 가격 50골드 할인 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/old-captain-seal_thumbnail.png',true,'boat_discount_gold',50,200),
('primordial-ember','태초의 불씨','연료생산소 동시 가동 가능 횟수 +2 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/primordial-ember_thumbnail.png',true,'fuel_active_slots',2,3000),
('sea-king-shipwright-edict','해왕의 조선 칙서','배 구매 가격 400골드 할인 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/sea-king-shipwright-edict_thumbnail.png',true,'boat_discount_gold',400,3000),
('sea-king-summoning-bell','해왕의 부름종','통발 미끼당 대기 시간 3분 단축 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/sea-king-summoning-bell_thumbnail.png',true,'trap_seconds_per_bait',180,3000),
('sea-king-trade-ledger','해왕의 거래 장부','미끼 구매 가격 2골드 할인','mythic','relics/mythic/sea-king-trade-ledger_thumbnail.png',true,'bait_discount_gold',2,3000),
('sea-merchant-shell-token','바다상인의 조개패','미끼 구매 가격 1골드 할인','epic','relics/epic/sea-merchant-shell-token_thumbnail.png',true,'bait_discount_gold',1,1300),
('shell-hourglass','조개 모래시계','나만의 미끼 생산소 최대 제작 시간 +2시간 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/shell-hourglass_thumbnail.png',true,'personal_bait_hours',2,200),
('silver-osprey-feather','은빛 물수리 깃털','낚시 대기 시간 0.5초 단축 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/silver-osprey-feather_thumbnail.png',true,'fishing_wait_seconds',0.5,200),
('still-wave-clock','멈춘 파도의 시계','나만의 미끼 생산소 최대 제작 시간 +4시간 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/still-wave-clock_thumbnail.png',true,'personal_bait_hours',4,1300),
('tide-bell','밀물의 종','통발 미끼당 대기 시간 1분 30초 단축 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/tide-bell_thumbnail.png',true,'trap_seconds_per_bait',90,1300),
('undying-furnace-heart','꺼지지 않는 화로심장','연료생산소 동시 가동 가능 횟수 +1 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/undying-furnace-heart_thumbnail.png',true,'fuel_active_slots',1,1300)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
commit;
