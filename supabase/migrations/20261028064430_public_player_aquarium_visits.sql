begin;
create or replace function app_private.friend_aquarium(p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_owner is null or not exists(select 1 from public.player_profiles where id=p_owner) then raise exception 'TANK_NOT_FOUND';end if;
 return jsonb_build_object(
 'isFriend',exists(select 1 from public.friend_requests where status='accepted' and ((sender_id=auth.uid() and recipient_id=p_owner) or (recipient_id=auth.uid() and sender_id=p_owner))),
 'owner',(select jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path) from public.player_profiles where id=p_owner),
 'tanks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'background_id',background_id,'is_default',is_default,'created_at',created_at,'display_order',display_order) order by display_order,created_at,id) from public.aquarium_tanks where user_id=p_owner),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 join public.aquarium_tanks t on t.id=c.tank_id and t.user_id=p_owner
 where c.user_id=p_owner and c.sold_at is null and c.escrow_gift_id is null and s.kind in('fish','trash','decoration')),'[]'::jsonb),
 'backgrounds',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'image_path',image_path)),'[]'::jsonb) from public.aquarium_backgrounds));
end $$;
notify pgrst,'reload schema';
commit;
