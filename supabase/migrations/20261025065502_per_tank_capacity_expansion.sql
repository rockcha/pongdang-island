-- Legacy account-wide capacity remains the base for existing and future tanks.
-- New purchases add capacity only to the selected tank; clients cannot edit it directly.
alter table public.aquarium_tanks add column capacity_bonus integer not null default 0 check(capacity_bonus>=0 and capacity_bonus%20=0 and capacity_bonus<=2147483500);

create function app_private.expand_aquarium_tank(p_tank_id uuid,p_target_capacity integer,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.player_wallets;previous public.gold_transactions;bonus integer;base integer;item text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tank_id is null or p_operation_id is null or p_target_capacity is null then raise exception 'INVALID_CAPACITY';end if;
 perform app_private.get_gold_wallet();
 -- Match the wallet-before-tank lock order used by tank purchases and management.
 select * into strict w from public.player_wallets where user_id=u for update;
 select capacity_bonus into bonus from public.aquarium_tanks where id=p_tank_id and user_id=u for update;
 if not found then raise exception 'TANK_NOT_FOUND';end if;
 item:='aquarium-tank-capacity:'||p_tank_id::text||':'||p_target_capacity::text;
 select * into previous from public.gold_transactions where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.action<>'buy' or previous.item_id is distinct from item then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.aquarium_state();
 end if;
 base:=coalesce((select capacity from app_private.player_aquarium_capacity where user_id=u),50);
 if bonus>2147483480 then raise exception 'AQUARIUM_FULLY_EXPANDED';end if;
 if p_target_capacity<>base+bonus+20 then raise exception 'CAPACITY_CHANGED';end if;
 if w.gold<1000 then raise exception 'INSUFFICIENT_GOLD';end if;
 update public.aquarium_tanks set capacity_bonus=capacity_bonus+20 where id=p_tank_id;
 update public.player_wallets set gold=gold-1000,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy',item,-1000);
 return app_private.aquarium_state();
end $$;
create function public.expand_aquarium_tank(p_tank_id uuid,p_target_capacity integer,p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.expand_aquarium_tank(p_tank_id,p_target_capacity,p_operation_id);
$$;
revoke all on function app_private.expand_aquarium_tank(uuid,integer,uuid),public.expand_aquarium_tank(uuid,integer,uuid) from public,anon;
grant execute on function app_private.expand_aquarium_tank(uuid,integer,uuid),public.expand_aquarium_tank(uuid,integer,uuid) to authenticated;

-- Old clients may recover a successful receipt, but must reload before buying again.
create or replace function app_private.expand_aquarium_capacity(p_target_capacity integer,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();previous public.gold_transactions;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select * into previous from public.gold_transactions where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.action<>'buy' or previous.item_id is distinct from 'aquarium-capacity:'||p_target_capacity::text then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.aquarium_state();
 end if;
 raise exception 'AQUARIUM_EXPANSION_CHANGED';
end $$;

CREATE OR REPLACE FUNCTION app_private.aquarium_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 insert into public.aquarium_tanks(user_id,background_id,is_default)
 select v_uid,background_id,true from public.player_aquariums where user_id=v_uid
 on conflict(user_id) where is_default do nothing;
 return jsonb_build_object(
 'background',(select background_id from public.aquarium_tanks where user_id=v_uid order by display_order,created_at,id limit 1),
 'tanks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('capacity',coalesce((select capacity from app_private.player_aquarium_capacity where user_id=v_uid),50)+t.capacity_bonus,'nextCapacityExpansion',jsonb_build_object('capacity',coalesce((select capacity from app_private.player_aquarium_capacity where user_id=v_uid),50)+t.capacity_bonus+20,'price',1000)) order by t.display_order,t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
   from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is not null and s.kind in ('fish','trash','decoration')),'[]'::jsonb),
 'storageCount',(select count(*) from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind in ('fish','trash','decoration')),
 'tankCapacity',coalesce((select capacity from app_private.player_aquarium_capacity where user_id=v_uid),50),
 'nextCapacityExpansion',null,'tankPrice',350,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $function$;


CREATE OR REPLACE FUNCTION app_private.move_collectibles(p_collectible_ids uuid[], p_tank_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_ids uuid[];v_count integer;v_occupancy integer;v_added integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if coalesce(cardinality(p_collectible_ids),0) not between 1 and 100 then raise exception 'INVALID_SELECTION'; end if;
 select array_agg(id order by id) into v_ids from(select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_SELECTION'; end if;
 -- Serialize admissions to the same tank before locking individuals in ID order.
 if p_tank_id is not null then
  perform 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid for update;
  if not found then raise exception 'TANK_NOT_FOUND'; end if;
 end if;
 perform 1 from public.player_collectibles where id=any(v_ids) and user_id=v_uid order by id for update;
 select count(*) into v_count from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.id=any(v_ids) and c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration');
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if p_tank_id is not null then
  if exists(select 1 from public.player_collectibles where id=any(v_ids) and tank_id is not null and tank_id<>p_tank_id) then raise exception 'STORAGE_REQUIRED'; end if;
  select count(*) into v_added from public.player_collectibles where id=any(v_ids) and tank_id is null;
  select count(*) into v_occupancy from public.player_collectibles where tank_id=p_tank_id and user_id=v_uid and sold_at is null and escrow_gift_id is null;
  if v_added>0 and v_occupancy+v_added>coalesce((select capacity from app_private.player_aquarium_capacity where user_id=v_uid),50)+(select capacity_bonus from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_FULL'; end if;
 end if;
 update public.player_collectibles set tank_id=p_tank_id,position_x=null,position_y=null
 where id=any(v_ids) and tank_id is distinct from p_tank_id;
 return app_private.aquarium_state();
end $function$;

notify pgrst,'reload schema';
