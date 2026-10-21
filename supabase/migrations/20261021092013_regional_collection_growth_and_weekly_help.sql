begin;

CREATE OR REPLACE FUNCTION app_private.growth_quest_period()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();boosts integer;tanks integer;themes integer;maps integer;entries jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select count(*) into boosts from app_private.expedition_boosts where helper_id=u;
 select count(*) into tanks from public.aquarium_tanks where user_id=u;
 -- Default/free backgrounds and the starter sea are not purchases/unlocks.
 select count(*) into themes from public.owned_aquarium_backgrounds o join public.aquarium_backgrounds b on b.id=o.background_id where o.user_id=u and b.price>0 and b.id<>'default';
 select count(*) into maps from public.player_map_fragments f join public.regions r on r.id=f.region_id where f.user_id=u and r.requires_map_fragment;
 with base_definitions(id,title,target,progress,reward,href,icon,ord) as (values
  ('boost_1','친구 통발에 물고기 유인 1회 하기',1,boosts,50,'/friends','expeditionBoost',1),
  ('boost_5','친구 통발에 물고기 유인 5회 하기',5,boosts,150,'/friends','expeditionBoost',2),
  ('boost_20','친구 통발에 물고기 유인 20회 하기',20,boosts,400,'/friends','expeditionBoost',3),
  ('boost_50','친구 통발에 물고기 유인 50회 하기',50,boosts,800,'/friends','expeditionBoost',4),
  ('boost_100','친구 통발에 물고기 유인 100회 하기',100,boosts,1500,'/friends','expeditionBoost',5),
  ('tanks_2','어항 2개 보유하기',2,tanks,100,'/aquarium','aquarium',11),
  ('tanks_3','어항 4개 보유하기',4,tanks,200,'/aquarium','aquarium',12),
  ('tanks_5','어항 6개 보유하기',6,tanks,400,'/aquarium','aquarium',13),
  ('themes_1','구매 테마 2종 모으기',2,themes,100,'/aquarium','theme',21),
  ('themes_3','구매 테마 5종 모으기',5,themes,200,'/aquarium','theme',22),
  ('themes_5','구매 테마 10종 모으기',10,themes,400,'/aquarium','theme',23),
  ('themes_10','구매 테마 15종 모으기',15,themes,600,'/aquarium','theme',24),
  ('maps_1','새로운 해역 1곳 해금하기',1,maps,50,'/shop?tab=maps','map',31),
  ('maps_3','새로운 해역 3곳 해금하기',3,maps,200,'/shop?tab=maps','map',32),
  ('maps_5','새로운 해역 6곳 해금하기',6,maps,400,'/shop?tab=maps','map',33),
  ('maps_10','새로운 해역 10곳 해금하기',10,maps,800,'/shop?tab=maps','map',34)
 ), regional as (
  select r.id,r.name,r.sort_order,count(s.id)::integer target,count(d.species_id)::integer progress
  from public.regions r join public.collectible_species s on s.native_region_id=r.id and s.kind in ('fish','trash','decoration')
  left join public.player_discoveries d on d.species_id=s.id and d.user_id=u
  group by r.id,r.name,r.sort_order
 ), definitions(id,title,target,progress,reward,href,icon,ord) as (
  select * from base_definitions
  union all
  select 'region_collection_'||id,name||' 개체 전부 해금하기',target,progress,1000,
   '/collection?region='||id,'region:'||id,100+sort_order from regional
 ) select jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'target',d.target,'progress',least(d.progress,d.target),
  'claimed',c.quest_id is not null,'complete',d.progress>=d.target or c.quest_id is not null,'reward',d.reward,'href',d.href,'icon',d.icon) order by d.ord)
 into entries from definitions d left join app_private.quest_claims c on c.user_id=u and c.period_kind='growth' and c.period_start=date '2000-01-01' and c.quest_id=d.id;
 return jsonb_build_object('kind','growth','start',date '2000-01-01','resetsAt',null,'quests',entries,'bonus',0,'bonusReady',false,'bonusClaimed',false);
end $function$
;

