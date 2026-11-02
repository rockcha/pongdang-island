-- Save the authoritative current position on explicit exit, including runs without a rest checkpoint.
-- Do not rewrite old saves, reopen abandoned runs, or change reward accounting.
begin;
CREATE OR REPLACE FUNCTION app_private.exploration_server_commit(p_user uuid, p_run uuid, p_operation uuid, p_request jsonb, p_revision integer, p_model jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r app_private.exploration_runs; op app_private.exploration_operations; receipt jsonb; complete boolean; reward_delta integer:=0; reward_operation uuid;
begin
 if p_user is null or p_run is null or p_operation is null or p_request is null then raise exception 'INVALID_REQUEST';end if;
 perform pg_advisory_xact_lock(hashtextextended('exploration:'||p_user::text,0));
 select * into op from app_private.exploration_operations where user_id=p_user and operation_id=p_operation;
 if found then
  if op.run_id<>p_run or op.request is distinct from p_request then raise exception 'OPERATION_CONFLICT';end if;
  return op.receipt;
 end if;
 if p_model is null or coalesce(p_model->>'version','') not in ('1','2') or p_model#>>'{state,mode}' is distinct from 'practice' then raise exception 'INVALID_MODEL';end if;
 if p_model->>'version'='2' and p_model#>>'{state,campaignFinalFloor}' is distinct from '80' then raise exception 'INVALID_MODEL';end if;
 select * into r from app_private.exploration_runs where id=p_run for update;
 if not found then
  if p_revision<>-1 or p_request->>'type' is distinct from 'start' or p_model#>>'{state,market,floor}' is distinct from '1' then raise exception 'RUN_NOT_FOUND';end if;
  update app_private.exploration_runs set abandoned_at=clock_timestamp() where user_id=p_user and finished_at is null and abandoned_at is null;
  insert into app_private.exploration_runs(id,user_id,model) values(p_run,p_user,p_model) returning * into r;
 else
  if r.model->>'version' is distinct from p_model->>'version' then raise exception 'INVALID_MODEL';end if;
  if r.user_id<>p_user then raise exception 'RUN_NOT_FOUND';end if;
  if r.finished_at is not null or r.abandoned_at is not null then raise exception 'RUN_CLOSED';end if;
  if r.revision<>p_revision then raise exception 'REVISION_CONFLICT';end if;
  if p_request->>'type'='resume' then
   if r.saved_model is null or coalesce((r.model#>>'{state,hp}')::numeric,0)<=0 then raise exception 'NO_SAVED_EXPLORATION';end if;
   update app_private.exploration_runs set model=saved_model,revision=revision+1 where id=r.id returning * into r;
  elsif p_request->>'type'='leave' and coalesce((r.model#>>'{state,hp}')::numeric,0)>0 and not coalesce((r.model#>>'{state,completed}')::boolean,false) then
   update app_private.exploration_runs set saved_model=model,saved_at=clock_timestamp(),revision=revision+1 where id=r.id returning * into r;
  elsif p_request->>'type'='leave' then
   update app_private.exploration_runs set abandoned_at=clock_timestamp(),revision=revision+1 where id=r.id returning * into r;
  else
   update app_private.exploration_runs set model=p_model,revision=revision+1 where id=r.id returning * into r;
  end if;
 end if;
 if p_request->>'type'='rest' and r.abandoned_at is null and r.model->>'view'='room' and r.model->>'settled'='true'
  and r.model#>>'{visit,id}' in ('rest-oasis','rest-camp','rest-garden') and coalesce((r.model#>>'{state,hp}')::numeric,0)>0 then
  update app_private.exploration_runs set saved_model=model,saved_at=clock_timestamp() where id=r.id returning * into r;
 end if;
 complete:=coalesce((r.model#>>'{state,completed}')::boolean,false);
 if complete and r.abandoned_at is null then
  if r.model#>>'{state,market,floor}' is distinct from (case when r.model->>'version'='2' then '80' else '50' end)
   or r.model#>>'{state,finalBossDefeated}' is distinct from 'true'
   or r.model#>>'{state,combat,monsterId}' is distinct from (case when r.model->>'version'='2' then 'black-sun-aker' else 'golden-pharaoh' end)
   or r.model#>>'{state,combat,status}' is distinct from 'won'
   or coalesce((r.model#>>'{state,hp}')::numeric,0)<=0 then raise exception 'EXPLORATION_INCOMPLETE';end if;
  if r.model->>'version'='2' and r.reward_gold<>2000 then raise exception 'EXPLORATION_CHECKPOINT_REQUIRED';end if;
  reward_delta:=2000;
 elsif r.abandoned_at is null and r.model->>'version'='2' and r.reward_gold=0
  and r.model#>>'{state,market,floor}'='50' and r.model#>>'{state,combat,monsterId}'='golden-pharaoh'
  and r.model#>>'{state,combat,status}'='won' and coalesce((r.model#>>'{state,hp}')::numeric,0)>0 then
  reward_delta:=2000;
 end if;
 if reward_delta>0 then
  -- The existing per-account transaction lock serializes all rewards. A distinct stable
  -- operation ID per checkpoint also prevents duplicate ledger entries across retries.
  reward_operation:=case when complete and r.model->>'version'='2' then md5('exploration:80:'||r.id::text)::uuid else r.id end;
  perform set_config('request.jwt.claim.sub',p_user::text,true);
  perform app_private.get_gold_wallet();
  update public.player_wallets set gold=gold+reward_delta,updated_at=clock_timestamp() where user_id=p_user;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(p_user,reward_operation,'charge','arcade:exploration:reward',reward_delta);
  update app_private.exploration_runs set finished_at=case when complete then clock_timestamp() else finished_at end,
   reward_gold=reward_gold+reward_delta where id=r.id returning * into r;
 end if;
 receipt:=jsonb_build_object('id',r.id,'revision',r.revision,'model',r.model,'rewardGold',r.reward_gold,'finishedAt',r.finished_at,'abandoned',r.abandoned_at is not null);
 insert into app_private.exploration_operations(user_id,operation_id,run_id,request,receipt) values(p_user,p_operation,p_run,p_request,receipt);
 return receipt;
end $function$
;
notify pgrst,'reload schema';
commit;
