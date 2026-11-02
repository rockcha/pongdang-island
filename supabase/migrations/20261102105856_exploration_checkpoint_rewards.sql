begin;
-- Rewards are cumulative: legacy 50-floor runs receive 2000; new runs receive 2000 at each checkpoint.
alter table app_private.exploration_runs drop constraint exploration_runs_reward_gold_check;
alter table app_private.exploration_runs drop constraint exploration_runs_check;
alter table app_private.exploration_runs add constraint exploration_runs_reward_gold_check check(reward_gold in (0,2000,4000));
alter table app_private.exploration_runs add constraint exploration_runs_reward_state_check check (
 reward_gold=0 or
 (model->>'version'='1' and reward_gold=2000 and finished_at is not null) or
 (model->>'version'='2' and ((reward_gold=2000 and finished_at is null) or (reward_gold=4000 and finished_at is not null)))
);
create or replace function app_private.exploration_server_commit(p_user uuid,p_run uuid,p_operation uuid,p_request jsonb,p_revision integer,p_model jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
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
  if p_request->>'type'='leave' then
   update app_private.exploration_runs set abandoned_at=clock_timestamp(),revision=revision+1 where id=r.id returning * into r;
  else
   update app_private.exploration_runs set model=p_model,revision=revision+1 where id=r.id returning * into r;
  end if;
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
end $$;

create or replace function app_private.exploration_leaderboard(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_RANKING_PAGE';end if;
 with progress as (
  select r.id,r.user_id,r.started_at,(r.model#>>'{state,market,floor}')::integer as floor,
   r.reward_gold=(case when r.model->>'version'='2' then 4000 else 2000 end) and r.finished_at is not null as completed
  from app_private.exploration_runs r
  where r.revision>0 and r.model->>'version' in ('1','2') and r.model#>>'{state,mode}'='practice'
   and r.model#>>'{state,market,floor}' ~ '^([1-9]|[1-7][0-9]|80)$'
 ), personal as (
  select p.*,row_number() over(partition by user_id order by floor desc,completed desc,started_at,id) as personal_rank from progress p
 ), ranks as (
  select p.*,row_number() over(order by floor desc,completed desc,started_at,id) as rank from personal p where personal_rank=1
 ), page as (select * from ranks order by rank offset p_offset limit 20)
 select jsonb_build_object('total',(select count(*) from ranks),'offset',p_offset,'rows',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',p.id,'userId',p.user_id,'rank',p.rank,'floor',p.floor,'completed',p.completed,
   'nickname',coalesce(profile.nickname,'탐험가'),'avatarPath',profile.avatar_path,
   'level',app_private.player_level(p.user_id),'levelProgress',app_private.player_level_progress(p.user_id),
   'mine',p.user_id=u,'friendCode',profile.friend_code,
   'friendStatus',(select f.status from public.friend_requests f
    where f.status in ('pending','accepted') and ((f.sender_id=u and f.recipient_id=p.user_id) or (f.recipient_id=u and f.sender_id=p.user_id))
    order by f.created_at desc limit 1)
  ) order by p.rank) from page p left join public.player_profiles profile on profile.id=p.user_id
 ),'[]'::jsonb)) into result;
 return result;
end $$;

notify pgrst,'reload schema';
commit;
