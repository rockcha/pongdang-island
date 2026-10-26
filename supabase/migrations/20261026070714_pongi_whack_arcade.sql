begin;

create table app_private.pongi_whack_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.player_profiles(id) on delete cascade,
 operation_id uuid not null,
 started_at timestamptz not null,
 targets jsonb not null check(jsonb_typeof(targets)='array'),
 finished_at timestamptz,
 abandoned_at timestamptz,
 score integer not null default 0 check(score>=0),
 mistakes integer not null default 0 check(mistakes>=0),
 hits jsonb not null default '[]'::jsonb,
 unique(user_id,operation_id),
 check(finished_at is null or abandoned_at is null)
);
create index pongi_whack_user_runs on app_private.pongi_whack_runs(user_id,started_at desc);
create index pongi_whack_weekly on app_private.pongi_whack_runs(finished_at,user_id,score desc) where finished_at is not null;
alter table app_private.pongi_whack_runs enable row level security;
revoke all on app_private.pongi_whack_runs from public,anon,authenticated;
grant all on app_private.pongi_whack_runs to service_role;

create function app_private.pongi_whack_board() returns jsonb
language plpgsql volatile set search_path='' as $$
declare board jsonb:='[]'; free integer[]:=array[0,0,0,0,0,0,0,0,0];
 t integer:=500; slot integer; choices integer[]; kind text; roll double precision;
 golden_at integer:=20000+floor(random()*35000)::integer; golden boolean:=false; deadline integer; n integer:=0;
begin
 while t<59000 loop
  select array_agg(i) into choices from generate_series(1,9) i where free[i]<=t;
  if cardinality(choices)>0 then
   slot:=choices[1+floor(random()*cardinality(choices))::integer]; roll:=random();
   kind:=case when not golden and t>=golden_at then 'golden' when roll<0.16 then 'bomb'
    when t>=20000 and roll<case when t>=40000 then 0.45 else 0.35 end then 'impostor' else 'pongi' end;
   if kind='golden' then golden:=true;end if;
   deadline:=least(60000,t+case when kind='golden' then 1050 when t<10000 then 1100 when t<20000 then 950 when t<40000 then 800 else 700 end);
   board:=board||jsonb_build_array(jsonb_build_object('id',n,'hole',slot-1,'at',t,'until',deadline,'kind',kind));
   free[slot]:=deadline+100;n:=n+1;
  end if;
  t:=t+case when t<10000 then 650 when t<20000 then 520 when t<40000 then 400 else 300 end;
 end loop;
 return board;
end $$;

create function app_private.pongi_whack_state(p_run app_private.pongi_whack_runs) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p_run.id,'startedAt',p_run.started_at,'targets',p_run.targets,
 'finishedAt',p_run.finished_at,'abandoned',p_run.abandoned_at is not null,'score',p_run.score,'mistakes',p_run.mistakes)
$$;

