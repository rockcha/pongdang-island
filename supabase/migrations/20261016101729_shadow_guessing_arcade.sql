-- Server-authoritative shadow quiz. No client score, gold, or clock is trusted.
begin;
create table public.shadow_game_runs(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 score integer not null default 0 check(score>=0),
 lives integer not null default 3 check(lives between 0 and 3),
 started_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 unique(user_id,operation_id)
);
create unique index shadow_one_active_run on public.shadow_game_runs(user_id) where finished_at is null;
create index shadow_leaderboard on public.shadow_game_runs(score desc,finished_at,id) where finished_at is not null;
create table app_private.shadow_game_rounds(
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.shadow_game_runs(id) on delete cascade,
 number integer not null check(number>0),
 target_id text not null,
 target_name text not null,
 image_path text not null,
 options jsonb not null check(jsonb_array_length(options)=4),
 deadline timestamptz not null,
 answered_at timestamptz,
 correct boolean,
 timed_out boolean,
 unique(run_id,number)
);
alter table public.shadow_game_runs enable row level security;
alter table app_private.shadow_game_rounds enable row level security;
revoke all on public.shadow_game_runs,app_private.shadow_game_rounds from public,anon,authenticated;

create function app_private.shadow_new_round(p_run uuid) returns void
language plpgsql set search_path='' as $$
declare v_options jsonb;v_target jsonb;v_number integer;
begin
 -- Distinct names prevent ambiguous answer buttons; maps never enter the pool.
 select jsonb_agg(jsonb_build_object('id',id,'name',name,'path',thumbnail_path)) into v_options
 from (select * from (select distinct on(name) id,name,thumbnail_path from public.collectible_species
 where kind<>'map' and thumbnail_path is not null and thumbnail_path<>'' order by name,id) pool order by random() limit 4) chosen;
 if jsonb_array_length(coalesce(v_options,'[]'::jsonb))<>4 then raise exception 'SHADOW_POOL_UNAVAILABLE'; end if;
 v_target:=v_options->floor(random()*4)::integer;
 select coalesce(max(number),0)+1 into v_number from app_private.shadow_game_rounds where run_id=p_run;
 insert into app_private.shadow_game_rounds(run_id,number,target_id,target_name,image_path,options,deadline)
 values(p_run,v_number,v_target->>'id',v_target->>'name',v_target->>'path',
 (select jsonb_agg(jsonb_build_object('id',o->>'id','name',o->>'name')) from jsonb_array_elements(v_options) o),clock_timestamp()+interval '10 seconds');
end $$;

create function app_private.shadow_run_response(p_run uuid) returns jsonb
language plpgsql set search_path='' as $$
declare r public.shadow_game_runs;q app_private.shadow_game_rounds;
begin
 if p_run is null then return jsonb_build_object('run',null,'serverNow',clock_timestamp()); end if;
 select * into strict r from public.shadow_game_runs where id=p_run;
 select * into q from app_private.shadow_game_rounds where run_id=r.id order by number desc limit 1;
 return jsonb_build_object('serverNow',clock_timestamp(),'run',jsonb_build_object(
 'id',r.id,'score',r.score,'lives',r.lives,'finished',r.finished_at is not null,
 'round',jsonb_build_object('id',q.id,'number',q.number,'imagePath',q.image_path,'options',q.options,'deadline',q.deadline,
 'answered',q.answered_at is not null,'correct',q.correct,'timedOut',q.timed_out,
 'answerName',case when q.answered_at is not null then q.target_name else null end)));
end $$;

