-- Retire old boats from NEW departures without deleting ownership or old snapshots.
update public.fishing_vessels set duration_minutes=10,min_baits=1,max_baits=30,
 bonus_count=0,bonus_basic_count=0,failure_reduction_bp=0,bonus_kind='basic',
 bonus_description='미끼 1개당 10분 · 최대 30개' where id='dinghy';

-- Keep the old settlement engine for already-departed boats and their bonuses.
alter function app_private.expedition_action(text,uuid,text,text,jsonb,uuid) rename to settle_legacy_expedition;
revoke all on function app_private.settle_legacy_expedition(text,uuid,text,text,jsonb,uuid) from public,anon,authenticated;

create function app_private.expedition_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_region_id text default null,p_cargo jsonb default null,p_expedition_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r jsonb;c record;total integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action='buy' then raise exception 'VESSEL_RETIRED';end if;
 if p_action='depart' then
  if p_vessel_id is distinct from 'dinghy' then raise exception 'VESSEL_RETIRED';end if;
  if p_cargo is null or jsonb_typeof(p_cargo)<>'object' then raise exception 'INVALID_CARGO';end if;
  for c in select value from jsonb_each_text(p_cargo) loop
   if c.value !~ '^[1-9][0-9]{0,2}$' then raise exception 'INVALID_CARGO';end if;
   total:=total+c.value::integer;
  end loop;
  if total<1 or total>30 then raise exception 'CARGO_LIMIT';end if;
 end if;
 r:=app_private.settle_legacy_expedition(p_action,p_operation_id,p_vessel_id,p_region_id,p_cargo,p_expedition_id);
 if p_action='depart' and not (r->>'replayed')::boolean then
  update public.fishing_expeditions set returns_at=departed_at+make_interval(mins=>total*10),
   vessel_snapshot=jsonb_set(vessel_snapshot,'{duration_minutes}',to_jsonb(total*10))
   where id=(r->'receipt'->>'expeditionId')::uuid and user_id=u;
  r:=app_private.expedition_state()||jsonb_build_object('receipt',r->'receipt','replayed',false);
 end if;
 return r;
end $$;
revoke all on function app_private.expedition_action(text,uuid,text,text,jsonb,uuid) from public,anon;
grant execute on function app_private.expedition_action(text,uuid,text,text,jsonb,uuid) to authenticated;
create or replace function public.expedition_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_region_id text default null,p_cargo jsonb default null,p_expedition_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select app_private.expedition_action(p_action,p_operation_id,p_vessel_id,p_region_id,p_cargo,p_expedition_id)$$;

create or replace function app_private.expedition_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',clock_timestamp(),'testEnabled',(select instant_return_enabled from app_private.expedition_settings where id),
 'vessels',(select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',true)) from public.fishing_vessels v where id='dinghy'),
 'active',(select (to_jsonb(e)-'result')||jsonb_build_object('boosts',app_private.expedition_boosts_payload(e.id)) from public.fishing_expeditions e where user_id=u and claimed_at is null),
 'history',coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('boosts',app_private.expedition_boosts_payload(h.id)) order by departed_at desc) from (select * from public.fishing_expeditions where user_id=u and claimed_at is not null order by departed_at desc limit 5) h),'[]'::jsonb),
 'baits',(select jsonb_agg(to_jsonb(b) order by sort_order) from public.fishing_baits b));
end $$;

create table public.harbor_vessels(
 id text primary key,name text not null,price integer not null check(price>=0),
 duration_minutes integer not null check(duration_minutes between 1 and 10080),
 fuel_cost integer not null check(fuel_cost between 1 and 100),
 fishing_count integer not null check(fishing_count between 1 and 100),
 sprite_path text not null,sort_order integer not null
);
insert into public.harbor_vessels values
 ('fishing-raft','낚시용 뗏목',300,30,1,2,'/port/fishing-raft-sprite.png',1),
 ('neoul-boat','너울 낚싯배',900,120,2,5,'/port/neoul-boat-sprite.png',2);
