begin;

-- NULL preserves the existing species-based depth. Explicit layers stay below
-- temporary drag controls (900) and touch effects (1000+) in the renderer.
alter table public.player_collectibles
  add column display_layer smallint
  constraint player_collectibles_display_layer_range check (display_layer between 0 and 800);

create function app_private.set_collectible_display_layer(p_collectible_id uuid,p_tank_id uuid,p_layer integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();item public.player_collectibles;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_layer is not null and not(p_layer between 0 and 800) then raise exception 'INVALID_LAYER';end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=u) then raise exception 'TANK_NOT_FOUND';end if;
 select * into item from public.player_collectibles
 where id=p_collectible_id and user_id=u and tank_id=p_tank_id
 and sold_at is null and consumed_at is null and escrow_gift_id is null for update;
 if not found then raise exception 'COLLECTIBLE_NOT_FOUND';end if;
 if not exists(select 1 from public.collectible_species where id=item.species_id and kind in ('fish','trash','decoration')) then raise exception 'INVALID_ITEM';end if;
 update public.player_collectibles set display_layer=p_layer where id=item.id;
 return jsonb_build_object('id',item.id,'display_layer',p_layer);
end $$;
revoke all on function app_private.set_collectible_display_layer(uuid,uuid,integer) from public,anon;
grant execute on function app_private.set_collectible_display_layer(uuid,uuid,integer) to authenticated;

create function public.set_collectible_display_layer(p_collectible_id uuid,p_tank_id uuid,p_layer integer)
returns jsonb language sql set search_path='' as $$
 select app_private.set_collectible_display_layer(p_collectible_id,p_tank_id,p_layer)
$$;
revoke all on function public.set_collectible_display_layer(uuid,uuid,integer) from public,anon;
grant execute on function public.set_collectible_display_layer(uuid,uuid,integer) to authenticated;

notify pgrst,'reload schema';
commit;
