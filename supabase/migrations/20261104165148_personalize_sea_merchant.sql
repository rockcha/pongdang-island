-- Existing receipts, ledger entries and recipe snapshots are retained.
set lock_timeout='5s';
create table app_private.merchant_settings (
 id boolean primary key default true check(id),
 transition_day date not null
);
alter table app_private.merchant_settings enable row level security;
revoke all on table app_private.merchant_settings from public,anon,authenticated;
insert into app_private.merchant_settings(id,transition_day) values(true,(clock_timestamp() at time zone 'Asia/Seoul')::date);

alter table app_private.merchant_orders add column owner_id uuid references auth.users(id) on delete cascade;
alter table app_private.merchant_orders drop constraint merchant_orders_day_slot_key;
create unique index merchant_orders_shared_day_slot on app_private.merchant_orders(day,slot) where owner_id is null;
create unique index merchant_orders_personal_day_slot on app_private.merchant_orders(owner_id,day,slot) where owner_id is not null;
alter table app_private.merchant_deliveries drop constraint merchant_deliveries_order_id_key;
alter table app_private.merchant_deliveries add constraint merchant_deliveries_user_order_key unique(user_id,order_id);
-- Keep an order-leading index for the FK and historical reporting.
create index merchant_deliveries_order_id_idx on app_private.merchant_deliveries(order_id);
alter table app_private.merchant_deliveries add column nickname text not null default '섬 모험가',add column avatar_path text;
update app_private.merchant_deliveries d set nickname=coalesce(o.completed_name,'섬 모험가'),avatar_path=o.completed_avatar_path
from app_private.merchant_orders o where o.id=d.order_id;

CREATE OR REPLACE FUNCTION app_private.ensure_merchant_orders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();d date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 i integer;j integer;n integer;shape integer[];eligible integer;high_position integer;rare_count integer;qroll integer;
 k public.collectible_kind;r public.game_rarity;highest public.game_rarity;
 s public.collectible_species;items jsonb;tier text;base integer;reward integer;used text[];
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 -- Preserve the transition-day shared recipes and IDs, including already paid orders.
 if exists(select 1 from app_private.merchant_orders o where o.day=d and o.owner_id is null
  and o.day=(select transition_day from app_private.merchant_settings where id)) then return;end if;
 if exists(select 1 from app_private.merchant_orders o where o.day=d and o.owner_id=uid) then return;end if;
 perform pg_advisory_xact_lock(hashtextextended('merchant-personal:'||uid::text||':'||d::text,0));
 if exists(select 1 from app_private.merchant_orders o where o.day=d and o.owner_id=uid) then return;end if;
 insert into app_private.merchant_days(day,rules_version) values(d,9) on conflict(day) do nothing;
 used:='{}'::text[];
 for i in 1..35 loop
  shape:=app_private.merchant_order_shape(i);n:=cardinality(shape);
  select count(*)::integer into eligible from unnest(shape) quantity where quantity=1;
  qroll:=floor(random()*10000)::integer;
  highest:=app_private.merchant_order_grade(qroll);
  tier:=case highest when 'common' then 'small' when 'rare' then 'mixed' when 'epic' then 'special' else 'grand' end;
  -- Two-unit slots are always common. Rare-only orders can use every single-unit slot.
  high_position:=1+floor(random()*eligible)::integer;
  rare_count:=case when highest='rare' then 1+floor(random()*eligible)::integer else 0 end;
  items:='[]';base:=0;
  for j in 1..n loop
   r:=case when shape[j]=2 then 'common'::public.game_rarity when highest='rare' and ((j-high_position+eligible)%eligible)<rare_count then 'rare'::public.game_rarity when j=high_position then highest else 'common'::public.game_rarity end;
   qroll:=floor(random()*10000)::integer;
   k:=case when qroll<6000 then 'fish'::public.collectible_kind when qroll<8000 then 'trash'::public.collectible_kind else 'decoration'::public.collectible_kind end;
   select x.* into s from public.collectible_species x where x.rarity=r and x.kind=k and x.sell_price>0
    and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
    and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
   order by random() limit 1;
   if s.id is null then
    select x.* into s from public.collectible_species x where x.rarity=r and x.kind in ('fish','trash','decoration') and x.sell_price>0
     and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
     and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
    order by random() limit 1;
   end if;
   if s.id is null then raise exception 'MERCHANT_POOL_EMPTY';end if;
   used:=array_append(used,s.id);
   items:=items||jsonb_build_array(jsonb_build_object('speciesId',s.id,'name',s.name,'thumbnailPath',s.thumbnail_path,'kind',s.kind,'rarity',s.rarity,'quantity',shape[j],'unitGold',s.sell_price));
   base:=base+s.sell_price*shape[j];
  end loop;
  reward:=base+app_private.merchant_order_bonus(items);
  insert into app_private.merchant_orders(owner_id,day,slot,tier,region_id,items,base_gold,reward_gold) values(uid,d,i,tier,null,items,base,reward);
 end loop;
