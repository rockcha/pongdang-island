begin;
create table public.bait_production_facilities (
 id text primary key,name text not null,description text not null,bait_id text not null references public.fishing_baits(id),
 price integer not null check(price>0),fuel_cost integer not null check(fuel_cost>0),output_count integer not null check(output_count>0),
 production_minutes integer not null check(production_minutes>0),storage_minutes integer not null check(storage_minutes>0),enabled boolean not null default true
);
alter table public.bait_production_facilities enable row level security;
grant select on public.bait_production_facilities to authenticated;
create policy bait_production_catalog_read on public.bait_production_facilities for select to authenticated using(true);
revoke insert,update,delete on public.bait_production_facilities from anon,authenticated;
create table app_private.bait_production_sites (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 facility_id text not null references public.bait_production_facilities(id),purchased_at timestamptz not null default clock_timestamp(),
 started_at timestamptz,completes_at timestamptz,expires_at timestamptz,run_output integer,run_bait_id text references public.fishing_baits(id),
 check ((started_at is null and completes_at is null and expires_at is null and run_output is null and run_bait_id is null)
 or (started_at is not null and completes_at is not null and expires_at is not null and run_output is not null and completes_at>started_at and expires_at>completes_at and run_output>0 and run_bait_id is not null))
);
create index bait_production_sites_user on app_private.bait_production_sites(user_id,purchased_at,id);
alter table app_private.bait_production_sites enable row level security;
create table app_private.bait_production_operations (
 user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,signature jsonb not null,receipt jsonb not null,
 primary key(user_id,operation_id)
);
alter table app_private.bait_production_operations enable row level security;
revoke all on app_private.bait_production_sites,app_private.bait_production_operations from anon,authenticated;

create function app_private.bait_production_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 select jsonb_build_object('serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('baitName',b.name,'image_path',b.image_path,'ownedCount',(select count(*) from app_private.bait_production_sites s where s.user_id=u and s.facility_id=f.id)) order by f.price,f.id),'[]'::jsonb) from public.bait_production_facilities f join public.fishing_baits b on b.id=f.bait_id where f.enabled),
 'sites',(select coalesce(jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'baitName',b.name,'image_path',b.image_path,'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by s.purchased_at,s.id),'[]'::jsonb) from app_private.bait_production_sites s join public.bait_production_facilities f on f.id=s.facility_id join public.fishing_baits b on b.id=f.bait_id where s.user_id=u)) into r from public.player_wallets w where user_id=u;
 return r;
end $$;
create function app_private.bait_production_action(p_action text,p_operation_id uuid,p_facility text,p_quantity integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
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
   if (select count(*) from app_private.bait_production_sites where user_id=u and completes_at>v_now)>=4 then raise exception 'BAIT_PRODUCTION_ACTIVE_LIMIT';end if;
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
end $$;
create function public.bait_production_state() returns jsonb language sql set search_path='' as $$select app_private.bait_production_state()$$;
create function public.bait_production_action(p_action text,p_operation_id uuid,p_facility text,p_quantity integer default 1) returns jsonb language sql set search_path='' as $$select app_private.bait_production_action(p_action,p_operation_id,p_facility,p_quantity)$$;
revoke all on function app_private.bait_production_state(),app_private.bait_production_action(text,uuid,text,integer),public.bait_production_state(),public.bait_production_action(text,uuid,text,integer) from public,anon;
grant execute on function app_private.bait_production_state(),app_private.bait_production_action(text,uuid,text,integer),public.bait_production_state(),public.bait_production_action(text,uuid,text,integer) to authenticated;
commit;
