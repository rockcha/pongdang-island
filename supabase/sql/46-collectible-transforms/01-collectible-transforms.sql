-- Apply after 45. Repeatable; retains existing placements and ownership.
begin;
alter table public.player_collectibles add column if not exists flipped boolean not null default false;
create or replace function app_private.arrange_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric,p_flipped boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_item public.player_collectibles;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION'; end if;
 if p_rotation is null or not(p_rotation between 0 and 360) or p_scale is null or not(p_scale between 0.5 and 2) then raise exception 'INVALID_TRANSFORM'; end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_NOT_FOUND'; end if;
 select * into v_item from public.player_collectibles
 where id=p_collectible_id and user_id=v_uid and sold_at is null and escrow_gift_id is null for update;
 if not found or v_item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if not exists(select 1 from public.collectible_species where id=v_item.species_id and kind in ('fish','trash','decoration')) then raise exception 'INVALID_ITEM'; end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y,rotation=mod(p_rotation,360),scale=p_scale,flipped=coalesce(p_flipped,false) where id=v_item.id;
 return jsonb_build_object('id',v_item.id,'position_x',p_x,'position_y',p_y,'rotation',mod(p_rotation,360),'scale',p_scale,'flipped',coalesce(p_flipped,false));
end $$;
create or replace function public.arrange_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric,p_flipped boolean)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.arrange_collectible(p_collectible_id,p_tank_id,p_x,p_y,p_rotation,p_scale,p_flipped)
$$;
revoke all on function app_private.arrange_collectible(uuid,uuid,numeric,numeric,numeric,numeric,boolean),public.arrange_collectible(uuid,uuid,numeric,numeric,numeric,numeric,boolean) from public,anon,authenticated;
grant execute on function app_private.arrange_collectible(uuid,uuid,numeric,numeric,numeric,numeric,boolean),public.arrange_collectible(uuid,uuid,numeric,numeric,numeric,numeric,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
