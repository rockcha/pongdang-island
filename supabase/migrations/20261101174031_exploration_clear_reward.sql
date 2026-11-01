begin;
-- Only the authenticated Edge worker can write authoritative game state or pay rewards.
create table app_private.exploration_runs (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 revision integer not null default 0 check(revision>=0),model jsonb not null,
 started_at timestamptz not null default clock_timestamp(),finished_at timestamptz,abandoned_at timestamptz,
 reward_gold integer not null default 0 check(reward_gold in(0,2000)),
 check(reward_gold=0 or finished_at is not null)
);
create index exploration_runs_user on app_private.exploration_runs(user_id,started_at desc);
create table app_private.exploration_operations (
 user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,
 run_id uuid not null references app_private.exploration_runs(id) on delete cascade,request jsonb not null,receipt jsonb not null,
 primary key(user_id,operation_id)
);
create index exploration_operations_run on app_private.exploration_operations(run_id);
alter table app_private.exploration_runs enable row level security;
alter table app_private.exploration_operations enable row level security;
revoke all on app_private.exploration_runs,app_private.exploration_operations from public,anon,authenticated;

create function app_private.exploration_server_state(p_user uuid,p_run uuid,p_operation uuid,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r app_private.exploration_runs; op app_private.exploration_operations;
begin
 select * into op from app_private.exploration_operations where user_id=p_user and operation_id=p_operation;
 if found then
  if op.run_id<>p_run or op.request is distinct from p_request then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('receipt',op.receipt);
 end if;
 select * into r from app_private.exploration_runs where id=p_run and user_id=p_user;
 if not found then return null;end if;
 return jsonb_build_object('id',r.id,'revision',r.revision,'model',r.model,'rewardGold',r.reward_gold,'finishedAt',r.finished_at,'abandoned',r.abandoned_at is not null);
end $$;
create function app_private.exploration_server_commit(p_user uuid,p_run uuid,p_operation uuid,p_request jsonb,p_revision integer,p_model jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r app_private.exploration_runs; op app_private.exploration_operations; receipt jsonb; complete boolean;
begin
 if p_user is null or p_run is null or p_operation is null or p_request is null then raise exception 'INVALID_REQUEST';end if;
 perform pg_advisory_xact_lock(hashtextextended('exploration:'||p_user::text,0));
 select * into op from app_private.exploration_operations where user_id=p_user and operation_id=p_operation;
 if found then
  if op.run_id<>p_run or op.request is distinct from p_request then raise exception 'OPERATION_CONFLICT';end if;
  return op.receipt;
 end if;
 if p_model is null or p_model->>'version' is distinct from '1' or p_model#>>'{state,mode}' is distinct from 'practice' then raise exception 'INVALID_MODEL';end if;
 select * into r from app_private.exploration_runs where id=p_run for update;
 if not found then
  if p_revision<>-1 or p_request->>'type' is distinct from 'start' or p_model#>>'{state,market,floor}' is distinct from '1' then raise exception 'RUN_NOT_FOUND';end if;
  update app_private.exploration_runs set abandoned_at=clock_timestamp() where user_id=p_user and finished_at is null and abandoned_at is null;
  insert into app_private.exploration_runs(id,user_id,model) values(p_run,p_user,p_model) returning * into r;
 else
  if r.user_id<>p_user then raise exception 'RUN_NOT_FOUND';end if;
  if r.finished_at is not null or r.abandoned_at is not null then raise exception 'RUN_CLOSED';end if;
  if r.revision<>p_revision then raise exception 'REVISION_CONFLICT';end if;
  if p_request->>'type'='leave' then
   update app_private.exploration_runs set abandoned_at=clock_timestamp(),revision=revision+1 where id=r.id returning * into r;
  else
   update app_private.exploration_runs set model=p_model,revision=revision+1 where id=r.id returning * into r;
  end if;
 end if;
 complete:=coalesce((r.model#>>'{state,completed}')::boolean,false);
 if complete and r.abandoned_at is null then
  if r.model#>>'{state,market,floor}' is distinct from '50' or r.model#>>'{state,finalBossDefeated}' is distinct from 'true'
   or r.model#>>'{state,combat,monsterId}' is distinct from 'golden-pharaoh' or r.model#>>'{state,combat,status}' is distinct from 'won'
   or coalesce((r.model#>>'{state,hp}')::numeric,0)<=0 then raise exception 'EXPLORATION_INCOMPLETE';end if;
  perform set_config('request.jwt.claim.sub',p_user::text,true);
  perform app_private.get_gold_wallet();
  update public.player_wallets set gold=gold+2000,updated_at=clock_timestamp() where user_id=p_user;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(p_user,r.id,'charge','arcade:exploration:reward',2000);
  update app_private.exploration_runs set finished_at=clock_timestamp(),reward_gold=2000 where id=r.id returning * into r;
 end if;
 receipt:=jsonb_build_object('id',r.id,'revision',r.revision,'model',r.model,'rewardGold',r.reward_gold,'finishedAt',r.finished_at,'abandoned',r.abandoned_at is not null);
 insert into app_private.exploration_operations(user_id,operation_id,run_id,request,receipt) values(p_user,p_operation,p_run,p_request,receipt);
 return receipt;
end $$;
create function public.exploration_server_state(p_user uuid,p_run uuid,p_operation uuid,p_request jsonb)
returns jsonb language sql security invoker set search_path='' as $$select app_private.exploration_server_state(p_user,p_run,p_operation,p_request)$$;
create function public.exploration_server_commit(p_user uuid,p_run uuid,p_operation uuid,p_request jsonb,p_revision integer,p_model jsonb)
returns jsonb language sql security invoker set search_path='' as $$select app_private.exploration_server_commit(p_user,p_run,p_operation,p_request,p_revision,p_model)$$;
revoke all on function app_private.exploration_server_state(uuid,uuid,uuid,jsonb),public.exploration_server_state(uuid,uuid,uuid,jsonb),app_private.exploration_server_commit(uuid,uuid,uuid,jsonb,integer,jsonb),public.exploration_server_commit(uuid,uuid,uuid,jsonb,integer,jsonb) from public,anon,authenticated;
grant usage on schema app_private to service_role;
grant execute on function app_private.exploration_server_state(uuid,uuid,uuid,jsonb),public.exploration_server_state(uuid,uuid,uuid,jsonb),app_private.exploration_server_commit(uuid,uuid,uuid,jsonb,integer,jsonb),public.exploration_server_commit(uuid,uuid,uuid,jsonb,integer,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