end $function$

;
CREATE OR REPLACE FUNCTION app_private.merchant_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();d date;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 loop
  perform app_private.ensure_merchant_orders();
  d:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
  exit when exists(select 1 from app_private.merchant_days m where m.day=d and exists(select 1 from app_private.merchant_orders o where o.day=d and (o.owner_id=uid or (o.owner_id is null and o.day=(select transition_day from app_private.merchant_settings where id)))));
 end loop;
 with stock as materialized (select c.species_id,count(*) n from public.player_collectibles c where c.user_id=uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null group by c.species_id)
 select jsonb_build_object('day',d,'serverNow',clock_timestamp(),'resetsAt',(d+1)::timestamp at time zone 'Asia/Seoul','dailyLimit',null,
 'deliveredToday',(select count(*) from app_private.merchant_deliveries x where x.user_id=uid and x.day=d),
 'orders',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.slot,'tier',o.tier,'regionName',r.name,
 'baseGold',o.base_gold,'rewardGold',o.reward_gold,'completed',receipt.order_id is not null,'mine',receipt.order_id is not null,
 'delivery',case when receipt.order_id is not null then jsonb_build_object('nickname',coalesce(receipt.nickname,'섬 모험가'),'avatarPath',case when profile.id is not null then profile.avatar_path else receipt.avatar_path end,'message',receipt.message,'level',case when profile.id is not null then app_private.player_level(profile.id) end,'levelProgress',case when profile.id is not null then app_private.player_level_progress(profile.id) end) end,
 'items',(select jsonb_agg(item||jsonb_build_object('owned',coalesce(stock.n,0)) order by ord) from jsonb_array_elements(o.items) with ordinality a(item,ord)
 left join stock on stock.species_id=item->>'speciesId')) order by o.slot),'[]'::jsonb)) into result
 from app_private.merchant_orders o left join public.regions r on r.id=o.region_id left join app_private.merchant_deliveries receipt on receipt.order_id=o.id and receipt.user_id=uid left join public.player_profiles profile on profile.id=receipt.user_id where o.day=d and (o.owner_id=uid or (o.owner_id is null and o.day=(select transition_day from app_private.merchant_settings where id)));
 return result;
end $function$

