-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
-- Preserve old savings contracts; new contracts snapshot the strengthened effects.
alter table public.shell_savings drop constraint shell_savings_relic_bonus_percent_check;
alter table public.shell_savings add constraint shell_savings_relic_bonus_percent_check check(relic_bonus_percent in (0,2,5,10,25,50));
alter table public.fishing_relics drop constraint relic_effect_shape;
alter table public.fishing_relics add constraint relic_effect_shape check ((effect_kind='none' and effect_value=0)
 or (effect_kind='fuel_active_slots' and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='bait_active_slots' and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='personal_bait_hours' and ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=8)))
 or (effect_kind='fishing_wait_seconds' and ((rarity='rare' and effect_value=0.5) or (rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='trap_seconds_per_bait' and ((rarity='rare' and effect_value=30) or (rarity='epic' and effect_value=90) or (rarity='mythic' and effect_value=180)))
 or (effect_kind='boat_discount_gold' and ((rarity='rare' and effect_value=100) or (rarity='epic' and effect_value=300) or (rarity='mythic' and effect_value=800)))
 or (effect_kind='bait_discount_gold' and ((rarity='epic' and effect_value=2) or (rarity='mythic' and effect_value=5)))
 or (effect_kind='harbor_duration_percent' and ((rarity='rare' and effect_value=3) or (rarity='epic' and effect_value=6) or (rarity='mythic' and effect_value=10)))
 or (effect_kind='production_auto_claim' and ((rarity='epic' and effect_value=1)))
 or (effect_kind='pongi_whack_golden_count' and ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=10)))
 or (effect_kind='direct_relic_chance_percent' and ((rarity='rare' and effect_value=1) or (rarity='epic' and effect_value=3) or (rarity='mythic' and effect_value=6)))
 or (effect_kind='direct_map_chance_percent' and ((rarity='rare' and effect_value=0.5) or (rarity='epic' and effect_value=2) or (rarity='mythic' and effect_value=5)))
 or (effect_kind='bait_refund_percent' and ((rarity='rare' and effect_value=1) or (rarity='epic' and effect_value=3) or (rarity='mythic' and effect_value=5)))
 or (effect_kind='savings_interest_bonus_percent' and ((rarity='rare' and effect_value=10) or (rarity='epic' and effect_value=25) or (rarity='mythic' and effect_value=50)))) not valid;

set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('coin-cradling-clam','동전을 품은 조개','조개 적금 기본 이자의 10% 추가 지급 · 가입 시 장착 효과 적용','rare','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/rare/coin-cradling-clam_v1_thumbnail.png',true,'savings_interest_bonus_percent',10,200),
('golden-anchor-seal','황금 닻 인장','배 구매 가격 300골드 할인 · 버그로 일시 중단되어 획득·장착할 수 없어요. 보유자는 건의함에 접수하면 확인 후 보상해 드려요.','epic','relics/epic/golden-anchor-seal_thumbnail.png',false,'boat_discount_gold',300,1300),
('old-captain-seal','낡은 선장의 인장','배 구매 가격 100골드 할인 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/old-captain-seal_thumbnail.png',true,'boat_discount_gold',100,200),
('sea-king-golden-vault','해왕의 황금 금고','조개 적금 기본 이자의 50% 추가 지급 · 가입 시 장착 효과 적용','mythic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/mythic/sea-king-golden-vault_v1_thumbnail.png',true,'savings_interest_bonus_percent',50,2800),
('sea-king-shipwright-edict','해왕의 조선 칙서','배 구매 가격 800골드 할인 · 버그로 일시 중단되어 획득·장착할 수 없어요. 보유자는 건의함에 접수하면 확인 후 보상해 드려요.','mythic','relics/mythic/sea-king-shipwright-edict_thumbnail.png',false,'boat_discount_gold',800,2800),
('sea-king-trade-ledger','해왕의 거래 장부','정가 40골드 이상 미끼 구매 시 개당 5골드 할인','mythic','relics/mythic/sea-king-trade-ledger_thumbnail.png',true,'bait_discount_gold',5,2800),
('sea-merchant-pearl-vault','바다상인의 진주 금고','조개 적금 기본 이자의 25% 추가 지급 · 가입 시 장착 효과 적용','epic','https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/relics/epic/sea-merchant-pearl-vault_v1_thumbnail.png',true,'savings_interest_bonus_percent',25,1300),
('sea-merchant-shell-token','바다상인의 조개패','정가 40골드 이상 미끼 구매 시 개당 2골드 할인','epic','relics/epic/sea-merchant-shell-token_thumbnail.png',true,'bait_discount_gold',2,1300)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';
alter table public.fishing_relics validate constraint relic_effect_shape;

