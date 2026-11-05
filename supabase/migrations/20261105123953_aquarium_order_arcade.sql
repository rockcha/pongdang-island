-- Server-owned rounds, deadlines and scoring. No entry fee or instant gold.
create table app_private.aquarium_order_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.player_profiles(id) on delete cascade,
 operation_id uuid not null,
 round_index integer not null default 0 check(round_index between 0 and 39),
 phase text not null default 'briefing' check(phase in ('briefing','counting','feedback','result')),
 board jsonb not null,
 submitted_order jsonb not null default '[]',
 score integer not null default 0 check(score between 0 and 6000),
 correct integer not null default 0 check(correct between 0 and 40),
 lives integer not null default 3 check(lives between 0 and 3),
 outcome text check(outcome in ('correct','wrong','timeout')),
 deadline timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 abandoned_at timestamptz,
 unique(user_id,operation_id)
);
alter table app_private.aquarium_order_runs enable row level security;
revoke all on app_private.aquarium_order_runs from public,anon,authenticated;
create unique index aquarium_order_one_active on app_private.aquarium_order_runs(user_id) where finished_at is null and abandoned_at is null;
create index aquarium_order_weekly on app_private.aquarium_order_runs(finished_at,user_id) where finished_at is not null and abandoned_at is null;

create function app_private.aquarium_order_board(p_index integer,p_previous jsonb default null)
returns jsonb language plpgsql set search_path='' as $$
declare
 stage integer:=p_index/2+1; targets integer[]; ranked integer[]; initial integer[];
 quantities jsonb:='[[9,6,3,1],[10,7,4,1],[11,8,5,2],[12,9,6,3],[13,10,7,4],[12,9,7,4],[13,10,8,5],[13,11,8,5],[14,12,9,6],[14,12,10,7],[14,12,10,8],[15,13,11,9],[15,13,12,10],[16,14,13,11],[16,15,13,11],[16,15,13,12],[17,16,14,13],[17,16,15,13],[18,17,16,14],[18,17,16,15]]';
 counts jsonb; kinds integer[]:='{}'; fish jsonb; prior integer[]; i integer; j integer;
begin
 if p_index<0 or p_index>39 then raise exception 'INVALID_ROUND';end if;
 if p_index%2=1 then
  select array_agg(v::integer order by n) into targets from jsonb_array_elements_text(p_previous->'targets') with ordinality t(v,n);
 else
  -- At least two species change at every stage boundary; only targets appear.
  select coalesce(array_agg(v::integer),'{}') into prior from jsonb_array_elements_text(coalesce(p_previous->'targets','[]')) t(v);
  select array_agg(k) into targets from (select k from generate_series(0,9) k where not(k=any(prior)) order by random() limit 2)t;
  select targets||array_agg(k) into targets from (select k from generate_series(0,9) k where not(k=any(targets)) order by random() limit 2)t;
 end if;
 select array_agg(k order by random()) into ranked from unnest(targets)k;
 if p_index%2=1 then
  select array_agg(kind order by n desc,kind) into prior from (select (v->>'kind')::integer kind,count(*) n from jsonb_array_elements(p_previous->'fish')v group by 1)t;
  if ranked=prior then ranked:=ranked[2:4]||ranked[1];end if;
 end if;
 counts:=quantities->(stage-1);
 for i in 1..4 loop
  for j in 1..(counts->>(i-1))::integer loop kinds:=array_append(kinds,ranked[i]);end loop;
 end loop;
 select array_agg(k order by random()) into initial from unnest(targets)k;
 if initial=ranked then initial:=initial[2:4]||initial[1];end if;
 select jsonb_agg(jsonb_build_object('kind',k,'lane',(n-1)%8,'phase',random()*2,'duration',6500+random()*3000,'wobble',random()*pi()*2) order by n) into fish
 from (select k,row_number() over() n from (select k from unnest(kinds)k order by random())a)b;
 return jsonb_build_object('stage',stage,'question',p_index%2+1,'targets',targets,'initialOrder',initial,'fish',fish,'duration',20000);
