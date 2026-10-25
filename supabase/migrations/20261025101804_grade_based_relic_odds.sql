begin;
create function app_private.fishing_reward_category(p_roll double precision,p_rarity public.game_rarity) returns text
language plpgsql immutable set search_path='' as $function$
declare v_relic_chance numeric:=case p_rarity when 'epic' then 0.05 when 'mythic' then 0.10 else 0.03 end;
begin
 if p_roll is null or not (p_roll>=0 and p_roll<1) then raise exception 'INVALID_REWARD_ROLL';end if;
 if p_rarity is null then raise exception 'INVALID_REWARD_RARITY';end if;
 -- Keep the map interval at 3%; missing candidates fall back in the caller.
 return case when p_roll<(0.97-v_relic_chance)::double precision then 'ordinary'
  when p_roll<(1-v_relic_chance)::double precision then 'map' else 'relic' end;
end $function$;
revoke all on function app_private.fishing_reward_category(double precision,public.game_rarity) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.prepare_discovery_cast(p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean, p_discovery boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;v_reduction integer;
 v_roll double precision;v_category text;v_reward record;v_map text;v_piece integer;v_relic text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_confirm_bite is null then raise exception 'INVALID_TRADE';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if p.region_id<>p_region_id or p.bait_id<>p_bait_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.prepared_fishing_payload(p);
 end if;
 if exists(select 1 from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and finished_at is null;
 if found then
  if p.expires_at<=clock_timestamp() then perform app_private.finish_fishing(p.operation_id,false);
  else return app_private.prepared_fishing_payload(p);end if;
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 -- Keep the exhausted discovery bait refusal before every random draw. Moving
 -- it after the category roll would permit unlimited free map/relic rerolls.
 if p_bait_id='bait_first_greeting' and not exists(select 1 from public.collectible_species s
  where app_private.collectible_available_at(s.id,statement_timestamp()) and s.kind in ('fish','trash','decoration')
  and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)) then
  raise exception 'ALL_COLLECTIBLES_DISCOVERED';
 end if;
 v_started:=clock_timestamp();
 v_profile:=app_private.fishing_bait_balance_at(p_bait_id,v_started);
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 -- Grade-specific disjoint category ranges; absent categories return to the ordinary
 -- pool without increasing the other discovery category's chance.
 v_category:='ordinary';
 if p_discovery then
  v_roll:=random();
  v_category:=app_private.fishing_reward_category(v_roll,v_rarity);
 end if;
 if v_category<>'ordinary' then
  select * into v_reward from app_private.fishing_discovery_candidates(v_rarity)
  where category=v_category order by random() limit 1;
  if found then
   if v_category='map' then
    v_map:=v_reward.region_id;v_piece:=v_reward.piece_number;
    v_snapshot:=app_private.fishing_map_piece_payload(v_map,v_piece,v_uid);
   else
    v_relic:=v_reward.reward_id;v_snapshot:=app_private.fishing_relic_payload(v_relic);
   end if;
  end if;
 end if;
 if v_snapshot is null then
  v_species:=app_private.pick_profile_collectible(p_region_id,v_rarity,v_profile,true);
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,null);
 end if;
 select r.wait_reduction_seconds into v_reduction from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=v_uid;
 v_wait:=greatest(1,12+12*random()-coalesce(v_reduction,0)-app_private.relic_bonus('fishing_wait_seconds'));
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('discovery_version',1),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$;

notify pgrst,'reload schema';
commit;
