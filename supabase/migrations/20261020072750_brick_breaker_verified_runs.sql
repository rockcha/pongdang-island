-- Paid runs are replayed by the authenticated Edge Function. Clients cannot submit rewards.
create table public.brick_game_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 payout_operation_id uuid not null default gen_random_uuid(),
 seed bigint not null check (seed between 0 and 4294967295),
 engine_version integer not null default 1 check (engine_version=1),
 started_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 score integer not null default 0 check (score between 0 and 360),
 reward integer not null default 0 check (reward in (0,10,30,60,100,150)),
 paid_reward integer not null default 0 check (paid_reward between 0 and 150),
 ticks integer not null default 0 check (ticks between 0 and 216000),
 replay jsonb not null default '{"ticks":0,"inputs":[]}',
 unique(user_id,operation_id),
 check(paid_reward=reward)
);
create unique index brick_game_one_active on public.brick_game_runs(user_id) where finished_at is null;
create index brick_game_ranking on public.brick_game_runs(reward desc,score desc,started_at,id) where finished_at is not null;
alter table public.brick_game_runs enable row level security;
revoke all on public.brick_game_runs from public,anon,authenticated;
grant select on public.brick_game_runs to authenticated;
create policy brick_game_own_read on public.brick_game_runs for select to authenticated using ((select auth.uid())=user_id);

create function app_private.brick_game_start(p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r public.brick_game_runs;v_gold integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_OPERATION';end if;
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 select * into r from public.brick_game_runs where user_id=v_uid and operation_id=p_operation_id;
 if found then return to_jsonb(r);end if;
 select * into r from public.brick_game_runs where user_id=v_uid and finished_at is null;
 if found then return to_jsonb(r);end if;
 if v_gold<20 then raise exception 'INSUFFICIENT_GOLD';end if;
 insert into public.brick_game_runs(user_id,operation_id,seed) values(v_uid,p_operation_id,floor(random()*4294967296)::bigint) returning * into r;
 update public.player_wallets set gold=gold-20,updated_at=clock_timestamp() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','arcade:brick-breaker',-20);
 return to_jsonb(r);
end $$;
create function public.brick_game_start(p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.brick_game_start(p_operation_id)$$;
revoke all on function app_private.brick_game_start(uuid),public.brick_game_start(uuid) from public,anon;
grant execute on function app_private.brick_game_start(uuid),public.brick_game_start(uuid) to authenticated;

-- Only the Edge Function's service role can call this after replay validation.
grant usage on schema app_private to service_role;
create function app_private.brick_game_settle(p_user_id uuid,p_run_id uuid,p_score integer,p_reward integer,p_replay jsonb,p_final boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.brick_game_runs;v_gold integer;v_delta integer;v_ticks integer;
begin
 select gold into v_gold from public.player_wallets where user_id=p_user_id for update;
 if not found then raise exception 'WALLET_NOT_FOUND';end if;
 select * into r from public.brick_game_runs where id=p_run_id and user_id=p_user_id for update;
 if not found then raise exception 'RUN_NOT_FOUND';end if;
 if r.finished_at is not null then return to_jsonb(r);end if;
 v_ticks:=(p_replay->>'ticks')::integer;
 if p_score is null or p_score not between 0 and 360 or p_reward is null or p_reward not in (0,10,30,60,100,150)
  or p_reward<r.reward or p_score<r.score or v_ticks is null or v_ticks<r.ticks or v_ticks>216000
  or v_ticks>floor(extract(epoch from(clock_timestamp()-r.started_at))*120)+240
  or jsonb_typeof(p_replay->'inputs') is distinct from 'array' or octet_length(p_replay::text)>1000000 or p_final is null then raise exception 'INVALID_SETTLEMENT';end if;
 v_delta:=p_reward-r.paid_reward;
 if v_gold>1000000000-v_delta then raise exception 'GOLD_LIMIT';end if;
 if v_delta>0 then
  update public.player_wallets set gold=gold+v_delta,updated_at=clock_timestamp() where user_id=p_user_id;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(p_user_id,gen_random_uuid(),'charge','arcade:brick-breaker:'||r.id::text,v_delta);
 end if;
 update public.brick_game_runs set score=p_score,reward=p_reward,paid_reward=p_reward,ticks=v_ticks,replay=p_replay,
  finished_at=case when p_final then clock_timestamp() else null end where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
create function public.brick_game_settle(p_user_id uuid,p_run_id uuid,p_score integer,p_reward integer,p_replay jsonb,p_final boolean) returns jsonb language sql security invoker set search_path='' as $$select app_private.brick_game_settle(p_user_id,p_run_id,p_score,p_reward,p_replay,p_final)$$;
revoke all on function app_private.brick_game_settle(uuid,uuid,integer,integer,jsonb,boolean),public.brick_game_settle(uuid,uuid,integer,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function app_private.brick_game_settle(uuid,uuid,integer,integer,jsonb,boolean),public.brick_game_settle(uuid,uuid,integer,integer,jsonb,boolean) to service_role;
grant select on public.brick_game_runs to service_role;

create function app_private.brick_leaderboard(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_offset integer:=greatest(0,least(coalesce(p_offset,0),10000));v_result jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 with personal as (
  select r.*,row_number() over(partition by user_id order by reward desc,score desc,started_at,id) as personal_rank from public.brick_game_runs r where finished_at is not null and score>0
 ), ranks as (
  select p.*,row_number() over(order by reward desc,score desc,started_at,id) as rank from personal p where personal_rank=1
 ), page as (select * from ranks order by rank offset v_offset limit 30)
 select jsonb_build_object('total',(select count(*) from ranks),'offset',v_offset,'rows',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'rank',p.rank,'score',p.score,'gold',p.reward,'nickname',coalesce(u.nickname,'퐁이'),'mine',p.user_id=v_uid) order by p.rank) from page p left join public.player_profiles u on u.id=p.user_id),'[]'::jsonb)) into v_result;
 return v_result;
end $$;
create function public.brick_leaderboard(p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.brick_leaderboard(p_offset)$$;
revoke all on function app_private.brick_leaderboard(integer),public.brick_leaderboard(integer) from public,anon;
grant execute on function app_private.brick_leaderboard(integer),public.brick_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
