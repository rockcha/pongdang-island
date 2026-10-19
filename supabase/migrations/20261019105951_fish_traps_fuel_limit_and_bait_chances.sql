-- Preserve quest/title IDs, existing traps, help records and operation receipts.
CREATE OR REPLACE FUNCTION app_private.fishing_success_chance_bp(p_bait_id text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 return case
  when p_bait_id='bait_safe' then 10000
  when p_bait_id in ('bait_grubby_magnet','bait_first_greeting','bait_magnet','bait_forbidden_star','bait_epic','bait_special') then 7000
  when p_bait_id='bait' then 3500
  else 4000
 end;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.harbor_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),'fuelPrice',60,'fuelDailyLimit',5,'fuelPurchasedToday',coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((clock_timestamp() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0),'dockSlots',2,
 'vessels',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',o.n>0,'ownedCount',o.n) order by v.sort_order)
  from public.harbor_vessels v cross join lateral(select count(*)::integer n from public.harbor_boats b where b.user_id=u and b.vessel_id=v.id)o),'[]'::jsonb),
 'boats',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('id',b.id,'vessel_id',b.vessel_id,'instance_no',b.instance_no,'dock_slot',b.dock_slot,'owned',true) order by b.purchased_at,b.id)
  from public.harbor_boats b join public.harbor_vessels v on v.id=b.vessel_id where b.user_id=u),'[]'::jsonb),
 'voyages',coalesce((select jsonb_agg(to_jsonb(v) order by v.departed_at) from public.harbor_voyages v where v.user_id=u and v.claimed_at is null),'[]'::jsonb));
end $function$;

