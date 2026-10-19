begin;

-- Private acquisition-time evidence is retained independently of inventory sales.
create table app_private.title_acquisition_evidence (
 collectible_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 species_id text not null,
 first_discovery boolean not null,
 last_mythic_discovery boolean not null,
 native_collection_complete boolean not null
);
create index title_acquisition_evidence_user_idx on app_private.title_acquisition_evidence(user_id);
alter table app_private.title_acquisition_evidence enable row level security;
revoke all on app_private.title_acquisition_evidence from public,anon,authenticated;

create function app_private.capture_title_acquisition() returns trigger
language plpgsql security definer set search_path='' as $$
declare s public.collectible_species;fresh boolean;last_one boolean:=false;complete boolean:=false;
begin
 perform pg_advisory_xact_lock(hashtextextended('title-acquisition:'||new.user_id::text,0));
 select * into strict s from public.collectible_species where id=new.species_id;
 fresh:=not exists(select 1 from public.player_discoveries where user_id=new.user_id and species_id=new.species_id);
 if fresh and s.kind='fish' and s.rarity='mythic' then
  last_one:=not exists(select 1 from public.collectible_species x where x.kind='fish' and x.rarity='mythic' and x.id<>s.id
   and not exists(select 1 from public.player_discoveries d where d.user_id=new.user_id and d.species_id=x.id));
 end if;
 if s.is_native then
  complete:=not exists(select 1 from public.collectible_species x where x.is_native and x.native_region_id=s.native_region_id
   and not exists(select 1 from public.player_discoveries d where d.user_id=new.user_id and d.species_id=x.id));
 end if;
 insert into app_private.title_acquisition_evidence values(new.id,new.user_id,new.species_id,fresh,last_one,complete);
 insert into app_private.title_dirty values(new.user_id) on conflict do nothing;
 return new;
end $$;
revoke all on function app_private.capture_title_acquisition() from public,anon,authenticated;
create trigger capture_title_acquisition after insert on public.player_collectibles
 for each row execute function app_private.capture_title_acquisition();

insert into public.title_catalog(id,name,tier,category,description,metric,target,sort_order) values
 ('sea-recognized','바다가 먼저 알아본 사람',4,'moment','같은 해역에서 서로 다른 신화 토착종 2종 직접 포획','rare_native_mythics',2,201),
 ('forgotten-home','돌아갈 바다를 잊은',4,'moment','한 해역 토착종을 모두 발견한 뒤 다른 해역에서 해당 해역 신화 토착종 직접 포획','rare_foreign_mythic',1,202),
 ('not-trash','쓰레기라 부르지 마세요',4,'collection','한 어항에 서로 다른 쓰레기 20종 전시','rare_trash_tank',20,203),
 ('ink-master','여백의 주인',4,'collection','한 어항에 묵향 토착종만 10마리 이상 전시하고 현무 포함','rare_ink_tank',1,204),
 ('nameless-friends','이름 없는 것들의 친구',4,'collection','소라의 첫인사로 서로 다른 미발견 생물 50종 발견','rare_conch_new',50,205),
 ('last-miracle','마지막 한 입의 기적',4,'moment','마지막 남은 미끼로 미발견 신화종 직접 포획','rare_last_miracle',1,206),
 ('last-legend','한 칸 남은 전설',4,'moment','도감의 미발견 신화 물고기가 1종 남았을 때 직접 낚시로 완성','rare_last_legend',1,207),
 ('sleeping-stars','별들이 잠든 어항',4,'collection','서로 다른 해역의 신화 토착종 7종을 한 어항에 전시','rare_stars_tank',7,208),
 ('never-anchor','닻을 내리지 않는 사람',4,'collection','모든 해역에서 배 조업으로 해당 해역 토착종 획득','rare_all_seas',1,209),
 ('slow-collector','가장 느린 수집가',4,'collection','낚시용 뗏목 조업으로 서로 다른 미발견 생물 100종 발견','rare_raft_new',100,210);

