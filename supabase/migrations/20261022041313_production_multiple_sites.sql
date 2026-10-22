begin;
-- Preserve every owned site's run snapshot while removing the one-per-kind key.
alter table app_private.production_sites add column id uuid not null default gen_random_uuid();
alter table app_private.production_sites drop constraint production_sites_pkey;
alter table app_private.production_sites add primary key(id);
create index production_sites_owner_facility_idx on app_private.production_sites(user_id,facility_id,purchased_at,id);

create function app_private.production_site(p_reference text)
returns app_private.production_sites language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();s app_private.production_sites;n integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_reference ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
  select * into s from app_private.production_sites where id=p_reference::uuid and user_id=u;
  if not found then raise exception 'PRODUCTION_NOT_OWNED';end if;
 else
  -- Old clients may address a catalog kind only while it identifies one site.
  select count(*) into n from app_private.production_sites where user_id=u and facility_id=p_reference;
  if n=0 then raise exception 'PRODUCTION_NOT_OWNED';end if;
  if n>1 then raise exception 'PRODUCTION_SITE_REQUIRED';end if;
  select * into s from app_private.production_sites where user_id=u and facility_id=p_reference;
 end if;
 return s;
end $$;

create or replace function app_private.production_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 with owned as materialized(select * from app_private.production_sites where user_id=u),
 first_site as(select distinct on(facility_id) * from owned order by facility_id,purchased_at,id),
 totals as(select facility_id,count(*) n from owned group by facility_id)
 select jsonb_build_object('serverNow',clock_timestamp(),'gold',w.gold,'fuel',coalesce((w.inventory->>'fuel')::integer,0),
 'facilities',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('owned',s.id is not null,'ownedCount',coalesce(t.n,0),
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output) order by f.price,f.id)
 from public.production_facilities f left join first_site s on s.facility_id=f.id left join totals t on t.facility_id=f.id
 where f.enabled or s.id is not null),'[]'::jsonb),
 'sites',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('siteId',s.id,'owned',true,
 'startedAt',s.started_at,'completesAt',s.completes_at,'expiresAt',s.expires_at,'runOutput',s.run_output)
 order by f.price,f.id,s.purchased_at,s.id) from owned s join public.production_facilities f on f.id=s.facility_id),'[]'::jsonb))
 into result from public.player_wallets w where w.user_id=u;
 return result;
end $$;

create or replace function app_private.production_materials(p_facility text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();k text;result jsonb;site app_private.production_sites;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 site:=app_private.production_site(p_facility);
 select kind into k from public.production_facilities where id=site.facility_id;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.sell_price,q.name,q.id),'[]'::jsonb) into result from (
  select s.id,s.name,s.thumbnail_path,s.rarity,s.sell_price,count(*)::integer available
  from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
  where c.user_id=u and c.sold_at is null and c.consumed_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind::text=k
  group by s.id
 )q;
 return result;
end $$;

