-- Apply the equipped, owned rod's affinity at selection time only.
-- Existing prepared casts retain their already selected rewards.
begin;
create or replace function app_private.rod_habitat_weight(p_primary_region text,p_region text,p_rod_region text)
returns numeric language sql immutable security invoker set search_path='' as $$
 select case when p_primary_region is not null and p_primary_region=p_rod_region
  then case when p_primary_region=p_region then 2.2::numeric else 0.3::numeric end
  else app_private.collectible_habitat_weight(p_primary_region,p_region) end
$$;
revoke all on function app_private.rod_habitat_weight(text,text,text) from public,anon,authenticated;

create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql volatile security invoker set search_path='' as $$
declare v_rod_region text;
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 -- Read the caller's owned loadout once, never accept a client-supplied rod ID.
 select r.region_id into v_rod_region from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id
 where l.user_id=auth.uid() and r.native_bonus_bp>0;
 return query select s.id,null::text from public.collectible_species s
 where (p_decoration and s.kind='decoration')
    or (not p_decoration and s.kind in ('fish','trash') and s.rarity=p_rarity)
 order by -ln(greatest(random(),1e-15))/app_private.rod_habitat_weight(
  case when s.is_native then s.native_region_id else null end,p_region_id,v_rod_region),s.id limit 1;
end $$;
notify pgrst,'reload schema';
commit;
