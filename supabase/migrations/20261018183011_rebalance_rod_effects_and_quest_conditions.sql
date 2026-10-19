begin;
-- Only the two general-purpose rods reduce the manual fishing failure roll.
-- Expedition success continues to use the bait-only helper.
create function app_private.manual_fishing_success_chance_bp(p_bait_id text)
returns integer language plpgsql stable set search_path='' as $$
declare bonus integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select r.failure_reduction_bp into bonus from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id
 where l.user_id=auth.uid() and r.id in ('bronze','calm');
 return least(10000,app_private.fishing_success_chance_bp(p_bait_id)+coalesce(bonus,0));
end $$;
revoke all on function app_private.manual_fishing_success_chance_bp(text) from public,anon,authenticated;

update public.fishing_rods set price=case when id='basic' then 0 when id='bronze' then 400 when id in ('calm','lunea') then 1000 else 800 end;
CREATE OR REPLACE FUNCTION app_private.prepare_fishing(p_region_id text, p_bait_id text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_decoration boolean;v_eligible boolean;
 v_rarity public.game_rarity;v_species text;v_map text;v_snapshot jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE';end if;
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
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 -- Reject an exhausted discovery pool before the failure roll or bait consumption.
 if p_bait_id='bait_first_greeting' and not exists (
  select 1 from public.collectible_species s where s.kind in ('fish','trash','decoration')
  and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)
 ) then raise exception 'ALL_COLLECTIBLES_DISCOVERED';end if;
 v_eligible:=random()<app_private.manual_fishing_success_chance_bp(p_bait_id)::numeric/10000;
 v_rarity:='common';
 if v_eligible then
  if not v_decoration then v_rarity:=app_private.resolve_regional_fishing(p_bait_id,p_region_id,floor(random()*10000)::integer);end if;
  if p_bait_id in ('bait_grubby_magnet','bait_sea_memory','bait_first_greeting') then
   v_species:=app_private.pick_special_bait_collectible(p_region_id,v_rarity,p_bait_id);
  else
   select q.species_id,q.map_region_id into v_species,v_map from app_private.pick_regional_collectible(p_region_id,v_rarity,v_decoration,floor(random()*10000)::integer) q;
  end if;
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,v_map);
 end if;
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,expires_at)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,v_eligible,v_species,v_map,v_rarity,v_snapshot,3+random()*2,
  4.5+random()*3,(array['bait','escape','wave'])[1+floor(random()*3)::integer],clock_timestamp()+interval '3 minutes') returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end;