CREATE OR REPLACE FUNCTION app_private.settle_legacy_harbor(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.harbor_vessels;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;fuel integer;cost integer;sid text;item uuid;i integer;purchase_at timestamptz;
 results jsonb:='[]'::jsonb;items jsonb;failed integer;attempts integer;claimed integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','fuel','depart','arrive','claim','claim_all') then raise exception 'INVALID_HARBOR_ACTION';end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'voyage',p_voyage_id,'quantity',p_quantity);
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 fuel:=coalesce((w.inventory->>'fuel')::integer,0);purchase_at:=clock_timestamp();
 if p_action in ('buy','depart') then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
 end if;
 if p_action='buy' then
  if exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_ALREADY_OWNED';end if;
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.player_harbor_vessels(user_id,vessel_id) values(u,v.id);
  update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','harbor-vessel:'||v.id,-v.price);
  receipt:=jsonb_build_object('action','buy','vesselId',v.id);
 elsif p_action='fuel' then
  if p_quantity is null or p_quantity<1 or p_quantity>5 or fuel>100000-p_quantity then raise exception 'INVALID_QUANTITY';end if;
  if coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op
   where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((purchase_at at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0)+p_quantity>5 then raise exception 'FUEL_DAILY_LIMIT';end if;
  cost:=p_quantity*60;
  if w.gold<cost then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.player_wallets set gold=gold-cost,inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel+p_quantity)),updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','fuel:'||p_quantity,-cost);
  receipt:=jsonb_build_object('action','fuel','quantity',p_quantity);
 elsif p_action='depart' then
  if not exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_NOT_OWNED';end if;
  if exists(select 1 from public.harbor_voyages where user_id=u and vessel_id=v.id and claimed_at is null) then raise exception 'VOYAGE_ACTIVE';end if;
  if fuel<v.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel-v.fuel_cost)),updated_at=now() where user_id=u;
  insert into public.harbor_voyages(user_id,vessel_id,vessel_snapshot,returns_at)
   values(u,v.id,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into trip;
  receipt:=jsonb_build_object('action','depart','voyageId',trip.id,'vesselId',v.id);
 elsif p_action='arrive' then
  select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u for update;
  if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
  if trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  update public.harbor_voyages set arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()) where id=trip.id;
  receipt:=jsonb_build_object('action','arrive','voyageId',trip.id);
 else
  if p_action='claim' then
   select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u;
   if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
   if trip.claimed_at is not null then
    receipt:=jsonb_build_object('action','claim','results',jsonb_build_array(trip.result));
   elsif trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  end if;
  if receipt is null then
   for trip in select * from public.harbor_voyages where user_id=u and claimed_at is null and returns_at<=clock_timestamp()
    and (p_action='claim_all' or id=p_voyage_id) order by id for update loop
    items:='[]'::jsonb;failed:=0;attempts:=(trip.vessel_snapshot->>'fishing_count')::integer;
    for i in 1..attempts loop
     -- Same draw and success rules as a normal-bait expedition, no bait inventory debit.
     sid:=app_private.expedition_pick('pongdang','bait',false,false);
     if sid is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
     if random()<app_private.expedition_success_chance_bp('bait',0)::numeric/10000 then
      insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
      insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
      items:=items||jsonb_build_array(jsonb_build_object('id',item,'species',app_private.species_payload(sid,null),'bonus',false));
     else failed:=failed+1;end if;
    end loop;
    update public.harbor_voyages set claimed_at=clock_timestamp(),arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()),
     result=jsonb_build_object('voyageId',trip.id,'vesselName',trip.vessel_snapshot->>'name','items',items,'attempted',attempts,'failed',failed,'succeeded',jsonb_array_length(items)) where id=trip.id returning result into receipt;
    results:=results||jsonb_build_array(receipt);claimed:=claimed+1;
   end loop;
   receipt:=jsonb_build_object('action',p_action,'results',results,'claimed',claimed);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt,created_at) values(u,p_operation_id,sig,receipt,purchase_at);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.base_quest_period(p_kind text, p_now timestamp with time zone)
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
end $function$;

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
 with definitions(id,title,target,progress,reward,href,icon,ord) as (values
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
 ) select jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'target',d.target,'progress',least(d.progress,d.target),
  'claimed',c.quest_id is not null,'complete',d.progress>=d.target or c.quest_id is not null,'reward',d.reward,'href',d.href,'icon',d.icon) order by d.ord)
 into entries from definitions d left join app_private.quest_claims c on c.user_id=u and c.period_kind='growth' and c.period_start=date '2000-01-01' and c.quest_id=d.id;
 return jsonb_build_object('kind','growth','start',date '2000-01-01','resetsAt',null,'quests',entries,'bonus',0,'bonusReady',false,'bonusClaimed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.boost_friend_expedition(p_expedition_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();e public.fishing_expeditions;b app_private.expedition_boosts;owner_id uuid;t timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select user_id into owner_id from public.fishing_expeditions where id=p_expedition_id;
 if not found then raise exception 'EXPEDITION_NOT_FOUND';end if;
 -- Locks the accepted friendship before the expedition, also excluding self.
 perform app_private.require_aquarium_friend(owner_id);
 select * into e from public.fishing_expeditions where id=p_expedition_id for update;
 if not found then raise exception 'EXPEDITION_NOT_FOUND';end if;
 -- A retried response must succeed even when this help caused the boat to return.
 select * into b from app_private.expedition_boosts where expedition_id=e.id and helper_id=u;
 if found then return app_private.friend_expedition_status()||jsonb_build_object('replayed',true);end if;
 t:=clock_timestamp();
 if e.claimed_at is not null or e.returns_at<=t then raise exception 'EXPEDITION_NOT_SAILING';end if;
 insert into app_private.expedition_boosts(expedition_id,helper_id,nickname,avatar_path)
 select e.id,u,nickname,avatar_path from public.player_profiles where id=u returning * into b;
 if not found then raise exception 'NICKNAME_REQUIRED';end if;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body,expedition_boost_id)
 values(e.user_id,u,'general','system',b.nickname||'님이 물고기를 유인해줬어요',
 '친구가 통발에 물고기를 유인해 수확이 최대 10분 빨라졌어요.',b.id);
 update public.fishing_expeditions set returns_at=greatest(t,returns_at-interval '10 minutes') where id=e.id;
 return app_private.friend_expedition_status()||jsonb_build_object('replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION app_private.notify_due_expeditions(p_expedition_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
 with due as (
  select id from public.fishing_expeditions where returns_at<=clock_timestamp() and notified_at is null and claimed_at is null and (p_expedition_id is null or id=p_expedition_id)
  order by returns_at limit 500 for update skip locked
 ), marked as (
  update public.fishing_expeditions e set notified_at=clock_timestamp() from due where e.id=due.id returning e.*
 ) insert into public.notifications(recipient_id,category,kind,title,body,expedition_id)
 select user_id,'general','system','통발 수확을 준비했어요!','물고기 유인이 끝났어요. 통발 설치 페이지에서 결과를 받아주세요.',id from marked
 on conflict (expedition_id) where expedition_id is not null do nothing;
 get diagnostics n=row_count;
 return n;
end $function$;

update public.fishing_vessels set name='꼬마 통발' where id='dinghy';
update public.title_catalog set name=v.name,description=v.description from (values
 ('voyage-1','첫 통발의 설렘','통발 결과 수령 누적 5회'),
 ('voyage-2','통발터의 단골','통발 결과 수령 누적 30회'),
 ('voyage-3','깊은 물길의 통발꾼','통발 결과 수령 누적 100회'),
 ('voyage-4','모든 물길의 통발 명인','통발 결과 수령 누적 300회'),
 ('double-mythic','한 통발에 담긴 기적','한 번의 통발에서 신화 2개 이상 획득'),
 ('tailwind-1','물고기를 부르는 손길','친구 통발에 물고기 유인 5회 하기'),
 ('tailwind-2','물고기 유인 전문가','친구 통발에 물고기 유인 20회 하기'),
 ('tailwind-3','바다를 잇는 다정함','친구 통발에 물고기 유인 50회 하기'),
 ('tailwind-4','백 통발의 길잡이','친구 통발에 물고기 유인 100회 하기')
) v(id,name,description) where public.title_catalog.id=v.id;
notify pgrst, 'reload schema';