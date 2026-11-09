create table app_private.billiards_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 engine_version integer not null default 1 check(engine_version=1),
 score integer not null default 0 check(score between -20000 and 40000),
 reward integer not null default 0 check(reward between 0 and 40000),
 replay jsonb not null default '{"version":1,"shots":[]}'::jsonb,
 started_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 abandoned boolean not null default false,
 unique(user_id,operation_id),
 check(jsonb_typeof(replay)='object' and replay->>'version'='1' and jsonb_typeof(replay->'shots')='array' and jsonb_array_length(replay->'shots')<=2000),
 check((finished_at is null and not abandoned and reward=0) or (finished_at is not null and reward=greatest(0,score)))
);
create unique index billiards_one_active on app_private.billiards_runs(user_id) where finished_at is null;
create index billiards_weekly on app_private.billiards_runs(finished_at,user_id) where finished_at is not null and not abandoned;
alter table app_private.billiards_runs enable row level security;
revoke all on app_private.billiards_runs from public,anon,authenticated;

create function app_private.billiards_snapshot(p_user_id uuid,p_run app_private.billiards_runs)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('serverNow',clock_timestamp(),'run',case when p_run.id is null then null else to_jsonb(p_run)-'user_id'-'operation_id' end,
 'wallet',jsonb_build_object('gold',w.gold,'inventory',w.inventory,'testClaimed',w.test_claimed,'testEnabled',(select test_charge_enabled from app_private.gold_settings where id)))
 from public.player_wallets w where w.user_id=p_user_id
$$;
create function app_private.billiards_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r app_private.billiards_runs;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 select * into r from app_private.billiards_runs where user_id=u and finished_at is null;
 return app_private.billiards_snapshot(u,r);