create function app_private.pongi_whack_action(p_action text,p_operation_id uuid,p_run_id uuid,p_hits jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); t timestamptz:=clock_timestamp(); r app_private.pongi_whack_runs;
 hit jsonb; target jsonb; seen integer[]:='{}'; idx integer; ms integer; last_ms integer:=-1000;
 points integer; total integer:=0; error_count integer:=0; balance bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in('state','start','finish','leave') then raise exception 'INVALID_ACTION';end if;
 perform pg_advisory_xact_lock(hashtextextended('pongi-whack:'||uid::text,0));
 if p_action='state' then
  select * into r from app_private.pongi_whack_runs where user_id=uid and abandoned_at is null and finished_at is null and started_at>t-interval '15 minutes' order by started_at desc limit 1;
 elsif p_action='start' then
  if p_operation_id is null then raise exception 'OPERATION_REQUIRED';end if;
  select * into r from app_private.pongi_whack_runs where user_id=uid and operation_id=p_operation_id;
  if not found then
   if exists(select 1 from app_private.pongi_whack_runs where user_id=uid and abandoned_at is null and finished_at is null and started_at>t-interval '15 minutes') then raise exception 'ACTIVE_RUN';end if;
   perform app_private.get_gold_wallet();
   update public.player_wallets set gold=gold-10,updated_at=clock_timestamp() where user_id=uid and gold>=10 returning gold into balance;
   if not found then raise exception 'INSUFFICIENT_GOLD';end if;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(uid,p_operation_id,'buy','arcade:pongi-whack',-10);
   insert into app_private.pongi_whack_runs(user_id,operation_id,started_at,targets)
    values(uid,p_operation_id,t+interval '3 seconds',app_private.pongi_whack_board()) returning * into r;
  end if;
 else
  select * into r from app_private.pongi_whack_runs where id=p_run_id and user_id=uid for update;
  if not found then raise exception 'RUN_NOT_FOUND';end if;
  if r.finished_at is null and r.abandoned_at is null then
   if p_action='leave' then
    update app_private.pongi_whack_runs set abandoned_at=t where id=r.id returning * into r;
   else
    if t<r.started_at+interval '60 seconds' then raise exception 'TOO_EARLY';end if;
    if t>r.started_at+interval '15 minutes' then raise exception 'RUN_EXPIRED';end if;
    -- Close submissions before the existing one-minute weekly settlement grace ends.
    if t>((date_trunc('week',(r.started_at+interval '60 seconds') at time zone 'Asia/Seoul')+interval '7 days') at time zone 'Asia/Seoul')+interval '45 seconds' then raise exception 'RUN_EXPIRED';end if;
    if p_hits is null or jsonb_typeof(p_hits)<>'array' then raise exception 'INVALID_HITS';end if;
    if jsonb_array_length(p_hits)>250 then raise exception 'INVALID_HITS';end if;
    for hit in select value from jsonb_array_elements(p_hits) loop
     if jsonb_typeof(hit)<>'object' or jsonb_typeof(hit->'id')<>'number' or jsonb_typeof(hit->'ms')<>'number'
      or not coalesce(hit->>'id' ~ '^[0-9]{1,3}$',false) or not coalesce(hit->>'ms' ~ '^[0-9]{1,5}$',false) then raise exception 'INVALID_HITS';end if;
     idx:=(hit->>'id')::integer;ms:=(hit->>'ms')::integer;target:=r.targets->idx;
     if target is null or idx=any(seen) or ms<(target->>'at')::integer+80 or ms>=(target->>'until')::integer or ms-last_ms<60 then raise exception 'INVALID_HITS';end if;
     seen:=array_append(seen,idx);last_ms:=ms;
     points:=case target->>'kind' when 'golden' then 10 when 'pongi' then 1 else -2 end;
     total:=greatest(0,total+points);if points<0 then error_count:=error_count+1;end if;
    end loop;
    update app_private.pongi_whack_runs set finished_at=started_at+interval '60 seconds',score=total,mistakes=error_count,hits=p_hits where id=r.id returning * into r;
   end if;
  end if;
 end if;
 select gold into balance from public.player_wallets where user_id=uid;
 return jsonb_build_object('serverNow',clock_timestamp(),'gold',balance,'run',case when r.id is null then null else app_private.pongi_whack_state(r) end);
end $$;

create function public.pongi_whack_action(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_hits jsonb default '[]')
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.pongi_whack_action(p_action,p_operation_id,p_run_id,p_hits)
$$;
revoke all on function app_private.pongi_whack_board(),app_private.pongi_whack_state(app_private.pongi_whack_runs),app_private.pongi_whack_action(text,uuid,uuid,jsonb),public.pongi_whack_action(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pongi_whack_action(text,uuid,uuid,jsonb) to authenticated;
grant execute on function app_private.pongi_whack_action(text,uuid,uuid,jsonb) to authenticated;

-- The weekly reward integration below shares the existing idempotent gift ledger.

alter table app_private.arcade_weekly_batches drop constraint arcade_weekly_batches_game_check;
alter table app_private.arcade_weekly_batches add constraint arcade_weekly_batches_game_check check(game in('shadow','memory','pongi-whack'));
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text, 'operator-gold-20261021-supply'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = ANY (ARRAY['welcome-bait'::text, 'operator-worm-20261020'::text])) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id ~~ 'arcade-weekly:%'::text) AND (quantity = ANY (ARRAY[2000, 1500, 1000, 650, 400, 200])) AND ((species ->> 'game'::text) = ANY (ARRAY['shadow'::text, 'memory'::text, 'pongi-whack'::text])) AND (reward_id = ((('arcade-weekly:'::text || (species ->> 'game'::text)) || ':'::text) || (species ->> 'week_start'::text))) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['giseong-catch-202610:giseong-fish'::text, 'giseong-catch-202610:giseong-webfoot-octopus'::text])) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 300) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'operator-update-20261023-nyamnyam'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 1000) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (sender_id IS NULL) AND (NOT exchange_hold) AND (cardinality(collectible_ids) = 0) AND
CASE
    WHEN (reward_id ~ '^level-up:[1-9][0-9]{0,8}$'::text) THEN (((split_part(reward_id, ':'::text, 2))::bigint >= 2) AND (quantity = LEAST((1000000000)::bigint, (100 * (((split_part(reward_id, ':'::text, 2))::bigint + 9) / 10)))) AND ((species ->> 'id'::text) = reward_id))
    ELSE false
END) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'halloween-20261024-gold-500'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait_special'::text) AND ((species ->> 'id'::text) = 'aquarium-apology-20261025'::text) AND (quantity = 2) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold))));
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
 ), best as (
  select distinct on(user_id) * from attempts order by user_id,metric,finished_at,run_id
 )
 select row_number() over(order by best.metric,best.finished_at,best.run_id),best.user_id,best.run_id,best.score,best.elapsed_ms,best.moves,best.finished_at from best
$function$;

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
 if p_game is null or p_game not in('shadow','memory','pongi-whack') or p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 select count(*) into total from app_private.arcade_weekly_rankings(p_game,week_start);
 select coalesce(jsonb_agg(jsonb_build_object('rank',r.rank,'id',r.run_id,'nickname',coalesce(p.nickname,'섬 여행자'),
 'avatarPath',p.avatar_path,'level',app_private.player_level(r.user_id),'levelProgress',app_private.player_level_progress(r.user_id),'mine',r.user_id=uid,'userId',r.user_id,'friendCode',p.friend_code,'friendStatus',(select f.status from public.friend_requests f where f.status in ('pending','accepted') and ((f.sender_id=uid and f.recipient_id=r.user_id) or (f.recipient_id=uid and f.sender_id=r.user_id)) order by f.created_at desc limit 1),'score',r.score,'elapsedMs',r.elapsed_ms,'moves',r.moves,'finishedAt',r.finished_at,
 'rewardGold',app_private.arcade_weekly_gold(r.rank)) order by r.rank),'[]'::jsonb) into rows
 from (select * from app_private.arcade_weekly_rankings(p_game,week_start) order by rank limit 20 offset p_offset) r
 left join public.player_profiles p on p.id=r.user_id;
 return jsonb_build_object('rows',rows,'total',total,'offset',p_offset,'pageSize',20,
 'weekStart',week_start::timestamp at time zone 'Asia/Seoul','weekEnd',(week_start+7)::timestamp at time zone 'Asia/Seoul',
 'rewards',jsonb_build_array(2000,1500,1000,650,400,200));
end $function$;

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
  cross join (values('shadow'),('memory'),('pongi-whack')) games(game)
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
    reward,format('%s 주간 서버 랭킹 %s등 보상이에요. 한 주 동안 함께해 주셔서 고마워요!',case batch.game when 'shadow' then '그림자 맞추기' when 'pongi-whack' then '퐁이 잡기' else '카드 짝맞추기' end,winner.rank),
    'system','gold','arcade-weekly:'||batch.game||':'||batch.week_start) returning id into gift;
   insert into app_private.arcade_weekly_rewards(game,week_start,user_id,rank,run_id,gold,gift_id)
   values(batch.game,batch.week_start,winner.user_id,winner.rank,winner.run_id,reward,gift);
   insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
   values(winner.user_id,'gift','gift_received','오락실 주간 랭킹 보상이 도착했어요!',
    format('%s %s등 · %s골드를 우편함에서 받아주세요.',case batch.game when 'shadow' then '그림자 맞추기' when 'pongi-whack' then '퐁이 잡기' else '카드 짝맞추기' end,winner.rank,reward),gift);
   update app_private.arcade_weekly_batches set players=players+1,total_gold=total_gold+reward where game=batch.game and week_start=batch.week_start;
   issued:=issued+1;
  end loop;
 end loop;
 return issued;
end $function$;

create function app_private.pongi_whack_leaderboard(p_offset integer default 0) returns jsonb
language sql security definer set search_path='' as $$
 select app_private.arcade_weekly_leaderboard('pongi-whack',p_offset)
$$;
create function public.pongi_whack_leaderboard(p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$
 select app_private.pongi_whack_leaderboard(p_offset)
$$;
revoke all on function app_private.pongi_whack_leaderboard(integer) from public,anon;
grant execute on function app_private.pongi_whack_leaderboard(integer) to authenticated;
revoke all on function public.pongi_whack_leaderboard(integer) from public,anon;
grant execute on function public.pongi_whack_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
commit;

