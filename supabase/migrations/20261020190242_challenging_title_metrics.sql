begin;
create function app_private.challenge_title_metrics(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
with logs as materialized (
 select *, (occurred_at at time zone 'Asia/Seoul')::date play_day from app_private.title_fishing_log where user_id=p_user and source='manual'
), runs as materialized (
 select *,count(*) over w12 n12,count(*) over w5 n5,count(*) over w3 n3,count(*) over w2 n2,count(*) over w7 n7,
 bool_and(coalesce(kind='fish' and species_id is not null,false)) over w12 fish12,
 bool_and(coalesce(kind='fish' and species_id is not null and rarity in ('rare','epic','mythic'),false)) over w5 rare5,
 bool_and(coalesce(kind='fish' and species_id is not null and rarity in ('epic','mythic'),false)) over w3 epic3,
 bool_and(coalesce(kind='fish' and species_id is not null and rarity='mythic',false)) over w2 mythic2,
 bool_and(coalesce(kind='trash' and species_id is not null,false)) over w7 trash7
 from logs window
 w12 as (order by occurred_at,id rows between 11 preceding and current row),
 w5 as (order by occurred_at,id rows between 4 preceding and current row),
 w3 as (order by occurred_at,id rows between 2 preceding and current row),
 w2 as (order by occurred_at,id rows between 1 preceding and current row),
 w7 as (order by occurred_at,id rows between 6 preceding and current row)
), fish as materialized (select * from logs where kind='fish' and species_id is not null),
 days as materialized (
 select play_day,count(distinct kind) filter(where kind in ('fish','trash','decoration') and species_id is not null) kinds,
 count(distinct rarity) filter(where kind='fish' and species_id is not null) grades from logs group by play_day
), deliveries as materialized (
 select o.items from app_private.merchant_deliveries d join app_private.merchant_orders o on o.id=d.order_id where d.user_id=p_user and o.completed_at is not null and o.completed_by=d.user_id
), harbor as materialized (
 select result from public.harbor_voyages where user_id=p_user and claimed_at is not null
)
select jsonb_build_object(
 'challenge_manual',(select count(*) from logs),
 'challenge_days',(select count(distinct play_day) from logs),
 'challenge_fish12',(select count(*) from runs where n12=12 and fish12),
 'challenge_rare5',(select count(*) from runs where n5=5 and rare5),
 'challenge_epic3',(select count(*) from runs where n3=3 and epic3),
 'challenge_mythic2',(select count(*) from runs where n2=2 and mythic2),
 'challenge_trash7',(select count(*) from runs where n7=7 and trash7),
 'challenge_same_fish',coalesce((select max(n) from (select count(*) n from fish group by species_id) q),0),
 'challenge_unique',(select count(distinct species_id) from fish),
 'challenge_mythic_seas',(select count(distinct region_id) from fish where rarity='mythic'),
 'challenge_mythic_baits',(select count(distinct bait_id) from fish where rarity='mythic'),
 'challenge_rainbow_days',(select count(*) from days where grades=4),
 'challenge_rare_unique',(select count(distinct species_id) from fish where rarity='rare'),
 'challenge_epic_unique',(select count(distinct species_id) from fish where rarity='epic'),
 'challenge_mythic_unique',(select count(distinct species_id) from fish where rarity='mythic'),
 'challenge_crumbs',(select count(*) from fish where bait_id='bait_shell_crumbs' and rarity='rare'),
 'challenge_pupa',(select count(*) from fish where bait_id='bait_firefly_pupa' and rarity='epic'),
 'challenge_lightning',(select count(*) from fish where bait_id='bait_lightning_stardust' and rarity='epic'),
 'challenge_wax',(select count(*) from fish where bait_id='bait_starlight_wax' and rarity='mythic'),
 'challenge_star',(select count(*) from fish where bait_id='bait_cracked_star' and rarity='mythic'),
 'challenge_cloud',(select count(*) from fish where bait_id='bait_cloud_dough' and rarity='common'),
 'challenge_worm',(select count(*) from fish where bait_id='bait' and rarity='mythic'),
 'challenge_last_mythic',(select count(*) from fish where last_bait and rarity='mythic'),
 'challenge_buffet_days',(select count(*) from days where kinds=3),
 'challenge_deliveries',(select count(*) from deliveries),
 'challenge_delivery_species',(select count(distinct a->>'speciesId') from deliveries cross join lateral jsonb_array_elements(items) a),
 'challenge_delivery_mythic',(select count(*) from deliveries where exists(select 1 from jsonb_array_elements(items) a where a->>'rarity'='mythic')),
 'challenge_harbor',(select count(*) from harbor),
 'challenge_harbor_pair',(select count(*) from harbor where (select count(*) from jsonb_array_elements(coalesce(result->'items','[]'::jsonb)) a where a->'species'->>'kind'='fish' and a->'species'->>'rarity'='mythic')>=2)
)
$$;
revoke all on function app_private.challenge_title_metrics(uuid) from public,anon,authenticated;

create or replace function app_private.sync_player_titles(p_user uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare metrics jsonb;t record;
begin
 perform pg_advisory_xact_lock(hashtextextended('titles:'||p_user::text,0));
 metrics:=app_private.title_metrics(p_user)||app_private.rare_title_metrics(p_user)||app_private.challenge_title_metrics(p_user);
 for t in select * from public.title_catalog c where coalesce((metrics->>c.metric)::bigint,0)>=c.target
 and (c.extra_metric is null or coalesce((metrics->>c.extra_metric)::bigint,0)>=c.extra_target)
 and not exists(select 1 from public.player_titles o where o.user_id=p_user and o.title_id=c.id) order by sort_order
 loop perform app_private.award_title(p_user,t.id);end loop;
 return metrics;
end $$;
revoke all on function app_private.sync_player_titles(uuid) from public,anon,authenticated;

create trigger merchant_titles_dirty after insert on app_private.merchant_deliveries
for each row execute function app_private.title_activity_event();

-- New definitions also reconsider existing evidence; only newly earned titles notify.
create function app_private.queue_title_catalog_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into app_private.title_dirty(user_id) select id from public.player_profiles on conflict do nothing;
 return null;
end $$;
revoke all on function app_private.queue_title_catalog_change() from public,anon,authenticated;
create trigger title_catalog_changed after insert or update on public.title_catalog
for each statement execute function app_private.queue_title_catalog_change();
commit;
