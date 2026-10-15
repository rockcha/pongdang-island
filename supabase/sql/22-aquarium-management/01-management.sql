-- Requires 16/17 collectible schema. Optional catalog seeds 18~21 are independent.
-- Repeatable. No reset. Ownership and wallet changes are performed only through RPCs.
begin;

create or replace function app_private.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.player_collectibles;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION'; end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_NOT_FOUND'; end if;
 select * into v_item from public.player_collectibles where id=p_collectible_id and user_id=v_uid and sold_at is null and (to_jsonb(player_collectibles)->>'escrow_gift_id') is null for update;
 if not found or v_item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if not exists(select 1 from public.collectible_species where id=v_item.species_id and kind in ('fish','trash','decoration')) then raise exception 'INVALID_ITEM'; end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y where id=v_item.id;
 return jsonb_build_object('id',v_item.id,'position_x',p_x,'position_y',p_y);
end $$;

create or replace function app_private.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ids uuid[]; v_key text; v_wallet public.player_wallets;
 v_previous public.gold_transactions; v_count integer; v_price bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or coalesce(cardinality(p_collectible_ids),0) not between 1 and 100 then raise exception 'INVALID_TRADE'; end if;
 select array_agg(id order by id) into v_ids from (select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_TRADE'; end if;
 v_key:='collectibles:'||array_to_string(v_ids,',');
 perform app_private.get_gold_wallet();
 -- Same lock order as other gold operations: wallet, then collectibles ordered by ID.
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>'sell' or v_previous.item_id is distinct from v_key then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 perform 1 from public.player_collectibles where user_id=v_uid and id=any(v_ids) order by id for update;
 select count(*),coalesce(sum(s.sell_price),0) into v_count,v_price
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.id=any(v_ids) and c.sold_at is null and (to_jsonb(c)->>'escrow_gift_id') is null and s.kind in ('fish','trash','decoration') and s.sell_price>0;
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if v_wallet.gold::bigint+v_price>1000000000 then raise exception 'GOLD_LIMIT'; end if;
 update public.player_collectibles set sold_at=now(),tank_id=null where user_id=v_uid and id=any(v_ids);
 update public.player_wallets set gold=gold+v_price::integer,updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'sell',v_key,v_price::integer);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',v_price);
end $$;

create or replace function public.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language sql security invoker set search_path='' as $$select app_private.place_collectible(p_collectible_id,p_tank_id,p_x,p_y)$$;
create or replace function public.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select app_private.sell_collectibles(p_collectible_ids,p_operation_id)$$;
revoke all on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) from public,anon;
grant execute on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) to authenticated;
notify pgrst,'reload schema';
commit;
