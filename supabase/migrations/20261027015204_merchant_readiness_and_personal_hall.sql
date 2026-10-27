begin;

-- Read-only summary: never initialize wallets or regenerate the daily order board.
create or replace function app_private.merchant_summary(p_include_stock boolean default true)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid(); d date:=(statement_timestamp() at time zone 'Asia/Seoul')::date;
 total_orders integer; ready_orders integer:=0;
begin
 if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 select count(*) into total_orders from app_private.merchant_orders where day=d;
 if p_include_stock and total_orders>0 then
  with orders as materialized (
   select items from app_private.merchant_orders where day=d and completed_at is null
  ), stock as materialized (
   select c.species_id,count(*) n from public.player_collectibles c
   where c.user_id=caller and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null
    and c.species_id in (select item->>'speciesId' from orders o cross join lateral jsonb_array_elements(o.items) item)
   group by c.species_id
  )
  select count(*) into ready_orders from orders o
  where jsonb_array_length(o.items)>0 and not exists (
   select 1 from jsonb_array_elements(o.items) item left join stock s on s.species_id=item->>'speciesId'
   where coalesce(s.n,0)<(item->>'quantity')::integer
  );
 end if;
 return jsonb_build_object('ready',ready_orders,'total',total_orders,
  'availableAt',case when total_orders>0 then d::timestamp at time zone 'Asia/Seoul' end,
  'resetsAt',(d+1)::timestamp at time zone 'Asia/Seoul');
end $$;
revoke all on function app_private.merchant_summary(boolean) from public,anon;
-- Required by the existing invoker new_content_state wrapper; authenticated caller is checked above.
grant execute on function app_private.merchant_summary(boolean) to authenticated;

create or replace function app_private.menu_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid(); sampled_at timestamptz:=now();
begin
 if caller is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 return jsonb_build_object(
  'serverNow',sampled_at,
  'production',(select jsonb_build_object('total',count(*),'sites',coalesce(jsonb_agg(jsonb_build_object('completesAt',completes_at,'expiresAt',expires_at)) filter(where started_at is not null),'[]'::jsonb)) from app_private.production_sites where user_id=caller),
  'baitProduction',(select jsonb_build_object('total',count(*),'sites',coalesce(jsonb_agg(jsonb_build_object('completesAt',completes_at,'expiresAt',expires_at)) filter(where started_at is not null),'[]'::jsonb)) from app_private.bait_production_sites where user_id=caller),
  'harbor',jsonb_build_object('total',(select count(*) from public.harbor_boats where user_id=caller and sold_at is null),
   'dockSlots',coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=caller),2),
   'returnsAt',coalesce((select jsonb_agg(returns_at) from public.harbor_voyages where user_id=caller and claimed_at is null),'[]'::jsonb)),
  'expedition',jsonb_build_object('returnsAt',(select returns_at from public.fishing_expeditions where user_id=caller and claimed_at is null)),
  'personalBait',jsonb_build_object('completesAt',(select completes_at from app_private.personal_bait_jobs where user_id=caller and claimed_at is null order by started_at desc limit 1)),
  'savings',jsonb_build_object('account',(select app_private.savings_payload(a,sampled_at) from public.shell_savings a where a.user_id=caller and a.closed_at is null)),
  'merchant',app_private.merchant_summary()
 );
end $$;

create or replace function public.new_content_state()
returns jsonb language plpgsql stable set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object(
  'board',(select created_at from public.board_posts where author_id<>u order by created_at desc,id desc limit 1),
  'exchange',(select created_at from public.exchange_listings where owner_id<>u and status='active' and side='sell'
   and offer->>'kind' in ('collectible','bait','fuel') and wanted->>'kind'='gold' and wanted->>'id'='gold' order by created_at desc,id limit 1),
  'suggestions',(select created_at from public.suggestion_posts where author_id<>u order by created_at desc,id desc limit 1),
  'bugs',(select created_at from public.bug_reports where author_id<>u order by created_at desc,id desc limit 1),
  'showcase',(select created_at from public.fishing_showcase_posts where author_id<>u order by created_at desc,id desc limit 1),
  'merchant',(app_private.merchant_summary(false)->>'availableAt')::timestamptz
 );
end $$;

