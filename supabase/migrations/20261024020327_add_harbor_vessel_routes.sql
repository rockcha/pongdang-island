begin;
set local lock_timeout='5s';
-- Keep existing snapshots and eight-argument callers; the new final argument defaults to NULL.
drop function public.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text);
drop function app_private.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text);
CREATE OR REPLACE FUNCTION app_private.harbor_action(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1, p_boat_id uuid DEFAULT NULL::uuid, p_slot integer DEFAULT NULL::integer, p_region_id text DEFAULT 'pongdang'::text, p_secondary_region_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.harbor_vessels;b public.harbor_boats;occupant public.harbor_boats;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;n integer;slot integer;fuel integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','depart','dock','store','sell','fuel','arrive','claim','claim_all') then raise exception 'INVALID_HARBOR_ACTION';end if;
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
 if p_action='buy' then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
  select count(*) into n from public.harbor_boats where user_id=u and vessel_id=v.id and sold_at is null;
  if n>=2 then raise exception 'VESSEL_OWNERSHIP_LIMIT';end if;
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  select s into slot from generate_series(1,2) s where not exists(select 1 from public.harbor_boats where user_id=u and dock_slot=s) order by s limit 1;
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
   if p_slot is null or p_slot not between 1 and 2 then raise exception 'INVALID_DOCK_SLOT';end if;
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
   if b.dock_slot is null then raise exception 'DOCK_REQUIRED';end if;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.harbor_action(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1, p_boat_id uuid DEFAULT NULL::uuid, p_slot integer DEFAULT NULL::integer, p_region_id text DEFAULT 'pongdang'::text, p_secondary_region_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$select app_private.harbor_action(p_action,p_operation_id,p_vessel_id,p_voyage_id,p_quantity,p_boat_id,p_slot,p_region_id,p_secondary_region_id)$function$
;
revoke all on function app_private.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text) from public,anon;
grant execute on function app_private.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text) to authenticated;
revoke all on function public.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text) from public,anon;
grant execute on function public.harbor_action(text,uuid,text,uuid,integer,uuid,integer,text,text) to authenticated;
CREATE OR REPLACE FUNCTION app_private.settle_legacy_harbor(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.harbor_vessels;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;fuel integer;cost integer;sid text;item uuid;i integer;purchase_at timestamptz;
 results jsonb:='[]'::jsonb;items jsonb;failed integer;attempts integer;claimed integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','fuel','depart','arrive','claim','claim_all') then raise exception 'INVALID_HARBOR_ACTION';end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'voyage',p_voyage_id,'quantity',p_quantity);
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 fuel:=coalesce((w.inventory->>'fuel')::integer,0);purchase_at:=clock_timestamp();
 if p_action in ('buy','depart') then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
 end if;
 if p_action='buy' then
  if exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_ALREADY_OWNED';end if;
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.player_harbor_vessels(user_id,vessel_id) values(u,v.id);
  update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','harbor-vessel:'||v.id,-v.price);
  receipt:=jsonb_build_object('action','buy','vesselId',v.id);
 elsif p_action='fuel' then
  if p_quantity is null or p_quantity<1 or p_quantity>5 or fuel>100000-p_quantity then raise exception 'INVALID_QUANTITY';end if;
  if coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op
   where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((purchase_at at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0)+p_quantity>5 then raise exception 'FUEL_DAILY_LIMIT';end if;
  cost:=p_quantity*57;
  if w.gold<cost then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.player_wallets set gold=gold-cost,inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel+p_quantity)),updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','fuel:'||p_quantity,-cost);
  receipt:=jsonb_build_object('action','fuel','quantity',p_quantity);
 elsif p_action='depart' then
  if not exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_NOT_OWNED';end if;
  if exists(select 1 from public.harbor_voyages where user_id=u and vessel_id=v.id and claimed_at is null) then raise exception 'VOYAGE_ACTIVE';end if;
  if fuel<v.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel-v.fuel_cost)),updated_at=now() where user_id=u;
  insert into public.harbor_voyages(user_id,vessel_id,vessel_snapshot,returns_at)
   values(u,v.id,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into trip;
  receipt:=jsonb_build_object('action','depart','voyageId',trip.id,'vesselId',v.id);
 elsif p_action='arrive' then
  select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u for update;
  if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
  if trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  update public.harbor_voyages set arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()) where id=trip.id;
  receipt:=jsonb_build_object('action','arrive','voyageId',trip.id);
 else
  if p_action='claim' then
   select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u;
   if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
   if trip.claimed_at is not null then
    receipt:=jsonb_build_object('action','claim','results',jsonb_build_array(trip.result));
   elsif trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  end if;
  if receipt is null then
   for trip in select * from public.harbor_voyages where user_id=u and claimed_at is null and returns_at<=clock_timestamp()
    and (p_action='claim_all' or id=p_voyage_id) order by id for update loop
    items:='[]'::jsonb;failed:=0;attempts:=(trip.vessel_snapshot->>'fishing_count')::integer;
    for i in 1..attempts loop
     sid:=app_private.harbor_draw(case when trip.vessel_snapshot->>'secondary_region_id' is not null and i>attempts/2 then trip.vessel_snapshot->>'secondary_region_id' else trip.region_id end,trip.vessel_snapshot->'catch_rule');
     if sid is not null then
      insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
      insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
      items:=items||jsonb_build_array(jsonb_build_object('id',item,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=item and evidence.user_id=u),false),'species',app_private.species_payload(sid,null),'bonus',false));
     else failed:=failed+1;end if;
    end loop;
    update public.harbor_voyages set claimed_at=clock_timestamp(),arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()),
     result=jsonb_build_object('voyageId',trip.id,'regionId',trip.region_id,'regionName',(select name from public.regions where id=trip.region_id)||case when trip.vessel_snapshot->>'secondary_region_id' is not null then ' · '||(trip.vessel_snapshot->>'secondary_region_name') else '' end,'vesselName',trip.vessel_snapshot->>'name','items',items,'attempted',attempts,'failed',failed,'succeeded',jsonb_array_length(items)) where id=trip.id returning result into receipt;
    results:=results||jsonb_build_array(receipt);claimed:=claimed+1;
   end loop;
   receipt:=jsonb_build_object('action',p_action,'results',results,'claimed',claimed);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt,created_at) values(u,p_operation_id,sig,receipt,purchase_at);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
alter table public.harbor_vessels add constraint harbor_vessels_region_count_check check (
 coalesce((catch_rule->>'region_count')::integer,1) in (1,2)
 and (coalesce((catch_rule->>'region_count')::integer,1)=1 or (fishing_count%2=0 and fishing_count_max is null))
);
notify pgrst,'reload schema';
commit;
