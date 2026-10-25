-- All future tutorial catches are the Pongdang pufferfish, never a random roll.
-- Preserve an already awarded fish and return its own name/artwork on resume.
create or replace function app_private.first_fishing_tutorial(p_action text default 'state') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t app_private.first_fishing_tutorials;v_item uuid;v_aquarium jsonb;v_tank uuid;v_species text:='pongdang-pufferfish';
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in('state','start','catch','place') then raise exception 'INVALID_TUTORIAL_ACTION';end if;
 perform app_private.sync_player_profile();
 if p_action in('start','catch') then perform pg_advisory_xact_lock(hashtextextended('first-fishing:'||u::text,0));end if;
 select * into t from app_private.first_fishing_tutorials where user_id=u;
 if not found then
  if p_action<>'state' then raise exception 'TUTORIAL_NOT_REQUIRED';end if;
  return jsonb_build_object('required',false,'step','inactive','species',null,'item',null,'tank',null,'aquarium',null,'readyAt',null,'serverNow',clock_timestamp());
 end if;
 if p_action='start' and t.step='ready' then
  update app_private.first_fishing_tutorials set step='fishing',started_at=clock_timestamp(),ready_at=clock_timestamp()+interval '2 seconds' where user_id=u returning * into t;
 elsif p_action='catch' and t.step not in('caught','completed') then
  if t.step<>'fishing' then raise exception 'TUTORIAL_CAST_REQUIRED';end if;
  if clock_timestamp()<t.ready_at then raise exception 'TUTORIAL_TOO_EARLY';end if;
  insert into public.player_collectibles(user_id,species_id) values(u,v_species) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(u,v_species) on conflict do nothing;
  update app_private.first_fishing_tutorials set step='caught',collectible_id=v_item,caught_at=clock_timestamp() where user_id=u returning * into t;
 elsif p_action='place' and t.step<>'completed' then
  if t.step<>'caught' then raise exception 'TUTORIAL_CATCH_REQUIRED';end if;
  v_aquarium:=app_private.aquarium_state();
  select id into v_tank from public.aquarium_tanks where user_id=u order by is_default desc,created_at,id limit 1;
  perform app_private.move_collectibles(array[t.collectible_id],v_tank);
  select * into t from app_private.first_fishing_tutorials where user_id=u;
  if t.step<>'completed' then raise exception 'TUTORIAL_PLACEMENT_REQUIRED';end if;
 end if;
 if t.collectible_id is not null then
  v_species:=coalesce((select species_id from public.player_collectibles where id=t.collectible_id and user_id=u),v_species);
 end if;
 v_aquarium:=app_private.aquarium_state();
 select id into v_tank from public.aquarium_tanks where user_id=u order by is_default desc,created_at,id limit 1;
 return jsonb_build_object('required',t.completed_at is null,'step',t.step,
  'species',app_private.species_payload(v_species,null),
  'item',(select to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) from public.player_collectibles c where id=t.collectible_id and user_id=u),
  'tank',(select to_jsonb(a) from public.aquarium_tanks a where id=v_tank),
  'aquarium',case when t.step='completed' then v_aquarium else null end,
  'readyAt',t.ready_at,'serverNow',clock_timestamp());
end $$;
revoke all on function app_private.first_fishing_tutorial(text) from public,anon,authenticated;
grant execute on function app_private.first_fishing_tutorial(text) to authenticated;
