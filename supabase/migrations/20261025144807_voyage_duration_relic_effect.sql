begin;

-- Refuse to overwrite an unexpected deployment target.
do $$begin if md5(replace(pg_get_functiondef('app_private.harbor_state()'::regprocedure),chr(13)||chr(10),chr(10)))<>'57198896dc4a51282405e1a1d10ba164' then raise exception 'HARBOR_RELIC_FUNCTION_DRIFT';end if;end$$;
do $$begin if md5(replace(pg_get_functiondef('app_private.snapshot_harbor_catch_rule()'::regprocedure),chr(13)||chr(10),chr(10)))<>'66dfa6ab7946436dec8316298245ccf1' then raise exception 'HARBOR_RELIC_FUNCTION_DRIFT';end if;end$$;

-- New departures snapshot the relic bonus. Existing voyages are never rewritten.
alter table public.fishing_relics drop constraint relic_effect_shape;
alter table public.fishing_relics add constraint relic_effect_shape check (
 (effect_kind='none' and effect_value=0)
 or (effect_kind in ('fuel_active_slots','bait_active_slots') and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='personal_bait_hours' and ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=8)))
 or (effect_kind='fishing_wait_seconds' and ((rarity='rare' and effect_value=0.5) or (rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='trap_seconds_per_bait' and ((rarity='rare' and effect_value=30) or (rarity='epic' and effect_value=90) or (rarity='mythic' and effect_value=180)))
 or (effect_kind='boat_discount_gold' and ((rarity='rare' and effect_value=50) or (rarity='epic' and effect_value=150) or (rarity='mythic' and effect_value=400)))
 or (effect_kind='bait_discount_gold' and ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='harbor_duration_percent' and ((rarity='rare' and effect_value=3) or (rarity='epic' and effect_value=6) or (rarity='mythic' and effect_value=10)))
);

CREATE OR REPLACE FUNCTION app_private.snapshot_harbor_catch_rule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rule jsonb; base_minutes integer; reduction numeric:=0; seconds numeric;
begin
 select catch_rule,duration_minutes into strict rule,base_minutes from public.harbor_vessels where id=new.vessel_id;
 if rule is null then raise exception 'HARBOR_RULE_REQUIRED';end if;
 new.vessel_snapshot:=jsonb_set(new.vessel_snapshot,'{catch_rule}',rule);
 -- Public departure holds the same wallet lock as equipment changes. The trigger
 -- is private; only the authenticated owner's equipped relic can affect a trip.
 if new.user_id=auth.uid() then reduction:=app_private.relic_bonus('harbor_duration_percent');end if;
 seconds:=base_minutes*60*(100-reduction)/100;
 new.returns_at:=new.departed_at+make_interval(secs=>seconds::double precision);
 new.vessel_snapshot:=new.vessel_snapshot||jsonb_build_object(
  'base_duration_minutes',base_minutes,'duration_minutes',seconds/60,
  'duration_seconds',seconds,'harbor_duration_percent',reduction);
 return new;
end $function$;

CREATE OR REPLACE FUNCTION app_private.harbor_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w jsonb;capacity integer;reduction numeric;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 reduction:=app_private.relic_bonus('harbor_duration_percent');
 select coalesce((select dock_slots from app_private.player_harbor_capacity where user_id=u),2) into capacity;
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),'fuelPrice',57,'fuelDailyLimit',5,'fuelPurchasedToday',coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((clock_timestamp() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0),'dockSlots',capacity,'nextDockExpansion',case when capacity<4 then jsonb_build_object('slot',capacity+1,'price',case capacity when 2 then 10000 else 30000 end) else null end,
 'regions',(select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'unlocked',not r.requires_map_fragment or exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) order by r.sort_order) from public.regions r),
 'vessels',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('price',greatest(0,v.price-app_private.relic_bonus('boat_discount_gold')::integer),'basePrice',v.price,'duration_minutes',v.duration_minutes*(100-reduction)/100,'base_duration_minutes',v.duration_minutes,'harbor_duration_percent',reduction,'owned',o.n>0,'ownedCount',o.n) order by v.sort_order)
  from public.harbor_vessels v cross join lateral(select count(*)::integer n from public.harbor_boats b where b.user_id=u and b.vessel_id=v.id and b.sold_at is null)o),'[]'::jsonb),
 'boats',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('price',coalesce(b.paid_price,v.price),'duration_minutes',v.duration_minutes*(100-reduction)/100,'base_duration_minutes',v.duration_minutes,'harbor_duration_percent',reduction,'id',b.id,'vessel_id',b.vessel_id,'instance_no',b.instance_no,'dock_slot',b.dock_slot,'owned',true) order by b.purchased_at,b.id)
  from public.harbor_boats b join public.harbor_vessels v on v.id=b.vessel_id where b.user_id=u and b.sold_at is null),'[]'::jsonb),
 'voyages',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('region_name',(select name from public.regions where id=v.region_id)) order by v.departed_at) from public.harbor_voyages v where v.user_id=u and v.claimed_at is null),'[]'::jsonb));
end $function$;

notify pgrst, 'reload schema';
commit;
