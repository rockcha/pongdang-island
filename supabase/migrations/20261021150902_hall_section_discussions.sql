begin;
-- Section discussions are independent of ranked players and survive rank changes.
-- Legacy player walls remain intact: there is no evidence linking them to a section.
create table app_private.hall_sections(id text primary key);
insert into app_private.hall_sections(id) values
 ('casts'),('fish'),('collection'),('mythic'),('mythic_rate'),('gifts'),('sales'),('purchases'),
 ('titles'),('cleanings'),('feedings'),('voyages'),('failure_rate'),('games'),
 ('daily'),('control_miss'),('decorations'),('trash'),('arcade_earned'),('arcade_spent'),
 ('failure_run'),('likes'),('dislikes'),('helps');
create table app_private.hall_section_comments(
 id uuid primary key default gen_random_uuid(),
 section_id text not null references app_private.hall_sections(id),
 author_id uuid not null references public.player_profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 500),
 created_at timestamptz not null default clock_timestamp()
);
create index hall_section_comments_section_idx on app_private.hall_section_comments(section_id,created_at desc,id desc);
create index hall_section_comments_author_idx on app_private.hall_section_comments(author_id,created_at desc);
create table app_private.hall_section_comment_reactions(
 comment_id uuid not null references app_private.hall_section_comments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 value smallint not null check(value in (-1,1)),
 primary key(comment_id,user_id)
);
create index hall_section_comment_reactions_user_idx on app_private.hall_section_comment_reactions(user_id);
alter table app_private.hall_sections enable row level security;
alter table app_private.hall_section_comments enable row level security;
alter table app_private.hall_section_comment_reactions enable row level security;
revoke all on app_private.hall_sections,app_private.hall_section_comments,app_private.hall_section_comment_reactions from public,anon,authenticated;

create function app_private.hall_section_wall(p_section text,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'INVALID_HALL';end if;
 if p_section is null or not exists(select 1 from app_private.hall_sections where id=p_section) then raise exception 'HALL_NOT_FOUND';end if;
 select jsonb_build_object(
  'total',(select count(*) from app_private.hall_section_comments where section_id=p_section),
  'comments',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc,c.id desc) from (
   select c.id,c.author_id,c.body,c.created_at,p.nickname,p.avatar_path,
    (select count(*) from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.value=1) likes,
    (select count(*) from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.value=-1) dislikes,
    coalesce((select r.value from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.user_id=auth.uid()),0) as "myReaction"
   from app_private.hall_section_comments c join public.player_profiles p on p.id=c.author_id
   where c.section_id=p_section order by c.created_at desc,c.id desc limit 30 offset p_offset
  ) c),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create function app_private.hall_section_counts() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select jsonb_object_agg(s.id,coalesce(c.n,0)) into result from app_private.hall_sections s
 left join (select section_id,count(*) n from app_private.hall_section_comments group by section_id) c on c.section_id=s.id;
 return coalesce(result,'{}'::jsonb);
end $$;

create function app_private.hall_section_action(p_section text,p_action text,p_body text default '',p_comment_id uuid default null,p_value integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();author uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_section is null or not exists(select 1 from app_private.hall_sections where id=p_section) then raise exception 'HALL_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('hall-section:'||u::text,0));
 if p_action='comment' then
  if p_body is null or char_length(btrim(p_body)) not between 1 and 500 then raise exception 'INVALID_HALL';end if;
  if exists(select 1 from app_private.hall_section_comments where author_id=u and created_at>clock_timestamp()-interval '5 seconds') then raise exception 'HALL_RATE_LIMIT';end if;
  insert into app_private.hall_section_comments(section_id,author_id,body) values(p_section,u,btrim(p_body));
 elsif p_action='delete_comment' then
  delete from app_private.hall_section_comments where id=p_comment_id and section_id=p_section and author_id=u;
  if not found then raise exception 'NOT_ALLOWED';end if;
 elsif p_action='react' then
  if p_value is null or p_value not in (-1,0,1) then raise exception 'INVALID_HALL';end if;
  select c.author_id into author from app_private.hall_section_comments c where c.id=p_comment_id and c.section_id=p_section for update;
  if not found then raise exception 'HALL_NOT_FOUND';end if;
  if author=u then raise exception 'HALL_SELF_REACTION';end if;
  if p_value=0 then delete from app_private.hall_section_comment_reactions where comment_id=p_comment_id and user_id=u;
  else insert into app_private.hall_section_comment_reactions(comment_id,user_id,value) values(p_comment_id,u,p_value)
   on conflict(comment_id,user_id) do update set value=excluded.value;end if;
 else raise exception 'INVALID_HALL';end if;
 return app_private.hall_section_wall(p_section,0);
end $$;

create function public.hall_section_wall(p_section text,p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$select app_private.hall_section_wall(p_section,p_offset)$$;
create function public.hall_section_counts() returns jsonb
language sql security invoker set search_path='' as $$select app_private.hall_section_counts()$$;
create function public.hall_section_action(p_section text,p_action text,p_body text default '',p_comment_id uuid default null,p_value integer default 0) returns jsonb
language sql security invoker set search_path='' as $$select app_private.hall_section_action(p_section,p_action,p_body,p_comment_id,p_value)$$;
revoke all on function app_private.hall_section_wall(text,integer),app_private.hall_section_counts(),app_private.hall_section_action(text,text,text,uuid,integer),public.hall_section_wall(text,integer),public.hall_section_counts(),public.hall_section_action(text,text,text,uuid,integer) from public,anon;
grant execute on function app_private.hall_section_wall(text,integer),app_private.hall_section_counts(),app_private.hall_section_action(text,text,text,uuid,integer),public.hall_section_wall(text,integer),public.hall_section_counts(),public.hall_section_action(text,text,text,uuid,integer) to authenticated;

-- Include received comment reactions in the existing social totals.
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
  select key,jsonb_agg(jsonb_build_object('id',user_id,'nickname',nickname,'avatar_path',avatar_path,'value',value,'rank',rank) order by rank) rows
  from ranked where rank<=5 group by key
 ) select coalesce(jsonb_object_agg(key,rows),'{}'::jsonb) into result from grouped;
 return jsonb_build_object('rankings',result,'generatedAt',statement_timestamp());
end $function$
;
commit;