create function app_private.shadow_game(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_round_id uuid default null,p_choice_id text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r public.shadow_game_runs;q app_private.shadow_game_rounds;v_gold integer;v_correct boolean;v_timeout boolean;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_action is null or p_action not in ('state','start','answer','next') then raise exception 'INVALID_SHADOW_ACTION'; end if;
 if p_action='state' then
  if p_run_id is not null then
   select * into r from public.shadow_game_runs where id=p_run_id and user_id=v_uid;
   if not found then raise exception 'SHADOW_RUN_NOT_FOUND'; end if;
  else select * into r from public.shadow_game_runs where user_id=v_uid and finished_at is null;
  end if;
  return app_private.shadow_run_response(r.id);
 end if;
 -- All mutating paths follow the wallet-first lock order used by purchases.
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 if p_action='start' then
  if p_operation_id is null then raise exception 'INVALID_OPERATION'; end if;
  select * into r from public.shadow_game_runs where user_id=v_uid and operation_id=p_operation_id;
  if found then return app_private.shadow_run_response(r.id); end if;
  select * into r from public.shadow_game_runs where user_id=v_uid and finished_at is null;
  if found then return app_private.shadow_run_response(r.id); end if;
  if v_gold<10 then raise exception 'INSUFFICIENT_GOLD'; end if;
  insert into public.shadow_game_runs(user_id,operation_id) values(v_uid,p_operation_id) returning * into r;
  perform app_private.shadow_new_round(r.id);
  update public.player_wallets set gold=gold-10,updated_at=clock_timestamp() where user_id=v_uid;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','arcade:shadow',-10);
  return app_private.shadow_run_response(r.id);
 end if;
 select * into r from public.shadow_game_runs where id=p_run_id and user_id=v_uid for update;
 if not found then raise exception 'SHADOW_RUN_NOT_FOUND'; end if;
 select * into q from app_private.shadow_game_rounds where id=p_round_id and run_id=r.id;
 if not found then raise exception 'SHADOW_ROUND_NOT_FOUND'; end if;
 if p_action='answer' then
  if q.answered_at is not null then return app_private.shadow_run_response(r.id); end if;
  if r.finished_at is not null then return app_private.shadow_run_response(r.id); end if;
  v_timeout:=clock_timestamp()>=q.deadline;
  if p_choice_id is null and not v_timeout then raise exception 'SHADOW_NOT_EXPIRED'; end if;
  if p_choice_id is not null and not exists(select 1 from jsonb_array_elements(q.options) o where o->>'id'=p_choice_id) then raise exception 'INVALID_SHADOW_CHOICE'; end if;
  v_correct:=not v_timeout and coalesce(p_choice_id=q.target_id,false);
  update app_private.shadow_game_rounds set answered_at=clock_timestamp(),correct=v_correct,timed_out=v_timeout where id=q.id;
  update public.shadow_game_runs set score=score+case when v_correct then 1 else 0 end,
   lives=lives-case when v_correct then 0 else 1 end,
   finished_at=case when not v_correct and lives=1 then clock_timestamp() else null end where id=r.id;
 else
  if r.finished_at is not null then return app_private.shadow_run_response(r.id); end if;
  if q.answered_at is null then raise exception 'SHADOW_ANSWER_REQUIRED'; end if;
  -- Replaying next for an old round must not skip the current question.
  if q.number=(select max(number) from app_private.shadow_game_rounds where run_id=r.id) then perform app_private.shadow_new_round(r.id); end if;
 end if;
 return app_private.shadow_run_response(r.id);
end $$;

create function app_private.shadow_leaderboard(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_rows jsonb;v_total bigint;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET'; end if;
 select count(*) into v_total from public.shadow_game_runs where finished_at is not null;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.rank),'[]'::jsonb) into v_rows from (
 select row_number() over(order by r.score desc,r.finished_at,r.id)+p_offset as rank,r.id,
 coalesce(p.nickname,'섬 여행자') as nickname,r.score,r.finished_at as "finishedAt",r.user_id=auth.uid() as mine
 from (select * from public.shadow_game_runs where finished_at is not null order by score desc,finished_at,id limit 20 offset p_offset) r
 left join public.player_profiles p on p.id=r.user_id) t;
 return jsonb_build_object('rows',v_rows,'total',v_total,'offset',p_offset,'pageSize',20);
end $$;

create function public.shadow_game(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_round_id uuid default null,p_choice_id text default null) returns jsonb
language sql security invoker set search_path='' as $$select app_private.shadow_game(p_action,p_operation_id,p_run_id,p_round_id,p_choice_id)$$;
create function public.shadow_leaderboard(p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$select app_private.shadow_leaderboard(p_offset)$$;
revoke all on function app_private.shadow_new_round(uuid),app_private.shadow_run_response(uuid),app_private.shadow_game(text,uuid,uuid,uuid,text),app_private.shadow_leaderboard(integer),public.shadow_game(text,uuid,uuid,uuid,text),public.shadow_leaderboard(integer) from public,anon,authenticated;
grant execute on function app_private.shadow_game(text,uuid,uuid,uuid,text),app_private.shadow_leaderboard(integer),public.shadow_game(text,uuid,uuid,uuid,text),public.shadow_leaderboard(integer) to authenticated;
notify pgrst,'reload schema';
commit;
