-- Snapshot first discovery from the existing acquisition evidence, preserving retries.
begin;
CREATE OR REPLACE FUNCTION app_private.finish_fishing(p_operation_id uuid, p_won boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_won is null then raise exception 'INVALID_RESULT';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id for update;
 if not found then raise exception 'CAST_NOT_FOUND';end if;
 if p.finished_at is not null then return p.result||jsonb_build_object('replayed',true);end if;
 if p_won and clock_timestamp()<p.created_at+make_interval(secs=>p.wait_seconds::double precision+3) then raise exception 'CAST_TOO_EARLY';end if;
 v_success:=p_won and p.eligible and clock_timestamp()<=p.expires_at;
 if v_success then
  if p.map_region_id is not null then
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,map_region_id) values(v_uid,p.species_id,p.map_region_id) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,p.species_id) on conflict do nothing;
 end if;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=v_item and evidence.user_id=v_uid),false)),
 'replayed',false,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.settle_legacy_expedition(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_region_id text DEFAULT NULL::text, p_cargo jsonb DEFAULT NULL::jsonb, p_expedition_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.fishing_vessels;e public.fishing_expeditions;w public.player_wallets;
 sig jsonb;prev app_private.expedition_operations;receipt jsonb;cargo record;total integer:=0;count integer;sid text;bid text;
 bonus integer;bonus_bait text;draws text[]:=array[]::text[];i integer;item uuid;results jsonb:='[]';refunds jsonb:='{}';local_discovery boolean;failed integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('buy','depart','claim','instant') or p_operation_id is null then raise exception 'INVALID_EXPEDITION';end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'region',p_region_id,'cargo',p_cargo,'expedition',p_expedition_id);
 perform pg_advisory_xact_lock(hashtextextended('expedition:'||u::text,0));
 select * into prev from app_private.expedition_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.expedition_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 if p_action in ('buy','depart') then
  select * into v from public.fishing_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
 end if;
 if p_action='buy' then
  if v.price>0 and not exists(select 1 from public.player_fishing_vessels where user_id=u and vessel_id=v.id) then
   if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
   update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
   insert into public.player_fishing_vessels(user_id,vessel_id) values(u,v.id);
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','vessel:'||v.id,-v.price);
  end if;
  receipt:=jsonb_build_object('action','buy','vesselId',v.id);
 elsif p_action='depart' then
  if v.price>0 and not exists(select 1 from public.player_fishing_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_NOT_OWNED';end if;
  if exists(select 1 from public.fishing_expeditions where user_id=u and claimed_at is null) then raise exception 'EXPEDITION_ACTIVE';end if;
  if not exists(select 1 from public.regions r where r.id=p_region_id and (not r.requires_map_fragment or exists(select 1 from public.player_map_fragments f where f.user_id=u and f.region_id=r.id))) then raise exception 'REGION_LOCKED';end if;
  if p_cargo is null or jsonb_typeof(p_cargo)<>'object' then raise exception 'INVALID_CARGO';end if;
  for cargo in select key,value from jsonb_each_text(p_cargo) loop
   if not exists(select 1 from public.fishing_baits where id=cargo.key) or cargo.value !~ '^[1-9][0-9]{0,2}$' then raise exception 'INVALID_CARGO';end if;
   count:=cargo.value::integer;total:=total+count;
   if coalesce((w.inventory->>cargo.key)::integer,0)<count then raise exception 'NO_BAIT';end if;
   w.inventory:=jsonb_set(w.inventory,array[cargo.key],to_jsonb((w.inventory->>cargo.key)::integer-count));
  end loop;
  if total<v.min_baits or total>v.max_baits then raise exception 'CARGO_LIMIT';end if;
  update public.player_wallets set inventory=w.inventory,updated_at=now() where user_id=u;
  insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at)
   values(u,v.id,p_region_id,p_cargo,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into e;
  receipt:=jsonb_build_object('action','depart','expeditionId',e.id);
 else
  perform app_private.notify_due_expeditions(p_expedition_id);
  select * into e from public.fishing_expeditions where id=p_expedition_id and user_id=u for update;
  if not found then raise exception 'EXPEDITION_NOT_FOUND';end if;
  if e.claimed_at is not null then
   receipt:=jsonb_build_object('action','claim','expeditionId',e.id,'result',e.result);
  elsif p_action='instant' then
   if not coalesce((select instant_return_enabled from app_private.expedition_settings where id),false) then raise exception 'TEST_DISABLED';end if;
   update public.fishing_expeditions set returns_at=least(returns_at,clock_timestamp()) where id=e.id;
   receipt:=jsonb_build_object('action','instant','expeditionId',e.id);
  else
   if clock_timestamp()<e.returns_at then raise exception 'EXPEDITION_NOT_READY';end if;
   v:=jsonb_populate_record(null::public.fishing_vessels,e.vessel_snapshot);
   for cargo in select key,value from jsonb_each_text(e.cargo) loop
    count:=cargo.value::integer;total:=total+count;
    for i in 1..count loop draws:=array_append(draws,cargo.key);end loop;
   end loop;
   bonus:=case when v.bonus_kind='per_ten' then least(total/10,v.bonus_count) else v.bonus_count end;
   bonus_bait:=case v.bonus_kind when 'special' then 'bait_special' when 'magnet' then 'bait_magnet' when 'candy' then 'bait_forbidden_star' when 'discovery' then 'bait_first_greeting' when 'epic' then 'bait_epic' else 'bait' end;
   if v.bonus_kind='copy' then
    select d into bonus_bait from unnest(draws) d where d not in ('bait_first_greeting','bait_epic','bait_magnet') order by random() limit 1;
    bonus_bait:=coalesce(bonus_bait,'bait');
   end if;
   for i in 1..bonus loop draws:=array_append(draws,bonus_bait);end loop;
   -- Snapshots from older departures have null for newly introduced fields.
   for i in 1..coalesce(v.bonus_basic_count,0) loop draws:=array_append(draws,'bait');end loop;
   for i in 1..cardinality(draws) loop
    bid:=draws[i];local_discovery:=i>total and v.bonus_kind='discovery';
    sid:=app_private.expedition_pick(e.region_id,bid,v.bonus_kind='native',local_discovery);
    if sid is null and local_discovery then bid:='bait_special';sid:=app_private.expedition_pick(e.region_id,bid,false,false);end if;
    if sid is null and bid='bait_first_greeting' and i<=total then
     refunds:=jsonb_set(refunds,array[bid],to_jsonb(coalesce((refunds->>bid)::integer,0)+1));
     w.inventory:=jsonb_set(w.inventory,array[bid],to_jsonb(coalesce((w.inventory->>bid)::integer,0)+1));
    elsif sid is not null and random()>=app_private.expedition_success_chance_bp(bid,v.failure_reduction_bp)::numeric/10000 then
     failed:=failed+1;
    else
     if sid is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
     insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
     insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
     results:=results||jsonb_build_array(jsonb_build_object('id',item,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=item and evidence.user_id=u),false),'species',app_private.species_payload(sid,null),'bonus',i>total,'baitId',bid));
    end if;
   end loop;
   receipt:=jsonb_build_object('action','claim','expeditionId',e.id,'result',jsonb_build_object('items',results,'refunds',refunds,'failed',failed,'attempted',cardinality(draws),'succeeded',jsonb_array_length(results)));
   update public.player_wallets set inventory=w.inventory,updated_at=now() where user_id=u;
   update public.fishing_expeditions set claimed_at=clock_timestamp(),result=receipt->'result' where id=e.id;
  end if;
 end if;
 insert into app_private.expedition_operations values(u,p_operation_id,sig,receipt);
 return app_private.expedition_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
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
  cost:=p_quantity*60;
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
     -- Same draw and success rules as a normal-bait expedition, no bait inventory debit.
     sid:=app_private.expedition_pick(trip.region_id,coalesce(trip.vessel_snapshot->>'catch_bait_id','bait'),coalesce((trip.vessel_snapshot->>'native_bonus')::boolean,false),false);
     if sid is null then
      if coalesce(trip.vessel_snapshot->>'catch_bait_id','bait')='bait_first_greeting' then failed:=failed+1;continue;end if;
      raise exception 'NO_COLLECTIBLE_FOR_REGION';
     end if;
     if random()<app_private.expedition_success_chance_bp(coalesce(trip.vessel_snapshot->>'catch_bait_id','bait'),0)::numeric/10000 then
      insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
      insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
      items:=items||jsonb_build_array(jsonb_build_object('id',item,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=item and evidence.user_id=u),false),'species',app_private.species_payload(sid,null),'bonus',false));
     else failed:=failed+1;end if;
    end loop;
    update public.harbor_voyages set claimed_at=clock_timestamp(),arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()),
     result=jsonb_build_object('voyageId',trip.id,'regionId',trip.region_id,'regionName',(select name from public.regions where id=trip.region_id),'vesselName',trip.vessel_snapshot->>'name','items',items,'attempted',attempts,'failed',failed,'succeeded',jsonb_array_length(items)) where id=trip.id returning result into receipt;
    results:=results||jsonb_build_array(receipt);claimed:=claimed+1;
   end loop;
   receipt:=jsonb_build_object('action',p_action,'results',results,'claimed',claimed);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt,created_at) values(u,p_operation_id,sig,receipt,purchase_at);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
notify pgrst,'reload schema';
commit;
