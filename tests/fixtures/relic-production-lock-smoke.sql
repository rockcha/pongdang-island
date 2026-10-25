-- Execute in a transaction and roll back. All production belongs to this fixture.
do $test$
declare u uuid:=gen_random_uuid();r record;s jsonb;before_jobs jsonb;after_jobs jsonb;balance integer;replace_op uuid;remove_op uuid;
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'가동검증'||left(u::text,6));
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,10000,'{}') on conflict(user_id) do update set gold=10000;
 insert into app_private.player_fishing_relics(user_id,relic_id) select u,id from public.fishing_relics;
 for r in select * from (values
  ('fuel','production_sites','primordial-ember','undying-furnace-heart','ocean-seed'),
  ('bait','bait_production_sites','ocean-seed','abundant-conch','primordial-ember')
 ) kinds(kind,site_table,mythic,epic,other) loop
  set local role authenticated;
  perform public.equip_relic(r.mythic,gen_random_uuid(),0);
  reset role;
  if r.kind='fuel' then
   insert into app_private.production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output)
    select u,'clockwork-compressor',now()-interval '1 minute',now()+interval '1 hour',now()+interval '2 hours',1 from generate_series(1,6);
  else
   insert into app_private.bait_production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output,run_bait_id)
    select u,'wriggly-soil-box',now()-interval '1 minute',now()+interval '1 hour',now()+interval '2 hours',3,'bait' from generate_series(1,6);
  end if;
  select gold into balance from public.player_wallets where user_id=u;
  execute format('select jsonb_agg(to_jsonb(s) order by id) from app_private.%I s where user_id=$1',r.site_table) into before_jobs using u;
  set local role authenticated;
  begin
   perform public.equip_relic(null,gen_random_uuid(),500);raise exception 'UNEQUIP_NOT_BLOCKED';
  exception when others then if sqlerrm<>format('RELIC_%s_PRODUCTION_ACTIVE:4',upper(r.kind)) then raise;end if;end;
  begin
   perform public.equip_relic(r.epic,gen_random_uuid(),500);raise exception 'DOWNGRADE_NOT_BLOCKED';
  exception when others then if sqlerrm<>format('RELIC_%s_PRODUCTION_ACTIVE:5',upper(r.kind)) then raise;end if;end;
  begin
   perform public.equip_relic('shell-hourglass',gen_random_uuid(),500);raise exception 'UNRELATED_SWITCH_NOT_BLOCKED';
  exception when others then if sqlerrm<>format('RELIC_%s_PRODUCTION_ACTIVE:4',upper(r.kind)) then raise;end if;end;
  begin
   perform public.equip_relic(r.other,gen_random_uuid(),500);raise exception 'CROSS_PRODUCTION_SWITCH_NOT_BLOCKED';
  exception when others then if sqlerrm<>format('RELIC_%s_PRODUCTION_ACTIVE:4',upper(r.kind)) then raise;end if;end;
  s:=public.relic_state();if s->>'equippedId'<>r.mythic then raise exception 'BLOCKED_ACTION_CHANGED_LOADOUT';end if;
  reset role;
  execute format('select jsonb_agg(to_jsonb(s) order by id) from app_private.%I s where user_id=$1',r.site_table) into after_jobs using u;
  if after_jobs<>before_jobs or (select gold from public.player_wallets where user_id=u)<>balance then raise exception 'BLOCKED_ACTION_CHANGED_JOBS_OR_GOLD';end if;
  -- Completed but unclaimed jobs no longer consume an active slot.
  execute format('update app_private.%I set completes_at=clock_timestamp()-interval ''1 second'' where id=(select id from app_private.%I where user_id=$1 and completes_at>clock_timestamp() order by id limit 1)',r.site_table,r.site_table) using u;
  replace_op:=gen_random_uuid();
  set local role authenticated;
  perform public.equip_relic(r.epic,replace_op,500);perform public.equip_relic(r.epic,replace_op,500);
  begin
   perform public.equip_relic(null,gen_random_uuid(),500);raise exception 'FIVE_ACTIVE_UNEQUIP_ALLOWED';
  exception when others then if sqlerrm<>format('RELIC_%s_PRODUCTION_ACTIVE:4',upper(r.kind)) then raise;end if;end;
  reset role;
  if (select gold from public.player_wallets where user_id=u)<>balance-500 then raise exception 'REPLACEMENT_REPLAY_CHARGED';end if;
  execute format('update app_private.%I set completes_at=clock_timestamp()-interval ''1 second'' where id=(select id from app_private.%I where user_id=$1 and completes_at>clock_timestamp() order by id limit 1)',r.site_table,r.site_table) using u;
  remove_op:=gen_random_uuid();
  set local role authenticated;
  perform public.equip_relic(null,remove_op,500);perform public.equip_relic(null,remove_op,500);
  reset role;
  if (select gold from public.player_wallets where user_id=u)<>balance-1000 then raise exception 'REMOVAL_REPLAY_CHARGED';end if;
  if exists(select 1 from app_private.player_relic_loadouts where user_id=u) then raise exception 'REMOVAL_DID_NOT_CLEAR_LOADOUT';end if;
  execute format('delete from app_private.%I where user_id=$1',r.site_table) using u;
 end loop;
end $test$;
