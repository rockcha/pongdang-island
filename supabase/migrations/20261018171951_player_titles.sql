begin;
create table public.title_catalog(id text primary key,name text unique not null,tier integer not null check(tier between 1 and 4),category text not null,description text not null,metric text not null,target integer not null check(target>0),extra_metric text,extra_target integer,sort_order integer not null);
create table public.player_titles(user_id uuid not null references auth.users(id) on delete cascade,title_id text not null references public.title_catalog(id),earned_at timestamptz not null default clock_timestamp(),primary key(user_id,title_id));
alter table public.player_profiles add column equipped_title text references public.title_catalog(name) on update cascade;
alter table public.notifications add column achievement_id text references public.title_catalog(id);
alter table public.title_catalog enable row level security;
alter table public.player_titles enable row level security;
create policy title_catalog_read on public.title_catalog for select to authenticated using(true);
create policy player_titles_read on public.player_titles for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.title_catalog,public.player_titles from public,anon,authenticated;
grant select on public.title_catalog,public.player_titles to authenticated;

-- Immutable catch evidence survives selling, gifting and catalog changes.
create table app_private.title_fishing_log(
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,event_key text not null,
 occurred_at timestamptz not null,source text not null,kind text,rarity text,species_id text,collectible_id uuid,region_id text,bait_id text,vessel_id text,batch_id text,last_bait boolean not null default false,
 unique(user_id,event_key)
);
create index title_fishing_history on app_private.title_fishing_log(user_id,occurred_at,id);
create table app_private.title_dirty(user_id uuid primary key references auth.users(id) on delete cascade);
alter table app_private.title_fishing_log enable row level security;
alter table app_private.title_dirty enable row level security;
revoke all on app_private.title_fishing_log,app_private.title_dirty from public,anon,authenticated;
alter table app_private.prepared_fishing_casts add column last_bait boolean not null default false;

create function app_private.award_title(p_user uuid,p_title text) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.player_titles(user_id,title_id) values(p_user,p_title) on conflict do nothing;
 if found then
  insert into public.notifications(recipient_id,category,kind,title,body,achievement_id)
  select p_user,'general','system','새 칭호를 획득했어요!',name||' · 마이페이지에서 장착해 보세요.',id from public.title_catalog where id=p_title;
 end if;
end $$;

create function app_private.title_last_bait() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.last_bait:=coalesce((select (inventory->>new.bait_id)::integer=1 from public.player_wallets where user_id=new.user_id),false);
 return new;
end $$;
create trigger title_last_bait before insert on app_private.prepared_fishing_casts for each row execute function app_private.title_last_bait();

create function app_private.title_catch_event() returns trigger language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;item jsonb;i integer:=0;last_one boolean:=false;
begin
 if tg_table_name='fishing_attempts' then
  if new.collectible_id is not null then
   select p.snapshot,p.last_bait into snapshot,last_one from app_private.prepared_fishing_casts p where p.user_id=new.user_id and p.operation_id=new.operation_id;
   if snapshot is null then select to_jsonb(s) into snapshot from public.player_collectibles c join public.collectible_species s on s.id=c.species_id where c.id=new.collectible_id;end if;
  end if;
  insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id,collectible_id,region_id,bait_id,last_bait)
  values(new.user_id,'cast:'||new.operation_id,new.created_at,'manual',snapshot->>'kind',snapshot->>'rarity',snapshot->>'id',new.collectible_id,new.region_id,new.bait_id,coalesce(last_one,false)) on conflict do nothing;
 else
  if new.claimed_at is null or old.claimed_at is not null then return new;end if;
  for item in select value from jsonb_array_elements(coalesce(new.result->'items','[]'::jsonb)) loop
   i:=i+1;
   insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id,collectible_id,region_id,bait_id,vessel_id,batch_id)
   values(new.user_id,'exp:'||new.id||':'||i,new.claimed_at,'expedition',item->'species'->>'kind',item->'species'->>'rarity',item->'species'->>'id',(item->>'id')::uuid,new.region_id,item->>'baitId',new.vessel_id,new.id::text) on conflict do nothing;
  end loop;
 end if;
 insert into app_private.title_dirty values(new.user_id) on conflict do nothing;
 return new;
