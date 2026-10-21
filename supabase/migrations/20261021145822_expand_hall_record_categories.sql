begin;
-- Reuse persisted evidence; never infer catches from current ownership or gifts.
-- Filter the requested account before ranking so it cannot occupy a TOP 5 slot.
create or replace function app_private.hall_of_fame() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 with participants as materialized (
  select p.id,p.nickname,p.avatar_path,p.created_at from public.player_profiles p
  join auth.users u on u.id=p.id where lower(coalesce(u.email,''))<>'1@1.com'
 ), logs as materialized (
  select l.user_id,l.id,l.occurred_at,l.source,l.kind,l.rarity,l.species_id
  from app_private.title_fishing_log l join participants p on p.id=l.user_id
 ), catches as materialized (
  select user_id,kind,rarity from logs where species_id is not null
  union all
  select v.user_id,item->'species'->>'kind',item->'species'->>'rarity'
  from public.harbor_voyages v join participants p on p.id=v.user_id
  cross join lateral jsonb_array_elements(coalesce(v.result->'items','[]'::jsonb)) item
  where v.claimed_at is not null
 ), manual as materialized (
  select *, (occurred_at at time zone 'Asia/Seoul')::date play_day,
   row_number() over(partition by user_id order by occurred_at,id)
   -row_number() over(partition by user_id,(species_id is not null) order by occurred_at,id) run
  from logs where source='manual'
 ), fishing as (
  select user_id,count(*) attempts,count(*) filter(where species_id is null) failures,
   count(*) filter(where species_id is not null and rarity='mythic') mythic
  from manual group by user_id
 ), totals as (
  select user_id,count(*) filter(where kind='fish') fish,
   count(*) filter(where rarity='mythic') mythic,
   count(*) filter(where kind='decoration') decorations from catches group by user_id
 ), daily as (
  select user_id,play_day,count(*) n from manual group by user_id,play_day
 ), runs as (
  select user_id,max(n) filter(where success) success,max(n) filter(where not success) failure
  from (select user_id,species_id is not null success,run,count(*) n
   from manual group by user_id,(species_id is not null),run) s group by user_id
 ), games as (
  select user_id from public.brick_game_runs union all select user_id from public.shadow_game_runs
  union all select user_id from public.memory_game_runs union all select user_id from public.odd_even_runs
  union all select user_id from app_private.ladder_runs
 ), arcade as (
  select user_id,sum(delta::bigint) filter(where delta>0) earned,
   -sum(delta::bigint) filter(where delta<0) spent
  from public.gold_transactions where item_id like 'arcade:%' group by user_id
 ), sales as (
  select case when side='sell' then owner_id else taker_id end user_id
  from public.exchange_listings where status='completed'
 ), purchases as (
  select case when side='sell' then taker_id else owner_id end user_id
  from public.exchange_listings where status='completed'
 ), reactions as materialized (
  select target_id user_id,value from app_private.hall_reactions
  union all
  select coalesce(c.author_id,p.author_id),r.value from public.board_reactions r
  join public.board_posts p on p.id=r.post_id left join public.board_comments c on c.id=r.comment_id
  where r.user_id<>coalesce(c.author_id,p.author_id) and (r.comment_id is null or not c.deleted)
 ), helps as (
  select visitor_id user_id from public.aquarium_feedings where completed_at is not null and visitor_id<>owner_id
  union all select visitor_id from public.aquarium_cleanings where completed_at is not null and visitor_id<>owner_id
  union all select helper_id from app_private.expedition_boosts
 ), metrics as (
  select user_id,'casts' key,attempts::numeric value from fishing
  union all select user_id,'fish',fish from totals
  union all select d.user_id,'collection',100.0*count(*)/greatest((select count(*) from public.collectible_species where kind<>'map'),1)
   from public.player_discoveries d join public.collectible_species s on s.id=d.species_id where s.kind<>'map' group by d.user_id
  union all select user_id,'mythic',mythic from totals
  union all select user_id,'mythic_rate',100.0*mythic/attempts from fishing where attempts>=100
  union all select user_id,'failure_rate',100.0*failures/attempts from fishing where attempts>=100
  union all select sender_id,'gifts',count(*) from public.collectible_gifts
   where source='friend' and sender_id<>recipient_id group by sender_id
  union all select user_id,'sales',count(*) from sales group by user_id
  union all select user_id,'purchases',count(*) from purchases group by user_id
  union all select user_id,'titles',count(*) from public.player_titles group by user_id
  union all select visitor_id,'cleanings',count(*) from public.aquarium_cleanings
   where completed_at is not null and visitor_id<>owner_id group by visitor_id
  union all select visitor_id,'feedings',count(*) from public.aquarium_feedings
   where completed_at is not null and visitor_id<>owner_id group by visitor_id
  union all select user_id,'voyages',count(*) from public.harbor_voyages group by user_id
  union all select user_id,'games',count(*) from games group by user_id
  union all select user_id,'arcade_earned',earned from arcade
  union all select user_id,'arcade_spent',spent from arcade
  union all select user_id,'decorations',decorations from totals
  union all select p.user_id,'control_miss',count(*) from app_private.prepared_fishing_casts p
   where p.finished_at is not null and p.result->>'failure_reason'='minigame' group by p.user_id
  union all select user_id,'daily',max(n) from daily group by user_id
  union all select user_id,'success_run',success from runs
  union all select user_id,'failure_run',failure from runs
  union all select user_id,'trash',count(*) from manual where kind='trash' group by user_id
  union all select user_id,'likes',count(*) from reactions where value=1 group by user_id
  union all select user_id,'dislikes',count(*) from reactions where value=-1 group by user_id
  union all select user_id,'helps',count(*) from helps group by user_id
 ), ranked as (
  select m.*,p.nickname,p.avatar_path,row_number() over(partition by key order by value desc,p.created_at,p.id) rank
  from metrics m join participants p on p.id=m.user_id where m.value>0
 ), grouped as (
  select key,jsonb_agg(jsonb_build_object('id',user_id,'nickname',nickname,'avatar_path',avatar_path,'value',value,'rank',rank) order by rank) rows
  from ranked where rank<=5 group by key
 ) select coalesce(jsonb_object_agg(key,rows),'{}'::jsonb) into result from grouped;
 return jsonb_build_object('rankings',result,'generatedAt',statement_timestamp());
end $$;
revoke all on function app_private.hall_of_fame() from public,anon;
grant execute on function app_private.hall_of_fame() to authenticated;
commit;
