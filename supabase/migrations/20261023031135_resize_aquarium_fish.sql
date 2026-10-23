begin;
-- Resize only: swimming paths, placement and species size remain unchanged.
create function app_private.resize_aquarium_fish(p_collectible_id uuid,p_tank_id uuid,p_scale numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();item public.player_collectibles;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_scale is null or not(p_scale between .5 and 2) then raise exception 'INVALID_TRANSFORM';end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=u) then raise exception 'TANK_NOT_FOUND';end if;
 select * into item from public.player_collectibles where id=p_collectible_id and user_id=u and tank_id=p_tank_id and sold_at is null and consumed_at is null and escrow_gift_id is null for update;
 if not found then raise exception 'COLLECTIBLE_NOT_FOUND';end if;
 if not exists(select 1 from public.collectible_species where id=item.species_id and kind='fish') then raise exception 'INVALID_ITEM';end if;
 update public.player_collectibles set scale=p_scale where id=item.id;
 return jsonb_build_object('id',item.id,'scale',p_scale);
end $$;
revoke all on function app_private.resize_aquarium_fish(uuid,uuid,numeric) from public,anon;
grant execute on function app_private.resize_aquarium_fish(uuid,uuid,numeric) to authenticated;
create function public.resize_aquarium_fish(p_collectible_id uuid,p_tank_id uuid,p_scale numeric)
returns jsonb language sql set search_path='' as $$
 select app_private.resize_aquarium_fish(p_collectible_id,p_tank_id,p_scale)
$$;
revoke all on function public.resize_aquarium_fish(uuid,uuid,numeric) from public,anon;
grant execute on function public.resize_aquarium_fish(uuid,uuid,numeric) to authenticated;
notify pgrst,'reload schema';
commit;
