-- Account capacity is private; purchases use the existing harbor lock and operation ledger.
create table app_private.player_harbor_capacity (
 user_id uuid primary key references auth.users(id) on delete cascade,
 dock_slots integer not null default 2 check(dock_slots between 2 and 4)
);
alter table app_private.player_harbor_capacity enable row level security;
revoke all on app_private.player_harbor_capacity from public,anon,authenticated;
alter table public.harbor_boats drop constraint harbor_boats_dock_slot_check;
alter table public.harbor_boats add constraint harbor_boats_dock_slot_check check(dock_slot between 1 and 4);

CREATE OR REPLACE FUNCTION app_private.harbor_action(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1, p_boat_id uuid DEFAULT NULL::uuid, p_slot integer DEFAULT NULL::integer, p_region_id text DEFAULT 'pongdang'::text, p_secondary_region_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.harbor_vessels;b public.harbor_boats;occupant public.harbor_boats;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;n integer;slot integer;fuel integer;capacity integer;expansion_price integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','depart','dock','store','sell','fuel','arrive','claim','claim_all','expand') then raise exception 'INVALID_HARBOR_ACTION';end if;
 if p_action in ('fuel','arrive','claim','claim_all') then return app_private.settle_legacy_harbor(p_action,p_operation_id,p_vessel_id,p_voyage_id,p_quantity);end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'voyage',p_voyage_id,'quantity',p_quantity);
 if p_boat_id is not null or p_slot is not null then sig:=sig||jsonb_build_object('boat',p_boat_id,'slot',p_slot);end if;
 if p_action='depart' and p_region_id is distinct from 'pongdang' then sig:=sig||jsonb_build_object('region',p_region_id);end if;
 if p_secondary_region_id is not null then sig:=sig||jsonb_build_object('secondaryRegion',p_secondary_region_id);end if;
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();select * into w from public.player_wallets where user_id=u for update;
 select coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=u),2) into capacity;
 if p_action='expand' then
  if capacity>=4 then raise exception 'HARBOR_FULLY_EXPANDED';end if;
  if p_slot is distinct from capacity+1 then raise exception 'HARBOR_EXPANSION_CHANGED';end if;
  expansion_price:=case capacity when 2 then 10000 else 20000 end;
  if w.gold<expansion_price then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into app_private.player_harbor_capacity(user_id,dock_slots) values(u,capacity+1)
   on conflict(user_id) do update set dock_slots=excluded.dock_slots;
  update public.player_wallets set gold=gold-expansion_price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
   values(u,p_operation_id,'buy','harbor-dock:'||(capacity+1)::text,-expansion_price);
  receipt:=jsonb_build_object('action','expand','dockSlots',capacity+1,'gold',expansion_price);
 elsif p_action='buy' then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
  select count(*) into n from public.harbor_boats where user_id=u and vessel_id=v.id and sold_at is null;
  if n>=2 then raise exception 'VESSEL_OWNERSHIP_LIMIT';end if;
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  select s into slot from generate_series(1,capacity) s where not exists(select 1 from public.harbor_boats where user_id=u and dock_slot=s) order by s limit 1;
  insert into public.harbor_boats(user_id,vessel_id,instance_no,dock_slot) values(u,v.id,(select s from generate_series(1,2) s where not exists(select 1 from public.harbor_boats hb where hb.user_id=u and hb.vessel_id=v.id and hb.instance_no=s and hb.sold_at is null) order by s limit 1),slot) returning * into b;
  insert into public.player_harbor_vessels(user_id,vessel_id) values(u,v.id) on conflict do nothing;
  update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','harbor-vessel:'||v.id,-v.price);
  receipt:=jsonb_build_object('action','buy','vesselId',v.id,'boatId',b.id);
 else
  if p_boat_id is not null then select * into b from public.harbor_boats where id=p_boat_id and user_id=u and sold_at is null;
  elsif p_action='depart' then
   select * into b from public.harbor_boats b0 where b0.user_id=u and b0.vessel_id=p_vessel_id and b0.dock_slot is not null
    order by exists(select 1 from public.harbor_voyages t where t.boat_id=b0.id and t.claimed_at is null),b0.dock_slot limit 1;
  end if;
  if b.id is null then raise exception 'VESSEL_NOT_OWNED';end if;
  if p_vessel_id is not null and p_vessel_id<>b.vessel_id then raise exception 'INVALID_BOAT';end if;
  if exists(select 1 from public.harbor_voyages where boat_id=b.id and claimed_at is null) then raise exception 'VOYAGE_ACTIVE';end if;
  if p_action='sell' then
   select * into strict v from public.harbor_vessels where id=b.vessel_id;
   n:=v.price/2;
   if w.gold::bigint+n>1000000000 then raise exception 'GOLD_LIMIT';end if;
   update public.harbor_boats set sold_at=clock_timestamp(),dock_slot=null where id=b.id;
   update public.player_wallets set gold=gold+n,updated_at=now() where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell','harbor-boat:'||b.id,n);
   receipt:=jsonb_build_object('action','sell','vesselId',v.id,'boatId',b.id,'gold',n);
  elsif p_action='dock' then
   if p_slot is null or p_slot not between 1 and capacity then raise exception 'INVALID_DOCK_SLOT';end if;
   if b.dock_slot is not null and b.dock_slot<>p_slot then raise exception 'BOAT_ALREADY_DOCKED';end if;
   select * into occupant from public.harbor_boats where user_id=u and dock_slot=p_slot and id<>b.id;
   if occupant.id is not null then
    if exists(select 1 from public.harbor_voyages where boat_id=occupant.id and claimed_at is null) then raise exception 'DOCK_RESERVED';end if;
    update public.harbor_boats set dock_slot=null where id=occupant.id;
   end if;
   update public.harbor_boats set dock_slot=p_slot where id=b.id;
   receipt:=jsonb_build_object('action','dock','boatId',b.id,'slot',p_slot);
  elsif p_action='store' then
   update public.harbor_boats set dock_slot=null where id=b.id;
   receipt:=jsonb_build_object('action','store','boatId',b.id);
  else
   if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
   if exists(select 1 from public.regions r where r.id=p_region_id and r.requires_map_fragment
    and not exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) then raise exception 'REGION_LOCKED';end if;
   if b.dock_slot is null or b.dock_slot>capacity then raise exception 'DOCK_REQUIRED';end if;
   select * into strict v from public.harbor_vessels where id=b.vessel_id;
   if coalesce((v.catch_rule->>'region_count')::integer,1)=2 then
    if p_secondary_region_id is null or p_secondary_region_id=p_region_id then raise exception 'SECOND_REGION_REQUIRED';end if;
    if not exists(select 1 from public.regions where id=p_secondary_region_id) then raise exception 'REGION_NOT_FOUND';end if;
    if exists(select 1 from public.regions r where r.id=p_secondary_region_id and r.requires_map_fragment
     and not exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) then raise exception 'REGION_LOCKED';end if;
   elsif p_secondary_region_id is not null then raise exception 'SECOND_REGION_NOT_ALLOWED';end if;
   fuel:=coalesce((w.inventory->>'fuel')::integer,0);
   if fuel<v.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
   update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel-v.fuel_cost)),updated_at=now() where user_id=u;
   insert into public.harbor_voyages(user_id,vessel_id,boat_id,region_id,vessel_snapshot,returns_at) values(u,v.id,b.id,p_region_id,to_jsonb(v)||case when p_secondary_region_id is not null then jsonb_build_object('secondary_region_id',p_secondary_region_id,'secondary_region_name',(select name from public.regions where id=p_secondary_region_id)) else '{}'::jsonb end||jsonb_build_object('fishing_count',v.fishing_count+floor(random()*(coalesce(v.fishing_count_max,v.fishing_count)-v.fishing_count+1))::integer),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into trip;
   receipt:=jsonb_build_object('action','depart','voyageId',trip.id,'vesselId',v.id,'boatId',b.id);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.harbor_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w jsonb;capacity integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 select coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=u),2) into capacity;
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),'fuelPrice',57,'fuelDailyLimit',5,'fuelPurchasedToday',coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((clock_timestamp() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0),'dockSlots',capacity,'nextDockExpansion',case when capacity<4 then jsonb_build_object('slot',capacity+1,'price',case capacity when 2 then 10000 else 20000 end) else null end,
 'regions',(select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'unlocked',not r.requires_map_fragment or exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) order by r.sort_order) from public.regions r),
 'vessels',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',o.n>0,'ownedCount',o.n) order by v.sort_order)
  from public.harbor_vessels v cross join lateral(select count(*)::integer n from public.harbor_boats b where b.user_id=u and b.vessel_id=v.id and b.sold_at is null)o),'[]'::jsonb),
 'boats',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('id',b.id,'vessel_id',b.vessel_id,'instance_no',b.instance_no,'dock_slot',b.dock_slot,'owned',true) order by b.purchased_at,b.id)
  from public.harbor_boats b join public.harbor_vessels v on v.id=b.vessel_id where b.user_id=u and b.sold_at is null),'[]'::jsonb),
 'voyages',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('region_name',(select name from public.regions where id=v.region_id)) order by v.departed_at) from public.harbor_voyages v where v.user_id=u and v.claimed_at is null),'[]'::jsonb));
end $function$;
