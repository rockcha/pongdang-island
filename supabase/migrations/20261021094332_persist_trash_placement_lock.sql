begin;
-- Existing remote installations already persist mirroring; preserve those values.
alter table public.player_collectibles add column if not exists flipped boolean not null default false;
alter table public.player_collectibles add column position_locked boolean not null default false;

create function app_private.arrange_collectible_with_lock(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric,p_flipped boolean,p_position_locked boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();item public.player_collectibles;item_kind text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION';end if;
 if p_rotation is null or not(p_rotation between 0 and 360) or p_scale is null or not(p_scale between .5 and 2) or p_position_locked is null then raise exception 'INVALID_TRANSFORM';end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=u) then raise exception 'TANK_NOT_FOUND';end if;
 select * into item from public.player_collectibles where id=p_collectible_id and user_id=u and sold_at is null and escrow_gift_id is null for update;
 if not found or item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND';end if;
 select kind::text into item_kind from public.collectible_species where id=item.species_id and (kind in ('decoration','trash') or (kind='fish' and movement_type='fixed'));
 if item_kind is null or (p_position_locked and item_kind<>'trash') then raise exception 'INVALID_ITEM';end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y,rotation=mod(p_rotation,360),scale=p_scale,flipped=coalesce(p_flipped,false),position_locked=p_position_locked where id=item.id;
 return jsonb_build_object('id',item.id,'position_x',p_x,'position_y',p_y,'rotation',mod(p_rotation,360),'scale',p_scale,'flipped',coalesce(p_flipped,false),'position_locked',p_position_locked);
end $$;
create function public.arrange_collectible_with_lock(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric,p_flipped boolean,p_position_locked boolean)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.arrange_collectible_with_lock(p_collectible_id,p_tank_id,p_x,p_y,p_rotation,p_scale,p_flipped,p_position_locked);
$$;
revoke all on function app_private.arrange_collectible_with_lock(uuid,uuid,numeric,numeric,numeric,numeric,boolean,boolean) from public,anon;
revoke all on function public.arrange_collectible_with_lock(uuid,uuid,numeric,numeric,numeric,numeric,boolean,boolean) from public,anon;
grant execute on function app_private.arrange_collectible_with_lock(uuid,uuid,numeric,numeric,numeric,numeric,boolean,boolean) to authenticated,service_role;
grant execute on function public.arrange_collectible_with_lock(uuid,uuid,numeric,numeric,numeric,numeric,boolean,boolean) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
