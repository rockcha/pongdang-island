-- Run inside a transaction and roll back. Calls use the authenticated role;
-- direct fixture writes only create/advance this temporary player's work.
do $test$
declare u uuid:=gen_random_uuid(); r record; state jsonb; p jsonb; base numeric; boosted numeric;
 site uuid; idle uuid; n integer; limit_count integer; max_minutes integer; before_gold integer;
 vessel text; list_price integer; boat uuid; seconds numeric; op uuid;
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'효과검증'||left(u::text,6));
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,1000000,'{"fuel":10000,"bait":10000}')
 on conflict(user_id) do update set gold=1000000,inventory=excluded.inventory;
 insert into public.player_navigation(user_id,region_id) values(u,'pongdang') on conflict(user_id) do update set region_id='pongdang';
 insert into app_private.player_fishing_relics(user_id,relic_id) select u,id from public.fishing_relics;
 for r in select * from public.fishing_relics order by effect_kind,effect_value loop
  set local role authenticated;
  state:=public.equip_relic(r.id,gen_random_uuid(),0);
  if state->>'equippedId'<>r.id then raise exception 'EQUIP_FAILED %',r.id;end if;
  reset role;
  if r.effect_kind in ('fuel_active_slots','bait_active_slots') then
   limit_count:=4+r.effect_value;
   for n in 1..limit_count+1 loop
    if r.effect_kind='fuel_active_slots' then
     insert into app_private.production_sites(user_id,facility_id) values(u,'clockwork-compressor') returning id into site;
     insert into public.player_collectibles(user_id,species_id) select u,'shared-drift-scrap-wood' from generate_series(1,2);
    else
     insert into app_private.bait_production_sites(user_id,facility_id) values(u,'wriggly-soil-box') returning id into site;
    end if;
    set local role authenticated;
    begin
     if r.effect_kind='fuel_active_slots' then
      state:=public.production_action('start',gen_random_uuid(),site::text,'{"shared-drift-scrap-wood":2}');
     else state:=public.bait_production_action('start',gen_random_uuid(),site::text,1);end if;
     if n>limit_count then raise exception 'EXTRA_SLOT_NOT_BLOCKED %',r.id;end if;
    exception when others then
     if n<=limit_count or sqlerrm not in ('PRODUCTION_ACTIVE_LIMIT','BAIT_PRODUCTION_ACTIVE_LIMIT') then raise;end if;
    end;
    reset role;
   end loop;
   if (state->>'activeTotal')::integer<>limit_count then raise exception 'ACTIVE_LIMIT_WRONG %',r.id;end if;
   idle:=site;
   set local role authenticated;
   begin
    perform public.equip_relic(null,gen_random_uuid(),500);raise exception 'OVER_CAPACITY_REMOVAL_ALLOWED';
   exception when others then
    if sqlerrm<>(case when r.effect_kind='fuel_active_slots' then 'RELIC_FUEL_PRODUCTION_ACTIVE:4' else 'RELIC_BAIT_PRODUCTION_ACTIVE:4' end) then raise;end if;
   end;
   reset role;
   if r.effect_kind='fuel_active_slots' then
    update app_private.production_sites set started_at=clock_timestamp()-interval '1 hour',completes_at=clock_timestamp()-interval '1 second'
     where id in(select id from app_private.production_sites where user_id=u and completes_at>clock_timestamp() order by id limit limit_count-4);
   else
    update app_private.bait_production_sites set started_at=clock_timestamp()-interval '1 hour',completes_at=clock_timestamp()-interval '1 second'
     where id in(select id from app_private.bait_production_sites where user_id=u and completes_at>clock_timestamp() order by id limit limit_count-4);
   end if;
   set local role authenticated;
   perform public.equip_relic(null,gen_random_uuid(),500);
   begin
    if r.effect_kind='fuel_active_slots' then
     perform public.production_action('start',gen_random_uuid(),idle::text,'{"shared-drift-scrap-wood":2}');
    else perform public.bait_production_action('start',gen_random_uuid(),idle::text,1);end if;
    raise exception 'UNEQUIPPED_EXTRA_SLOT_ALLOWED %',r.id;
   exception when others then
    if sqlerrm not in ('PRODUCTION_ACTIVE_LIMIT','BAIT_PRODUCTION_ACTIVE_LIMIT') then raise;end if;
   end;
   reset role;
   if r.effect_kind='fuel_active_slots' then
    if (select count(*) from app_private.production_sites where user_id=u and started_at is not null)<>limit_count then raise exception 'RUNNING_FUEL_CHANGED';end if;
    delete from app_private.production_sites where user_id=u;
   else
    if (select count(*) from app_private.bait_production_sites where user_id=u and started_at is not null)<>limit_count then raise exception 'RUNNING_BAIT_CHANGED';end if;
    delete from app_private.bait_production_sites where user_id=u;
   end if;
   continue;
  elsif r.effect_kind='personal_bait_hours' then
   max_minutes:=720+60*r.effect_value;
   set local role authenticated;
   state:=public.personal_bait_workshop_state();
   if (state#>>'{limits,maxMinutes}')::integer<>max_minutes then raise exception 'WORKSHOP_LIMIT_WRONG %',r.id;end if;
   begin
    perform public.personal_bait_workshop_action('start',gen_random_uuid(),'bait',1,max_minutes+30,null,1);
    raise exception 'WORKSHOP_OVERRUN_ALLOWED';
   exception when others then if sqlerrm<>'INVALID_WORKSHOP_TIME' then raise;end if;end;
   perform public.personal_bait_workshop_action('start',gen_random_uuid(),'bait',1,max_minutes,null,1);
   perform public.equip_relic(null,gen_random_uuid(),500);
   state:=public.personal_bait_workshop_state();
   if (state#>>'{limits,maxMinutes}')::integer<>720 or (state#>>'{job,minutes}')::integer<>max_minutes then raise exception 'WORKSHOP_SNAPSHOT_CHANGED';end if;
   reset role;
   delete from app_private.personal_bait_jobs where user_id=u;
   set local role authenticated;
   begin
    perform public.personal_bait_workshop_action('start',gen_random_uuid(),'bait',1,max_minutes,null,1);
    raise exception 'UNEQUIPPED_WORKSHOP_BONUS_ALLOWED';
   exception when others then if sqlerrm<>'INVALID_WORKSHOP_TIME' then raise;end if;end;
   reset role;continue;
  elsif r.effect_kind='fishing_wait_seconds' then
   set local role authenticated;
   perform setseed(0.25);
   p:=public.prepare_discovery_fishing('pongdang','bait',gen_random_uuid(),false);
   boosted:=(p->>'wait_seconds')::numeric;
   perform public.equip_relic(null,gen_random_uuid(),500);
   state:=public.prepare_discovery_fishing('pongdang','bait',gen_random_uuid(),false);
   if state->>'operation_id'<>p->>'operation_id' or (state->>'wait_seconds')::numeric<>boosted then raise exception 'PENDING_CAST_CHANGED';end if;
   reset role;
   update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where user_id=u and finished_at is null;
   set local role authenticated;
   perform setseed(0.25);
   p:=public.prepare_discovery_fishing('pongdang','bait',gen_random_uuid(),false);
   base:=(p->>'wait_seconds')::numeric;
   if abs(base-boosted-r.effect_value)>0.00001 then raise exception 'FISHING_REDUCTION_WRONG %: %',r.id,base-boosted;end if;
   reset role;
   update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where user_id=u and finished_at is null;
   continue;
  elsif r.effect_kind='trap_seconds_per_bait' then
   set local role authenticated;
   perform public.expedition_action('depart',gen_random_uuid(),'dinghy','pongdang','{"bait":2}');
   reset role;
   select extract(epoch from returns_at-departed_at) into seconds from public.fishing_expeditions where user_id=u and claimed_at is null;
   if seconds is null or seconds<>2*(900-r.effect_value) then raise exception 'TRAP_DURATION_WRONG %: %',r.id,seconds;end if;
   set local role authenticated;
   perform public.equip_relic(null,gen_random_uuid(),500);
   state:=public.expedition_state();
   if (state->>'minutesPerBait')::numeric<>15 then raise exception 'TRAP_BONUS_NOT_REMOVED';end if;
   reset role;
   if not exists(select 1 from public.fishing_expeditions where user_id=u and claimed_at is null and extract(epoch from returns_at-departed_at)=seconds) then raise exception 'RUNNING_TRAP_CHANGED';end if;
   delete from public.fishing_expeditions where user_id=u;
   continue;
  elsif r.effect_kind='bait_discount_gold' then
   select price into list_price from public.fishing_baits where id='bait';
   select gold into before_gold from public.player_wallets where user_id=u;
   set local role authenticated;
   state:=public.fishing_state();
   if not exists(select 1 from jsonb_array_elements(state->'baits') b where b->>'id'='bait' and (b->>'price')::integer=greatest(1,list_price-r.effect_value)) then raise exception 'BAIT_PRICE_DISPLAY_WRONG';end if;
   perform public.buy_fishing_bait_at_price('bait',gen_random_uuid(),greatest(1,list_price-r.effect_value)::integer);
   reset role;
   if (select gold from public.player_wallets where user_id=u)<>before_gold-greatest(1,list_price-r.effect_value) then raise exception 'BAIT_PAYMENT_WRONG';end if;
   set local role authenticated;perform public.equip_relic(null,gen_random_uuid(),500);reset role;continue;
  elsif r.effect_kind='boat_discount_gold' then
   select id,price into vessel,list_price from public.harbor_vessels where price>=1000 order by price,id limit 1;
   select gold into before_gold from public.player_wallets where user_id=u;
   set local role authenticated;
   state:=public.harbor_action('buy',gen_random_uuid(),vessel);
   reset role;
   if (select gold from public.player_wallets where user_id=u)<>before_gold-list_price+r.effect_value then raise exception 'BOAT_PAYMENT_WRONG %',r.id;end if;
   select id into boat from public.harbor_boats where user_id=u and vessel_id=vessel and sold_at is null;
   if boat is null or (select paid_price from public.harbor_boats where id=boat)<>list_price-r.effect_value then raise exception 'BOAT_PAID_PRICE_WRONG';end if;
   set local role authenticated;
   perform public.equip_relic(null,gen_random_uuid(),500);
   state:=public.harbor_action('sell',gen_random_uuid(),null,null,1,boat);
   if (state#>>'{receipt,gold}')::integer<>floor((list_price-r.effect_value)/2) then raise exception 'BOAT_RESALE_WRONG';end if;
   reset role;continue;
  else raise exception 'UNKNOWN_EFFECT %',r.effect_kind;
  end if;
 end loop;
 if (select count(*) from app_private.player_fishing_relics where user_id=u)<>(select count(*) from public.fishing_relics) then raise exception 'CATALOG_OWNERSHIP_INCOMPLETE';end if;
end $test$;
