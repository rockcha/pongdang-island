begin;
create function app_private.player_level(p_user uuid) returns integer
 language sql stable security definer set search_path='' as $$
 select floor((-1+sqrt(9+4*coalesce((select total_xp from app_private.player_experience where user_id=p_user),0)::numeric/25))/2)::integer
$$;
create function app_private.player_levels(p_ids uuid[],p_friend_codes text[] default '{}'::text[]) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_ids is null or cardinality(p_ids)>100 or p_friend_codes is null or cardinality(p_friend_codes)>100 then raise exception 'INVALID_PLAYER_IDS';end if;
 -- Authorize the displayed identity before reading private progression. A
 -- profile UUID alone is never sufficient. Match existing display visibility.
 return coalesce((select jsonb_agg(jsonb_build_object('userId',p.id,'level',app_private.player_level(p.id)) order by p.id)
 from public.player_profiles p where p.id=any(p_ids) and (
  p.id=auth.uid()
  or p.friend_code=any(p_friend_codes)
  or exists(select 1 from public.friend_requests f where f.status in ('pending','accepted') and ((f.sender_id=auth.uid() and f.recipient_id=p.id) or(f.recipient_id=auth.uid() and f.sender_id=p.id)))
  or exists(select 1 from public.exchange_listings l where l.owner_id=p.id and l.side='sell' and (l.status in ('active','completed') or l.owner_id=auth.uid()))
  or exists(select 1 from public.exchange_listing_comments c join public.exchange_listings l on l.id=c.listing_id where c.user_id=p.id and l.side='sell' and (l.status in ('active','completed') or l.owner_id=auth.uid()))
  or exists(select 1 from public.board_posts b where b.author_id=p.id)
  or exists(select 1 from public.board_comments c where c.author_id=p.id and not c.deleted)
  or exists(select 1 from public.bug_reports b where b.author_id=p.id)
  or exists(select 1 from public.suggestion_posts s where s.author_id=p.id and (not s.friends_only or s.author_id=auth.uid() or (select app_private.notice_is_operator()) or exists(select 1 from public.friend_requests f where f.status='accepted' and ((f.sender_id=auth.uid() and f.recipient_id=s.author_id) or(f.recipient_id=auth.uid() and f.sender_id=s.author_id)))))
  or exists(select 1 from public.fishing_showcase_posts s where s.author_id=p.id)
  or exists(select 1 from public.fishing_showcase_reactions r join public.fishing_showcase_posts s on s.id=r.post_id where r.user_id=p.id)
  or exists(select 1 from public.collectible_gifts g where not g.exchange_hold and (g.sender_id=auth.uid() or g.recipient_id=auth.uid()) and p.id in (g.sender_id,g.recipient_id))
  or exists(select 1 from app_private.hall_comments c where c.author_id=p.id)
  or exists(select 1 from app_private.hall_section_comments c where c.author_id=p.id)
 )),'[]'::jsonb);
end $$;
create function public.player_levels(p_ids uuid[],p_friend_codes text[] default '{}'::text[]) returns jsonb language sql stable set search_path='' as $$ select app_private.player_levels(p_ids,p_friend_codes) $$;
revoke all on function app_private.player_level(uuid),app_private.player_levels(uuid[],text[]),public.player_levels(uuid[],text[]) from public,anon,authenticated;
grant execute on function app_private.player_levels(uuid[],text[]),public.player_levels(uuid[],text[]) to authenticated;

-- Merchant delivery snapshots expose public display data, never account IDs.
CREATE OR REPLACE FUNCTION app_private.merchant_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();d date;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 loop
  perform app_private.ensure_merchant_orders();
  d:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
  exit when exists(select 1 from app_private.merchant_days m where m.day=d);
 end loop;
 with stock as materialized (select c.species_id,count(*) n from public.player_collectibles c where c.user_id=uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null group by c.species_id)
 select jsonb_build_object('day',d,'serverNow',clock_timestamp(),'resetsAt',(d+1)::timestamp at time zone 'Asia/Seoul','dailyLimit',null,
 'deliveredToday',(select count(*) from app_private.merchant_deliveries x where x.user_id=uid and x.day=d),
 'orders',coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.slot,'tier',o.tier,'regionName',r.name,
 'baseGold',o.base_gold,'rewardGold',o.reward_gold,'completed',o.completed_at is not null,'mine',coalesce(o.completed_by=uid,false),
 'delivery',case when o.completed_at is not null then jsonb_build_object('nickname',coalesce(o.completed_name,'섬 모험가'),'avatarPath',case when profile.id is not null then profile.avatar_path else o.completed_avatar_path end,'message',o.completed_message,'level',case when profile.id is not null then app_private.player_level(profile.id) end) end,
 'items',(select jsonb_agg(item||jsonb_build_object('owned',coalesce(stock.n,0)) order by ord) from jsonb_array_elements(o.items) with ordinality a(item,ord)
 left join stock on stock.species_id=item->>'speciesId')) order by o.slot),'[]'::jsonb)) into result
 from app_private.merchant_orders o left join public.regions r on r.id=o.region_id left join public.player_profiles profile on profile.id=o.completed_by where o.day=d;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.expedition_boosts_payload(p_expedition uuid)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $function$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path,'minutes',minutes,'created_at',created_at,'level',app_private.player_level(helper_id)) order by created_at,id),'[]'::jsonb)
 from app_private.expedition_boosts where expedition_id=p_expedition;
$function$;
CREATE OR REPLACE FUNCTION app_private.hall_of_fame()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  select c.author_id user_id,r.value from app_private.hall_section_comment_reactions r
  join app_private.hall_section_comments c on c.id=r.comment_id where r.user_id<>c.author_id
  union all
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
  union all select user_id,'failure_run',failure from runs
  union all select user_id,'trash',count(*) from manual where kind='trash' group by user_id
  union all select user_id,'likes',count(*) from reactions where value=1 group by user_id
  union all select user_id,'dislikes',count(*) from reactions where value=-1 group by user_id
  union all select user_id,'helps',count(*) from helps group by user_id
 ), ranked as (
  select m.*,p.nickname,p.avatar_path,row_number() over(partition by key order by value desc,p.created_at,p.id) rank
  from metrics m join participants p on p.id=m.user_id where m.value>0
 ), grouped as (
  select key,jsonb_agg(jsonb_build_object('id',user_id,'level',app_private.player_level(user_id),'nickname',nickname,'avatar_path',avatar_path,'value',value,'rank',rank) order by rank) rows
  from ranked where rank<=5 group by key
 ) select coalesce(jsonb_object_agg(key,rows),'{}'::jsonb) into result from grouped;
 return jsonb_build_object('rankings',result,'generatedAt',statement_timestamp());
end $function$
;
notify pgrst,'reload schema';
commit;
