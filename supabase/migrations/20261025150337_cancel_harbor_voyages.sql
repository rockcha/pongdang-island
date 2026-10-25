begin;

-- Archive interrupted trips outside the catch history. Marking them claimed
-- would incorrectly award completion statistics and allow collection logic.
create table app_private.cancelled_harbor_voyages (
 voyage_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 voyage jsonb not null check(jsonb_typeof(voyage)='object'),
 cancelled_at timestamptz not null,
 free_cancellation boolean not null,
 refunded_fuel integer not null check(refunded_fuel>=0)
);
alter table app_private.cancelled_harbor_voyages enable row level security;
create index cancelled_harbor_owner on app_private.cancelled_harbor_voyages(user_id);
create index cancelled_harbor_boat on app_private.cancelled_harbor_voyages(user_id,(voyage->>'boat_id'),cancelled_at desc);
revoke all on app_private.cancelled_harbor_voyages from public,anon,authenticated;

create function app_private.cancel_harbor_voyage(p_voyage_id uuid,p_operation_id uuid,p_refund_expected boolean)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();trip public.harbor_voyages;w public.player_wallets;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;at_time timestamptz;free_cancel boolean;refund integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_voyage_id is null or p_operation_id is null or p_refund_expected is null then raise exception 'INVALID_HARBOR_ACTION';end if;
 sig:=jsonb_build_object('action','cancel','voyage',p_voyage_id,'refundExpected',p_refund_expected);
 -- Serialize with departure, collection and arrival acknowledgement.
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature is distinct from sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u for update;
 if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
 at_time:=clock_timestamp();
 if trip.claimed_at is not null or trip.returns_at<=at_time then raise exception 'VOYAGE_ALREADY_RETURNED';end if;
 free_cancel:=at_time<=trip.departed_at+interval '30 seconds';
 if free_cancel is distinct from p_refund_expected then raise exception 'CANCELLATION_QUOTE_CHANGED';end if;
 refund:=case when free_cancel then (trip.vessel_snapshot->>'fuel_cost')::integer else 0 end;
 if refund is null or refund<0 then raise exception 'INVALID_VOYAGE_SNAPSHOT';end if;
 if coalesce((w.inventory->>'fuel')::bigint,0)+refund>1000000000 then raise exception 'FUEL_LIMIT';end if;
 insert into app_private.cancelled_harbor_voyages(voyage_id,user_id,voyage,cancelled_at,free_cancellation,refunded_fuel)
 values(trip.id,u,to_jsonb(trip),at_time,free_cancel,refund);
 delete from public.harbor_voyages where id=trip.id and user_id=u;
 if refund>0 then
  update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(coalesce((inventory->>'fuel')::integer,0)+refund)),updated_at=at_time where user_id=u;
 end if;
 receipt:=jsonb_build_object('action','cancel','voyageId',trip.id,'boatId',trip.boat_id,'refundedFuel',refund,'freeCancellation',free_cancel);
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt,created_at) values(u,p_operation_id,sig,receipt,at_time);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;

create function public.cancel_harbor_voyage(p_voyage_id uuid,p_operation_id uuid,p_refund_expected boolean)
returns jsonb language sql set search_path='' as $function$
 select app_private.cancel_harbor_voyage(p_voyage_id,p_operation_id,p_refund_expected)
$function$;
revoke all on function app_private.cancel_harbor_voyage(uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.cancel_harbor_voyage(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function app_private.cancel_harbor_voyage(uuid,uuid,boolean) to authenticated;
grant execute on function public.cancel_harbor_voyage(uuid,uuid,boolean) to authenticated;

CREATE OR REPLACE FUNCTION app_private.snapshot_harbor_catch_rule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rule jsonb;base_minutes integer;minimum_count integer;maximum_count integer;
 reduction numeric:=0;seconds numeric;previous app_private.cancelled_harbor_voyages;previous_count integer;
begin
 select catch_rule,duration_minutes,fishing_count,coalesce(fishing_count_max,fishing_count)
 into strict rule,base_minutes,minimum_count,maximum_count from public.harbor_vessels where id=new.vessel_id;
 if rule is null then raise exception 'HARBOR_RULE_REQUIRED';end if;
 new.vessel_snapshot:=jsonb_set(new.vessel_snapshot,'{catch_rule}',rule);
 -- An undo must not become a free way to reroll a boat's attempt count.
 select * into previous from app_private.cancelled_harbor_voyages
 where user_id=new.user_id and voyage->>'boat_id'=new.boat_id::text order by cancelled_at desc limit 1;
 if found and previous.free_cancellation and previous.voyage#>'{vessel_snapshot,catch_rule}'=rule
  and not exists(select 1 from public.harbor_voyages where boat_id=new.boat_id and departed_at>=previous.cancelled_at) then
  previous_count:=(previous.voyage#>>'{vessel_snapshot,fishing_count}')::integer;
  if previous_count between minimum_count and maximum_count then
   new.vessel_snapshot:=jsonb_set(new.vessel_snapshot,'{fishing_count}',to_jsonb(previous_count));
  end if;
 end if;
 if new.user_id=auth.uid() then reduction:=app_private.relic_bonus('harbor_duration_percent');end if;
 seconds:=base_minutes*60*(100-reduction)/100;
 new.returns_at:=new.departed_at+make_interval(secs=>seconds::double precision);
 new.vessel_snapshot:=new.vessel_snapshot||jsonb_build_object('base_duration_minutes',base_minutes,
  'duration_minutes',seconds/60,'duration_seconds',seconds,'harbor_duration_percent',reduction);
 return new;
end $function$;
notify pgrst,'reload schema';
commit;
