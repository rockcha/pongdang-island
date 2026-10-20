begin;
alter table app_private.merchant_days add column rules_version integer not null default 1;
alter table app_private.merchant_orders drop constraint merchant_orders_items_check;
alter table app_private.merchant_orders add constraint merchant_orders_items_check check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 4);
alter table app_private.merchant_orders add column completed_name text;
alter table app_private.merchant_orders add column completed_avatar_path text;
alter table app_private.merchant_orders add column completed_message text not null default '' check(char_length(completed_message)<=80);
alter table app_private.merchant_deliveries add column message text not null default '' check(char_length(message)<=80);
update app_private.merchant_orders o set completed_name=p.nickname,completed_avatar_path=p.avatar_path from public.player_profiles p where o.completed_at is not null and p.id=o.completed_by;

-- Draw the highest grade once per order, not independently for every item.
create function app_private.merchant_recipe(p_size_roll integer,p_grade_roll integer) returns jsonb
language plpgsql immutable set search_path='' as $$
declare n integer;grade text;
begin
 if p_size_roll is null or p_grade_roll is null or p_size_roll not between 0 and 9999 or p_grade_roll not between 0 and 9999 then raise exception 'INVALID_MERCHANT_ROLL';end if;
 n:=case when p_size_roll<3000 then 1 when p_size_roll<8000 then 2 when p_size_roll<9700 then 3 else 4 end;
 grade:=case when p_grade_roll<7600 then 'common' when p_grade_roll<9600 then 'rare' when p_grade_roll<9970 then 'epic' else 'mythic' end;
 return jsonb_build_object('count',n,'rarity',grade,'rate',case n when 1 then 28000 when 2 then 30000 when 3 then 30000 else 32000 end);
end $$;
revoke all on function app_private.merchant_recipe(integer,integer) from public,anon,authenticated;

create or replace function app_private.ensure_merchant_orders() returns void
language plpgsql security definer set search_path='' as $$
declare d date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 i integer;j integer;n integer;high_position integer;qroll integer;quantity integer;
 k public.collectible_kind;r public.game_rarity;highest public.game_rarity;region text;local_order boolean;
 recipe jsonb;s public.collectible_species;items jsonb;tier text;rate integer;base integer;reward integer;used text[];
begin
 perform pg_advisory_xact_lock(hashtextextended('merchant-day:'||d::text,0));
 if exists(select 1 from app_private.merchant_days m where m.day=d and m.rules_version=2) then return;end if;
 insert into app_private.merchant_days(day,rules_version) values(d,2) on conflict(day) do update set rules_version=2;
 -- Replace only unfinished old-rule orders. Fresh IDs invalidate old confirmation dialogs safely.
 delete from app_private.merchant_orders where day=d and completed_at is null;
 select coalesce(array_agg(a->>'speciesId'),'{}'::text[]) into used from app_private.merchant_orders o cross join lateral jsonb_array_elements(o.items)a where o.day=d;
 for i in 1..30 loop
  if exists(select 1 from app_private.merchant_orders o where o.day=d and o.slot=i) then continue;end if;
  recipe:=app_private.merchant_recipe(floor(random()*10000)::integer,floor(random()*10000)::integer);
  n:=(recipe->>'count')::integer;highest:=(recipe->>'rarity')::public.game_rarity;rate:=(recipe->>'rate')::integer;
  tier:=case highest when 'common' then 'small' when 'rare' then 'mixed' when 'epic' then 'special' else 'grand' end;
  high_position:=1+floor(random()*n)::integer;local_order:=random()<0.7;
  select x.id into region from public.regions x where exists(select 1 from public.collectible_species s0 where s0.native_region_id=x.id and s0.kind='fish' and s0.rarity='common') order by random() limit 1;
  if not local_order then region:=null;end if;
  items:='[]';base:=0;
  for j in 1..n loop
   r:=case when j=high_position then highest else 'common'::public.game_rarity end;
   qroll:=floor(random()*10000)::integer;
   quantity:=case r when 'common' then case when qroll<3500 then 1 when qroll<8500 then 2 when qroll<9700 then 3 else 4 end when 'rare' then case when qroll<8500 then 1 else 2 end else 1 end;
   qroll:=floor(random()*10000)::integer;
   k:=case when qroll<6000 then 'fish'::public.collectible_kind when qroll<8000 then 'trash'::public.collectible_kind else 'decoration'::public.collectible_kind end;
   select x.* into s from public.collectible_species x where x.rarity=r and x.kind=k and x.sell_price>0
    and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
    and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
   order by case when local_order and (x.native_region_id=region or x.native_region_id is null) then 0 else 1 end,random() limit 1;
   if s.id is null then
    select x.* into s from public.collectible_species x where x.rarity=r and x.kind in ('fish','trash','decoration') and x.sell_price>0
     and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
     and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
    order by case when local_order and (x.native_region_id=region or x.native_region_id is null) then 0 else 1 end,random() limit 1;
   end if;
   if s.id is null then raise exception 'MERCHANT_POOL_EMPTY';end if;
   used:=array_append(used,s.id);
   items:=items||jsonb_build_array(jsonb_build_object('speciesId',s.id,'name',s.name,'thumbnailPath',s.thumbnail_path,'kind',s.kind,'rarity',s.rarity,'quantity',quantity,'unitGold',s.sell_price));
   base:=base+s.sell_price*quantity;
  end loop;
  reward:=greatest(base+1,round(base::numeric*rate/10000)::integer);
  insert into app_private.merchant_orders(day,slot,tier,region_id,items,base_gold,reward_gold) values(d,i,tier,region,items,base,reward);
 end loop;