-- Internal primitive: batches collect receipts and build the full state only once.
create function app_private.production_apply(p_action text,p_operation_id uuid,p_facility text,p_materials jsonb,p_return_state boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.player_wallets;f public.production_facilities;s app_private.production_sites;
 prev app_private.production_operations;sig jsonb;receipt jsonb;ids uuid[];n integer;v_now timestamptz;fuel bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','start','claim','discard') or p_facility is null then raise exception 'INVALID_PRODUCTION';end if;
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
end $$;

create or replace function app_private.production_action(p_action text,p_operation_id uuid,p_facility text,p_materials jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 return app_private.production_apply(p_action,p_operation_id,p_facility,p_materials,true);
end $$;

create function app_private.production_purchase(p_facility text,p_quantity integer,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.player_wallets;f public.production_facilities;prev app_private.production_operations;
 sig jsonb;receipt jsonb;ids uuid[];total bigint;v_now timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_facility is null or p_quantity is null or p_quantity not between 1 and 100 then raise exception 'INVALID_PRODUCTION_QUANTITY';end if;
 sig:=jsonb_build_object('action','purchase','facility',p_facility,'quantity',p_quantity);
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.production_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 select * into f from public.production_facilities where id=p_facility for share;
 if not found then raise exception 'PRODUCTION_NOT_FOUND';end if;
 if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
 total:=f.price::bigint*p_quantity;
 if w.gold<total then raise exception 'INSUFFICIENT_GOLD';end if;
 v_now:=clock_timestamp();
 with purchased as(insert into app_private.production_sites(user_id,facility_id)
  select u,f.id from generate_series(1,p_quantity) returning id) select array_agg(id order by id) into ids from purchased;
 update public.player_wallets set gold=gold-total,updated_at=v_now where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','production:'||f.id,-total);
 receipt:=jsonb_build_object('action','purchase','facility',f.id,'siteIds',ids,'count',p_quantity);
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;

create or replace function app_private.production_bulk_action(p_action text,p_operation_id uuid,p_steps jsonb,p_allow_valuable boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();sig jsonb;prev app_private.production_operations;step jsonb;result jsonb;receipt jsonb;
 total_fuel integer:=0;n integer;site app_private.production_sites;normalized jsonb:='[]'::jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('start','claim','discard') then raise exception 'INVALID_PRODUCTION';end if;
 if p_steps is null or jsonb_typeof(p_steps)<>'array' then raise exception 'INVALID_PRODUCTION';end if;
 n:=jsonb_array_length(p_steps);
 if n not between 1 and 1000 then raise exception 'INVALID_PRODUCTION';end if;
 if exists(select 1 from jsonb_array_elements(p_steps) e where jsonb_typeof(e)<>'object'
  or jsonb_typeof(e->'facility') is distinct from 'string' or jsonb_typeof(e->'materials') is distinct from 'object') then raise exception 'INVALID_PRODUCTION';end if;
 if (select count(distinct e->>'facility') from jsonb_array_elements(p_steps)e)<>n then raise exception 'INVALID_PRODUCTION';end if;
 sig:=jsonb_build_object('action','bulk_'||p_action,'steps',p_steps,'allowValuable',coalesce(p_allow_valuable,false));
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.production_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 for step in select e from jsonb_array_elements(p_steps)e loop
  site:=app_private.production_site(step->>'facility');
  normalized:=normalized||jsonb_build_array(step||jsonb_build_object('facility',site.id,'catalog',site.facility_id));
 end loop;
 if (select count(distinct e->>'facility') from jsonb_array_elements(normalized)e)<>n then raise exception 'INVALID_PRODUCTION';end if;
 if p_action='start' and not coalesce(p_allow_valuable,false) and exists(
  select 1 from jsonb_array_elements(p_steps)e cross join lateral jsonb_object_keys(e->'materials') m(id)
  join public.collectible_species cs on cs.id=m.id where cs.rarity in ('epic','mythic')
 ) then raise exception 'VALUABLE_MATERIAL_CONFIRM_REQUIRED';end if;
 for step in select e from jsonb_array_elements(normalized)e join public.production_facilities f on f.id=e->>'catalog' order by f.price,f.id,e->>'facility' loop
  result:=app_private.production_apply(p_action,gen_random_uuid(),step->>'facility',step->'materials',false);
  total_fuel:=total_fuel+coalesce((result->'receipt'->>'fuel')::integer,0);
 end loop;
 receipt:=jsonb_build_object('action','bulk_'||p_action,'count',n,'fuel',total_fuel);
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $$;

create function public.production_purchase(p_facility text,p_quantity integer,p_operation_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select app_private.production_purchase(p_facility,p_quantity,p_operation_id)$$;
revoke all on function app_private.production_site(text),app_private.production_apply(text,uuid,text,jsonb,boolean) from public,anon,authenticated;
revoke all on function app_private.production_purchase(text,integer,uuid),public.production_purchase(text,integer,uuid) from public,anon;
grant execute on function app_private.production_purchase(text,integer,uuid),public.production_purchase(text,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
