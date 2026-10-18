-- Habitats remain historical catalog metadata. Eligibility is global; the existing
-- native_region_id / is_native icon contract now represents the primary habitat.
-- Do not alter existing casts, ownership, discoveries, navigation or map unlocks.
begin;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description") values
('bait','퐁당 지렁이','퐁당섬의 촉촉한 모래와 풀숲에서만 서식하는 선홍빛 지렁이. 물속에서도 꼬물꼬물 움직여 물고기의 호기심을 자극한다. 매우 흔하고 구하기 쉬워, 섬의 초보 낚시꾼들이 가장 먼저 챙기는 미끼다.',30,'/items/baits/pongdang-worm.png',1,7700,2000,270,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.'),
('bait_epic','별잠의 유혹','별잠 유적의 틈에 맺힌 별가루를 자수정 조각에 봉인한 미끼. 물결에 닿으면 보랏빛 잔광이 길게 번져, 깊은 바다에 몸을 숨긴 비범한 생명까지 잠에서 깨운다고 전해진다.',null,'/items/baits/starlit-allure.png',5,0,0,9970,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.'),
('bait_magnet','심해 인력석','깊은 해구에서 건져 올린 푸른 자철석을 다듬어 만든 인양용 미끼. 물고기 대신 바다 아래 잠든 장식물에 반응하며, 오래전에 가라앉은 보물의 흔적을 조용히 끌어당긴다.',null,'/items/baits/abyss-lodestone.png',4,0,0,0,10000,0,'decoration','모든 해역의 장식물을 만날 수 있어요. 주 서식지에서는 추첨 가중치가 높아져요.'),
('bait_safe','이슬잎 경단','새벽 이슬을 머금은 어린 잎에 향긋한 해초 반죽을 감싼 수제 미끼. 작은 쇠바늘에 단단히 붙어 쉽게 흩어지지 않고, 잎 사이로 퍼지는 순한 향이 경계심 많은 물고기를 안심시킨다.',null,'/items/baits/dewleaf-dumpling.png',3,7700,2000,270,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.'),
('bait_special','달빛 진주새우','달빛이 스며드는 얕은 바다에서 자라는 작은 진주새우. 반투명한 껍질 속 푸른 진주가 은은하게 빛나며, 평범한 먹이에는 다가오지 않던 진귀한 물고기까지 불러 모은다고 한다.',null,'/items/baits/special.png',2,0,9870,100,30,0,'fish','미끼별 등급 확률은 모든 해역에서 같아요. 주 서식지에서는 개체의 추첨 가중치가 높아져요.')
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description";

create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare b public.fishing_baits;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 if b.effect_kind='decoration' then
  return jsonb_build_object('common_bp',0,'rare_bp',0,'epic_bp',0,'mythic_bp',0,'failure_bp',0);
 end if;
 return jsonb_build_object('common_bp',b.common_bp,'rare_bp',b.rare_bp,'epic_bp',b.epic_bp,'mythic_bp',b.mythic_bp,'failure_bp',b.failure_bp);
end $$;

-- Exponential race: each species' probability is its weight / sum(weights).
-- No habitat JOIN: old habitat rows must neither exclude nor duplicate candidates.
create or replace function app_private.collectible_habitat_weight(p_primary_region text,p_region text)
returns numeric language sql immutable security invoker set search_path='' as $$
 select case when p_primary_region is null then 1::numeric
  when p_primary_region=p_region then 2::numeric else 0.2::numeric end
$$;
revoke all on function app_private.collectible_habitat_weight(text,text) from public,anon,authenticated;

create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql volatile security invoker set search_path='' as $$
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 return query select s.id,null::text from public.collectible_species s
 where (p_decoration and s.kind='decoration')
    or (not p_decoration and s.kind in ('fish','trash') and s.rarity=p_rarity)
 order by -ln(greatest(random(),1e-15))/app_private.collectible_habitat_weight(
  case when s.is_native then s.native_region_id else null end,p_region_id),s.id limit 1;
end $$;

-- Availability is all seas. The primary habitat is supplied separately by the
-- existing species fields, so UI filters must use native_region_id, not habitats.
create or replace function app_private.collection_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_regions jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order),'[]'::jsonb)
 into v_regions from public.regions r;
 return jsonb_build_object('items',app_private.owned_collectibles(),
 'catalog',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object(
 'discovered',d.species_id is not null,'habitats',v_regions) order by s.kind,s.id),'[]'::jsonb)
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid
 where s.kind<>'map'));
end $$;
notify pgrst,'reload schema';
commit;
