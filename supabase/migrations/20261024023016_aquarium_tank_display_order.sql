begin;
set local lock_timeout='5s';
alter table public.aquarium_tanks add column display_order integer not null default 0 check(display_order>=0);
-- Preserve the existing creation order. The original is_default flag still owns legacy setup behavior.
with ranked as (select id,row_number() over(partition by user_id order by created_at,id)-1 as position from public.aquarium_tanks)
update public.aquarium_tanks t set display_order=r.position from ranked r where r.id=t.id;
create index aquarium_tanks_display_order_idx on public.aquarium_tanks(user_id,display_order,created_at,id);
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
 'tanks',coalesce((select jsonb_agg(to_jsonb(t) order by t.display_order,t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
   from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is not null and s.kind in ('fish','trash','decoration')),'[]'::jsonb),
 'storageCount',(select count(*) from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind in ('fish','trash','decoration')),
 'tankCapacity',50,'tankPrice',350,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.friend_aquarium(p_owner uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform app_private.require_aquarium_friend(p_owner);
 return jsonb_build_object(
 'owner',(select jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path) from public.player_profiles where id=p_owner),
 'tanks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'background_id',background_id,'is_default',is_default,'created_at',created_at,'display_order',display_order) order by display_order,created_at,id) from public.aquarium_tanks where user_id=p_owner),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 join public.aquarium_tanks t on t.id=c.tank_id and t.user_id=p_owner
 where c.user_id=p_owner and c.sold_at is null and c.escrow_gift_id is null and s.kind in('fish','trash','decoration')),'[]'::jsonb),
 'backgrounds',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'image_path',image_path)),'[]'::jsonb) from public.aquarium_backgrounds));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.buy_aquarium_tank(p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets; v_previous public.gold_transactions; v_number integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform app_private.get_gold_wallet();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>'buy' or v_previous.item_id is distinct from 'aquarium:tank' then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if v_wallet.gold<350 then raise exception 'INSUFFICIENT_GOLD'; end if;
 perform app_private.aquarium_state();
 select count(*)+1 into v_number from public.aquarium_tanks where user_id=v_uid;
 update public.player_wallets set gold=gold-350,updated_at=now() where user_id=v_uid;
 insert into public.aquarium_tanks(user_id,name,display_order) values(v_uid,'어항 '||v_number::text,(select coalesce(max(display_order),-1)+1 from public.aquarium_tanks where user_id=v_uid));
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','aquarium:tank',-350);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',-350);
end $function$
;
create function app_private.reorder_aquarium_tanks(p_tank_ids uuid[],p_expected_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();actual uuid[];
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 -- Purchases take the same wallet lock, so a new tank cannot race a reorder.
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=u for update;
 perform app_private.aquarium_state();
 select array_agg(id order by display_order,created_at,id) into actual from public.aquarium_tanks where user_id=u;
 if p_tank_ids is null or cardinality(p_tank_ids)<>cardinality(actual)
  or exists(select 1 from unnest(p_tank_ids) t(id) where id is null)
  or (select count(distinct id) from unnest(p_tank_ids)t(id))<>cardinality(actual)
  or exists(select 1 from unnest(p_tank_ids)t(id) where not(id=any(actual))) then raise exception 'INVALID_TANK_ORDER';end if;
 -- An identical retry succeeds; a stale edit cannot overwrite a newer order.
 if p_tank_ids=actual then return app_private.aquarium_state();end if;
 if p_expected_ids is distinct from actual then raise exception 'TANK_ORDER_CHANGED';end if;
 update public.aquarium_tanks t set display_order=p.position-1
 from unnest(p_tank_ids) with ordinality p(id,position) where t.id=p.id and t.user_id=u;
 return app_private.aquarium_state();
end$$;
revoke all on function app_private.reorder_aquarium_tanks(uuid[],uuid[]) from public,anon;
grant execute on function app_private.reorder_aquarium_tanks(uuid[],uuid[]) to authenticated;
create function public.reorder_aquarium_tanks(p_tank_ids uuid[],p_expected_ids uuid[])
returns jsonb language sql security invoker set search_path='' as $$select app_private.reorder_aquarium_tanks(p_tank_ids,p_expected_ids)$$;
revoke all on function public.reorder_aquarium_tanks(uuid[],uuid[]) from public,anon;
grant execute on function public.reorder_aquarium_tanks(uuid[],uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
