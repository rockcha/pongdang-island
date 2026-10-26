-- Keep completed scores and existing odd/even stakes unchanged. Legacy active
-- shadow games receive a catalog snapshot when their next action is processed.
alter table public.shadow_game_runs add column question_pool jsonb
  check (question_pool is null or jsonb_typeof(question_pool)='array');
alter table public.odd_even_runs add column initial_stake integer not null default 10
  check (initial_stake in (10,30));
alter table public.odd_even_runs alter column initial_stake set default 30;
alter table public.odd_even_runs alter column stake set default 30;
alter table public.odd_even_runs drop constraint odd_even_runs_stake_check;
alter table public.odd_even_runs add constraint odd_even_runs_stake_check check(stake between 0 and 31457280);

create function app_private.shadow_question_pool()
returns jsonb language sql stable set search_path=''
as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'path',thumbnail_path) order by name,id),'[]'::jsonb)
 from (select distinct on(name) id,name,thumbnail_path from public.collectible_species
   where kind<>'map' and thumbnail_path is not null and thumbnail_path<>'' order by name,id) pool;
$$;
revoke all on function app_private.shadow_question_pool() from public,anon,authenticated;

create or replace function app_private.shadow_new_round(p_run uuid)
returns void language plpgsql set search_path=''
as $$
declare v_pool jsonb;v_options jsonb;v_target jsonb;v_number integer;
begin
 select question_pool into strict v_pool from public.shadow_game_runs where id=p_run;
 if v_pool is null then
   v_pool:=app_private.shadow_question_pool();
   update public.shadow_game_runs set question_pool=v_pool where id=p_run;
 end if;
 if jsonb_array_length(v_pool)<4 then raise exception 'SHADOW_POOL_UNAVAILABLE';end if;
 select item into v_target from jsonb_array_elements(v_pool) item
 where not exists(select 1 from app_private.shadow_game_rounds q where q.run_id=p_run and q.target_id=item->>'id')
 order by random() limit 1;
 if not found then
   update public.shadow_game_runs set finished_at=coalesce(finished_at,clock_timestamp()) where id=p_run;
   return;
 end if;
 select jsonb_agg(item order by random()) into v_options from (
   select v_target item union all
   (select item from jsonb_array_elements(v_pool) item where item->>'id'<>v_target->>'id' order by random() limit 3)
 ) choices;
 select coalesce(max(number),0)+1 into v_number from app_private.shadow_game_rounds where run_id=p_run;
 insert into app_private.shadow_game_rounds(run_id,number,target_id,target_name,image_path,options,deadline)
 values(p_run,v_number,v_target->>'id',v_target->>'name',v_target->>'path',
   (select jsonb_agg(jsonb_build_object('id',o->>'id','name',o->>'name')) from jsonb_array_elements(v_options) o),clock_timestamp()+interval '8 seconds');
end;
$$;

