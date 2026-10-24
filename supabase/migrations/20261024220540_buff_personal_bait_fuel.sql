-- New starts only: existing job snapshots and operation receipts stay unchanged.
CREATE OR REPLACE FUNCTION app_private.personal_bait_workshop_action(p_action text, p_operation_id uuid, p_bait_id text DEFAULT NULL::text, p_quantity integer DEFAULT NULL::integer, p_minutes integer DEFAULT NULL::integer, p_job_id uuid DEFAULT NULL::uuid, p_expected_fuel integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;b public.fishing_baits;j app_private.personal_bait_jobs;
 previous app_private.personal_bait_operations;sig jsonb;receipt jsonb;unit_value integer;cost integer;stock bigint;v_now timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('start','claim') then raise exception 'INVALID_WORKSHOP_ACTION';end if;
 sig:=jsonb_build_object('action',p_action,'bait',p_bait_id,'quantity',p_quantity,'minutes',p_minutes,'job',p_job_id,'expectedFuel',p_expected_fuel);
 perform app_private.get_gold_wallet();
 -- Shares the wallet lock with all other fuel spenders and reward claims.
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from app_private.personal_bait_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.personal_bait_workshop_state()||jsonb_build_object('receipt',previous.receipt,'replayed',true);
 end if;
 v_now:=clock_timestamp();
 if p_action='start' then
  if p_quantity is null or p_quantity not between 1 and 100 then raise exception 'INVALID_WORKSHOP_QUANTITY';end if;
  if p_minutes is null or p_minutes not between 30 and 720 or p_minutes%30<>0 then raise exception 'INVALID_WORKSHOP_TIME';end if;
  if p_job_id is not null then raise exception 'INVALID_WORKSHOP_ACTION';end if;
  select * into b from public.fishing_baits where id=p_bait_id and price>0 for share;
  if not found then raise exception 'BAIT_NOT_AVAILABLE';end if;
  if exists(select 1 from app_private.personal_bait_jobs where user_id=u and claimed_at is null) then raise exception 'PERSONAL_PRODUCTION_BUSY';end if;
  unit_value:=case when b.id='bait' then 50 else b.price end;
  -- 20% less fuel before rounding; preserve the existing linear time bonus.
  cost:=ceil(p_quantity::numeric*unit_value*92/(5750+100*(p_minutes/30-1)))::integer;
  if p_expected_fuel is distinct from cost then raise exception 'FUEL_QUOTE_CHANGED';end if;
  if coalesce((w.inventory->>'fuel')::bigint,0)<cost then raise exception 'INSUFFICIENT_FUEL';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb((inventory->>'fuel')::integer-cost)),updated_at=v_now where user_id=u;
  insert into app_private.personal_bait_jobs(user_id,bait_id,bait_name,image_path,quantity,production_minutes,unit_value,fuel_cost,started_at,completes_at)
   values(u,b.id,b.name,b.image_path,p_quantity,p_minutes,unit_value,cost,v_now,v_now+make_interval(mins=>p_minutes)) returning * into j;
  receipt:=jsonb_build_object('action','start','jobId',j.id,'baitId',b.id,'baitName',b.name,'quantity',j.quantity,'fuelCost',cost,'minutes',p_minutes);
 else
  if p_job_id is null or p_bait_id is not null or p_quantity is not null or p_minutes is not null or p_expected_fuel is not null then raise exception 'INVALID_WORKSHOP_ACTION';end if;
  select * into j from app_private.personal_bait_jobs where id=p_job_id and user_id=u for update;
  if not found or j.claimed_at is not null then raise exception 'WORKSHOP_JOB_NOT_FOUND';end if;
  if v_now<j.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
  stock:=coalesce((w.inventory->>j.bait_id)::bigint,0)+j.quantity;
  if stock>1000000000 then raise exception 'BAIT_LIMIT';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,array[j.bait_id],to_jsonb(stock::integer)),updated_at=v_now where user_id=u;
  update app_private.personal_bait_jobs set claimed_at=v_now where id=j.id;
  receipt:=jsonb_build_object('action','claim','jobId',j.id,'baitId',j.bait_id,'baitName',j.bait_name,'quantity',j.quantity,'fuelCost',j.fuel_cost,'minutes',j.production_minutes);
 end if;
 insert into app_private.personal_bait_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.personal_bait_workshop_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
notify pgrst,'reload schema';