create function app_private.relic_bait_price(p_base_price integer)
returns integer language sql stable security invoker set search_path='' as $relic_price$
 select case when p_base_price is null then null when p_base_price>=40 then greatest(1,p_base_price-app_private.relic_bonus('bait_discount_gold')::integer) else greatest(1,p_base_price) end
$relic_price$;
revoke all on function app_private.relic_bait_price(integer) from public,anon,authenticated;
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
 v_price:=app_private.relic_bait_price(b.price);
 if p_expected_price is not null and p_expected_price<>v_price then raise exception 'BAIT_PRICE_CHANGED';end if;
 if w.gold<v_price then raise exception 'INSUFFICIENT_GOLD';end if;
 update public.player_wallets set gold=gold-v_price,
 inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(coalesce((inventory->>p_bait_id)::integer,0)+1)),updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','fishing:'||p_bait_id,-v_price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-v_price);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.buy_fishing_bait_bulk(p_bait_id text, p_quantity integer, p_operation_id uuid, p_expected_price integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();b public.fishing_baits;w public.player_wallets;
 previous app_private.bait_purchase_operations;price integer;total bigint;stock bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_bait_id is null or p_expected_price is null or p_expected_price<1 then raise exception 'INVALID_TRADE';end if;
 if p_quantity is null or p_quantity not between 1 and 99 then raise exception 'INVALID_QUANTITY';end if;
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from app_private.bait_purchase_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.bait_id is distinct from p_bait_id or previous.quantity<>p_quantity or previous.unit_price<>p_expected_price then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into b from public.fishing_baits where id=p_bait_id for share;
 if not found then raise exception 'INVALID_BAIT';end if;
 if b.price is null then raise exception 'BAIT_NOT_FOR_SALE';end if;
 price:=app_private.relic_bait_price(b.price);
 if p_expected_price<>price then raise exception 'BAIT_PRICE_CHANGED';end if;
 total:=price::bigint*p_quantity;
 if w.gold<total then raise exception 'INSUFFICIENT_GOLD';end if;
 stock:=coalesce((w.inventory->>p_bait_id)::bigint,0)+p_quantity;
 if stock>1000000000 then raise exception 'INVENTORY_LIMIT';end if;
 update public.player_wallets set gold=gold-total::integer,
  inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(stock::integer)),updated_at=clock_timestamp() where user_id=u;
 -- Keep the existing item identity so maintenance and accounting hooks apply.
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','fishing:'||p_bait_id,-total::integer);
 insert into app_private.bait_purchase_operations(user_id,operation_id,bait_id,quantity,unit_price) values(u,p_operation_id,p_bait_id,p_quantity,price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-total::integer,'replayed',false,'quantity',p_quantity);
