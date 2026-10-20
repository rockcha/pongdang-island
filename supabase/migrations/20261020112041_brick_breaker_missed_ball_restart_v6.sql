-- Engine 6 waits for a manual launch after losing the final ball and reduces speed 5%.
alter table public.brick_game_runs
 drop constraint brick_game_runs_engine_version_check,
 drop constraint brick_game_runs_reward_check,
 alter column engine_version set default 6,
 add constraint brick_game_runs_engine_version_check check(engine_version in (1,2,3,4,5,6)),
 add constraint brick_game_runs_reward_check check(
  (engine_version=1 and reward in (0,10,30,60,100,150)) or
  (engine_version in (2,3,4,5,6) and score=0 and reward between 0 and 6400 and reward%10=0));

create or replace function app_private.brick_game_start(p_operation_id uuid,p_engine_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r public.brick_game_runs;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_engine_version is null or p_engine_version not in (3,4,5,6) then raise exception 'ENGINE_VERSION_MISMATCH';end if;
 if p_operation_id is null then raise exception 'INVALID_OPERATION';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 select * into r from public.brick_game_runs where user_id=v_uid and operation_id=p_operation_id;
 if found then return to_jsonb(r);end if;
 select * into r from public.brick_game_runs where user_id=v_uid and finished_at is null;
 if found then return to_jsonb(r);end if;
 insert into public.brick_game_runs(user_id,operation_id,seed,engine_version) values(v_uid,p_operation_id,floor(random()*4294967296)::bigint,p_engine_version) returning * into r;
 return to_jsonb(r);
end $$;

create or replace function app_private.brick_game_settle(p_user_id uuid,p_run_id uuid,p_score integer,p_reward integer,p_replay jsonb,p_final boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.brick_game_runs;v_gold integer;v_delta integer;v_ticks integer;
begin
 select gold into v_gold from public.player_wallets where user_id=p_user_id for update;
 if not found then raise exception 'WALLET_NOT_FOUND';end if;
 select * into r from public.brick_game_runs where id=p_run_id and user_id=p_user_id for update;
 if not found then raise exception 'RUN_NOT_FOUND';end if;
 if r.finished_at is not null then return to_jsonb(r);end if;
 v_ticks:=(p_replay->>'ticks')::integer;
 if p_score is null or p_score not between 0 and 360 or p_reward is null or (r.engine_version=1 and p_reward not in (0,10,30,60,100,150))
  or (r.engine_version in (2,3,4,5,6) and (p_score<>0 or p_reward not between 0 and 6400 or p_reward%10<>0))
  or p_reward<r.reward or p_score<r.score or v_ticks is null or v_ticks<r.ticks or v_ticks>216000
  or v_ticks>floor(extract(epoch from(clock_timestamp()-r.started_at))*120)+240
  or jsonb_typeof(p_replay->'inputs') is distinct from 'array'
  or octet_length(p_replay::text)>(case when r.engine_version=1 then 1000000 else 8000000 end)
  or p_final is null then raise exception 'INVALID_SETTLEMENT';end if;
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

notify pgrst,'reload schema';
