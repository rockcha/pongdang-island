begin;

create table app_private.arcade_reward_settings (
 id boolean primary key default true check(id),
 first_week date not null default (date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul'))::date,
 check(extract(isodow from first_week)=1)
);
insert into app_private.arcade_reward_settings(id) values(true);
create table app_private.arcade_weekly_batches (
 game text not null check(game in('shadow','memory')),
 week_start date not null check(extract(isodow from week_start)=1),
 settled_at timestamptz not null default clock_timestamp(),
 players integer not null default 0,
 total_gold bigint not null default 0,
 primary key(game,week_start)
);
create table app_private.arcade_weekly_rewards (
 game text not null,
 week_start date not null,
 user_id uuid not null references public.player_profiles(id) on delete cascade,
 rank bigint not null check(rank>0),
 run_id uuid not null,
 gold integer not null,
 gift_id uuid not null unique references public.collectible_gifts(id),
 primary key(game,week_start,user_id),
 foreign key(game,week_start) references app_private.arcade_weekly_batches(game,week_start)
);
alter table app_private.arcade_reward_settings enable row level security;
alter table app_private.arcade_weekly_batches enable row level security;
alter table app_private.arcade_weekly_rewards enable row level security;
revoke all on app_private.arcade_reward_settings,app_private.arcade_weekly_batches,app_private.arcade_weekly_rewards from public,anon,authenticated;
grant all on app_private.arcade_reward_settings,app_private.arcade_weekly_batches,app_private.arcade_weekly_rewards to service_role;

create function app_private.arcade_weekly_gold(p_rank bigint) returns integer
language sql immutable set search_path='' as $$
 select case when p_rank is null or p_rank<1 then 0 when p_rank=1 then 2000 when p_rank=2 then 1500
 when p_rank=3 then 1000 when p_rank=4 then 650 when p_rank=5 then 400 else 200 end
$$;

create function app_private.arcade_weekly_rankings(p_game text,p_week_start date)
returns table(rank bigint,user_id uuid,run_id uuid,score integer,elapsed_ms bigint,moves integer,finished_at timestamptz)
language sql stable set search_path='' as $$
 with bounds as (
  select p_week_start::timestamp at time zone 'Asia/Seoul' a,(p_week_start+7)::timestamp at time zone 'Asia/Seoul' b
 ), attempts as (
  select s.user_id,s.id run_id,s.score,null::bigint elapsed_ms,null::integer moves,s.finished_at,-s.score::bigint metric
  from public.shadow_game_runs s,bounds
  where p_game='shadow' and s.finished_at>=bounds.a and s.finished_at<bounds.b
  union all
  select m.user_id,m.id,null::integer,m.elapsed_ms,m.moves,m.finished_at,m.elapsed_ms
  from public.memory_game_runs m,bounds
  where p_game='memory' and m.finished_at>=bounds.a and m.finished_at<bounds.b
  and m.abandoned_at is null and m.elapsed_ms is not null
 ), best as (
  select distinct on(user_id) * from attempts order by user_id,metric,finished_at,run_id
 )
 select row_number() over(order by best.metric,best.finished_at,best.run_id),best.user_id,best.run_id,best.score,best.elapsed_ms,best.moves,best.finished_at from best
$$;

create index shadow_weekly_rank on public.shadow_game_runs(finished_at,user_id,score desc) where finished_at is not null;

create function app_private.arcade_weekly_leaderboard(p_game text,p_offset integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 week_start date:=date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date;
 rows jsonb;total bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_game is null or p_game not in('shadow','memory') or p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 select count(*) into total from app_private.arcade_weekly_rankings(p_game,week_start);
 select coalesce(jsonb_agg(jsonb_build_object('rank',r.rank,'id',r.run_id,'nickname',coalesce(p.nickname,'섬 여행자'),
 'mine',r.user_id=uid,'score',r.score,'elapsedMs',r.elapsed_ms,'moves',r.moves,'finishedAt',r.finished_at,
 'rewardGold',app_private.arcade_weekly_gold(r.rank)) order by r.rank),'[]'::jsonb) into rows
 from (select * from app_private.arcade_weekly_rankings(p_game,week_start) order by rank limit 20 offset p_offset) r
 left join public.player_profiles p on p.id=r.user_id;
 return jsonb_build_object('rows',rows,'total',total,'offset',p_offset,'pageSize',20,
 'weekStart',week_start::timestamp at time zone 'Asia/Seoul','weekEnd',(week_start+7)::timestamp at time zone 'Asia/Seoul',
 'rewards',jsonb_build_array(2000,1500,1000,650,400,200));
end $$;
create or replace function app_private.shadow_leaderboard(p_offset integer default 0)
returns jsonb language sql security definer set search_path='' as $$
 select app_private.arcade_weekly_leaderboard('shadow',p_offset)
$$;
create or replace function app_private.memory_leaderboard(p_offset integer default 0)
returns jsonb language sql security definer set search_path='' as $$
 select app_private.arcade_weekly_leaderboard('memory',p_offset)
$$;

create unique index arcade_weekly_gift_once on public.collectible_gifts(recipient_id,reward_id)
where source='system' and reward_kind='gold' and reward_id like 'arcade-weekly:%';

alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = 'welcome-bait'::text) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR (source='system' AND reward_kind='gold' AND reward_id like 'arcade-weekly:%' AND quantity in (2000,1500,1000,650,400,200) AND species->>'game' in ('shadow','memory') AND reward_id='arcade-weekly:'||(species->>'game')||':'||(species->>'week_start') AND cardinality(collectible_ids)=0 AND sender_id IS NULL AND NOT exchange_hold)));