$function$
;
CREATE OR REPLACE FUNCTION app_private.fishing_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_region text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 return jsonb_build_object('regionId',v_region,'regionName',(select name from public.regions where id=v_region),
 'successChanceBp',app_private.manual_fishing_success_chance_bp('bait'),
 'prepared',(select app_private.prepared_fishing_payload(p) from app_private.prepared_fishing_casts p where user_id=v_uid and finished_at is null and expires_at>clock_timestamp()),
 'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region)||jsonb_build_object('baseSuccessChanceBp',app_private.fishing_success_chance_bp(b.id),'successChanceBp',app_private.manual_fishing_success_chance_bp(b.id)) order by b.sort_order) from public.fishing_baits b));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.quest_period(p_kind text, p_now timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();start_date date;start_at timestamptz;end_at timestamptz;
 attempts integer;rare_catches integer;epic_catches integer;trash_catches integer;decor_catches integer;
 posts integer;trades integer;departures integer;games integer;care integer;gifts integer;maps integer;rods integer;
 need_map boolean;need_rod boolean;entries jsonb;bonus integer;
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
 need_map:=maps>0 or exists(select 1 from public.region_maps m join public.regions r on r.id=m.region_id
  where r.requires_map_fragment and not exists(select 1 from public.player_map_fragments f where f.user_id=u and f.region_id=m.region_id));
 need_rod:=rods>0 or exists(select 1 from public.fishing_rods r where r.price>0
  and not exists(select 1 from public.player_fishing_rods o where o.user_id=u and o.rod_id=r.id));
 with definitions(id,title,target,progress,href,icon,ord) as (values
  ('post','판매글 올리기',1,posts,'/exchange','exchange',1),
  ('fish','낚시 5회',5,attempts,'/harbor','rod',2),
  ('depart','어선 파견 1회',1,departures,'/expeditions','expeditions',3),
  ('rare','희귀 이상 포획',1,rare_catches,'/harbor','fish',4),
  ('game','미니게임 실전 플레이 1회',1,games,'/arcade','gameplay',5),
  ('care','친구 어항 청소 또는 먹이 주기',1,care,'/friends','mailFriend',6),
  ('trade','거래 7회 완료',7,trades,'/exchange','exchange',11),
  ('weekly_fish','낚시 40회',40,attempts,'/harbor','rod',12),
  ('epic','특급 이상 포획',1,epic_catches,'/harbor','fish',13),
  ('trash','쓰레기 10회 포획',10,trash_catches,'/harbor','trash',14),
  ('gift','선물 3회 보내기',3,gifts,'/notifications?tab=gift','mailGift',15),
  ('decor','장식물 10회 포획',10,decor_catches,'/harbor','decoration',16),
  ('map','지도 구매',1,maps,'/shop?tab=maps','map',17),
  ('rod','낚싯대 구매',1,rods,'/shop?tab=rods','rod',18)
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
update public.title_catalog set description='하루에 물고기·쓰레기·장식물 모두 포획' where id='full-course';
CREATE OR REPLACE FUNCTION app_private.title_metrics(p_user uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with logs as materialized (
 select *,(occurred_at at time zone 'Asia/Seoul')::date play_day,(occurred_at at time zone 'Asia/Seoul')::time local_time
 from app_private.title_fishing_log where user_id=p_user
), manual as materialized (
 select *,row_number() over(partition by play_day order by occurred_at,id) day_rank,
 sum((species_id is null)::integer) over(order by occurred_at,id rows between 5 preceding and 1 preceding) failures,
 sum((kind='trash')::integer) over(order by occurred_at,id rows between 2 preceding and current row) trash_run,
 array_agg(species_id) over(order by occurred_at,id rows between 4 preceding and current row) last_species,
 array_agg(region_id) over(order by occurred_at,id rows between 4 preceding and current row) last_regions
 from logs where source='manual'
), care as materialized (
 select visitor_id,owner_id,(completed_at at time zone 'Asia/Seoul')::date play_day,'feed' action from public.aquarium_feedings where completed_at is not null and (visitor_id=p_user or owner_id=p_user)
 union all
 select visitor_id,owner_id,(completed_at at time zone 'Asia/Seoul')::date,'clean' from public.aquarium_cleanings where completed_at is not null and (visitor_id=p_user or owner_id=p_user)
), tanks as materialized (
 select c.tank_id,count(distinct s.native_region_id) filter(where s.is_native) natives,
 count(distinct s.id) filter(where s.kind='trash') trash,
 count(distinct s.id) filter(where s.kind='fish' and s.size<=45) small
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=p_user and c.tank_id is not null and c.sold_at is null and c.escrow_gift_id is null group by c.tank_id
), values_list(key,value) as (values
 ('manual',(select count(*) from manual)),
 ('dawn',(select count(*) from manual where local_time>=time '02:00' and local_time<time '05:00')),
 ('mythic',(select count(*) from logs where rarity='mythic')),
 ('mythic_unique',(select count(distinct species_id) from logs where rarity='mythic')),
 ('trash',(select count(*) from logs where kind='trash')),
 ('decor',(select count(*) from logs where kind='decoration')),
 ('voyage',(select count(*) from public.fishing_expeditions where user_id=p_user and claimed_at is not null)),
 ('care',(select count(distinct (owner_id,play_day)) from care where visitor_id=p_user and owner_id<>p_user)),
 ('trade',(select count(*) from public.exchange_listings where (owner_id=p_user or taker_id=p_user) and status='completed')),
 ('quest',(select count(*) from app_private.quest_claims where user_id=p_user and period_kind='daily' and quest_id='all')),
 ('first_mythic',(select count(*) from manual where day_rank=1 and rarity='mythic')),
 ('last_rare',(select count(*) from manual where last_bait and rarity in ('rare','epic','mythic'))),
 ('after_failure',(select count(*) from manual where failures=5 and rarity in ('epic','mythic'))),
 ('triple_trash',(select count(*) from manual where trash_run=3)),
 ('five_species',(select count(*) from manual where cardinality(last_species)=5 and (select count(distinct s) from unnest(last_species) s)=5 and (select count(distinct r) from unnest(last_regions) r)=1)),
 ('midnight',(select count(*) from (select case when local_time>=time '23:55' then play_day+1 else play_day end from manual where local_time>=time '23:55' or local_time<time '00:05' group by 1 having bool_or(local_time>=time '23:55') and bool_or(local_time<time '00:05')) x)),
 ('daily_kinds',(select count(*) from (select play_day from logs where species_id is not null group by play_day having count(distinct kind) filter(where kind in ('fish','trash','decoration'))=3) x)),
 ('daily_rarities',(select count(*) from (select play_day from logs where species_id is not null group by play_day having count(distinct rarity)>=4) x)),
 ('five_baits',(select count(*) from (select play_day from manual group by play_day having count(distinct bait_id)>=5) x)),
 ('dinghy_mythic',(select count(*) from logs where source='expedition' and vessel_id='dinghy' and rarity='mythic')),
 ('double_mythic',(select count(*) from (select batch_id from logs where source='expedition' and rarity='mythic' group by batch_id having count(*)>=2) x)),
 ('fresh_gift',(select count(*) from public.collectible_gifts g where g.sender_id=p_user and g.source='friend' and exists(select 1 from manual m where m.collectible_id=any(g.collectible_ids) and m.play_day=(g.created_at at time zone 'Asia/Seoul')::date and m.occurred_at<=g.created_at))),
 ('mutual_care',(select count(*) from care a where a.visitor_id=p_user and a.owner_id<>p_user and exists(select 1 from care b where b.visitor_id=a.owner_id and b.owner_id=p_user and a.play_day=b.play_day))),
 ('three_neighbors',(select count(*) from (select play_day from (select play_day,owner_id from care where visitor_id=p_user and owner_id<>p_user group by play_day,owner_id having count(distinct action)=2) a group by play_day having count(*)>=3) b)),
 ('tank_native',(select count(*) from tanks where natives>=5)),
 ('tank_trash',(select count(*) from tanks where trash>=5)),
 ('tank_small',(select count(*) from tanks where small>=10)),
 ('friend_day_gift',(select count(*) from public.collectible_gifts g join public.friend_requests f on ((f.sender_id=p_user and f.recipient_id=g.recipient_id) or(f.recipient_id=p_user and f.sender_id=g.recipient_id))
 where g.sender_id=p_user and g.source='friend' and f.status='accepted' and (f.updated_at at time zone 'Asia/Seoul')::date=(g.created_at at time zone 'Asia/Seoul')::date and exists(select 1 from public.collectible_gifts b where b.source='friend' and b.sender_id=g.recipient_id and b.recipient_id=p_user and (b.created_at at time zone 'Asia/Seoul')::date=(g.created_at at time zone 'Asia/Seoul')::date)))
)
select jsonb_object_agg(key,value) from values_list
$function$
;
insert into app_private.title_dirty select id from public.player_profiles on conflict do nothing;
notify pgrst,'reload schema';
commit;
