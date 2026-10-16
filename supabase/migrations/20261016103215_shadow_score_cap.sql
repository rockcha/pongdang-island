begin;
-- Preserve historical scores; enforce the cap for newly answered rounds.
create or replace function app_private.shadow_game(p_action text,p_operation_id uuid default null,p_run_id uuid default null,p_round_id uuid default null,p_choice_id text default null) returns jsonb
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
 if r.finished_at is not null then return app_private.shadow_run_response(r.id); end if;
 if r.score>=100 then
  update public.shadow_game_runs set finished_at=clock_timestamp() where id=r.id;
  return app_private.shadow_run_response(r.id);
 end if;
 if p_action='answer' then
  if q.answered_at is not null then return app_private.shadow_run_response(r.id); end if;
  v_timeout:=clock_timestamp()>=q.deadline;
  if p_choice_id is null and not v_timeout then raise exception 'SHADOW_NOT_EXPIRED'; end if;
  if p_choice_id is not null and not exists(select 1 from jsonb_array_elements(q.options) o where o->>'id'=p_choice_id) then raise exception 'INVALID_SHADOW_CHOICE'; end if;
  v_correct:=not v_timeout and coalesce(p_choice_id=q.target_id,false);
  update app_private.shadow_game_rounds set answered_at=clock_timestamp(),correct=v_correct,timed_out=v_timeout where id=q.id;
  update public.shadow_game_runs set score=least(100,score+case when v_correct then 1 else 0 end),
   lives=lives-case when v_correct then 0 else 1 end,
   finished_at=case when (not v_correct and lives=1) or (v_correct and score>=99) then clock_timestamp() else null end where id=r.id;
 else
  if q.answered_at is null then raise exception 'SHADOW_ANSWER_REQUIRED'; end if;
  if q.number=(select max(number) from app_private.shadow_game_rounds where run_id=r.id) then perform app_private.shadow_new_round(r.id); end if;
 end if;
 return app_private.shadow_run_response(r.id);
end $$;
revoke all on function app_private.shadow_game(text,uuid,uuid,uuid,text) from public,anon;
grant execute on function app_private.shadow_game(text,uuid,uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
