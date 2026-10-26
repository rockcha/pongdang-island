begin;
-- Existing 60-second attempts retain their original deadlines and server score rules.
alter table app_private.pongi_whack_runs add column duration_ms integer not null default 60000 check(duration_ms in(30000,60000));
alter table app_private.pongi_whack_runs alter column duration_ms set default 30000;
create or replace function app_private.pongi_whack_board() returns jsonb
language plpgsql volatile set search_path='' as $$
declare board jsonb:='[]'; free integer[]:=array[0,0,0,0,0,0,0,0,0];
 t integer:=500; slot integer; choices integer[]; kind text; roll double precision;
 golden_at integer:=5000+floor(random()*21000)::integer; golden boolean:=false; deadline integer; n integer:=0;
begin
 while t<29000 loop
  select array_agg(i) into choices from generate_series(1,9) i where free[i]<=t;
  if cardinality(choices)>0 then
   slot:=choices[1+floor(random()*cardinality(choices))::integer]; roll:=random();
   kind:=case when not golden and t>=golden_at then 'golden' when roll<0.14 then 'bomb'
    when roll<case when t<10000 then 0.30 when t<20000 then 0.42 else 0.54 end
     then case when random()<0.5 then 'impostor' else 'hay' end else 'pongi' end;
   if kind='golden' then golden:=true;end if;
   deadline:=least(30000,t+case when kind='golden' then 1050 when t<10000 then 1100 when t<20000 then 900 else 780 end);
   board:=board||jsonb_build_array(jsonb_build_object('id',n,'hole',slot-1,'at',t,'until',deadline,'kind',kind));
   free[slot]:=deadline+100;n:=n+1;
  end if;
  t:=t+case when t<10000 then 600 when t<20000 then 420 else 300 end;
 end loop;
 return board;
end $$;
CREATE OR REPLACE FUNCTION app_private.pongi_whack_state(p_run app_private.pongi_whack_runs)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id',p_run.id,'durationMs',p_run.duration_ms,'startedAt',p_run.started_at,'targets',p_run.targets,
 'finishedAt',p_run.finished_at,'abandoned',p_run.abandoned_at is not null,'score',p_run.score,'mistakes',p_run.mistakes)
$function$;
CREATE OR REPLACE FUNCTION app_private.pongi_whack_action(p_action text, p_operation_id uuid, p_run_id uuid, p_hits jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   insert into app_private.pongi_whack_runs(user_id,operation_id,started_at,targets,duration_ms)
    values(uid,p_operation_id,t+interval '3 seconds',app_private.pongi_whack_board(),30000) returning * into r;
  end if;
 else
  select * into r from app_private.pongi_whack_runs where id=p_run_id and user_id=uid for update;
  if not found then raise exception 'RUN_NOT_FOUND';end if;
  if r.finished_at is null and r.abandoned_at is null then
   if p_action='leave' then
    update app_private.pongi_whack_runs set abandoned_at=t where id=r.id returning * into r;
   else
    if t<r.started_at+make_interval(secs=>r.duration_ms/1000.0) then raise exception 'TOO_EARLY';end if;
    if t>r.started_at+interval '15 minutes' then raise exception 'RUN_EXPIRED';end if;
    -- Close submissions before the existing one-minute weekly settlement grace ends.
    if t>((date_trunc('week',(r.started_at+make_interval(secs=>r.duration_ms/1000.0)) at time zone 'Asia/Seoul')+interval '7 days') at time zone 'Asia/Seoul')+interval '45 seconds' then raise exception 'RUN_EXPIRED';end if;
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
    update app_private.pongi_whack_runs set finished_at=started_at+make_interval(secs=>r.duration_ms/1000.0),score=total,mistakes=error_count,hits=p_hits where id=r.id returning * into r;
   end if;
  end if;
 end if;
 select gold into balance from public.player_wallets where user_id=uid;
 return jsonb_build_object('serverNow',clock_timestamp(),'gold',balance,'run',case when r.id is null then null else app_private.pongi_whack_state(r) end);
end $function$;
notify pgrst,'reload schema';
commit;
