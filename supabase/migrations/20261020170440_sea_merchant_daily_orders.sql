begin;

create table app_private.merchant_days (
 day date primary key,
 created_at timestamptz not null default clock_timestamp()
);
create table app_private.merchant_orders (
 id uuid primary key default gen_random_uuid(),
 day date not null references app_private.merchant_days(day),
 slot integer not null check(slot between 1 and 30),
 tier text not null check(tier in ('small','mixed','special','grand')),
 region_id text references public.regions(id),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 2 and 3),
 base_gold integer not null check(base_gold>0),
 reward_gold integer not null check(reward_gold>base_gold),
 completed_by uuid references auth.users(id) on delete set null,
 completed_at timestamptz,
 unique(day,slot)
);
create table app_private.merchant_deliveries (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 order_id uuid not null unique references app_private.merchant_orders(id),
 day date not null,
 gold integer not null check(gold>0),
 collectible_ids uuid[] not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
create index merchant_daily_limit on app_private.merchant_deliveries(user_id,day);
create index merchant_storage_candidates on public.player_collectibles(user_id,species_id,id)
 where sold_at is null and escrow_gift_id is null and tank_id is null;
alter table app_private.merchant_days enable row level security;
alter table app_private.merchant_orders enable row level security;
alter table app_private.merchant_deliveries enable row level security;
revoke all on app_private.merchant_days,app_private.merchant_orders,app_private.merchant_deliveries from public,anon,authenticated;

-- Lazily publish one complete shared board per Korean day. No client can supply a date or seed.
create function app_private.ensure_merchant_orders() returns void
language plpgsql security definer set search_path='' as $$
declare
 d date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
 i integer;j integer;k text;r public.game_rarity;region text;local_order boolean;
 kinds text[];grades public.game_rarity[];quantities integer[];used text[]:='{}';
 s public.collectible_species;items jsonb;tier text;rate integer;base integer;reward integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('merchant-day:'||d::text,0));
 if exists(select 1 from app_private.merchant_days m where m.day=d) then return;end if;
 insert into app_private.merchant_days(day) values(d);
 for i in 1..30 loop
  local_order:=random()<0.7;
  select x.id into region from public.regions x where exists(select 1 from public.collectible_species s0 where s0.native_region_id=x.id and s0.kind='fish' and s0.rarity='common') order by random() limit 1;
  if not local_order then region:=null;end if;
  if i<=12 then
   tier:='small';rate:=15000;kinds:=array['fish',case when i<=6 then 'trash' else 'decoration' end];
   grades:=array['common','common']::public.game_rarity[];quantities:=array[3+floor(random()*3)::integer,case when i<=6 then 1+floor(random()*3)::integer else 2 end];
  elsif i<=23 then
   tier:='mixed';rate:=14000;kinds:=array['fish',case when random()<0.7 then 'fish' else 'decoration' end,case when random()<0.5 then 'trash' else 'decoration' end];
   grades:=array['common','rare','common']::public.game_rarity[];quantities:=array[2+floor(random()*3)::integer,1,2];
  elsif i<=29 then
   tier:='special';rate:=12500;kinds:=array['fish',case when random()<0.8 then 'fish' else 'decoration' end,case when random()<0.5 then 'trash' else 'decoration' end];
   grades:=array['common','epic','common']::public.game_rarity[];quantities:=array[3,1,2];
  else
   tier:='grand';rate:=13000;kinds:=array['fish','decoration','fish'];
   grades:=array['epic','rare','rare']::public.game_rarity[];quantities:=array[1,2,2];
  end if;
  items:='[]';base:=0;
  for j in 1..cardinality(kinds) loop
   k:=kinds[j];r:=grades[j];
   select x.* into s from public.collectible_species x
   where x.kind=k::public.collectible_kind and x.rarity=r and x.sell_price>0
    and (select count(*) from unnest(used) u(id) where u.id=x.id)<2
    and not exists(select 1 from jsonb_array_elements(items) t where t->>'speciesId'=x.id)
   order by case when local_order and (x.native_region_id=region or x.native_region_id is null) then 0 else 1 end,random() limit 1;
   if s.id is null then raise exception 'MERCHANT_POOL_EMPTY';end if;
   used:=array_append(used,s.id);
   items:=items||jsonb_build_array(jsonb_build_object('speciesId',s.id,'name',s.name,'thumbnailPath',s.thumbnail_path,'kind',s.kind,'rarity',s.rarity,'quantity',quantities[j],'unitGold',s.sell_price));
   base:=base+s.sell_price*quantities[j];
  end loop;
  reward:=greatest(base+case when tier='small' then 80 else 1 end,round(base::numeric*rate/10000)::integer);
  insert into app_private.merchant_orders(day,slot,tier,region_id,items,base_gold,reward_gold) values(d,i,tier,region,items,base,reward);
 end loop;
end $$;

create function app_private.merchant_state() returns jsonb
language plpgsql security definer set search_path='' as $$
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
 'items',(select jsonb_agg(item||jsonb_build_object('owned',coalesce(stock.n,0)) order by ord) from jsonb_array_elements(o.items) with ordinality a(item,ord)
 left join stock on stock.species_id=item->>'speciesId')) order by o.slot),'[]'::jsonb)) into result
 from app_private.merchant_orders o left join public.regions r on r.id=o.region_id where o.day=d;
 return result;
end $$;

create function app_private.deliver_merchant_order(p_order_id uuid,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();d date;o app_private.merchant_orders;prev app_private.merchant_deliveries;
 item jsonb;chosen uuid[];ids uuid[]:='{}';v_gold integer;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_order_id is null or p_operation_id is null then raise exception 'INVALID_MERCHANT_REQUEST';end if;
 perform app_private.get_gold_wallet();
 -- Consistent wallet -> order -> collectibles lock order; the wallet serializes the daily cap.
 select w.gold into v_gold from public.player_wallets w where w.user_id=uid for update;
 select * into prev from app_private.merchant_deliveries x where x.user_id=uid and x.operation_id=p_operation_id;
 if found then
  if prev.order_id<>p_order_id then raise exception 'OPERATION_CONFLICT';end if;
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
 update app_private.merchant_orders set completed_by=uid,completed_at=clock_timestamp() where id=o.id;
 insert into app_private.merchant_deliveries(user_id,operation_id,order_id,day,gold,collectible_ids) values(uid,p_operation_id,o.id,d,o.reward_gold,ids);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(uid,p_operation_id,'sell','merchant:'||o.id,o.reward_gold);
 return app_private.merchant_state()||jsonb_build_object('replayed',false,'receipt',jsonb_build_object('orderId',o.id,'gold',o.reward_gold));
end $$;

create function public.merchant_state() returns jsonb language sql set search_path='' as $$select app_private.merchant_state()$$;
create function public.deliver_merchant_order(p_order_id uuid,p_operation_id uuid) returns jsonb language sql set search_path='' as $$select app_private.deliver_merchant_order(p_order_id,p_operation_id)$$;
revoke all on function app_private.ensure_merchant_orders() from public,anon,authenticated;
revoke all on function app_private.merchant_state(),app_private.deliver_merchant_order(uuid,uuid),public.merchant_state(),public.deliver_merchant_order(uuid,uuid) from public,anon,authenticated;
grant execute on function app_private.merchant_state(),app_private.deliver_merchant_order(uuid,uuid),public.merchant_state(),public.deliver_merchant_order(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
