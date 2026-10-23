begin;
-- Count each persisted server game start once; free practice has no run row.
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
), arcade_counts as materialized (
 select (select count(*) from app_private.ladder_runs where user_id=p_user) ladder,
 (select count(*) from public.odd_even_runs where user_id=p_user) odd_even,
 (select count(*) from public.brick_game_runs where user_id=p_user) brick,
 (select count(*) from public.shadow_game_runs where user_id=p_user) shadow,
 (select count(*) from public.memory_game_runs where user_id=p_user) memory
), values_list(key,value) as (values
 ('arcade_ladder',(select ladder from arcade_counts)),
 ('arcade_odd_even',(select odd_even from arcade_counts)),
 ('arcade_brick',(select brick from arcade_counts)),
 ('arcade_shadow',(select shadow from arcade_counts)),
 ('arcade_memory',(select memory from arcade_counts)),
 ('arcade_total',(select ladder+odd_even+brick+shadow+memory from arcade_counts)),
 ('arcade_variety',(select (ladder>0)::int+(odd_even>0)::int+(brick>0)::int+(shadow>0)::int+(memory>0)::int from arcade_counts)),
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
create trigger arcade_title_started after insert on app_private.ladder_runs for each row execute function app_private.title_activity_event();
create trigger arcade_title_started after insert on public.odd_even_runs for each row execute function app_private.title_activity_event();
create trigger arcade_title_started after insert on public.brick_game_runs for each row execute function app_private.title_activity_event();
create trigger arcade_title_started after insert on public.shadow_game_runs for each row execute function app_private.title_activity_event();
create trigger arcade_title_started after insert on public.memory_game_runs for each row execute function app_private.title_activity_event();
notify pgrst,'reload schema';
commit;