create function app_private.settle_arcade_weeks(p_now timestamptz default clock_timestamp())
returns integer language plpgsql security definer set search_path='' as $$
declare
 current_week date:=date_trunc('week',p_now at time zone 'Asia/Seoul')::date;
 first_week date;batch record;winner record;gift uuid;reward integer;issued integer:=0;player_name text;
begin
 if p_now is null then raise exception 'INVALID_SETTLEMENT_TIME';end if;
 if not pg_try_advisory_xact_lock(hashtextextended('arcade-weekly-settlement',0)) then return 0;end if;
 select s.first_week into first_week from app_private.arcade_reward_settings s where id;
 -- Persist even empty weeks, catch up missed jobs, never settle the open week.
 for batch in
  select games.game,period.week_start::date week_start
  from generate_series(first_week::timestamp,(current_week-7)::timestamp,interval '7 days') period(week_start)
  cross join (values('shadow'),('memory')) games(game)
  where not exists(select 1 from app_private.arcade_weekly_batches b where b.game=games.game and b.week_start=period.week_start::date)
  and ((period.week_start::date+7)::timestamp at time zone 'Asia/Seoul')<=p_now-interval '1 minute'
  order by period.week_start,games.game limit 16
 loop
  insert into app_private.arcade_weekly_batches(game,week_start) values(batch.game,batch.week_start);
  for winner in select * from app_private.arcade_weekly_rankings(batch.game,batch.week_start) order by rank loop
   select nickname into player_name from public.player_profiles where id=winner.user_id;
   if not found then continue;end if;
   reward:=app_private.arcade_weekly_gold(winner.rank);
   insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
   values('퐁당섬 운영자',winner.user_id,player_name,gen_random_uuid(),'{}'::uuid[],
    jsonb_build_object('id','arcade-weekly','name','오락실 주간 랭킹 보상','game',batch.game,'week_start',batch.week_start,'rank',winner.rank),
    reward,format('%s 주간 서버 랭킹 %s등 보상이에요. 한 주 동안 함께해 주셔서 고마워요!',case batch.game when 'shadow' then '그림자 맞추기' else '카드 짝맞추기' end,winner.rank),
    'system','gold','arcade-weekly:'||batch.game||':'||batch.week_start) returning id into gift;
   insert into app_private.arcade_weekly_rewards(game,week_start,user_id,rank,run_id,gold,gift_id)
   values(batch.game,batch.week_start,winner.user_id,winner.rank,winner.run_id,reward,gift);
   insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
   values(winner.user_id,'gift','gift_received','오락실 주간 랭킹 보상이 도착했어요!',
    format('%s %s등 · %s골드를 우편함에서 받아주세요.',case batch.game when 'shadow' then '그림자 맞추기' else '카드 짝맞추기' end,winner.rank,reward),gift);
   update app_private.arcade_weekly_batches set players=players+1,total_gold=total_gold+reward where game=batch.game and week_start=batch.week_start;
   issued:=issued+1;
  end loop;
 end loop;
 return issued;
end $$;

revoke all on function app_private.arcade_weekly_gold(bigint),app_private.arcade_weekly_rankings(text,date),app_private.arcade_weekly_leaderboard(text,integer),app_private.settle_arcade_weeks(timestamptz) from public,anon,authenticated;
grant execute on function app_private.settle_arcade_weeks(timestamptz) to service_role;

-- Cron is UTC. Every minute picks up the newly closed KST week and recovers missed runs.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('arcade-weekly-rank-rewards','* * * * *','select app_private.settle_arcade_weeks()');
 else raise notice 'pg_cron unavailable; a server scheduler must call app_private.settle_arcade_weeks()';end if;
end $$;
notify pgrst,'reload schema';
commit;
