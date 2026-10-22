-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds") values
('bait','퐁당 지렁이',50,10000,8320,1500,150,30,14,18,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_epic','별잠의 유혹',null,10000,0,0,9970,30,14,18,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_forbidden_star','금단의 별사탕',165,10000,7223,1876,760,141,17,23,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_safe','이슬잎 경단',69,10000,8320,1500,150,30,11,13,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_sea_memory','바다기억 조개알',100,10000,8320,1500,150,30,16,20,'["fish","trash","decoration"]'::jsonb,'native_boost',3,null,null,null,null),
('bait_snowflake_salt','눈꽃 소금사탕',70,10000,8320,1500,150,30,14,18,'["fish","trash","decoration"]'::jsonb,'common_only',1,null,null,null,null),
('bait_special','달빛 진주새우',null,10000,0,9870,100,30,12,15,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","success_chance_bp"=excluded."success_chance_bp","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","wait_min_seconds"=excluded."wait_min_seconds","wait_max_seconds"=excluded."wait_max_seconds","target_kinds"=excluded."target_kinds","effect_kind"=excluded."effect_kind","native_multiplier"=excluded."native_multiplier","night_common_bp"=excluded."night_common_bp","night_rare_bp"=excluded."night_rare_bp","night_wait_min_seconds"=excluded."night_wait_min_seconds","night_wait_max_seconds"=excluded."night_wait_max_seconds";
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait','퐁당 지렁이','익숙한 향기가 물살을 따라 퍼져요. 조금 여유를 두고 기다려 주세요.',50,'/items/baits/pongdang-worm.png',101,8320,1500,150,30,0,'fish','물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false),
('bait_epic','별잠의 유혹','보랏빛 잔광이 물밑에 스며들 때까지 차분히 기다려 주세요.',null,'/items/baits/starlit-allure.png',108,0,0,9970,30,0,'fish','물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false),
('bait_forbidden_star','금단의 별사탕','달콤한 별가루가 깊은 곳까지 퍼지도록 느긋하게 기다려 주세요.',165,'/items/baits/forbidden-star-candy.png',105,7223,1876,760,141,0,'fish','물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false),
('bait_safe','이슬잎 경단','이슬 향기가 퍼지면 바다 친구들이 금세 찾아와요.',69,'/items/baits/dewleaf-dumpling.png',102,8320,1500,150,30,0,'fish','물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false),
('bait_sea_memory','바다기억 조개알','이 바다의 익숙한 향기를 알아본 친구들이 천천히 다가와요.',100,'/items/baits/sea-memory-clam-pearl.png',104,8320,1500,150,30,0,'fish','현재 해역 토착종 선택 가중치가 3배예요. 물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false),
('bait_snowflake_salt','눈꽃 소금사탕','맑은 소금 향기가 익숙한 바다 친구들을 불러요.',70,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/snowflake-salt-candy.png',121,8320,1500,150,30,0,'fish','토착종을 제외한 공통종만 만나요. 물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false),
('bait_special','달빛 진주새우','진주새우의 반짝임에 호기심 많은 손님이 빠르게 다가와요.',null,'/items/baits/special.png',107,0,9870,100,30,0,'fish','물고기·쓰레기·장식물 포획 미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',10000,false,false)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
-- Use each run's saved targets for common-only bait too: old runs remain fish/trash.
create or replace function app_private.pick_profile_collectible(p_region text,p_rarity public.game_rarity,p_profile jsonb,p_manual boolean default false,p_native boolean default false,p_local_discovery boolean default false)
returns text language plpgsql security invoker set search_path='' as $$
declare ids text[];rod_region text;fallback boolean;bid text:=p_profile->>'id';effect text:=p_profile->>'effect_kind';
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_profile is null then raise exception 'INVALID_BAIT';end if;
 if not exists(select 1 from public.regions where id=p_region) then raise exception 'REGION_NOT_FOUND';end if;
 if p_manual then
  select r.region_id into rod_region from public.player_rod_loadouts l
  join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
  join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 end if;
 with candidates as materialized (
  select s.id,s.rarity from public.collectible_species s where case
   when effect='undiscovered' then s.kind in ('fish','trash','decoration')
    and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
    and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
   when bid='bait_grubby_magnet' then s.kind='trash'
   when effect='shooting_star' then s.rarity=p_rarity and (p_rarity='mythic' or s.kind='trash')
   when effect='common_only' then s.rarity=p_rarity and not s.is_native and (p_profile->'target_kinds') ? s.kind::text
   else s.rarity=p_rarity and (p_profile->'target_kinds') ? s.kind::text end
 ), pool as (
  select * from candidates c where c.rarity=p_rarity
   or (effect='undiscovered' or bid='bait_grubby_magnet') and not exists(select 1 from candidates c2 where c2.rarity=p_rarity)
 )
 select array_agg(id order by id),not coalesce(bool_or(rarity=p_rarity),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region,rod_region,
  coalesce((p_profile->>'native_multiplier')::numeric,1)*(case when p_native then 1.5 else 1 end),fallback);
end $$;
revoke all on function app_private.pick_profile_collectible(text,public.game_rarity,jsonb,boolean,boolean,boolean) from public,anon,authenticated;
notify pgrst, 'reload schema';
commit;
