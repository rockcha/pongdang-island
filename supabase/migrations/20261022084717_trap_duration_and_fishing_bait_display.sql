begin;
set local lock_timeout='5s';

create function app_private.trap_minutes_per_bait()
returns integer language sql immutable set search_path='' as $$select 22$$;
revoke all on function app_private.trap_minutes_per_bait() from public,anon,authenticated;

create or replace function app_private.expedition_action(p_action text,p_operation_id uuid,p_vessel_id text default null,
 p_region_id text default null,p_cargo jsonb default null,p_expedition_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r jsonb;c record;total integer:=0;minutes integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action='buy' then raise exception 'VESSEL_RETIRED';end if;
 if p_action='depart' then
  if p_vessel_id is distinct from 'dinghy' then raise exception 'VESSEL_RETIRED';end if;
  if p_cargo is null or jsonb_typeof(p_cargo)<>'object' then raise exception 'INVALID_CARGO';end if;
  for c in select value from jsonb_each_text(p_cargo) loop
   if c.value !~ '^[1-9][0-9]{0,2}$' then raise exception 'INVALID_CARGO';end if;
   total:=total+c.value::integer;
  end loop;
  if total<1 or total>30 then raise exception 'CARGO_LIMIT';end if;
 end if;
 r:=app_private.settle_legacy_expedition(p_action,p_operation_id,p_vessel_id,p_region_id,p_cargo,p_expedition_id);
 if p_action='depart' and not (r->>'replayed')::boolean then
  minutes:=total*app_private.trap_minutes_per_bait();
  update public.fishing_expeditions set returns_at=departed_at+make_interval(mins=>minutes),
   vessel_snapshot=jsonb_set(vessel_snapshot,'{duration_minutes}',to_jsonb(minutes))
   where id=(r->'receipt'->>'expeditionId')::uuid and user_id=u;
  r:=app_private.expedition_state()||jsonb_build_object('receipt',r->'receipt','replayed',false);
 end if;
 return r;
end $$;

create or replace function app_private.expedition_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',clock_timestamp(),'testEnabled',(select instant_return_enabled from app_private.expedition_settings where id),
 'minutesPerBait',app_private.trap_minutes_per_bait(),
 'vessels',(select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',true)) from public.fishing_vessels v where id='dinghy'),
 'active',(select (to_jsonb(e)-'result')||jsonb_build_object('boosts',app_private.expedition_boosts_payload(e.id)) from public.fishing_expeditions e where user_id=u and claimed_at is null),
 'history',coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('boosts',app_private.expedition_boosts_payload(h.id)) order by departed_at desc) from (select * from public.fishing_expeditions where user_id=u and claimed_at is not null order by departed_at desc limit 5) h),'[]'::jsonb),
 'baits',(select jsonb_agg(to_jsonb(b) order by sort_order) from public.fishing_baits b));
end $$;

-- The fishing card must keep the bait's start-time grades/targets/night period,
-- even after the inventory refreshes or the next alternating turn advances.
create or replace function app_private.prepared_fishing_payload(p app_private.prepared_fishing_casts)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('operation_id',p.operation_id,'region_id',p.region_id,'bait_id',p.bait_id,
 'eligible',p.eligible,'species',p.snapshot,'rarity',p.rarity,'wait_seconds',p.wait_seconds,
 'failure_at',p.failure_at,'failure_reason',p.failure_reason,'expires_at',p.expires_at,
 'finished',p.finished_at is not null,'result',p.result,'bait_profile',p.bait_snapshot)
$$;

notify pgrst,'reload schema';
commit;