end $$;

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
  exit when exists(select 1 from app_private.merchant_days m where m.day=d);
 end loop;
 with stock as materialized (select c.species_id,count(*) n from public.player_collectibles c where c.user_id=uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null group by c.species_id)
 select jsonb_build_object('day',d,'serverNow',clock_timestamp(),'resetsAt',(d+1)::timestamp at time zone 'Asia/Seoul','dailyLimit',3,
 'deliveredToday',(select count(*) from app_private.merchant_deliveries x where x.user_id=uid and x.day=d),
 'orders',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.slot,'tier',o.tier,'regionName',r.name,
 'baseGold',o.base_gold,'rewardGold',o.reward_gold,'completed',o.completed_at is not null,'mine',coalesce(o.completed_by=uid,false),
 'delivery',case when o.completed_at is not null then jsonb_build_object('nickname',coalesce(o.completed_name,'섬 모험가'),'avatarPath',o.completed_avatar_path,'message',o.completed_message) end,
 'items',(select jsonb_agg(item||jsonb_build_object('owned',coalesce(stock.n,0)) order by ord) from jsonb_array_elements(o.items) with ordinality a(item,ord)
 left join stock on stock.species_id=item->>'speciesId')) order by o.slot),'[]'::jsonb)) into result
 from app_private.merchant_orders o left join public.regions r on r.id=o.region_id where o.day=d;
 return result;
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
 -- Consistent wallet -> order -> collectibles lock order; the wallet serializes the daily cap.
 select w.gold into v_gold from public.player_wallets w where w.user_id=uid for update;
 select * into prev from app_private.merchant_deliveries x where x.user_id=uid and x.operation_id=p_operation_id;
 if found then
  if prev.order_id<>p_order_id or prev.message<>v_message then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.merchant_state()||jsonb_build_object('replayed',true,'receipt',jsonb_build_object('orderId',prev.order_id,'gold',prev.gold));
 end if;
 if exists(select 1 from public.gold_transactions t where t.user_id=uid and t.operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into o from app_private.merchant_orders x where x.id=p_order_id for update;
 if not found then raise exception 'MERCHANT_ORDER_NOT_FOUND';end if;
 d:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 if o.day<>d then raise exception 'MERCHANT_ORDER_EXPIRED';end if;
 if o.completed_at is not null then raise exception 'MERCHANT_ORDER_TAKEN';end if;
 if (select count(*) from app_private.merchant_deliveries x where x.user_id=uid and x.day=d)>=3 then raise exception 'MERCHANT_DAILY_LIMIT';end if;
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
 update app_private.merchant_orders set completed_by=uid,completed_at=clock_timestamp(),completed_name=coalesce((select p.nickname from public.player_profiles p where p.id=uid),'섬 모험가'),completed_avatar_path=(select p.avatar_path from public.player_profiles p where p.id=uid),completed_message=v_message where id=o.id;
 insert into app_private.merchant_deliveries(user_id,operation_id,order_id,day,gold,collectible_ids,message) values(uid,p_operation_id,o.id,d,o.reward_gold,ids,v_message);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(uid,p_operation_id,'sell','merchant:'||o.id,o.reward_gold);
 return app_private.merchant_state()||jsonb_build_object('replayed',false,'receipt',jsonb_build_object('orderId',o.id,'gold',o.reward_gold));
end $function$
;

create or replace function app_private.deliver_merchant_order(p_order_id uuid,p_operation_id uuid) returns jsonb language sql security definer set search_path='' as $$select app_private.deliver_merchant_order(p_order_id,p_operation_id,'')$$;
create function public.deliver_merchant_order(p_order_id uuid,p_operation_id uuid,p_message text) returns jsonb language sql set search_path='' as $$select app_private.deliver_merchant_order(p_order_id,p_operation_id,p_message)$$;
revoke all on function app_private.deliver_merchant_order(uuid,uuid,text),public.deliver_merchant_order(uuid,uuid,text) from public,anon,authenticated;
grant execute on function app_private.deliver_merchant_order(uuid,uuid,text),public.deliver_merchant_order(uuid,uuid,text) to authenticated;
-- Preserve completed orders and receipts, but upgrade today's unfinished board atomically.
select app_private.ensure_merchant_orders();
notify pgrst,'reload schema';
commit;