create function app_private.rare_title_metrics(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
with manual as materialized (
 select l.*,s.native_region_id,s.is_native,e.first_discovery,e.last_mythic_discovery,e.native_collection_complete
 from app_private.title_fishing_log l join public.collectible_species s on s.id=l.species_id
 left join app_private.title_acquisition_evidence e on e.collectible_id=l.collectible_id and e.user_id=l.user_id
 where l.user_id=p_user and l.source='manual'
), harbor as materialized (
 select v.region_id,v.vessel_id,v.vessel_snapshot->>'catch_bait_id' bait_id,item->'species'->>'id' species_id,
 s.native_region_id,s.is_native,e.first_discovery
 from public.harbor_voyages v cross join lateral jsonb_array_elements(coalesce(v.result->'items','[]'::jsonb)) item
 join public.collectible_species s on s.id=item->'species'->>'id'
 left join app_private.title_acquisition_evidence e on e.collectible_id=(item->>'id')::uuid and e.user_id=v.user_id
 where v.user_id=p_user and v.claimed_at is not null
), conch as (
 select species_id from manual where bait_id='bait_first_greeting' and first_discovery
 union select species_id from harbor where bait_id='bait_first_greeting' and first_discovery
 union select l.species_id from app_private.title_fishing_log l
 join app_private.title_acquisition_evidence e on e.collectible_id=l.collectible_id and e.user_id=l.user_id
 where l.user_id=p_user and l.source='expedition' and l.bait_id='bait_first_greeting' and e.first_discovery
), tanks as materialized (
 select c.tank_id,count(*) occupants,
 count(*) filter(where s.is_native and s.native_region_id='mukhyang') ink,
 bool_or(s.id='muk-hyeonmu') hyeonmu,
 count(distinct s.id) filter(where s.kind='trash') trash,
 count(distinct s.native_region_id) filter(where s.rarity='mythic' and s.is_native) stars
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=p_user and c.tank_id is not null and c.sold_at is null and c.escrow_gift_id is null group by c.tank_id
)
select jsonb_build_object(
 'rare_native_mythics',coalesce((select max(n) from (select count(distinct species_id) n from manual where rarity='mythic' and is_native and native_region_id=region_id group by region_id) x),0),
 'rare_foreign_mythic',(select count(*) from manual where rarity='mythic' and is_native and native_region_id<>region_id and native_collection_complete),
 'rare_trash_tank',coalesce((select max(trash) from tanks),0),
 'rare_ink_tank',(select count(*) from tanks where occupants>=10 and ink=occupants and hyeonmu),
 'rare_conch_new',(select count(*) from conch),
 'rare_last_miracle',(select count(*) from manual where rarity='mythic' and last_bait and first_discovery),
 'rare_last_legend',(select count(*) from manual where rarity='mythic' and last_mythic_discovery),
 'rare_stars_tank',coalesce((select max(stars) from tanks),0),
 'rare_all_seas',case when not exists(select 1 from public.regions r where not exists(select 1 from harbor h where h.region_id=r.id and h.is_native and h.native_region_id=r.id)) then 1 else 0 end,
 'rare_raft_new',(select count(distinct species_id) from harbor where vessel_id='fishing-raft' and first_discovery)
);
$$;
revoke all on function app_private.rare_title_metrics(uuid) from public,anon,authenticated;

-- Preserve tank achievements even when a player rearranges the tank before opening titles.
create function app_private.rare_title_tank_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare m jsonb;t record;
begin
 if new.tank_id is null or new.sold_at is not null or new.escrow_gift_id is not null then return new;end if;
 m:=app_private.rare_title_metrics(new.user_id);
 for t in select id from public.title_catalog where metric in ('rare_trash_tank','rare_ink_tank','rare_stars_tank') and coalesce((m->>metric)::integer,0)>=target
 loop perform app_private.award_title(new.user_id,t.id);end loop;
 return new;
end $$;
revoke all on function app_private.rare_title_tank_event() from public,anon,authenticated;
create trigger rare_title_tank after insert or update of tank_id on public.player_collectibles
 for each row execute function app_private.rare_title_tank_event();

create function app_private.mark_harbor_titles_dirty() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.claimed_at is not null and old.claimed_at is null then
  insert into app_private.title_dirty values(new.user_id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function app_private.mark_harbor_titles_dirty() from public,anon,authenticated;
create trigger harbor_titles_dirty after update of claimed_at on public.harbor_voyages
 for each row execute function app_private.mark_harbor_titles_dirty();

-- Authenticated callers can read requirements only for titles they already own.
drop policy title_catalog_read on public.title_catalog;
create policy title_catalog_read on public.title_catalog for select to authenticated
 using(exists(select 1 from public.player_titles o where o.user_id=(select auth.uid()) and o.title_id=title_catalog.id));

CREATE OR REPLACE FUNCTION app_private.sync_player_titles(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare metrics jsonb;t record;
begin
 perform pg_advisory_xact_lock(hashtextextended('titles:'||p_user::text,0));
 metrics:=app_private.title_metrics(p_user)||app_private.rare_title_metrics(p_user);
 for t in select * from public.title_catalog c where coalesce((metrics->>c.metric)::bigint,0)>=c.target
 and (c.extra_metric is null or coalesce((metrics->>c.extra_metric)::bigint,0)>=c.extra_target)
 and not exists(select 1 from public.player_titles o where o.user_id=p_user and o.title_id=c.id) order by sort_order
 loop perform app_private.award_title(p_user,t.id);end loop;
 return metrics;
end $function$
;

create or replace function app_private.title_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();m jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 m:=app_private.sync_player_titles(u);
 return jsonb_build_object('equipped',(select c.id from public.player_profiles p join public.title_catalog c on c.name=p.equipped_title where p.id=u),
 'titles',(select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'tier',c.tier,'category',c.category,'earnedAt',o.earned_at,
 'description',case when o.earned_at is not null then c.description end,
 'target',case when o.earned_at is not null then c.target end,
 'progress',case when o.earned_at is not null then c.target end,
 'extra_target',case when o.earned_at is not null then c.extra_target end,
 'extraProgress',case when o.earned_at is not null then c.extra_target end) order by c.sort_order)
 from public.title_catalog c left join public.player_titles o on o.user_id=u and o.title_id=c.id));
end $$;

-- Queue existing players for reevaluation without changing existing ownership.
insert into app_private.title_dirty(user_id) select id from public.player_profiles on conflict do nothing;
notify pgrst, 'reload schema';
commit;