CREATE OR REPLACE FUNCTION app_private.shadow_game(p_action text, p_operation_id uuid DEFAULT NULL::uuid, p_run_id uuid DEFAULT NULL::uuid, p_round_id uuid DEFAULT NULL::uuid, p_choice_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 if p_action='start' then
  if p_operation_id is null then raise exception 'INVALID_OPERATION'; end if;
  select * into r from public.shadow_game_runs where user_id=v_uid and operation_id=p_operation_id;
  if found then return app_private.shadow_run_response(r.id); end if;
  select * into r from public.shadow_game_runs where user_id=v_uid and finished_at is null;
  if found then return app_private.shadow_run_response(r.id); end if;
  if v_gold<10 then raise exception 'INSUFFICIENT_GOLD'; end if;
  insert into public.shadow_game_runs(user_id,operation_id,question_pool) values(v_uid,p_operation_id,app_private.shadow_question_pool()) returning * into r;
  perform app_private.shadow_new_round(r.id);
  update public.player_wallets set gold=gold-10,updated_at=clock_timestamp() where user_id=v_uid;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','arcade:shadow',-10);
  return app_private.shadow_run_response(r.id);
 end if;
 select * into r from public.shadow_game_runs where id=p_run_id and user_id=v_uid for update;
 if not found then raise exception 'SHADOW_RUN_NOT_FOUND'; end if;
 select * into q from app_private.shadow_game_rounds where id=p_round_id and run_id=r.id;
 if not found then raise exception 'SHADOW_ROUND_NOT_FOUND'; end if;
 if r.finished_at is not null then return app_private.shadow_run_response(r.id); end if;
 if r.question_pool is null then
  update public.shadow_game_runs set question_pool=app_private.shadow_question_pool() where id=r.id returning * into r;
 end if;
 if p_action='answer' then
  if q.answered_at is not null then return app_private.shadow_run_response(r.id); end if;
  v_timeout:=clock_timestamp()>=q.deadline;
  if p_choice_id is null and not v_timeout then raise exception 'SHADOW_NOT_EXPIRED'; end if;
  if p_choice_id is not null and not exists(select 1 from jsonb_array_elements(q.options) o where o->>'id'=p_choice_id) then raise exception 'INVALID_SHADOW_CHOICE'; end if;
  v_correct:=not v_timeout and coalesce(p_choice_id=q.target_id,false);
  update app_private.shadow_game_rounds set answered_at=clock_timestamp(),correct=v_correct,timed_out=v_timeout where id=q.id;
  update public.shadow_game_runs set score=score+case when v_correct then 1 else 0 end,
   lives=lives-case when v_correct then 0 else 1 end,
   finished_at=case when (not v_correct and lives=1) or (q.number>=jsonb_array_length(r.question_pool)) then clock_timestamp() else null end where id=r.id;
 else
  if q.answered_at is null then raise exception 'SHADOW_ANSWER_REQUIRED'; end if;
  if q.number=(select max(number) from app_private.shadow_game_rounds where run_id=r.id) then perform app_private.shadow_new_round(r.id); end if;
 end if;
 return app_private.shadow_run_response(r.id);
end $function$;

CREATE OR REPLACE FUNCTION app_private.shadow_run_response(p_run uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.shadow_game_runs;q app_private.shadow_game_rounds;
begin
 if p_run is null then return jsonb_build_object('run',null,'serverNow',clock_timestamp()); end if;
 select * into strict r from public.shadow_game_runs where id=p_run;
 select * into q from app_private.shadow_game_rounds where run_id=r.id order by number desc limit 1;
 return jsonb_build_object('serverNow',clock_timestamp(),'run',jsonb_build_object(
 'id',r.id,'score',r.score,'totalQuestions',jsonb_array_length(r.question_pool),'lives',r.lives,'finished',r.finished_at is not null,
 'round',jsonb_build_object('id',q.id,'number',q.number,'imagePath',q.image_path,'options',q.options,'deadline',q.deadline,
 'answered',q.answered_at is not null,'correct',q.correct,'timedOut',q.timed_out,
 'answerName',case when q.answered_at is not null then q.target_name else null end)));
end $function$;

CREATE OR REPLACE FUNCTION app_private.odd_even_game(p_action text, p_operation_id uuid DEFAULT NULL::uuid, p_run_id uuid DEFAULT NULL::uuid, p_round integer DEFAULT NULL::integer, p_choice text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();r public.odd_even_runs;v_gold integer;v_pearls integer;v_win boolean;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('state','start','answer','double','cashout') then raise exception 'INVALID_ODD_EVEN_ACTION';end if;
 if p_action='state' then
  select * into r from public.odd_even_runs where user_id=v_uid and finished_at is null;
  return app_private.odd_even_response(r.id);
 end if;
 perform app_private.get_gold_wallet();
 select gold into v_gold from public.player_wallets where user_id=v_uid for update;
 if p_action='start' then
  if p_operation_id is null then raise exception 'INVALID_OPERATION';end if;
  select * into r from public.odd_even_runs where user_id=v_uid and operation_id=p_operation_id;
  if found then return app_private.odd_even_response(r.id);end if;
  select * into r from public.odd_even_runs where user_id=v_uid and finished_at is null;
  if found then return app_private.odd_even_response(r.id);end if;
  if v_gold<30 then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.odd_even_runs(user_id,operation_id,stake,initial_stake) values(v_uid,p_operation_id,30,30) returning * into r;
  update public.player_wallets set gold=gold-30,updated_at=clock_timestamp() where user_id=v_uid;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','arcade:odd-even',-30);
  return app_private.odd_even_response(r.id);
 end if;
 select * into r from public.odd_even_runs where id=p_run_id and user_id=v_uid for update;
 if not found then raise exception 'ODD_EVEN_RUN_NOT_FOUND';end if;
 if r.finished_at is not null then return app_private.odd_even_response(r.id);end if;
 if p_round is null then raise exception 'INVALID_ROUND';end if;
 if p_round<r.round then return app_private.odd_even_response(r.id);end if;
 if p_round<>r.round then raise exception 'INVALID_ROUND';end if;
 if p_action='answer' then
  if r.stage<>'choose' then return app_private.odd_even_response(r.id);end if;
  if p_choice is null or p_choice not in ('odd','even') then raise exception 'INVALID_CHOICE';end if;
  v_pearls:=1+floor(random()*10)::integer;
  v_win:=(v_pearls%2=1)=(p_choice='odd');
  update public.odd_even_runs set pearls=v_pearls,choice=p_choice,stake=case when v_win then stake*2 else 0 end,
   wins=wins+case when v_win then 1 else 0 end,stage=case when v_win then 'decision' else 'lost' end,
   finished_at=case when v_win then null else clock_timestamp() end where id=r.id;
 elsif p_action='double' then
  if r.stage='choose' then return app_private.odd_even_response(r.id);end if;
  if r.wins>=20 then raise exception 'ODD_EVEN_LIMIT';end if;
  update public.odd_even_runs set stage='choose',round=round+1,pearls=null,choice=null where id=r.id;
 else
  if r.stage<>'decision' then raise exception 'ODD_EVEN_WIN_REQUIRED';end if;
  if v_gold>1000000000-r.stake then raise exception 'GOLD_LIMIT';end if;
  update public.player_wallets set gold=gold+r.stake,updated_at=clock_timestamp() where user_id=v_uid;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,r.payout_operation_id,'charge','arcade:odd-even:'||r.id::text,r.stake);
  update public.odd_even_runs set stage='banked',finished_at=clock_timestamp() where id=r.id;
 end if;
 return app_private.odd_even_response(r.id);
end $function$;

CREATE OR REPLACE FUNCTION app_private.odd_even_response(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select jsonb_build_object('run',(select jsonb_build_object('id',r.id,'stake',r.stake,'initialStake',r.initial_stake,'wins',r.wins,'round',r.round,'stage',r.stage,'pearls',r.pearls,'choice',r.choice) from public.odd_even_runs r where r.id=p_id),'maxWins',20)
$function$;
