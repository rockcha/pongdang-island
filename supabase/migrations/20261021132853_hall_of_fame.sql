-- Player walls belong to players, not to a particular ranking position.
-- Moving between categories must never duplicate votes or comments.
create table app_private.hall_reactions (
 target_id uuid not null references public.player_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 value smallint not null check (value in (-1,1)),
 primary key(target_id,user_id), check(target_id<>user_id)
);
create index hall_reactions_user_idx on app_private.hall_reactions(user_id);
create table app_private.hall_comments (
 id uuid primary key default gen_random_uuid(),
 target_id uuid not null references public.player_profiles(id) on delete cascade,
 author_id uuid not null references public.player_profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 500),
 created_at timestamptz not null default clock_timestamp()
);
create index hall_comments_target_idx on app_private.hall_comments(target_id,created_at desc,id desc);
create index hall_comments_author_idx on app_private.hall_comments(author_id,created_at desc);
alter table app_private.hall_reactions enable row level security;
alter table app_private.hall_comments enable row level security;
revoke all on app_private.hall_reactions,app_private.hall_comments from public,anon,authenticated;

create function app_private.hall_of_fame() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 with logs as materialized (
  select user_id,id,occurred_at,source,kind,rarity,species_id from app_private.title_fishing_log
 ), catches as materialized (
  select user_id,kind,rarity from logs where species_id is not null
  union all
  select v.user_id,item->'species'->>'kind',item->'species'->>'rarity'
  from public.harbor_voyages v cross join lateral jsonb_array_elements(coalesce(v.result->'items','[]'::jsonb)) item
  where v.claimed_at is not null
 ), manual as materialized (
  select *, (occurred_at at time zone 'Asia/Seoul')::date play_day,
   row_number() over(partition by user_id order by occurred_at,id)
   -row_number() over(partition by user_id,(species_id is not null) order by occurred_at,id) run
  from logs where source='manual'
 ), fishing as (
  select user_id,count(*) attempts,count(*) filter(where species_id is null) failures from manual group by user_id
 ), totals as (
  select user_id,count(*) filter(where kind='fish') fish,count(*) filter(where rarity='mythic') mythic from catches group by user_id
 ), daily as materialized (
  select user_id,play_day,count(*) n from manual group by user_id,play_day
 ), days as (
  select user_id,play_day-(row_number() over(partition by user_id order by play_day))::integer island from daily
 ), day_streaks as (
  select user_id,max(n) n from (select user_id,island,count(*) n from days group by user_id,island) s group by user_id
 ), runs as (
  select user_id,max(n) filter(where success) success,max(n) filter(where not success) failure
  from (select user_id,species_id is not null success,run,count(*) n from manual group by user_id,(species_id is not null),run) s group by user_id
 ), games as (
  select user_id from public.brick_game_runs union all select user_id from public.shadow_game_runs
  union all select user_id from public.memory_game_runs union all select user_id from public.odd_even_runs
  union all select user_id from app_private.ladder_runs
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
  union all select user_id,'failure_rate',100.0*failures/attempts from fishing where attempts>=100
  union all select user_id,'games',count(*) from games group by user_id
  union all select user_id,'daily',max(n) from daily group by user_id
  union all select user_id,'success_run',success from runs
  union all select user_id,'failure_run',failure from runs
  union all select user_id,'trash',count(*) from manual where kind='trash' group by user_id
  union all select user_id,'days',n from day_streaks
  union all select user_id,'likes',count(*) from reactions where value=1 group by user_id
  union all select user_id,'dislikes',count(*) from reactions where value=-1 group by user_id
  union all select user_id,'helps',count(*) from helps group by user_id
 ), ranked as (
  select m.*,p.nickname,p.avatar_path,row_number() over(partition by key order by value desc,p.created_at,p.id) rank
  from metrics m join public.player_profiles p on p.id=m.user_id where m.value>0
 ), grouped as (
  select key,jsonb_agg(jsonb_build_object('id',user_id,'nickname',nickname,'avatar_path',avatar_path,'value',value,'rank',rank) order by rank) rows
  from ranked where rank<=5 group by key
 ) select coalesce(jsonb_object_agg(key,rows),'{}'::jsonb) into result from grouped;
 return jsonb_build_object('rankings',result,'generatedAt',statement_timestamp());