-- One ranked snapshot serves TOP 5, the caller's exact rank and its two neighbors on each side.
create or replace function app_private.hall_of_fame()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;caller uuid:=auth.uid();
begin
 if caller is null then raise exception 'AUTH_REQUIRED';end if;
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
  select user_id,count(*) filter(where kind='fish') fish,count(*) filter(where rarity='mythic') mythic,
   count(*) filter(where kind='decoration') decorations from catches group by user_id
 ), daily as (
  select user_id,play_day,count(*) n from manual group by user_id,play_day
 ), runs as (
  select user_id,max(n) filter(where success) success,max(n) filter(where not success) failure
  from (select user_id,species_id is not null success,run,count(*) n from manual group by user_id,(species_id is not null),run) s group by user_id
 ), games as materialized (
  select user_id,'brick_plays'::text game from public.brick_game_runs
  union all select user_id,'shadow_plays' from public.shadow_game_runs
  union all select user_id,'memory_plays' from public.memory_game_runs
  union all select user_id,'odd_even_plays' from public.odd_even_runs
  union all select user_id,'ladder_plays' from app_private.ladder_runs
 ), arcade as (
  select user_id,sum(delta::bigint) filter(where delta>0) earned,-sum(delta::bigint) filter(where delta<0) spent
  from public.gold_transactions where item_id like 'arcade:%' group by user_id
 ), sales as (
  select case when side='sell' then owner_id else taker_id end user_id from public.exchange_listings where status='completed'
 ), purchases as (
  select case when side='sell' then taker_id else owner_id end user_id from public.exchange_listings where status='completed'
 ), reactions as materialized (
  select c.author_id user_id,r.value from app_private.hall_section_comment_reactions r
  join app_private.hall_section_comments c on c.id=r.comment_id where r.user_id<>c.author_id
  union all select target_id user_id,value from app_private.hall_reactions
  union all
  select coalesce(c.author_id,p.author_id),r.value from public.board_reactions r
  join public.board_posts p on p.id=r.post_id left join public.board_comments c on c.id=r.comment_id
  where r.user_id<>coalesce(c.author_id,p.author_id) and (r.comment_id is null or not c.deleted)
 ), helps as (
  select visitor_id user_id from public.aquarium_feedings where completed_at is not null and visitor_id<>owner_id
  union all select visitor_id from public.aquarium_cleanings where completed_at is not null and visitor_id<>owner_id
  union all select helper_id from app_private.expedition_boosts
 ), metrics as materialized (
  select user_id,'casts' key,attempts::numeric value from fishing
  union all select user_id,'fish',fish from totals
  union all select d.user_id,'collection',100.0*count(*)/greatest((select count(*) from public.collectible_species where kind<>'map'),1)
   from public.player_discoveries d join public.collectible_species s on s.id=d.species_id where s.kind<>'map' group by d.user_id
  union all select user_id,'mythic',mythic from totals
  union all select user_id,'mythic_rate',100.0*mythic/attempts from fishing where attempts>=100
  union all select user_id,'failure_rate',100.0*failures/attempts from fishing where attempts>=100
  union all select sender_id,'gifts',count(*) from public.collectible_gifts where source='friend' and sender_id<>recipient_id group by sender_id
  union all select user_id,'sales',count(*) from sales group by user_id
  union all select user_id,'purchases',count(*) from purchases group by user_id
  union all select user_id,'titles',count(*) from public.player_titles group by user_id
  union all select visitor_id,'cleanings',count(*) from public.aquarium_cleanings where completed_at is not null and visitor_id<>owner_id group by visitor_id
  union all select visitor_id,'feedings',count(*) from public.aquarium_feedings where completed_at is not null and visitor_id<>owner_id group by visitor_id
  union all select user_id,'voyages',count(*) from public.harbor_voyages group by user_id
  union all select user_id,'games',count(*) from games group by user_id
  union all select user_id,game,count(*) from games group by user_id,game
  union all select user_id,'arcade_earned',earned from arcade
  union all select user_id,'arcade_spent',spent from arcade
  union all select user_id,'decorations',decorations from totals
  union all select p.user_id,'control_miss',count(*) from app_private.prepared_fishing_casts p where p.finished_at is not null and p.result->>'failure_reason'='minigame' group by p.user_id
  union all select user_id,'daily',max(n) from daily group by user_id
  union all select user_id,'failure_run',failure from runs
  union all select user_id,'trash',count(*) from manual where kind='trash' group by user_id
  union all select user_id,'likes',count(*) from reactions where value=1 group by user_id
  union all select user_id,'dislikes',count(*) from reactions where value=-1 group by user_id
  union all select user_id,'helps',count(*) from helps group by user_id
 ), ranked as materialized (
  select m.*,p.nickname,p.avatar_path,row_number() over(partition by key order by value desc,p.created_at,p.id) rank
  from metrics m join participants p on p.id=m.user_id where m.value>0
 ), own_metrics as (
  select key,value from metrics where user_id=caller
  union all select 'mythic_rate',100.0*mythic/attempts from fishing where user_id=caller and attempts between 1 and 99
  union all select 'failure_rate',100.0*failures/attempts from fishing where user_id=caller and attempts between 1 and 99
 ), grouped as (
  select key,jsonb_agg(jsonb_build_object('id',user_id,'level',app_private.player_level(user_id),'levelProgress',app_private.player_level_progress(user_id),'nickname',nickname,'avatar_path',avatar_path,'value',value,'rank',rank) order by rank) rows
  from ranked where rank<=5 group by key
 ), personal as (
  select m.key,jsonb_build_object('rank',mine.rank,'value',m.value,'neighbors',coalesce((
   select jsonb_agg(jsonb_build_object('id',r.user_id,'level',app_private.player_level(r.user_id),'levelProgress',app_private.player_level_progress(r.user_id),'nickname',r.nickname,'avatar_path',r.avatar_path,'value',r.value,'rank',r.rank) order by r.rank)
   from ranked r where r.key=m.key and r.rank between mine.rank-2 and mine.rank+2
  ),'[]'::jsonb)) payload
  from own_metrics m left join ranked mine on mine.key=m.key and mine.user_id=caller
 )
 select jsonb_build_object('rankings',coalesce((select jsonb_object_agg(key,rows) from grouped),'{}'::jsonb),
  'personal',coalesce((select jsonb_object_agg(key,payload) from personal),'{}'::jsonb),'generatedAt',statement_timestamp()) into result;
 return result;
end $$;

notify pgrst,'reload schema';
commit;
