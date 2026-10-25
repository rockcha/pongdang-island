-- Temporary player's authenticated actions only; caller must roll back.
do $test$
declare u uuid:=gen_random_uuid();r record;v record;b record;s jsonb;op uuid;
 trip uuid;before_trip jsonb;before_fuel integer;expected numeric;trap_id uuid;trap_end timestamptz;
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'항로검증'||left(u::text,6));
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,1000000,'{"fuel":10000,"bait":1000}')
 on conflict(user_id) do update set gold=1000000,inventory=excluded.inventory;
 insert into app_private.player_fishing_relics(user_id,relic_id)
 select u,id from public.fishing_relics where effect_kind='harbor_duration_percent';
 set local role authenticated;
 perform public.harbor_action('buy',gen_random_uuid(),'tin-dinghy');
 perform public.harbor_action('buy',gen_random_uuid(),'red-lantern');
 reset role;
 for r in select * from public.fishing_relics where effect_kind='harbor_duration_percent' order by effect_value loop
  set local role authenticated;
  perform public.equip_relic(r.id,gen_random_uuid(),0);
  s:=public.harbor_state();
  reset role;
  for b in select * from public.harbor_boats where user_id=u loop
   select * into strict v from public.harbor_vessels where id=b.vessel_id;
   expected:=v.duration_minutes*60*(100-r.effect_value)/100;
   if not exists(select 1 from jsonb_array_elements(s->'boats') x where x->>'id'=b.id::text
     and (x->>'duration_minutes')::numeric=expected/60
     and (x->>'base_duration_minutes')::integer=v.duration_minutes) then raise exception 'BOAT_PREVIEW_WRONG';end if;
   if not exists(select 1 from jsonb_array_elements(s->'vessels') x where x->>'id'=v.id
     and (x->>'duration_minutes')::numeric=expected/60) then raise exception 'CATALOG_PREVIEW_WRONG';end if;
   select (inventory->>'fuel')::integer into before_fuel from public.player_wallets where user_id=u;
   op:=gen_random_uuid();
   set local role authenticated;
   s:=public.harbor_action('depart',op,null,null,1,b.id);
   reset role;
   trip:=(s#>>'{receipt,voyageId}')::uuid;
   select to_jsonb(t) into before_trip from public.harbor_voyages t where id=trip;
   if extract(epoch from (before_trip->>'returns_at')::timestamptz-(before_trip->>'departed_at')::timestamptz)<>expected then raise exception 'DURATION_WRONG %',r.id;end if;
   if (before_trip#>>'{vessel_snapshot,duration_seconds}')::numeric<>expected
    or (before_trip#>>'{vessel_snapshot,harbor_duration_percent}')::numeric<>r.effect_value
    or before_trip#>'{vessel_snapshot,catch_rule}' is distinct from v.catch_rule
    or (before_trip#>>'{vessel_snapshot,fuel_cost}')::integer<>v.fuel_cost then raise exception 'SNAPSHOT_WRONG';end if;
   if (select (inventory->>'fuel')::integer from public.player_wallets where user_id=u)<>before_fuel-v.fuel_cost then raise exception 'FUEL_CHANGED';end if;
   set local role authenticated;
   s:=public.harbor_action('depart',op,null,null,1,b.id);
   reset role;
   if not (s->>'replayed')::boolean or (select to_jsonb(t) from public.harbor_voyages t where id=trip) is distinct from before_trip then raise exception 'RETRY_CHANGED_TRIP';end if;
   -- Keep this voyage for a second retry after changing equipment below.
  end loop;
  set local role authenticated;
  perform public.expedition_action('depart',gen_random_uuid(),'dinghy','pongdang','{"bait":1}');
  reset role;
  select id,returns_at into trap_id,trap_end from public.fishing_expeditions where user_id=u and claimed_at is null;
  if not exists(select 1 from public.fishing_expeditions where id=trap_id and extract(epoch from returns_at-departed_at)=900) then raise exception 'TRAP_AFFECTED';end if;
  select to_jsonb(t) into before_trip from public.harbor_voyages t where id=trip;
  set local role authenticated;
  perform public.equip_relic(null,gen_random_uuid(),500);
  s:=public.harbor_action('depart',op,null,null,1,b.id);
  reset role;
  if not (s->>'replayed')::boolean or (select to_jsonb(t) from public.harbor_voyages t where id=trip) is distinct from before_trip then raise exception 'UNEQUIP_OR_RETRY_CHANGED_TRIP';end if;
  if (select returns_at from public.fishing_expeditions where id=trap_id)<>trap_end then raise exception 'TRAP_RETURN_CHANGED';end if;
  delete from public.harbor_voyages where user_id=u;
  delete from public.fishing_expeditions where user_id=u;
  set local role authenticated;
  s:=public.harbor_action('depart',gen_random_uuid(),null,null,1,b.id);
  reset role;
  if not exists(select 1 from public.harbor_voyages where id=(s#>>'{receipt,voyageId}')::uuid
   and extract(epoch from returns_at-departed_at)=v.duration_minutes*60
   and (vessel_snapshot->>'harbor_duration_percent')::numeric=0) then raise exception 'BONUS_PERSISTED_AFTER_UNEQUIP';end if;
  delete from public.harbor_voyages where user_id=u;
 end loop;
 if (select count(*) from public.fishing_relics where effect_kind='harbor_duration_percent')<>3 then raise exception 'MISSING_RELICS';end if;
end $test$;
