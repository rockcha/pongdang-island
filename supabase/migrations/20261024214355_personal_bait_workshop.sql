create table app_private.personal_bait_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 bait_id text not null references public.fishing_baits(id),
 bait_name text not null,
 image_path text not null,
 quantity integer not null check(quantity between 1 and 100),
 production_minutes integer not null check(production_minutes between 30 and 720 and production_minutes%30=0),
 unit_value integer not null check(unit_value>0),
 fuel_cost integer not null check(fuel_cost>0),
 started_at timestamptz not null,
 completes_at timestamptz not null,
 claimed_at timestamptz,
 check(completes_at=started_at+make_interval(mins=>production_minutes)),
 check(claimed_at is null or claimed_at>=completes_at)
);
-- Uncollected output occupies the workshop too; there is no expiry or silent loss.
create unique index personal_bait_one_open_job on app_private.personal_bait_jobs(user_id) where claimed_at is null;
create index personal_bait_jobs_owner on app_private.personal_bait_jobs(user_id);
create table app_private.personal_bait_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 signature jsonb not null,
 receipt jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
alter table app_private.personal_bait_jobs enable row level security;
alter table app_private.personal_bait_operations enable row level security;
revoke all on app_private.personal_bait_jobs,app_private.personal_bait_operations from public,anon,authenticated;

create function app_private.personal_bait_workshop_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),
  'limits',jsonb_build_object('maxQuantity',100,'minMinutes',30,'maxMinutes',720,'stepMinutes',30,'maxActive',1),
  'baits',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'imagePath',b.image_path,
   'unitValue',case when b.id='bait' then 50 else b.price end,'owned',coalesce((w->'inventory'->>b.id)::integer,0)) order by b.sort_order,b.id)
   from public.fishing_baits b where b.price>0),'[]'::jsonb),
  'job',(select jsonb_build_object('id',j.id,'baitId',j.bait_id,'baitName',j.bait_name,'imagePath',j.image_path,
   'quantity',j.quantity,'minutes',j.production_minutes,'unitValue',j.unit_value,'fuelCost',j.fuel_cost,
   'startedAt',j.started_at,'completesAt',j.completes_at)
   from app_private.personal_bait_jobs j where j.user_id=u and j.claimed_at is null));
end $$;
create function public.personal_bait_workshop_state()
returns jsonb language sql security invoker set search_path='' as $$select app_private.personal_bait_workshop_state();$$;

create function app_private.personal_bait_workshop_action(
 p_action text,p_operation_id uuid,p_bait_id text default null,p_quantity integer default null,
 p_minutes integer default null,p_job_id uuid default null,p_expected_fuel integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
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
  -- Exact rational interpolation: 50 at step 1, 70 at step 24. Round only the final fuel cost.
  cost:=ceil(p_quantity::numeric*unit_value*23/(1150+20*(p_minutes/30-1)))::integer;
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
end $$;
create function public.personal_bait_workshop_action(
 p_action text,p_operation_id uuid,p_bait_id text default null,p_quantity integer default null,
 p_minutes integer default null,p_job_id uuid default null,p_expected_fuel integer default null)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.personal_bait_workshop_action(p_action,p_operation_id,p_bait_id,p_quantity,p_minutes,p_job_id,p_expected_fuel);
$$;
revoke all on function app_private.personal_bait_workshop_state(),public.personal_bait_workshop_state(),
 app_private.personal_bait_workshop_action(text,uuid,text,integer,integer,uuid,integer),public.personal_bait_workshop_action(text,uuid,text,integer,integer,uuid,integer) from public,anon;
grant execute on function app_private.personal_bait_workshop_state(),public.personal_bait_workshop_state(),
 app_private.personal_bait_workshop_action(text,uuid,text,integer,integer,uuid,integer),public.personal_bait_workshop_action(text,uuid,text,integer,integer,uuid,integer) to authenticated;
notify pgrst,'reload schema';