end $$;
create trigger title_manual_catch after insert on public.fishing_attempts for each row execute function app_private.title_catch_event();
create trigger title_expedition_catch after update of claimed_at on public.fishing_expeditions for each row execute function app_private.title_catch_event();

create function app_private.title_activity_event() returns trigger language plpgsql security definer set search_path='' as $$
declare a uuid;b uuid;
begin
 if tg_table_name in ('aquarium_feedings','aquarium_cleanings') then
  if new.completed_at is null then return new;end if;a:=new.visitor_id;b:=new.owner_id;
 elsif tg_table_name='exchange_listings' then a:=new.owner_id;b:=new.taker_id;
 elsif tg_table_name in ('collectible_gifts','friend_requests') then a:=new.sender_id;b:=new.recipient_id;
 else a:=new.user_id;
 end if;
 if a is not null then insert into app_private.title_dirty values(a) on conflict do nothing;end if;
 if b is not null then insert into app_private.title_dirty values(b) on conflict do nothing;end if;
 return new;
end $$;
create trigger title_care_feed after insert or update of completed_at on public.aquarium_feedings for each row execute function app_private.title_activity_event();
create trigger title_care_clean after insert or update of completed_at on public.aquarium_cleanings for each row execute function app_private.title_activity_event();
create trigger title_exchange after insert or update of status on public.exchange_listings for each row execute function app_private.title_activity_event();
create trigger title_gift after insert on public.collectible_gifts for each row execute function app_private.title_activity_event();
create trigger title_friend after insert or update of status on public.friend_requests for each row execute function app_private.title_activity_event();
create trigger title_daily_quest after insert on app_private.quest_claims for each row execute function app_private.title_activity_event();

create function app_private.title_tank_event() returns trigger language plpgsql security definer set search_path='' as $$
declare regions integer;trash integer;small integer;
begin
 if new.tank_id is null or new.sold_at is not null or new.escrow_gift_id is not null then return new;end if;
 select count(distinct s.native_region_id) filter(where s.is_native),count(distinct s.id) filter(where s.kind='trash'),count(distinct s.id) filter(where s.kind='fish' and s.size<=45)
 into regions,trash,small from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=new.user_id and c.tank_id=new.tank_id and c.sold_at is null and c.escrow_gift_id is null;
 if regions>=5 then perform app_private.award_title(new.user_id,'tank-native');end if;
 if trash>=5 then perform app_private.award_title(new.user_id,'tank-trash');end if;
 if small>=10 then perform app_private.award_title(new.user_id,'tank-small');end if;
 return new;
