begin;
create table public.production_facilities(
 id text primary key,name text not null,description text not null,kind text not null check(kind in ('trash','fish')),
 price integer not null check(price between 1 and 1000000),input_count integer not null check(input_count between 1 and 100),
 output_count integer not null check(output_count between 1 and 1000),production_minutes integer not null check(production_minutes between 1 and 10080),
 storage_minutes integer not null check(storage_minutes between 1 and 10080),image_path text not null,enabled boolean not null default true
);
alter table public.production_facilities enable row level security;
revoke all on public.production_facilities from public,anon,authenticated;
grant select on public.production_facilities to authenticated;
create policy production_facilities_read on public.production_facilities for select to authenticated using(true);

create table app_private.production_sites(
 user_id uuid not null references auth.users(id) on delete cascade,
 facility_id text not null references public.production_facilities(id),purchased_at timestamptz not null default clock_timestamp(),
 started_at timestamptz,completes_at timestamptz,expires_at timestamptz,run_output integer,
 primary key(user_id,facility_id),
 check((started_at is null and completes_at is null and expires_at is null and run_output is null)
 or (started_at is not null and completes_at is not null and expires_at is not null and run_output is not null and completes_at>started_at and expires_at>completes_at and run_output between 1 and 1000))
);
create index production_sites_facility_idx on app_private.production_sites(facility_id);
create table app_private.production_operations(
 user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,signature jsonb not null,
 receipt jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(user_id,operation_id)
);
alter table app_private.production_sites enable row level security;
alter table app_private.production_operations enable row level security;
revoke all on app_private.production_sites,app_private.production_operations from public,anon,authenticated;
-- Keep catch history and all existing availability predicates intact. A consumed
-- item receives the existing retired/sold timestamp AND an explicit consumption
-- marker; no sale transaction or gold is created for production materials.
alter table public.player_collectibles add column consumed_at timestamptz;

create function app_private.production_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 select jsonb_build_object('serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('owned',s.user_id is not null,'startedAt',s.started_at,
 'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by f.price,f.id)
 from public.production_facilities f left join app_private.production_sites s on s.facility_id=f.id and s.user_id=u where f.enabled or s.user_id is not null),'[]'::jsonb))
 into result from public.player_wallets w where w.user_id=u;
 return result;
end $$;

create function app_private.production_materials(p_facility text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();k text;result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select f.kind into k from public.production_facilities f join app_private.production_sites s on s.facility_id=f.id and s.user_id=u where f.id=p_facility;
 if not found then raise exception 'PRODUCTION_NOT_OWNED';end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.sell_price,q.name,q.id),'[]'::jsonb) into result from (
  select s.id,s.name,s.thumbnail_path,s.rarity,s.sell_price,count(*)::integer available
  from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
  where c.user_id=u and c.sold_at is null and c.consumed_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind::text=k
  group by s.id
 )q;
 return result;
end $$;

create function app_private.production_action(p_action text,p_operation_id uuid,p_facility text,p_materials jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.player_wallets;f public.production_facilities;s app_private.production_sites;
 prev app_private.production_operations;sig jsonb;receipt jsonb;ids uuid[];n integer;v_now timestamptz;fuel bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','start','claim','discard') or p_facility is null then raise exception 'INVALID_PRODUCTION';end if;
 if p_materials is null or jsonb_typeof(p_materials)<>'object' then raise exception 'INVALID_MATERIALS';end if;
 if p_action<>'start' and p_materials<>'{}'::jsonb then raise exception 'INVALID_MATERIALS';end if;
 sig:=jsonb_build_object('action',p_action,'facility',p_facility,'materials',p_materials);
 -- Wallet first, then site, then collectible IDs in ascending order. Wallet
 -- locking also serializes purchases/claims with the harbor and gold actions.
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.production_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 select * into f from public.production_facilities where id=p_facility for share;
 if not found then raise exception 'PRODUCTION_NOT_FOUND';end if;
 v_now:=clock_timestamp();
 if p_action='buy' then
  if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
  if exists(select 1 from app_private.production_sites where user_id=u and facility_id=f.id) then raise exception 'PRODUCTION_ALREADY_OWNED';end if;
  if w.gold<f.price then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into app_private.production_sites(user_id,facility_id) values(u,f.id);
  update public.player_wallets set gold=gold-f.price,updated_at=v_now where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','production:'||f.id,-f.price);
  receipt:=jsonb_build_object('action','buy','facility',f.id);
 else
  select * into s from app_private.production_sites where user_id=u and facility_id=f.id for update;
  if not found then raise exception 'PRODUCTION_NOT_OWNED';end if;
  v_now:=clock_timestamp();
  if p_action='start' then
   if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
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
    expires_at=v_now+make_interval(mins=>f.production_minutes+f.storage_minutes),run_output=f.output_count where user_id=u and facility_id=f.id;
   receipt:=jsonb_build_object('action','start','facility',f.id,'consumedIds',ids);
  else
   if s.started_at is null then raise exception 'PRODUCTION_IDLE';end if;
   if p_action='claim' then
    if v_now<s.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
    if v_now>=s.expires_at then raise exception 'PRODUCTION_EXPIRED';end if;
    fuel:=coalesce((w.inventory->>'fuel')::bigint,0)+s.run_output;
    if fuel>1000000000 then raise exception 'FUEL_LIMIT';end if;
    update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel::integer)),updated_at=v_now where user_id=u;
   elsif v_now<s.expires_at then raise exception 'PRODUCTION_NOT_EXPIRED';end if;
   receipt:=jsonb_build_object('action',p_action,'facility',f.id,'fuel',case when p_action='claim' then s.run_output else 0 end);
   update app_private.production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null where user_id=u and facility_id=f.id;
  end if;
 end if;
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;

create function public.production_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.production_state()$$;
create function public.production_materials(p_facility text) returns jsonb language sql security invoker set search_path='' as $$select app_private.production_materials(p_facility)$$;
create function public.production_action(p_action text,p_operation_id uuid,p_facility text,p_materials jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select app_private.production_action(p_action,p_operation_id,p_facility,p_materials)$$;
revoke all on function public.production_state(),public.production_materials(text),public.production_action(text,uuid,text,jsonb),
app_private.production_state(),app_private.production_materials(text),app_private.production_action(text,uuid,text,jsonb) from public,anon;
grant execute on function public.production_state(),public.production_materials(text),public.production_action(text,uuid,text,jsonb),
app_private.production_state(),app_private.production_materials(text),app_private.production_action(text,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