CREATE OR REPLACE FUNCTION app_private.base_quest_period(p_kind text, p_now timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();start_date date;start_at timestamptz;end_at timestamptz;
 attempts integer;rare_catches integer;epic_catches integer;trash_catches integer;decor_catches integer;
 posts integer;trades integer;departures integer;games integer;care integer;gifts integer;maps integer;rods integer;
 boosts integer;need_map boolean;need_rod boolean;entries jsonb;bonus integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_kind not in ('daily','weekly') or p_kind is null then raise exception 'INVALID_QUEST';end if;
 start_date:=case when p_kind='daily' then (p_now at time zone 'Asia/Seoul')::date else date_trunc('week',p_now at time zone 'Asia/Seoul')::date end;
 start_at:=start_date::timestamp at time zone 'Asia/Seoul';
 end_at:=(start_date+case when p_kind='daily' then 1 else 7 end)::timestamp at time zone 'Asia/Seoul';
 select count(*) into attempts from public.fishing_attempts where user_id=u and created_at>=start_at and created_at<end_at;
 -- Catch quests include manual catches and collected expedition results, never gifts or purchases.
 with catches as (
  select s.rarity::text rarity,s.kind::text kind from public.fishing_attempts a
  join public.player_collectibles c on c.id=a.collectible_id join public.collectible_species s on s.id=c.species_id
  where a.user_id=u and a.created_at>=start_at and a.created_at<end_at
  union all
  select item->'species'->>'rarity',item->'species'->>'kind'
  from public.fishing_expeditions e cross join lateral jsonb_array_elements(coalesce(e.result->'items','[]'::jsonb)) item
  where e.user_id=u and e.claimed_at>=start_at and e.claimed_at<end_at
 ) select count(*) filter(where rarity in ('rare','epic','mythic')),
 count(*) filter(where rarity in ('epic','mythic')),
 count(*) filter(where kind='trash'),count(*) filter(where kind='decoration')
 into rare_catches,epic_catches,trash_catches,decor_catches from catches;
 select count(*) into posts from public.exchange_listings where owner_id=u and side='sell' and created_at>=start_at and created_at<end_at;
 select count(*) into trades from public.exchange_listings where (owner_id=u or taker_id=u) and status='completed' and closed_at>=start_at and closed_at<end_at;
 select count(*) into departures from public.fishing_expeditions where user_id=u and departed_at>=start_at and departed_at<end_at;
 select count(*) filter(where item_id in ('arcade:memory','arcade:shadow','arcade:odd-even')),
 count(*) filter(where item_id like 'map:%'),count(*) filter(where item_id like 'rod:%') into games,maps,rods
 from public.gold_transactions where user_id=u and action='buy' and delta<0 and created_at>=start_at and created_at<end_at;
 select count(*) into care from (
  select id from public.aquarium_feedings where visitor_id=u and owner_id<>u and completed_at>=start_at and completed_at<end_at
  union all select id from public.aquarium_cleanings where visitor_id=u and owner_id<>u and completed_at>=start_at and completed_at<end_at
 ) visits;
 select count(*) into gifts from public.collectible_gifts where sender_id=u and source='friend' and created_at>=start_at and created_at<end_at;
 select count(*) into boosts from app_private.expedition_boosts where helper_id=u and created_at>=start_at and created_at<end_at;
 need_map:=maps>0 or exists(select 1 from public.region_maps m join public.regions r on r.id=m.region_id
  where r.requires_map_fragment and not exists(select 1 from public.player_map_fragments f where f.user_id=u and f.region_id=m.region_id));
 need_rod:=rods>0 or exists(select 1 from public.fishing_rods r where r.price>0
  and not exists(select 1 from public.player_fishing_rods o where o.user_id=u and o.rod_id=r.id));
 with definitions(id,title,target,progress,href,icon,ord) as (values
  ('post','판매글 올리기',1,posts,'/exchange','exchange',1),
  ('fish','낚시 5회',5,attempts,'/harbor','rod',2),
  ('depart','통발 설치 1회',1,departures,'/expeditions','expeditions',3),
  ('rare','희귀 이상 포획',1,rare_catches,'/harbor','fish',4),
  ('game','미니게임 실전 플레이 1회',1,games,'/arcade','gameplay',5),
  ('care','친구 어항 청소 또는 먹이 주기',1,care,'/friends','mailFriend',6),
  ('trade','거래 7회 완료',7,trades,'/exchange','exchange',11),
  ('weekly_fish','낚시 40회',40,attempts,'/harbor','rod',12),
  ('epic','특급 이상 포획',1,epic_catches,'/harbor','fish',13),
  ('trash','쓰레기 10회 포획',10,trash_catches,'/harbor','trash',14),
  ('gift','선물 3회 하기',3,gifts,'/notifications?tab=gift','mailGift',15),
  ('decor','장식물 10회 포획',10,decor_catches,'/harbor','decoration',16),
  ('map','지도 구매',1,maps,'/shop?tab=maps','map',17),
  ('rod','낚싯대 구매',1,rods,'/shop?tab=rods','rod',18),
  ('boost','통발 30번 도와주기',30,boosts,'/friends','expeditionBoost',19)
 ), rows as (
  select d.*,c.quest_id is not null claimed from definitions d left join app_private.quest_claims c
   on c.user_id=u and c.period_kind=p_kind and c.period_start=start_date and c.quest_id=d.id
  where (p_kind='daily' and ord<10) or (p_kind='weekly' and ord>10 and (id<>'map' or need_map or c.quest_id is not null) and (id<>'rod' or need_rod or c.quest_id is not null))
 ) select jsonb_agg(jsonb_build_object('id',id,'title',title,'target',target,'progress',least(progress,target),
 'claimed',claimed,'complete',progress>=target or claimed,'reward',case when p_kind='daily' then 30 else 50 end,'href',href,'icon',icon) order by ord) into entries from rows;
 bonus:=case when p_kind='daily' then 200 else 1000 end;
 return jsonb_build_object('kind',p_kind,'start',start_date,'resetsAt',end_at,'quests',entries,'bonus',bonus,
 'bonusReady',not exists(select 1 from jsonb_array_elements(entries) q where not (q->>'complete')::boolean),
 'bonusClaimed',exists(select 1 from app_private.quest_claims where user_id=u and period_kind=p_kind and period_start=start_date and quest_id='all'));
end $function$
;

notify pgrst,'reload schema';
commit;
