-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds") values
('bait','퐁당 지렁이',48,10000,8650,1200,130,20,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_aurora_clockwork_bug','오로라 태엽벌레',190,10000,2420,7500,0,80,13,25,'["fish","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_breadcrumbs','보슬보슬 빵가루',18,10000,9500,500,0,0,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_cloud_dough','솜구름 반죽',33,10000,10000,0,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_coral_pollen','산호 꽃가루',62,10000,9600,0,400,0,13,25,'["fish","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_cracked_star','금 간 별조각',247,10000,0,9930,0,70,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_deep_sleep_sachet','깊은잠 향낭',361,10000,0,8600,1300,100,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_epic','별잠의 유혹',null,10000,0,0,9970,30,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_firefly_pupa','반딧불 번데기',67,10000,9550,0,450,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_first_greeting','소라의 첫인사',null,10000,8320,1500,150,30,13,25,'["fish","trash","decoration"]'::jsonb,'undiscovered',1,null,null,null,null),
('bait_forbidden_star','금단의 별사탕',133,10000,7720,1600,600,80,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_goblin_bell_cherry','도깨비 방울체리',209,10000,2100,7500,400,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_grain_dumpling','노릇노릇 곡물경단',25,10000,9000,1000,0,0,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_grubby_magnet','꼬질 자석경단',8,10000,9900,100,0,0,13,25,'["trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_halfmoon_honey','반달 꿀젤리',124,10000,5000,5000,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_honey_dumpling','햇살 꿀경단',52,10000,8200,1800,0,0,13,25,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_lightning_stardust','벼락 별가루',266,10000,0,9450,550,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_magnet','심해 인력석',48,10000,8700,1200,100,0,13,25,'["decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_mermaid_whisper_candy','인어의 귓속말 캔디',157,10000,4000,6000,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_moonshade_dumpling','달그늘 경단',109,10000,5500,4500,0,0,13,25,'["fish","trash","decoration"]'::jsonb,'day_night',1,4500,5500,13,25),
('bait_pearl_bubble','진주 거품방울',62,10000,6500,3500,0,0,13,25,'["decoration","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_safe','이슬잎 경단',57,10000,8300,1500,180,20,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_sea_memory','바다기억 조개알',86,10000,8650,1200,130,20,13,25,'["fish","trash","decoration"]'::jsonb,'native_boost',2.5,null,null,null,null),
('bait_shell_crumbs','조개 부스러기',48,10000,8600,1400,0,0,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_shooting_star_tail','별똥별 꼬리젤리',48,10000,9920,0,0,80,13,25,'["fish","trash","decoration"]'::jsonb,'shooting_star',1,null,null,null,null),
('bait_snowflake_salt','눈꽃 소금사탕',52,10000,6800,3000,200,0,13,25,'["fish","trash","decoration"]'::jsonb,'common_only',1,null,null,null,null),
('bait_special','달빛 진주새우',null,10000,0,9870,100,30,13,25,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_starlight_wax','별빛 밀랍',43,10000,9950,0,0,50,13,25,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_zigzag_jelly','지그재그 젤리',128,10000,10000,0,0,0,13,25,'["fish"]'::jsonb,'alternating',1,null,null,null,null)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","success_chance_bp"=excluded."success_chance_bp","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","wait_min_seconds"=excluded."wait_min_seconds","wait_max_seconds"=excluded."wait_max_seconds","target_kinds"=excluded."target_kinds","effect_kind"=excluded."effect_kind","native_multiplier"=excluded."native_multiplier","night_common_bp"=excluded."night_common_bp","night_rare_bp"=excluded."night_rare_bp","night_wait_min_seconds"=excluded."night_wait_min_seconds","night_wait_max_seconds"=excluded."night_wait_max_seconds";
notify pgrst, 'reload schema';

-- Only future casts sample this delay. Stored casts and operation retries are unchanged.
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
 v_wait:=greatest(1,13+12*random()-coalesce(v_reduction,0)-app_private.relic_bonus('fishing_wait_seconds'));
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('discovery_version',1),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$
;
commit;