create table public.player_harbor_vessels(
 user_id uuid not null references auth.users(id) on delete cascade,
 vessel_id text not null references public.harbor_vessels(id),purchased_at timestamptz not null default now(),
 primary key(user_id,vessel_id)
);
create index player_harbor_vessels_vessel_idx on public.player_harbor_vessels(vessel_id);
create table public.harbor_voyages(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 vessel_id text not null references public.harbor_vessels(id),
 vessel_snapshot jsonb not null check(jsonb_typeof(vessel_snapshot)='object'),
 departed_at timestamptz not null default clock_timestamp(),returns_at timestamptz not null,
 arrival_seen_at timestamptz,claimed_at timestamptz,result jsonb,
 check(returns_at>departed_at),check(claimed_at is null or claimed_at>=returns_at)
);
create unique index harbor_one_voyage_per_vessel on public.harbor_voyages(user_id,vessel_id) where claimed_at is null;
create index harbor_voyages_vessel_idx on public.harbor_voyages(vessel_id);
create index harbor_voyages_owner_idx on public.harbor_voyages(user_id,departed_at desc);
create index harbor_voyages_ready_idx on public.harbor_voyages(user_id,returns_at) where claimed_at is null;
create table app_private.harbor_operations(
 user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,
 signature jsonb not null,receipt jsonb not null,created_at timestamptz not null default now(),primary key(user_id,operation_id)
);
alter table public.harbor_vessels enable row level security;
alter table public.player_harbor_vessels enable row level security;
alter table public.harbor_voyages enable row level security;
alter table app_private.harbor_operations enable row level security;
revoke all on public.harbor_vessels,public.player_harbor_vessels,public.harbor_voyages from public,anon,authenticated;
revoke all on app_private.harbor_operations from public,anon,authenticated;
grant select on public.harbor_vessels,public.player_harbor_vessels,public.harbor_voyages to authenticated;
create policy harbor_catalog_read on public.harbor_vessels for select to authenticated using(true);
create policy harbor_owned_read on public.player_harbor_vessels for select to authenticated using(user_id=(select auth.uid()));
create policy harbor_voyages_read on public.harbor_voyages for select to authenticated using(user_id=(select auth.uid()));

create function app_private.harbor_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),'fuelPrice',50,
 'vessels',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',exists(select 1 from public.player_harbor_vessels o where o.user_id=u and o.vessel_id=v.id)) order by v.sort_order) from public.harbor_vessels v),'[]'::jsonb),
 'voyages',coalesce((select jsonb_agg(to_jsonb(v) order by v.departed_at) from public.harbor_voyages v where user_id=u and claimed_at is null),'[]'::jsonb));
end $$;

create function app_private.harbor_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_voyage_id uuid default null,p_quantity integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v public.harbor_vessels;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;fuel integer;cost integer;sid text;item uuid;i integer;
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
 fuel:=coalesce((w.inventory->>'fuel')::integer,0);
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
  if p_quantity is null or p_quantity<1 or p_quantity>100 or fuel>100000-p_quantity then raise exception 'INVALID_QUANTITY';end if;
  cost:=p_quantity*50;
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
     sid:=app_private.expedition_pick('pongdang','bait',false,false);
     if sid is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
     if random()<app_private.expedition_success_chance_bp('bait',0)::numeric/10000 then
      insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
      insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
      items:=items||jsonb_build_array(jsonb_build_object('id',item,'species',app_private.species_payload(sid,null),'bonus',false));
     else failed:=failed+1;end if;
    end loop;
    update public.harbor_voyages set claimed_at=clock_timestamp(),arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()),
     result=jsonb_build_object('voyageId',trip.id,'vesselName',trip.vessel_snapshot->>'name','items',items,'attempted',attempts,'failed',failed,'succeeded',jsonb_array_length(items)) where id=trip.id returning result into receipt;
    results:=results||jsonb_build_array(receipt);claimed:=claimed+1;
   end loop;
   receipt:=jsonb_build_object('action',p_action,'results',results,'claimed',claimed);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;

create function public.harbor_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.harbor_state()$$;
create function public.harbor_action(p_action text,p_operation_id uuid,p_vessel_id text default null,p_voyage_id uuid default null,p_quantity integer default 1)
returns jsonb language sql security invoker set search_path='' as $$select app_private.harbor_action(p_action,p_operation_id,p_vessel_id,p_voyage_id,p_quantity)$$;
revoke all on function public.harbor_state(),public.harbor_action(text,uuid,text,uuid,integer),app_private.harbor_state(),app_private.harbor_action(text,uuid,text,uuid,integer) from public,anon;
grant execute on function public.harbor_state(),public.harbor_action(text,uuid,text,uuid,integer),app_private.harbor_state(),app_private.harbor_action(text,uuid,text,uuid,integer) to authenticated;
