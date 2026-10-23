begin;
-- Wallet locking and operation receipts serialize sales and deduplicate retries.
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
 if p_action is null or p_action not in('buy','sell','start','claim','discard') or p_operation_id is null or p_facility is null or p_quantity is null or p_quantity not between 1 and 100 or (p_action<>'buy' and p_quantity<>1) then raise exception 'INVALID_PRODUCTION';end if;
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
  if p_action='sell' then
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   v_cost:=f.price/2;
   if w.gold::bigint+v_cost>1000000000 then raise exception 'GOLD_LIMIT';end if;
   delete from app_private.bait_production_sites where id=s.id and user_id=u;
   update public.player_wallets set gold=gold+v_cost,updated_at=v_now where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell','bait-production:'||f.id,v_cost);
   receipt:=jsonb_build_object('action','sell','facility',f.id,'siteId',s.id,'gold',v_cost,'count',1);
  elsif p_action='start' then
   if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if app_private.bait_production_active_count()>=4 then raise exception 'PRODUCTION_ACTIVE_LIMIT';end if;
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
  if p_action<>'sell' then
   receipt:=jsonb_build_object('action',p_action,'siteId',s.id,'count',case when p_action='claim' then s.run_output else 0 end);
  end if;
 end if;
 insert into app_private.bait_production_operations values(u,p_operation_id,sig,receipt);
 return app_private.bait_production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
notify pgrst,'reload schema';
commit;
