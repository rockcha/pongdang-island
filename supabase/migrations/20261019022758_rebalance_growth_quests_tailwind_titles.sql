-- Quest IDs identify permanent reward tiers, not their editable target counts.
-- Preserve existing claims when targets or rewards change; never pay a tier twice.
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
  ('boost_1','친구 파견에 순풍 1회 보내기',1,boosts,50,'/friends','expeditionBoost',1),
  ('boost_5','친구 파견에 순풍 5회 보내기',5,boosts,150,'/friends','expeditionBoost',2),
  ('boost_20','친구 파견에 순풍 20회 보내기',20,boosts,400,'/friends','expeditionBoost',3),
  ('boost_50','친구 파견에 순풍 50회 보내기',50,boosts,800,'/friends','expeditionBoost',4),
  ('boost_100','친구 파견에 순풍 100회 보내기',100,boosts,1500,'/friends','expeditionBoost',5),
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
 ('tailwind',(select count(*) from app_private.expedition_boosts where helper_id=p_user)),
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
$function$;

CREATE OR REPLACE FUNCTION app_private.title_activity_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a uuid;b uuid;
begin
 if tg_table_name in ('aquarium_feedings','aquarium_cleanings') then
  if new.completed_at is null then return new;end if;a:=new.visitor_id;b:=new.owner_id;
 elsif tg_table_name='expedition_boosts' then a:=new.helper_id;
 elsif tg_table_name='exchange_listings' then a:=new.owner_id;b:=new.taker_id;
 elsif tg_table_name in ('collectible_gifts','friend_requests') then a:=new.sender_id;b:=new.recipient_id;
 else a:=new.user_id;
 end if;
 if a is not null then insert into app_private.title_dirty values(a) on conflict do nothing;end if;
 if b is not null then insert into app_private.title_dirty values(b) on conflict do nothing;end if;
 return new;
end $function$;

create trigger title_tailwind_activity after insert on app_private.expedition_boosts
 for each row execute function app_private.title_activity_event();

insert into public.title_catalog(id,name,tier,category,description,metric,target,sort_order) values
 ('tailwind-1','작은 순풍을 보내는 이',1,'growth','친구 파견에 순풍 5회 보내기','tailwind',5,61),
 ('tailwind-2','돛을 밀어주는 손길',2,'growth','친구 파견에 순풍 20회 보내기','tailwind',20,62),
 ('tailwind-3','바다를 건너는 다정함',3,'growth','친구 파견에 순풍 50회 보내기','tailwind',50,63),
 ('tailwind-4','백 척의 돛을 채운 바람',4,'growth','친구 파견에 순풍 100회 보내기','tailwind',100,64);

-- Existing sent tailwinds count toward titles on the next normal title sync.
insert into app_private.title_dirty(user_id)
 select distinct helper_id from app_private.expedition_boosts on conflict do nothing;
