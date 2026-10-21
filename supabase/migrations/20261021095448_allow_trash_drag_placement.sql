begin;
create or replace function app_private.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();item public.player_collectibles;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION';end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=u) then raise exception 'TANK_NOT_FOUND';end if;
 select * into item from public.player_collectibles where id=p_collectible_id and user_id=u and sold_at is null and escrow_gift_id is null for update;
 if not found or item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND';end if;
 if not exists(select 1 from public.collectible_species where id=item.species_id and (kind in ('decoration','trash') or (kind='fish' and movement_type='fixed'))) then raise exception 'INVALID_ITEM';end if;
 -- Dragging changes coordinates only: retain the lock and manual transform.
 update public.player_collectibles set position_x=p_x,position_y=p_y where id=item.id;
 return jsonb_build_object('id',item.id,'position_x',p_x,'position_y',p_y);
end $$;
notify pgrst,'reload schema';
commit;
