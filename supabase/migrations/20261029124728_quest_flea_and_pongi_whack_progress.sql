-- Include successful flea operations and paid Pongi Whack plays in existing quest periods.
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
 -- Successful flea trade receipts count once per operation for both participants, including partial fills.
 trades:=trades+(select count(*) from app_private.flea_receipts r
 join app_private.flea_posts p on p.id=(r.request->>'post')::uuid
 where r.request->>'action'='trade' and (r.user_id=u or p.owner_id=u)
 and r.created_at>=start_at and r.created_at<end_at);
 select count(*) into departures from public.fishing_expeditions where user_id=u and departed_at>=start_at and departed_at<end_at;
 select count(*) filter(where item_id in ('arcade:memory','arcade:shadow','arcade:odd-even','arcade:pongi-whack')),
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