;
CREATE OR REPLACE FUNCTION app_private.merchant_summary(p_include_stock boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare caller uuid:=auth.uid(); d date:=(statement_timestamp() at time zone 'Asia/Seoul')::date;
 total_orders integer; ready_orders integer:=0;
begin
 if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 select count(*) into total_orders from app_private.merchant_orders o where o.day=d and (o.owner_id=caller or (o.owner_id is null and o.day=(select transition_day from app_private.merchant_settings where id)));
 if p_include_stock and total_orders>0 then
  with orders as materialized (
   select o.items from app_private.merchant_orders o where o.day=d and (o.owner_id=caller or (o.owner_id is null and o.day=(select transition_day from app_private.merchant_settings where id))) and not exists(select 1 from app_private.merchant_deliveries x where x.user_id=caller and x.order_id=o.id)
  ), stock as materialized (
   select c.species_id,count(*) n from public.player_collectibles c
   where c.user_id=caller and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null
    and c.species_id in (select item->>'speciesId' from orders o cross join lateral jsonb_array_elements(o.items) item)
   group by c.species_id
  )
  select count(*) into ready_orders from orders o
  where jsonb_array_length(o.items)>0 and not exists (
   select 1 from jsonb_array_elements(o.items) item left join stock s on s.species_id=item->>'speciesId'
   where coalesce(s.n,0)<(item->>'quantity')::integer
  );
 end if;
 return jsonb_build_object('ready',ready_orders,'total',case when total_orders=0 then 35 else total_orders end,
  'availableAt',d::timestamp at time zone 'Asia/Seoul',
  'resetsAt',(d+1)::timestamp at time zone 'Asia/Seoul');
end $function$

;
CREATE OR REPLACE FUNCTION app_private.deliver_merchant_order(p_order_id uuid, p_operation_id uuid, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();d date;o app_private.merchant_orders;prev app_private.merchant_deliveries;
 item jsonb;chosen uuid[];ids uuid[]:='{}';v_gold integer;v_message text:=btrim(coalesce(p_message,''));
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if char_length(v_message)>80 then raise exception 'MERCHANT_MESSAGE_TOO_LONG';end if;
 if p_order_id is null or p_operation_id is null then raise exception 'INVALID_MERCHANT_REQUEST';end if;
 perform app_private.get_gold_wallet();
 -- Consistent wallet -> order -> collectibles lock order; the wallet serializes competing wallet operations.
 select w.gold into v_gold from public.player_wallets w where w.user_id=uid for update;
 select * into prev from app_private.merchant_deliveries x where x.user_id=uid and x.operation_id=p_operation_id;
 if found then
  if prev.order_id<>p_order_id or prev.message<>v_message then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.merchant_state()||jsonb_build_object('replayed',true,'receipt',jsonb_build_object('orderId',prev.order_id,'gold',prev.gold));
 end if;
 if exists(select 1 from public.gold_transactions t where t.user_id=uid and t.operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into o from app_private.merchant_orders x where x.id=p_order_id and (x.owner_id is null or x.owner_id=uid) for update;
 if not found then raise exception 'MERCHANT_ORDER_NOT_FOUND';end if;
 d:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 if o.day<>d then raise exception 'MERCHANT_ORDER_EXPIRED';end if;
 if not coalesce(o.owner_id=uid or (o.owner_id is null and o.day=(select transition_day from app_private.merchant_settings where id)),false) then raise exception 'MERCHANT_ORDER_NOT_FOUND';end if;
 if exists(select 1 from app_private.merchant_deliveries x where x.user_id=uid and x.order_id=o.id) then raise exception 'MERCHANT_ORDER_TAKEN';end if;
 if v_gold::bigint+o.reward_gold>1000000000 then raise exception 'GOLD_LIMIT';end if;
 -- Lock all relevant storage rows in ID order, matching regular sales and gift sending.
 perform 1 from public.player_collectibles c where c.user_id=uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null
 and exists(select 1 from jsonb_array_elements(o.items) a where a->>'speciesId'=c.species_id) order by c.id for update;
 for item in select value from jsonb_array_elements(o.items) loop
  select array_agg(q.id order by q.id) into chosen from (select c.id from public.player_collectibles c where c.user_id=uid and c.species_id=item->>'speciesId'
   and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null order by c.id limit (item->>'quantity')::integer) q;
  if coalesce(cardinality(chosen),0)<>(item->>'quantity')::integer then raise exception 'MERCHANT_INSUFFICIENT_ITEMS';end if;
  ids:=ids||chosen;
 end loop;
 if (clock_timestamp() at time zone 'Asia/Seoul')::date<>d then raise exception 'MERCHANT_ORDER_EXPIRED';end if;
 update public.player_collectibles set sold_at=clock_timestamp() where user_id=uid and id=any(ids);
 update public.player_wallets set gold=gold+o.reward_gold,updated_at=now() where user_id=uid;
 -- The receipt is the per-player completion record; shared history stays immutable.
 insert into app_private.merchant_deliveries(user_id,operation_id,order_id,day,gold,collectible_ids,message,nickname,avatar_path)
 values(uid,p_operation_id,o.id,d,o.reward_gold,ids,v_message,
  coalesce((select p.nickname from public.player_profiles p where p.id=uid),'섬 모험가'),
  (select p.avatar_path from public.player_profiles p where p.id=uid));
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(uid,p_operation_id,'sell','merchant:'||o.id,o.reward_gold);
 return app_private.merchant_state()||jsonb_build_object('replayed',false,'receipt',jsonb_build_object('orderId',o.id,'gold',o.reward_gold));
end $function$
;