end $$;

create function app_private.hall_wall(p_target uuid,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'INVALID_HALL';end if;
 if not exists(select 1 from public.player_profiles where id=p_target) then raise exception 'HALL_NOT_FOUND';end if;
 select jsonb_build_object(
  'likes',(select count(*) from app_private.hall_reactions where target_id=p_target and value=1),
  'dislikes',(select count(*) from app_private.hall_reactions where target_id=p_target and value=-1),
  'myReaction',coalesce((select value from app_private.hall_reactions where target_id=p_target and user_id=auth.uid()),0),
  'total',(select count(*) from app_private.hall_comments where target_id=p_target),
  'comments',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc,c.id desc) from (
   select c.id,c.author_id,c.body,c.created_at,p.nickname,p.avatar_path from app_private.hall_comments c
   join public.player_profiles p on p.id=c.author_id where target_id=p_target
   order by c.created_at desc,c.id desc limit 30 offset p_offset
  ) c),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create function app_private.hall_action(p_target uuid,p_action text,p_value integer default 0,p_body text default '',p_comment_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_target is null or not exists(select 1 from public.player_profiles where id=p_target) then raise exception 'HALL_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('hall:'||u::text,0));
 if p_action='react' then
  if p_target=u then raise exception 'HALL_SELF_REACTION';end if;
  if p_value is null or p_value not in (-1,0,1) then raise exception 'INVALID_HALL';end if;
  if p_value=0 then delete from app_private.hall_reactions where target_id=p_target and user_id=u;
  else insert into app_private.hall_reactions(target_id,user_id,value) values(p_target,u,p_value)
   on conflict(target_id,user_id) do update set value=excluded.value;end if;
 elsif p_action='comment' then
  if p_body is null or char_length(btrim(p_body)) not between 1 and 500 then raise exception 'INVALID_HALL';end if;
  if exists(select 1 from app_private.hall_comments where author_id=u and created_at>clock_timestamp()-interval '5 seconds') then raise exception 'HALL_RATE_LIMIT';end if;
  insert into app_private.hall_comments(target_id,author_id,body) values(p_target,u,btrim(p_body));
 elsif p_action='delete_comment' then
  delete from app_private.hall_comments where id=p_comment_id and target_id=p_target and author_id=u;
  if not found then raise exception 'NOT_ALLOWED';end if;
 else raise exception 'INVALID_HALL';end if;
 return app_private.hall_wall(p_target,0);
end $$;

create function public.hall_of_fame() returns jsonb language sql set search_path='' as $$select app_private.hall_of_fame()$$;
create function public.hall_wall(p_target uuid,p_offset integer default 0) returns jsonb language sql set search_path='' as $$select app_private.hall_wall(p_target,p_offset)$$;
create function public.hall_action(p_target uuid,p_action text,p_value integer default 0,p_body text default '',p_comment_id uuid default null) returns jsonb language sql set search_path='' as $$select app_private.hall_action(p_target,p_action,p_value,p_body,p_comment_id)$$;
revoke all on function app_private.hall_of_fame(),app_private.hall_wall(uuid,integer),app_private.hall_action(uuid,text,integer,text,uuid),public.hall_of_fame(),public.hall_wall(uuid,integer),public.hall_action(uuid,text,integer,text,uuid) from public,anon;
grant execute on function app_private.hall_of_fame(),app_private.hall_wall(uuid,integer),app_private.hall_action(uuid,text,integer,text,uuid),public.hall_of_fame(),public.hall_wall(uuid,integer),public.hall_action(uuid,text,integer,text,uuid) to authenticated;