end $$;
create function app_private.billiards_start(p_operation_id uuid,p_engine_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r app_private.billiards_runs;w public.player_wallets;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_engine_version is distinct from 1 then raise exception 'ENGINE_VERSION_MISMATCH';end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 select * into r from app_private.billiards_runs where user_id=u and operation_id=p_operation_id;
 if found then return app_private.billiards_snapshot(u,r);end if;
 select * into r from app_private.billiards_runs where user_id=u and finished_at is null;
 if found then return app_private.billiards_snapshot(u,r);end if;
 if w.gold<10 then raise exception 'INSUFFICIENT_GOLD';end if;
 insert into app_private.billiards_runs(user_id,operation_id) values(u,p_operation_id) returning * into r;
 update public.player_wallets set gold=gold-10,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','arcade:billiards:entry',-10);
 return app_private.billiards_snapshot(u,r);
end $$;

-- Only the authenticated Edge verifier may read a run by owner or commit a score.
create function app_private.billiards_record(p_user_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r app_private.billiards_runs;
begin
 select * into r from app_private.billiards_runs where id=p_run_id and user_id=p_user_id;
 if not found then raise exception 'RUN_NOT_FOUND';end if;
 return app_private.billiards_snapshot(p_user_id,r);
end $$;
create function app_private.billiards_settle(p_user_id uuid,p_run_id uuid,p_score integer,p_replay jsonb,p_final boolean,p_abandoned boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r app_private.billiards_runs;n integer;old_n integer;w public.player_wallets;v_reward integer;
begin
 select * into w from public.player_wallets where user_id=p_user_id for update;
 if not found then raise exception 'WALLET_NOT_FOUND';end if;
 select * into r from app_private.billiards_runs where id=p_run_id and user_id=p_user_id for update;
 if not found then raise exception 'RUN_NOT_FOUND';end if;
 if r.finished_at is not null then return app_private.billiards_snapshot(p_user_id,r);end if;
 if p_final is null or p_abandoned is null or p_score is null or p_score not between -20000 and 40000
  or p_replay is null or p_replay->>'version' is distinct from '1' or jsonb_typeof(p_replay->'shots') is distinct from 'array'
  or octet_length(p_replay::text)>160000 then raise exception 'INVALID_REPLAY';end if;
 n:=jsonb_array_length(p_replay->'shots');old_n:=jsonb_array_length(r.replay->'shots');
 if n>2000 or n<old_n or exists(select 1 from generate_series(0,old_n-1)i where p_replay->'shots'->i is distinct from r.replay->'shots'->i)
  or p_score>n*20 or p_score< -n*10 then raise exception 'CHECKPOINT_MISMATCH';end if;
 v_reward:=case when p_final then greatest(0,p_score) else 0 end;
 if w.gold::bigint+v_reward>1000000000 then raise exception 'GOLD_LIMIT';end if;
 update app_private.billiards_runs set score=p_score,replay=p_replay,reward=v_reward,
  finished_at=case when p_final then clock_timestamp() else null end,abandoned=p_final and p_abandoned where id=r.id returning * into r;
 if v_reward>0 then
  update public.player_wallets set gold=gold+v_reward,updated_at=clock_timestamp() where user_id=p_user_id;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(p_user_id,r.id,'sell','arcade:billiards:reward',v_reward);
 end if;
 return app_private.billiards_snapshot(p_user_id,r);
end $$;

create function public.billiards_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.billiards_state()$$;
create function public.billiards_start(p_operation_id uuid,p_engine_version integer default 1) returns jsonb language sql security invoker set search_path='' as $$select app_private.billiards_start(p_operation_id,p_engine_version)$$;
create function public.billiards_record(p_user_id uuid,p_run_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.billiards_record(p_user_id,p_run_id)$$;
create function public.billiards_settle(p_user_id uuid,p_run_id uuid,p_score integer,p_replay jsonb,p_final boolean,p_abandoned boolean) returns jsonb language sql security invoker set search_path='' as $$select app_private.billiards_settle(p_user_id,p_run_id,p_score,p_replay,p_final,p_abandoned)$$;
revoke all on function app_private.billiards_snapshot(uuid,app_private.billiards_runs) from public,anon,authenticated;
revoke all on function app_private.billiards_state(),public.billiards_state(),app_private.billiards_start(uuid,integer),public.billiards_start(uuid,integer) from public,anon;
grant execute on function app_private.billiards_state(),public.billiards_state(),app_private.billiards_start(uuid,integer),public.billiards_start(uuid,integer) to authenticated;
revoke all on function app_private.billiards_record(uuid,uuid),public.billiards_record(uuid,uuid),app_private.billiards_settle(uuid,uuid,integer,jsonb,boolean,boolean),public.billiards_settle(uuid,uuid,integer,jsonb,boolean,boolean) from public,anon,authenticated;
grant execute on function app_private.billiards_record(uuid,uuid),public.billiards_record(uuid,uuid),app_private.billiards_settle(uuid,uuid,integer,jsonb,boolean,boolean),public.billiards_settle(uuid,uuid,integer,jsonb,boolean,boolean) to service_role;

alter table app_private.arcade_weekly_batches drop constraint arcade_weekly_batches_game_check;
alter table app_private.arcade_weekly_batches add constraint arcade_weekly_batches_game_check check(game in ('shadow','memory','pongi-whack','aquarium-order','billiards'));

create or replace function app_private.arcade_weekly_rankings(p_game text,p_week_start date)
returns table(rank bigint,user_id uuid,run_id uuid,score integer,elapsed_ms bigint,moves integer,finished_at timestamptz)
language sql stable set search_path='' as $$
 with bounds as (
  select p_week_start::timestamp at time zone 'Asia/Seoul' a,(p_week_start+7)::timestamp at time zone 'Asia/Seoul' b
 ), attempts as (
  select s.user_id,s.id run_id,s.score,null::bigint elapsed_ms,null::integer moves,s.finished_at,-s.score::bigint metric
  from public.shadow_game_runs s,bounds where p_game='shadow' and s.finished_at>=bounds.a and s.finished_at<bounds.b
  union all
  select m.user_id,m.id,null::integer,m.elapsed_ms,m.moves,m.finished_at,m.elapsed_ms
  from public.memory_game_runs m,bounds where p_game='memory' and m.finished_at>=bounds.a and m.finished_at<bounds.b and m.abandoned_at is null and m.elapsed_ms is not null
  union all
  select w.user_id,w.id,w.score,null::bigint,w.mistakes,w.finished_at,(-w.score::bigint*100000+w.mistakes)
  from app_private.pongi_whack_runs w,bounds where p_game='pongi-whack' and w.finished_at>=bounds.a and w.finished_at<bounds.b and w.abandoned_at is null
  union all
  select a.user_id,a.id,a.score,null::bigint,null::integer,a.finished_at,-a.score::bigint
  from app_private.aquarium_order_runs a,bounds where p_game='aquarium-order' and a.finished_at>=bounds.a and a.finished_at<bounds.b and a.abandoned_at is null
  union all
  select b.user_id,b.id,b.score,null::bigint,null::integer,b.finished_at,-b.score::bigint
  from app_private.billiards_runs b,bounds where p_game='billiards' and b.finished_at>=bounds.a and b.finished_at<bounds.b and not b.abandoned
 ), best as (
  select distinct on(user_id) * from attempts order by user_id,metric,finished_at,run_id
 )
 select row_number() over(order by best.metric,best.finished_at,best.run_id),best.user_id,best.run_id,best.score,best.elapsed_ms,best.moves,best.finished_at from best
$$;
create or replace function app_private.arcade_weekly_leaderboard(p_game text,p_offset integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();week_start date:=date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date;rows jsonb;total bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_game is null or p_game not in('shadow','memory','pongi-whack','aquarium-order','billiards') or p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 select count(*) into total from app_private.arcade_weekly_rankings(p_game,week_start);
 select coalesce(jsonb_agg(jsonb_build_object('rank',r.rank,'id',r.run_id,'nickname',coalesce(p.nickname,'섬 여행자'),
  'avatarPath',p.avatar_path,'level',app_private.player_level(r.user_id),'levelProgress',app_private.player_level_progress(r.user_id),'mine',r.user_id=uid,'userId',r.user_id,'friendCode',p.friend_code,
  'friendStatus',(select f.status from public.friend_requests f where f.status in ('pending','accepted') and ((f.sender_id=uid and f.recipient_id=r.user_id) or (f.recipient_id=uid and f.sender_id=r.user_id)) order by f.created_at desc limit 1),
  'score',r.score,'elapsedMs',r.elapsed_ms,'moves',r.moves,'finishedAt',r.finished_at,'rewardGold',app_private.arcade_weekly_gold(r.rank)) order by r.rank),'[]'::jsonb) into rows
 from (select * from app_private.arcade_weekly_rankings(p_game,week_start) order by rank limit 20 offset p_offset) r left join public.player_profiles p on p.id=r.user_id;
 return jsonb_build_object('rows',rows,'total',total,'offset',p_offset,'pageSize',20,'weekStart',week_start::timestamp at time zone 'Asia/Seoul','weekEnd',(week_start+7)::timestamp at time zone 'Asia/Seoul','rewards',jsonb_build_array(2000,1500,1000,650,400,200));
end $$;
create or replace function app_private.settle_arcade_weeks(p_now timestamptz default clock_timestamp())
returns integer language plpgsql security definer set search_path='' as $$
declare current_week date:=date_trunc('week',p_now at time zone 'Asia/Seoul')::date;first_week date;batch record;winner record;gift uuid;reward integer;issued integer:=0;player_name text;game_name text;
begin
 if p_now is null then raise exception 'INVALID_SETTLEMENT_TIME';end if;
 if not pg_try_advisory_xact_lock(hashtextextended('arcade-weekly-settlement',0)) then return 0;end if;
 select s.first_week into first_week from app_private.arcade_reward_settings s where id;
 for batch in
  select games.game,period.week_start::date week_start
  from generate_series(first_week::timestamp,(current_week-7)::timestamp,interval '7 days') period(week_start)
  cross join (values('shadow'),('memory'),('pongi-whack'),('aquarium-order'),('billiards')) games(game)
  where not exists(select 1 from app_private.arcade_weekly_batches b where b.game=games.game and b.week_start=period.week_start::date)
  and ((period.week_start::date+7)::timestamp at time zone 'Asia/Seoul')<=p_now-interval '1 minute'
  order by period.week_start,games.game limit 16
 loop
  insert into app_private.arcade_weekly_batches(game,week_start) values(batch.game,batch.week_start);
  game_name:=case batch.game when 'billiards' then '퐁이 당구' when 'aquarium-order' then '어항 줄세우기' when 'shadow' then '그림자 맞추기' when 'pongi-whack' then '퐁이 잡기' else '카드 짝맞추기' end;
  for winner in select * from app_private.arcade_weekly_rankings(batch.game,batch.week_start) order by rank loop
   select nickname into player_name from public.player_profiles where id=winner.user_id;
   if not found then continue;end if;
   reward:=app_private.arcade_weekly_gold(winner.rank);
   insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
   values('퐁당섬 운영자',winner.user_id,player_name,gen_random_uuid(),'{}'::uuid[],jsonb_build_object('id','arcade-weekly','name','오락실 주간 랭킹 보상','game',batch.game,'week_start',batch.week_start,'rank',winner.rank),reward,
    format('%s 주간 서버 랭킹 %s등 보상이에요. 한 주 동안 함께해 주셔서 고마워요!',game_name,winner.rank),'system','gold','arcade-weekly:'||batch.game||':'||batch.week_start) returning id into gift;
   insert into app_private.arcade_weekly_rewards(game,week_start,user_id,rank,run_id,gold,gift_id) values(batch.game,batch.week_start,winner.user_id,winner.rank,winner.run_id,reward,gift);
   insert into public.notifications(recipient_id,category,kind,title,body,gift_id) values(winner.user_id,'gift','gift_received','오락실 주간 랭킹 보상이 도착했어요!',format('%s %s등 · %s골드를 우편함에서 받아주세요.',game_name,winner.rank,reward),gift);
   update app_private.arcade_weekly_batches set players=players+1,total_gold=total_gold+reward where game=batch.game and week_start=batch.week_start;
   issued:=issued+1;
  end loop;
 end loop;
 return issued;
end $$;
create function app_private.billiards_leaderboard(p_offset integer) returns jsonb language sql security definer set search_path='' as $$select app_private.arcade_weekly_leaderboard('billiards',p_offset)$$;
create function public.billiards_leaderboard(p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select app_private.billiards_leaderboard(p_offset)$$;
revoke all on function app_private.billiards_leaderboard(integer),public.billiards_leaderboard(integer) from public,anon;
grant execute on function app_private.billiards_leaderboard(integer),public.billiards_leaderboard(integer) to authenticated;
do $$
declare shape text;updated text;
begin
 select pg_get_constraintdef(oid) into shape from pg_constraint where conrelid='public.collectible_gifts'::regclass and conname='gift_asset_shape';
 updated:=replace(shape,'ARRAY[''shadow''::text, ''memory''::text, ''pongi-whack''::text, ''aquarium-order''::text]','ARRAY[''shadow''::text, ''memory''::text, ''pongi-whack''::text, ''aquarium-order''::text, ''billiards''::text]');
 if updated is null or updated=shape then raise exception 'UNEXPECTED_GIFT_SHAPE';end if;
 alter table public.collectible_gifts drop constraint gift_asset_shape;
 execute 'alter table public.collectible_gifts add constraint gift_asset_shape '||updated;
end $$;
notify pgrst,'reload schema';
