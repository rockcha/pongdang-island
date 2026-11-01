begin;
set local lock_timeout='5s';

-- Scheduled by the server clock; reopening requires an explicit release.
create table app_private.pongi_whack_maintenance (
 id boolean primary key default true check(id),
 starts_at timestamptz not null,
 released_at timestamptz,
 check(released_at is null or released_at>=starts_at)
);
alter table app_private.pongi_whack_maintenance enable row level security;
revoke all on app_private.pongi_whack_maintenance from public,anon,authenticated;
insert into app_private.pongi_whack_maintenance(id,starts_at)
values(true,'2026-11-02 00:00:00+09');

create function app_private.pongi_whack_maintenance_active(p_at timestamptz default clock_timestamp())
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from app_private.pongi_whack_maintenance
 where id and p_at>=starts_at and (released_at is null or p_at<released_at))
$$;
revoke all on function app_private.pongi_whack_maintenance_active(timestamptz) from public,anon,authenticated;

-- Full final RPC definition. Existing finish/leave, scoring, quests and rewards remain intact.
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
   -- Preserve retries of an accepted operation; reject only genuinely new starts.
   if app_private.pongi_whack_maintenance_active(clock_timestamp()) then raise exception 'PONGI_WHACK_MAINTENANCE';end if;
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
    update app_private.pongi_whack_runs set finished_at=started_at+make_interval(secs=>r.duration_ms/1000.0),score=total,reward_gold=total,mistakes=error_count,hits=p_hits where id=r.id returning * into r;
    if total>0 then
     update public.player_wallets set gold=gold+total,updated_at=clock_timestamp() where user_id=uid;
     insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
      values(uid,gen_random_uuid(),'charge','arcade:pongi-whack:reward',total);
    end if;
   end if;
  end if;
 end if;
 select gold into balance from public.player_wallets where user_id=uid;
 return jsonb_build_object('serverNow',clock_timestamp(),'gold',balance,
 'maintenance',(select jsonb_build_object('startsAt',m.starts_at,'releasedAt',m.released_at,'active',app_private.pongi_whack_maintenance_active(clock_timestamp())) from app_private.pongi_whack_maintenance m where m.id),
 'run',case when r.id is null then null else app_private.pongi_whack_state(r) end);
end $function$;
revoke all on function app_private.pongi_whack_action(text,uuid,uuid,jsonb) from public,anon;
grant execute on function app_private.pongi_whack_action(text,uuid,uuid,jsonb) to authenticated;

comment on table app_private.pongi_whack_maintenance is
 'Pongi Whack rework gate. Preserve existing runs and weekly settlement. Reopen only after validation by setting released_at=clock_timestamp() where id.';
commit;