end $$;
-- Catalog rows are inserted below before these triggers can be used by players.
create trigger title_tank after insert or update of tank_id on public.player_collectibles for each row execute function app_private.title_tank_event();
insert into public.title_catalog values
('fishing-1','첫 물결의 낚시꾼',1,'growth','직접 낚시 누적 30회','manual',30,null,null,1),
('fishing-2','물때를 읽는 사람',2,'growth','직접 낚시 누적 200회','manual',200,null,null,2),
('fishing-3','파도보다 끈질긴',3,'growth','직접 낚시 누적 1000회','manual',1000,null,null,3),
('fishing-4','바다와 세월을 낚은',4,'growth','직접 낚시 누적 3000회','manual',3000,null,null,4),
('dawn-1','새벽에 드리운 낚싯줄',1,'growth','오전 2~5시 직접 낚시 누적 10회','dawn',10,null,null,5),
('dawn-2','잠들지 않는 낚시꾼',2,'growth','오전 2~5시 직접 낚시 누적 40회','dawn',40,null,null,6),
('dawn-3','불굴의 새벽 낚시꾼',3,'growth','오전 2~5시 직접 낚시 누적 150회','dawn',150,null,null,7),
('dawn-4','새벽바다의 마지막 등불',4,'growth','오전 2~5시 직접 낚시 누적 500회','dawn',500,null,null,8),
('mythic-1','신화를 마주한',1,'growth','신화 포획 누적 1회','mythic',1,null,null,9),
('mythic-2','전설을 따라가는',2,'growth','신화 포획 누적 5회','mythic',5,null,null,10),
('mythic-3','신들의 물길을 아는',3,'growth','신화 포획 누적 20회','mythic',20,null,null,11),
('mythic-4','신화마저 낚아 올린',4,'growth','신화 포획 누적 50회 + 서로 다른 신화 5종','mythic',50,'mythic_unique',5,12),
('trash-1','해변의 작은 손길',1,'growth','쓰레기 포획 누적 20회','trash',20,null,null,13),
('trash-2','바다의 청소부',2,'growth','쓰레기 포획 누적 100회','trash',100,null,null,14),
('trash-3','푸른 물결의 수호자',3,'growth','쓰레기 포획 누적 400회','trash',400,null,null,15),
('trash-4','바다를 되살린 사람',4,'growth','쓰레기 포획 누적 1000회','trash',1000,null,null,16),
('decor-1','조개 하나의 취향',1,'growth','장식물 포획 누적 10회','decor',10,null,null,17),
('decor-2','작은 바다의 정원사',2,'growth','장식물 포획 누적 60회','decor',60,null,null,18),
('decor-3','심해의 수집가',3,'growth','장식물 포획 누적 250회','decor',250,null,null,19),
('decor-4','가라앉은 문명의 기록자',4,'growth','장식물 포획 누적 700회','decor',700,null,null,20),
('voyage-1','통통배의 선장',1,'growth','어선 조업 결과 수령 누적 5회','voyage',5,null,null,21),
('voyage-2','항구의 단골 선장',2,'growth','어선 조업 결과 수령 누적 30회','voyage',30,null,null,22),
('voyage-3','수평선 너머의 선장',3,'growth','어선 조업 결과 수령 누적 100회','voyage',100,null,null,23),
('voyage-4','모든 물길의 항해자',4,'growth','어선 조업 결과 수령 누적 300회','voyage',300,null,null,24),
('care-1','다녀가는 다정함',1,'growth','친구 어항 돌보기 · 같은 친구 하루 1회 누적 5회','care',5,null,null,25),
('care-2','이웃 바다의 단골손님',2,'growth','친구 어항 돌보기 · 같은 친구 하루 1회 누적 30회','care',30,null,null,26),
('care-3','모두의 바다지기',3,'growth','친구 어항 돌보기 · 같은 친구 하루 1회 누적 100회','care',100,null,null,27),
('care-4','천 개의 바다에 닿은 손길',4,'growth','친구 어항 돌보기 · 같은 친구 하루 1회 누적 300회','care',300,null,null,28),
('trade-1','첫 흥정의 설렘',1,'growth','거래 성사 누적 5회','trade',5,null,null,29),
('trade-2','항구의 장사꾼',2,'growth','거래 성사 누적 30회','trade',30,null,null,30),
('trade-3','물길을 잇는 거상',3,'growth','거래 성사 누적 100회','trade',100,null,null,31),
('trade-4','퐁당 상단의 주인',4,'growth','거래 성사 누적 300회','trade',300,null,null,32),
('quest-1','작은 약속을 지킨',1,'growth','일일 퀘스트 전체 완료 보상 수령 누적 3일','quest',3,null,null,33),
('quest-2','오늘도 빠짐없이',2,'growth','일일 퀘스트 전체 완료 보상 수령 누적 14일','quest',14,null,null,34),
('quest-3','백일의 항해일지',3,'growth','일일 퀘스트 전체 완료 보상 수령 누적 45일','quest',45,null,null,35),
('quest-4','사계절을 함께한',4,'growth','일일 퀘스트 전체 완료 보상 수령 누적 100일','quest',100,null,null,36),
('first-legend','첫입부터 전설',3,'moment','그날 첫 직접 낚시에서 신화 포획','first_mythic',1,null,null,37),
('last-bite','마지막 한 입',2,'moment','해당 종류의 마지막 보유 미끼로 희귀 이상 포획','last_rare',1,null,null,38),
('after-failure','빈손 끝의 별빛',3,'moment','직접 낚시 5회 연속 실패 직후 특급 이상 포획','after_failure',1,null,null,39),
('midnight','자정의 경계에서',2,'moment','자정 전후 5분 이내에 각각 직접 낚시','midnight',1,null,null,40),
('full-course','바다의 풀코스',3,'moment','하루에 물고기·쓰레기·장식물·지도 모두 포획','daily_kinds',1,null,null,41),
('all-rarities','오늘의 주인공',3,'moment','하루에 일반·희귀·특급·신화 모두 포획','daily_rarities',1,null,null,42),
('triple-trash','뜻밖의 대청소',2,'moment','직접 낚시로 쓰레기 3회 연속 포획','triple_trash',1,null,null,43),
('five-species','같은 바다, 다른 얼굴',2,'moment','같은 해역에서 5회 연속 서로 다른 종 직접 포획','five_species',1,null,null,44),
('five-baits','미끼통의 모험가',2,'moment','하루에 서로 다른 미끼 5종으로 직접 낚시','five_baits',1,null,null,45),
('dinghy-mythic','작은 배의 큰 발견',4,'moment','꼬마 통통배 조업에서 신화 포획','dinghy_mythic',1,null,null,46),
('double-mythic','한 배를 탄 기적',4,'moment','한 번의 파견에서 신화 2개 이상 획득','double_mythic',1,null,null,47),
('fresh-gift','받자마자 나누는 마음',1,'social','그날 직접 잡은 개체를 친구에게 선물','fresh_gift',1,null,null,48),
('mutual-care','서로의 바다지기',2,'social','같은 날 친구와 서로 어항 돌보기 완료','mutual_care',1,null,null,49),
('three-neighbors','반짝이는 이웃',2,'social','하루에 친구 3명의 어항을 각각 청소하고 먹이 주기','three_neighbors',1,null,null,50),
('tank-native','바다보다 넓은 취향',2,'collection','서로 다른 해역 5곳의 고유종을 한 어항에 배치','tank_native',1,null,null,51),
('tank-trash','쓰레기도 내 가족',1,'collection','서로 다른 쓰레기 5종을 한 어항에 배치','tank_trash',1,null,null,52),
('tank-small','작은 것들의 왕국',2,'collection','기본 크기 45 이하 물고기 10종을 한 어항에 배치','tank_small',1,null,null,53),
('friend-day-gift','이름보다 먼저 온 인연',1,'social','친구가 된 당일 서로 선물 보내기','friend_day_gift',1,null,null,54);
create function app_private.title_metrics(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
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
 ('daily_kinds',(select count(*) from (select play_day from logs where species_id is not null group by play_day having count(distinct kind)>=4) x)),
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
$$;

create function app_private.sync_player_titles(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare metrics jsonb;t record;
begin
 perform pg_advisory_xact_lock(hashtextextended('titles:'||p_user::text,0));
 metrics:=app_private.title_metrics(p_user);
 for t in select * from public.title_catalog c where coalesce((metrics->>c.metric)::bigint,0)>=c.target
 and (c.extra_metric is null or coalesce((metrics->>c.extra_metric)::bigint,0)>=c.extra_target)
 and not exists(select 1 from public.player_titles o where o.user_id=p_user and o.title_id=c.id) order by sort_order
 loop perform app_private.award_title(p_user,t.id);end loop;
 return metrics;
end $$;

create function app_private.title_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();m jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 m:=app_private.sync_player_titles(u);
 return jsonb_build_object('equipped',(select c.id from public.player_profiles p join public.title_catalog c on c.name=p.equipped_title where p.id=u),
 'titles',(select jsonb_agg(to_jsonb(c)||jsonb_build_object('earnedAt',o.earned_at,'progress',least(c.target,coalesce((m->>c.metric)::bigint,0)),
 'extraProgress',case when c.extra_metric is not null then least(c.extra_target,coalesce((m->>c.extra_metric)::bigint,0)) end) order by c.sort_order)
 from public.title_catalog c left join public.player_titles o on o.user_id=u and o.title_id=c.id));
end $$;
create function app_private.equip_title(p_title text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.sync_player_titles(u);
 if p_title is not null and not exists(select 1 from public.player_titles where user_id=u and title_id=p_title) then raise exception 'TITLE_NOT_EARNED';end if;
 update public.player_profiles set equipped_title=(select name from public.title_catalog where id=p_title) where id=u;
 if not found then raise exception 'PROFILE_NOT_FOUND';end if;
 return app_private.title_state();
end $$;
create function public.title_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.title_state()$$;
create function public.equip_title(p_title text default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.equip_title(p_title)$$;

create function app_private.sync_titles() returns integer language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();before_count integer;after_count integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 delete from app_private.title_dirty where user_id=u;
 if not found then return 0;end if;
 select count(*) into before_count from public.player_titles where user_id=u;
 perform app_private.sync_player_titles(u);
 select count(*) into after_count from public.player_titles where user_id=u;
 return after_count-before_count;
end $$;
create function public.sync_titles() returns integer language sql security invoker set search_path='' as $$select app_private.sync_titles()$$;

create function app_private.process_title_queue() returns integer language plpgsql security definer set search_path='' as $$
declare r record;n integer:=0;
begin
 for r in select user_id from app_private.title_dirty order by user_id limit 100 for update skip locked loop
  perform app_private.sync_player_titles(r.user_id);
  delete from app_private.title_dirty where user_id=r.user_id;n:=n+1;
 end loop;return n;
end $$;
-- Backfill only provable historical evidence. Last-bait evidence starts with this migration.
insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id,collectible_id,region_id,bait_id)
select a.user_id,'cast:'||a.operation_id,a.created_at,'manual',
 case when a.collectible_id is not null then coalesce(p.snapshot->>'kind',s.kind::text) end,
 case when a.collectible_id is not null then coalesce(p.snapshot->>'rarity',a.rarity::text) end,
 case when a.collectible_id is not null then coalesce(p.snapshot->>'id',s.id) end,a.collectible_id,a.region_id,a.bait_id
from public.fishing_attempts a left join app_private.prepared_fishing_casts p on p.user_id=a.user_id and p.operation_id=a.operation_id
left join public.player_collectibles c on c.id=a.collectible_id left join public.collectible_species s on s.id=c.species_id on conflict do nothing;
insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id,collectible_id,region_id,bait_id,vessel_id,batch_id)
select e.user_id,'exp:'||e.id||':'||item.ordinality,e.claimed_at,'expedition',item.value->'species'->>'kind',item.value->'species'->>'rarity',item.value->'species'->>'id',(item.value->>'id')::uuid,e.region_id,item.value->>'baitId',e.vessel_id,e.id::text
from public.fishing_expeditions e cross join lateral jsonb_array_elements(coalesce(e.result->'items','[]'::jsonb)) with ordinality item(value,ordinality)
where e.claimed_at is not null on conflict do nothing;
insert into app_private.title_dirty select id from public.player_profiles on conflict do nothing;

revoke all on function app_private.award_title(uuid,text),app_private.title_last_bait(),app_private.title_catch_event(),app_private.title_activity_event(),app_private.title_tank_event(),app_private.title_metrics(uuid),app_private.sync_player_titles(uuid),app_private.process_title_queue() from public,anon,authenticated;
revoke all on function app_private.title_state(),app_private.equip_title(text),public.title_state(),public.equip_title(text) from public,anon;
grant execute on function app_private.title_state(),app_private.equip_title(text),public.title_state(),public.equip_title(text) to authenticated;
revoke all on function app_private.sync_titles(),public.sync_titles() from public,anon;
grant execute on function app_private.sync_titles(),public.sync_titles() to authenticated;
do $$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('player-title-achievements','* * * * *','select app_private.process_title_queue()');
 end if;
end $$;
notify pgrst,'reload schema';
commit;
