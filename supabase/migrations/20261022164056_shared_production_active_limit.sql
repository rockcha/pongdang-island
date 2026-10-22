-- Shared fuel and bait concurrency cap. Wallet locking serializes starts in both paths.
begin;
create function app_private.production_active_count() returns integer language sql security definer set search_path='' as $$
 select ((select count(*) from app_private.production_sites where user_id=auth.uid() and completes_at>clock_timestamp())+(select count(*) from app_private.bait_production_sites where user_id=auth.uid() and completes_at>clock_timestamp()))::integer
$$;
revoke all on function app_private.production_active_count() from public,anon;
grant execute on function app_private.production_active_count() to authenticated;
CREATE OR REPLACE FUNCTION app_private.production_apply(p_action text, p_operation_id uuid, p_facility text, p_materials jsonb, p_return_state boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;f public.production_facilities;s app_private.production_sites;
 prev app_private.production_operations;sig jsonb;receipt jsonb;ids uuid[];n integer;v_now timestamptz;fuel bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','sell','start','claim','discard') or p_facility is null then raise exception 'INVALID_PRODUCTION';end if;
 if p_materials is null or jsonb_typeof(p_materials)<>'object' then raise exception 'INVALID_MATERIALS';end if;
 if p_action<>'start' and p_materials<>'{}'::jsonb then raise exception 'INVALID_MATERIALS';end if;
 sig:=jsonb_build_object('action',p_action,'facility',p_facility,'materials',p_materials);
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return (case when p_return_state then app_private.production_state() else '{}'::jsonb end)||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 if p_action='buy' then
  select * into f from public.production_facilities where id=p_facility for share;
  if not found then raise exception 'PRODUCTION_NOT_FOUND';end if;
  if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
 if w.gold<f.price then raise exception 'INSUFFICIENT_GOLD';end if;
  v_now:=clock_timestamp();
  insert into app_private.production_sites(user_id,facility_id) values(u,f.id) returning * into s;
  update public.player_wallets set gold=gold-f.price,updated_at=v_now where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','production:'||f.id,-f.price);
  receipt:=jsonb_build_object('action','buy','facility',f.id,'siteId',s.id,'count',1);
 else
  s:=app_private.production_site(p_facility);
  select * into s from app_private.production_sites where id=s.id and user_id=u for update;
  select * into f from public.production_facilities where id=s.facility_id for share;
  v_now:=clock_timestamp();
  if p_action='sell' then
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if w.gold::bigint+(f.price/2)>1000000000 then raise exception 'GOLD_LIMIT';end if;
   delete from app_private.production_sites where id=s.id and user_id=u;
   update public.player_wallets set gold=gold+(f.price/2),updated_at=v_now where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
    values(u,p_operation_id,'sell','production:'||f.id,f.price/2);
   receipt:=jsonb_build_object('action','sell','facility',f.id,'siteId',s.id,'gold',f.price/2,'count',1);
  elsif p_action='start' then
   if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if app_private.production_active_count()>=4 then raise exception 'PRODUCTION_ACTIVE_LIMIT';end if;
   if (select count(*) from jsonb_each(p_materials)) not between 1 and 100 then raise exception 'INVALID_MATERIALS';end if;
   if exists(select 1 from jsonb_each(p_materials) e where jsonb_typeof(e.value)<>'number' or e.value::text !~ '^[1-9][0-9]{0,2}$') then raise exception 'INVALID_MATERIALS';end if;
   if (select sum(value::integer) from jsonb_each_text(p_materials))<>f.input_count then raise exception 'INVALID_MATERIAL_COUNT';end if;
   select array_agg(p.id order by p.id) into ids from jsonb_each_text(p_materials) e
   cross join lateral(select c.id from public.player_collectibles c join public.collectible_species cs on cs.id=c.species_id
    where c.user_id=u and c.species_id=e.key and cs.kind::text=f.kind and c.sold_at is null and c.consumed_at is null
    and c.tank_id is null and c.escrow_gift_id is null order by c.id limit e.value::integer)p;
   if coalesce(cardinality(ids),0)<>f.input_count then raise exception 'INSUFFICIENT_MATERIALS';end if;
   perform 1 from public.player_collectibles where user_id=u and id=any(ids) order by id for update;
   select count(*) into n from public.player_collectibles c join public.collectible_species cs on cs.id=c.species_id
    where c.user_id=u and c.id=any(ids) and cs.kind::text=f.kind and c.sold_at is null and c.consumed_at is null and c.tank_id is null and c.escrow_gift_id is null;
   if n<>f.input_count then raise exception 'INSUFFICIENT_MATERIALS';end if;
   v_now:=clock_timestamp();
   update public.player_collectibles set sold_at=v_now,consumed_at=v_now where user_id=u and id=any(ids);
   update app_private.production_sites set started_at=v_now,completes_at=v_now+make_interval(mins=>f.production_minutes),
    expires_at=v_now+make_interval(mins=>f.production_minutes+f.storage_minutes),run_output=f.output_count where user_id=u and id=s.id;
   receipt:=jsonb_build_object('action','start','facility',f.id,'siteId',s.id,'consumedIds',ids);
  else
   if s.started_at is null then raise exception 'PRODUCTION_IDLE';end if;
   if p_action='claim' then
    if v_now<s.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
    if v_now>=s.expires_at then raise exception 'PRODUCTION_EXPIRED';end if;
    fuel:=coalesce((w.inventory->>'fuel')::bigint,0)+s.run_output;
    if fuel>1000000000 then raise exception 'FUEL_LIMIT';end if;
    update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel::integer)),updated_at=v_now where user_id=u;
   elsif v_now<s.expires_at then raise exception 'PRODUCTION_NOT_EXPIRED';end if;
   receipt:=jsonb_build_object('action',p_action,'facility',f.id,'siteId',s.id,'fuel',case when p_action='claim' then s.run_output else 0 end);
   update app_private.production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null where user_id=u and id=s.id;
  end if;
 end if;
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return (case when p_return_state then app_private.production_state() else '{}'::jsonb end)||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.bait_production_action(p_action text, p_operation_id uuid, p_facility text, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;f public.bait_production_facilities;s app_private.bait_production_sites;prev app_private.bait_production_operations;
 sig jsonb;receipt jsonb;v_now timestamptz;v_count bigint;v_cost bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in('buy','start','claim','discard') or p_operation_id is null or p_facility is null or p_quantity is null or p_quantity not between 1 and 100 or (p_action<>'buy' and p_quantity<>1) then raise exception 'INVALID_PRODUCTION';end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 sig:=jsonb_build_object('action',p_action,'facility',p_facility,'quantity',p_quantity);
 select * into prev from app_private.bait_production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.bait_production_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 v_now:=clock_timestamp();
 if p_action='buy' then
  select * into f from public.bait_production_facilities where id=p_facility for share;
  if not found or not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
  v_cost:=f.price::bigint*p_quantity;
  if w.gold<v_cost then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into app_private.bait_production_sites(user_id,facility_id) select u,f.id from generate_series(1,p_quantity);
  update public.player_wallets set gold=gold-v_cost,updated_at=v_now where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','bait-production:'||f.id,-v_cost);
  receipt:=jsonb_build_object('action','buy','count',p_quantity);
 else
  select * into s from app_private.bait_production_sites where id=p_facility::uuid and user_id=u for update;
  if not found then raise exception 'PRODUCTION_NOT_OWNED';end if;
  select * into f from public.bait_production_facilities where id=s.facility_id for share;
  if p_action='start' then
   if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if app_private.production_active_count()>=4 then raise exception 'PRODUCTION_ACTIVE_LIMIT';end if;
   if coalesce((w.inventory->>'fuel')::bigint,0)<f.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
   update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb((inventory->>'fuel')::integer-f.fuel_cost)),updated_at=v_now where user_id=u;
   update app_private.bait_production_sites set started_at=v_now,completes_at=v_now+make_interval(mins=>f.production_minutes),expires_at=v_now+make_interval(mins=>f.production_minutes+f.storage_minutes),run_output=f.output_count,run_bait_id=f.bait_id where id=s.id;
  else
   if s.started_at is null then raise exception 'PRODUCTION_IDLE';end if;
   if p_action='claim' then
    if v_now<s.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
    if v_now>=s.expires_at then raise exception 'PRODUCTION_EXPIRED';end if;
    v_count:=coalesce((w.inventory->>s.run_bait_id)::bigint,0)+s.run_output;
    if v_count>1000000000 then raise exception 'BAIT_LIMIT';end if;
    update public.player_wallets set inventory=jsonb_set(inventory,array[s.run_bait_id],to_jsonb(v_count::integer)),updated_at=v_now where user_id=u;
   elsif v_now<s.expires_at then raise exception 'PRODUCTION_NOT_EXPIRED';end if;
   update app_private.bait_production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null,run_bait_id=null where id=s.id;
  end if;
  receipt:=jsonb_build_object('action',p_action,'siteId',s.id,'count',case when p_action='claim' then s.run_output else 0 end);
 end if;
 insert into app_private.bait_production_operations values(u,p_operation_id,sig,receipt);
 return app_private.bait_production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.production_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 with owned as materialized(select * from app_private.production_sites where user_id=u),
 first_site as(select distinct on(facility_id) * from owned order by facility_id,purchased_at,id),
 totals as(select facility_id,count(*) n from owned group by facility_id)
 select jsonb_build_object('activeTotal',app_private.production_active_count(),'serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('owned',s.id is not null,'ownedCount',coalesce(t.n,0),
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by f.price,f.id)
 from public.production_facilities f left join first_site s on s.facility_id=f.id left join totals t on t.facility_id=f.id
 where f.enabled or s.id is not null),'[]'::jsonb),
 'sites',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'owned',true,
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output)
 order by f.price,f.id,s.purchased_at,s.id) from owned s join public.production_facilities f on f.id=s.facility_id),'[]'::jsonb))
 into result from public.player_wallets w where w.user_id=u;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.bait_production_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();r jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 select jsonb_build_object('activeTotal',app_private.production_active_count(),'serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('baitName',b.name,'image_path',b.image_path,'ownedCount',(select count(*) from app_private.bait_production_sites s where s.user_id=u and s.facility_id=f.id)) order by f.price,f.id),'[]'::jsonb) from public.bait_production_facilities f join public.fishing_baits b on b.id=f.bait_id where f.enabled),
 'sites',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'baitName',b.name,'image_path',b.image_path,'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by s.purchased_at,s.id),'[]'::jsonb) from app_private.bait_production_sites s join public.bait_production_facilities f on f.id=s.facility_id join public.fishing_baits b on b.id=f.bait_id where s.user_id=u)) into r from public.player_wallets w where user_id=u;
 return r;
end $function$
;
notify pgrst, 'reload schema';
commit;