end $function$
;
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
 'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region)||jsonb_build_object('base_price',b.price,'price',case when b.price is null then null else (case when b.price>=40 then greatest(1,b.price-v_discount) else b.price end) end,'priceDiscountGold',case when b.price is null then 0 else b.price-(case when b.price>=40 then greatest(1,b.price-v_discount) else b.price end) end,'baseSuccessChanceBp',10000,'successChanceBp',10000,'mechanicsVersion',2) order by b.sort_order) from public.fishing_baits b));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.savings_action(p_action text, p_operation_id uuid, p_account_id uuid DEFAULT NULL::uuid, p_term_days integer DEFAULT NULL::integer, p_daily_amount integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_now timestamptz;v_account public.shell_savings;v_previous app_private.savings_operations;
 v_signature jsonb;v_status text;v_payout integer:=0;v_bonus integer:=0;v_gold integer;v_receipt jsonb;v_kind text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('open','deposit','withdraw') then raise exception 'INVALID_SAVINGS_ACTION';end if;
 if (p_action='open' and p_account_id is not null) or
    (p_action<>'open' and (p_account_id is null or p_term_days is not null or p_daily_amount is not null)) then raise exception 'INVALID_SAVINGS_ACTION';end if;
 v_signature:=jsonb_build_object('action',p_action,'account',p_account_id,'term',p_term_days,'daily',p_daily_amount);
 perform pg_advisory_xact_lock(hashtextextended('savings:'||v_uid::text,0));
 select * into v_previous from app_private.savings_operations where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.signature<>v_signature then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.savings_state()||jsonb_build_object('receipt',v_previous.receipt,'replayed',true);
 end if;
 v_now:=clock_timestamp();
 if p_action='open' then
  if p_term_days is null or p_term_days not in (3,5,7) or p_daily_amount is null or p_daily_amount not between 10 and 5000 then raise exception 'INVALID_SAVINGS_PLAN';end if;
  if exists(select 1 from public.shell_savings where user_id=v_uid and closed_at is null) then raise exception 'SAVINGS_ALREADY_OPEN';end if;
 else
  select * into v_account from public.shell_savings where id=p_account_id and user_id=v_uid for update;
  if not found then raise exception 'SAVINGS_NOT_FOUND';end if;
  if v_account.closed_at is not null then raise exception 'SAVINGS_CLOSED';end if;
 end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 -- Re-read time after any wallet lock wait, including at exact deadlines.
 v_now:=clock_timestamp();
 if p_action<>'open' then
  v_status:=app_private.savings_payload(v_account,v_now)->>'status';
  if p_action='deposit' and v_status<>'due' then
   if v_status='missed' then raise exception 'SAVINGS_MISSED';else raise exception 'SAVINGS_NOT_DUE';end if;
  end if;
 end if;
 if p_action='open' then
  if v_gold<p_daily_amount then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.shell_savings(user_id,term_days,daily_amount,started_at,relic_bonus_percent) values(v_uid,p_term_days,p_daily_amount,v_now,least(50,greatest(0,app_private.relic_bonus('savings_interest_bonus_percent')))::integer) returning * into v_account;
  update public.player_wallets set gold=gold-p_daily_amount,updated_at=v_now where user_id=v_uid;
 elsif p_action='deposit' then
  if v_gold<v_account.daily_amount then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.shell_savings set paid_count=paid_count+1 where id=v_account.id returning * into v_account;
  update public.player_wallets set gold=gold-v_account.daily_amount,updated_at=v_now where user_id=v_uid;
 else
  v_kind:=case v_status when 'matured' then 'matured' when 'missed' then 'missed' else 'cancelled' end;
  if v_kind='matured' then v_bonus:=(v_account.daily_amount*v_account.paid_count*(case v_account.term_days when 3 then 20 when 5 then 25 else 30 end))/100;v_bonus:=v_bonus+(v_bonus*v_account.relic_bonus_percent)/100;end if;
  v_payout:=v_account.daily_amount*v_account.paid_count+v_bonus;
  if v_gold::bigint+v_payout>1000000000 then raise exception 'GOLD_LIMIT';end if;
  update public.player_wallets set gold=gold+v_payout,updated_at=v_now where user_id=v_uid;
  update public.shell_savings set closed_at=v_now,close_kind=v_kind,payout=v_payout where id=v_account.id returning * into v_account;
 end if;
 v_receipt:=jsonb_build_object('action',p_action,'accountId',v_account.id,'paidCount',v_account.paid_count,'payout',v_payout,'bonus',v_bonus,'closeKind',v_kind);
 insert into app_private.savings_operations(user_id,operation_id,account_id,signature,receipt) values(v_uid,p_operation_id,v_account.id,v_signature,v_receipt);
 return app_private.savings_state()||jsonb_build_object('receipt',v_receipt,'replayed',false);
end;
$function$
;
CREATE OR REPLACE FUNCTION app_private.savings_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_now timestamptz:=clock_timestamp();v_account jsonb;v_history jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select app_private.savings_payload(a,v_now) into v_account from public.shell_savings a where a.user_id=v_uid and a.closed_at is null;
 select coalesce(jsonb_agg(q.payload),'[]'::jsonb) into v_history from (
  select app_private.savings_payload(a,v_now) payload from public.shell_savings a
  where a.user_id=v_uid and a.closed_at is not null order by a.closed_at desc,a.id limit 5
 ) q;
 return jsonb_build_object('relicBonusPercent',least(50,greatest(0,app_private.relic_bonus('savings_interest_bonus_percent'))),'account',v_account,'history',v_history,'serverNow',v_now,
  'gold',coalesce((select gold from public.player_wallets where user_id=v_uid),0));
end;
$function$
;
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
   if p_item_id='bait' then v_price:=app_private.relic_bait_price(v_price);end if;
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
end $function$
;
commit;