end $$;

create function app_private.aquarium_order_snapshot(p_run app_private.aquarium_order_runs)
returns jsonb language sql set search_path='' as $$
 select jsonb_build_object('serverNow',clock_timestamp(),'run',case when p_run.id is null then null else
 jsonb_build_object('id',p_run.id,'round',p_run.round_index,'phase',p_run.phase,'board',p_run.board,'order',p_run.submitted_order,
 'score',p_run.score,'correct',p_run.correct,'lives',p_run.lives,'outcome',p_run.outcome,'deadline',p_run.deadline,
 'finishedAt',p_run.finished_at,'abandoned',p_run.abandoned_at is not null) end)
$$;

create function app_private.aquarium_order_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r app_private.aquarium_order_runs;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from app_private.aquarium_order_runs where user_id=uid and abandoned_at is null and phase<>'result' order by created_at desc limit 1;
 return app_private.aquarium_order_snapshot(r);
end $$;

create function app_private.aquarium_order_action(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_round integer default null,p_order jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r app_private.aquarium_order_runs;expected jsonb;expired boolean;ok boolean;points integer;now_at timestamptz;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('start','begin','answer','next','leave') then raise exception 'INVALID_ACTION';end if;
 perform pg_advisory_xact_lock(hashtextextended('aquarium-order:'||uid,0));
 now_at:=clock_timestamp();
 if p_action='start' then
  if p_operation_id is null then raise exception 'OPERATION_REQUIRED';end if;
  select * into r from app_private.aquarium_order_runs where user_id=uid and operation_id=p_operation_id;
  if found then return app_private.aquarium_order_snapshot(r);end if;
  select * into r from app_private.aquarium_order_runs where user_id=uid and finished_at is null and abandoned_at is null;
  if found then return app_private.aquarium_order_snapshot(r);end if;
  insert into app_private.aquarium_order_runs(user_id,operation_id,board) values(uid,p_operation_id,app_private.aquarium_order_board(0)) returning * into r;
  return app_private.aquarium_order_snapshot(r);
 end if;
 select * into r from app_private.aquarium_order_runs where id=p_run_id and user_id=uid for update;
 if not found then raise exception 'RUN_NOT_FOUND';end if;
 if p_action='leave' then
  update app_private.aquarium_order_runs set abandoned_at=case when finished_at is null then now_at else abandoned_at end,phase='result' where id=r.id returning * into r;
  return app_private.aquarium_order_snapshot(r);
 end if;
 if r.abandoned_at is not null then raise exception 'RUN_ABANDONED';end if;
 if p_round is null or p_round>r.round_index then raise exception 'INVALID_ROUND';end if;
 if p_round<r.round_index then return app_private.aquarium_order_snapshot(r);end if;
 if p_action='begin' and r.phase='briefing' then
  update app_private.aquarium_order_runs set phase='counting',deadline=now_at+interval '20 seconds' where id=r.id returning * into r;
 elsif p_action='answer' and r.phase='counting' then
  if p_order is null or jsonb_typeof(p_order)<>'array' then raise exception 'INVALID_ORDER';end if;
  if jsonb_array_length(p_order)<>4 or (select count(distinct v) from jsonb_array_elements(p_order)v)<>4
    or exists(select 1 from jsonb_array_elements(p_order)v where jsonb_typeof(v)<>'number' or not (r.board->'targets' @> jsonb_build_array(v))) then raise exception 'INVALID_ORDER';end if;
  select jsonb_agg(kind order by n desc,kind) into expected from (select (v->>'kind')::integer kind,count(*) n from jsonb_array_elements(r.board->'fish')v group by 1)t;
  expired:=now_at>=r.deadline;ok:=not expired and p_order=expected;
  points:=case when ok then 100+ceil(greatest(0,extract(epoch from(r.deadline-now_at)))/20*50)::integer else 0 end;
  update app_private.aquarium_order_runs set phase='feedback',submitted_order=p_order,score=score+points,correct=correct+ok::integer,lives=lives-(not ok)::integer,
   outcome=case when expired then 'timeout' when ok then 'correct' else 'wrong' end,
   finished_at=case when round_index=39 or (not ok and lives=1) then now_at else null end
   where id=r.id returning * into r;
 elsif p_action='next' and r.phase='feedback' then
  if r.finished_at is not null then
   update app_private.aquarium_order_runs set phase='result' where id=r.id returning * into r;
  else
   update app_private.aquarium_order_runs set round_index=round_index+1,board=app_private.aquarium_order_board(round_index+1,board),phase='briefing',deadline=null,outcome=null,submitted_order='[]' where id=r.id returning * into r;
  end if;
 end if;
 return app_private.aquarium_order_snapshot(r);
end $$;

create function public.aquarium_order_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.aquarium_order_state()$$;
create function public.aquarium_order_action(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_round integer default null,p_order jsonb default null)
returns jsonb language sql security invoker set search_path='' as $$select app_private.aquarium_order_action(p_action,p_operation_id,p_run_id,p_round,p_order)$$;
revoke all on function app_private.aquarium_order_board(integer,jsonb),app_private.aquarium_order_snapshot(app_private.aquarium_order_runs) from public,anon,authenticated;
revoke all on function app_private.aquarium_order_state(),app_private.aquarium_order_action(text,uuid,uuid,integer,jsonb),public.aquarium_order_state(),public.aquarium_order_action(text,uuid,uuid,integer,jsonb) from public,anon;
grant execute on function app_private.aquarium_order_state(),app_private.aquarium_order_action(text,uuid,uuid,integer,jsonb),public.aquarium_order_state(),public.aquarium_order_action(text,uuid,uuid,integer,jsonb) to authenticated;

alter table app_private.arcade_weekly_batches drop constraint arcade_weekly_batches_game_check;
alter table app_private.arcade_weekly_batches add constraint arcade_weekly_batches_game_check check(game in ('shadow','memory','pongi-whack','aquarium-order'));
CREATE OR REPLACE FUNCTION app_private.arcade_weekly_rankings(p_game text, p_week_start date)
 RETURNS TABLE(rank bigint, user_id uuid, run_id uuid, score integer, elapsed_ms bigint, moves integer, finished_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
 union all
  select w.user_id,w.id,w.score,null::bigint,w.mistakes,w.finished_at,(-w.score::bigint*100000+w.mistakes)
  from app_private.pongi_whack_runs w,bounds
  where p_game='pongi-whack' and w.finished_at>=bounds.a and w.finished_at<bounds.b and w.abandoned_at is null
 union all
 select a.user_id,a.id,a.score,null::bigint,null::integer,a.finished_at,-a.score::bigint
 from app_private.aquarium_order_runs a,bounds
 where p_game='aquarium-order' and a.finished_at>=bounds.a and a.finished_at<bounds.b and a.abandoned_at is null
 ), best as (
  select distinct on(user_id) * from attempts order by user_id,metric,finished_at,run_id
 )
 select row_number() over(order by best.metric,best.finished_at,best.run_id),best.user_id,best.run_id,best.score,best.elapsed_ms,best.moves,best.finished_at from best
$function$
;
CREATE OR REPLACE FUNCTION app_private.arcade_weekly_leaderboard(p_game text, p_offset integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid();
 week_start date:=date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date;
 rows jsonb;total bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_game is null or p_game not in('shadow','memory','pongi-whack','aquarium-order') or p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 select count(*) into total from app_private.arcade_weekly_rankings(p_game,week_start);
 select coalesce(jsonb_agg(jsonb_build_object('rank',r.rank,'id',r.run_id,'nickname',coalesce(p.nickname,'섬 여행자'),
 'avatarPath',p.avatar_path,'level',app_private.player_level(r.user_id),'levelProgress',app_private.player_level_progress(r.user_id),'mine',r.user_id=uid,'userId',r.user_id,'friendCode',p.friend_code,'friendStatus',(select f.status from public.friend_requests f where f.status in ('pending','accepted') and ((f.sender_id=uid and f.recipient_id=r.user_id) or (f.recipient_id=uid and f.sender_id=r.user_id)) order by f.created_at desc limit 1),'score',r.score,'elapsedMs',r.elapsed_ms,'moves',r.moves,'finishedAt',r.finished_at,
 'rewardGold',app_private.arcade_weekly_gold(r.rank)) order by r.rank),'[]'::jsonb) into rows
 from (select * from app_private.arcade_weekly_rankings(p_game,week_start) order by rank limit 20 offset p_offset) r
 left join public.player_profiles p on p.id=r.user_id;
 return jsonb_build_object('rows',rows,'total',total,'offset',p_offset,'pageSize',20,
 'weekStart',week_start::timestamp at time zone 'Asia/Seoul','weekEnd',(week_start+7)::timestamp at time zone 'Asia/Seoul',
 'rewards',jsonb_build_array(2000,1500,1000,650,400,200));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.settle_arcade_weeks(p_now timestamp with time zone DEFAULT clock_timestamp())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  cross join (values('shadow'),('memory'),('pongi-whack'),('aquarium-order')) games(game)
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
    reward,format('%s 주간 서버 랭킹 %s등 보상이에요. 한 주 동안 함께해 주셔서 고마워요!',case batch.game when 'aquarium-order' then U&'\C5B4\D56D \C904\C138\C6B0\AE30' when 'shadow' then '그림자 맞추기' when 'pongi-whack' then '퐁이 잡기' else '카드 짝맞추기' end,winner.rank),
    'system','gold','arcade-weekly:'||batch.game||':'||batch.week_start) returning id into gift;
   insert into app_private.arcade_weekly_rewards(game,week_start,user_id,rank,run_id,gold,gift_id)
   values(batch.game,batch.week_start,winner.user_id,winner.rank,winner.run_id,reward,gift);
   insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
   values(winner.user_id,'gift','gift_received','오락실 주간 랭킹 보상이 도착했어요!',
    format('%s %s등 · %s골드를 우편함에서 받아주세요.',case batch.game when 'aquarium-order' then U&'\C5B4\D56D \C904\C138\C6B0\AE30' when 'shadow' then '그림자 맞추기' when 'pongi-whack' then '퐁이 잡기' else '카드 짝맞추기' end,winner.rank,reward),gift);
   update app_private.arcade_weekly_batches set players=players+1,total_gold=total_gold+reward where game=batch.game and week_start=batch.week_start;
   issued:=issued+1;
  end loop;
 end loop;
 return issued;
end $function$
;
create function app_private.aquarium_order_leaderboard(p_offset integer) returns jsonb language sql security definer set search_path='' as $$select app_private.arcade_weekly_leaderboard('aquarium-order',p_offset)$$;
revoke all on function app_private.aquarium_order_leaderboard(integer) from public,anon;
grant execute on function app_private.aquarium_order_leaderboard(integer) to authenticated;
create function public.aquarium_order_leaderboard(p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select app_private.aquarium_order_leaderboard(p_offset)$$;
revoke all on function public.aquarium_order_leaderboard(integer) from public,anon;
grant execute on function public.aquarium_order_leaderboard(integer) to authenticated;
-- Preserve all existing gift shapes; extend only the weekly-game allowlist.
do $$
declare shape text; updated text;
begin
 select pg_get_constraintdef(oid) into shape from pg_constraint
 where conrelid='public.collectible_gifts'::regclass and conname='gift_asset_shape';
 updated:=replace(shape, 'ARRAY[''shadow''::text, ''memory''::text, ''pongi-whack''::text]', 'ARRAY[''shadow''::text, ''memory''::text, ''pongi-whack''::text, ''aquarium-order''::text]');
 if updated is null or updated=shape then raise exception 'UNEXPECTED_GIFT_SHAPE';end if;
 alter table public.collectible_gifts drop constraint gift_asset_shape;
 execute 'alter table public.collectible_gifts add constraint gift_asset_shape '||updated;
end $$;
notify pgrst,'reload schema';
