-- Synthetic users only. The caller wraps this entire fixture in a rollback.
do $smoke$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); fuel_site uuid:=gen_random_uuid(); bait_site uuid:=gen_random_uuid(); expired_site uuid:=gen_random_uuid(); other_site uuid:=gen_random_uuid(); inv jsonb;
begin
 insert into auth.users(id) values(u),(other_user);
 insert into public.player_profiles(id,nickname) values(u,'H'||left(replace(u::text,'-',''),7)),(other_user,'H'||left(replace(other_user::text,'-',''),7));
 insert into public.player_wallets(user_id,gold,inventory) values(u,10000,'{"fuel":10,"bait":20}'),(other_user,10000,'{"fuel":10,"bait":20}')
 on conflict(user_id) do update set gold=10000,inventory=excluded.inventory;
 insert into app_private.player_fishing_relics(user_id,relic_id) values(u,'sleepless-harvest-bell');
 insert into app_private.production_sites(id,user_id,facility_id,started_at,completes_at,expires_at,run_output) values
 (fuel_site,u,'tin-grandpa-hearth',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour',12),
 (expired_site,u,'tin-grandpa-hearth',clock_timestamp()-interval '3 hours',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour',99),
 (other_site,other_user,'tin-grandpa-hearth',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour',55);
 insert into app_private.bait_production_sites(id,user_id,facility_id,started_at,completes_at,expires_at,run_output,run_bait_id)
 values(bait_site,u,'wriggly-soil-box',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour',17,'bait');
 if app_private.auto_claim_production(u)<>0 then raise exception 'UNEQUIPPED_AUTO_CLAIM'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform public.equip_relic('sleepless-harvest-bell',gen_random_uuid(),0);
 select inventory into inv from public.player_wallets where user_id=u;
 if inv<>'{"fuel":22,"bait":37}'::jsonb then raise exception 'WRONG_HARVEST_TOTAL:%',inv; end if;
 if (select count(*) from app_private.production_auto_claims where user_id=u)<>2 then raise exception 'MISSING_RECEIPTS'; end if;
 if (select count(*) from public.notifications where recipient_id=u and production_auto_claim)<>1 then raise exception 'HARVEST_NOT_AGGREGATED'; end if;
 if not exists(select 1 from jsonb_array_elements(public.notification_inbox()->'notifications') n where n->>'production_auto_claim'='true') then raise exception 'HARVEST_MARKER_NOT_IN_INBOX'; end if;
 if (select started_at is null from app_private.production_sites where id=expired_site) then raise exception 'EXPIRED_REVIVED'; end if;
 if (select inventory from public.player_wallets where user_id=other_user)<>'{"fuel":10,"bait":20}'::jsonb then raise exception 'OTHER_ACCOUNT_CREDITED'; end if;
 -- No Auth context is needed by the server-only settlement path.
 perform set_config('request.jwt.claim.sub','',true);
 if app_private.auto_claim_production(u)<>0 then raise exception 'HARVEST_REPLAYED'; end if;
 update app_private.bait_production_sites set started_at=clock_timestamp()-interval '1 hour',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour',run_output=5,run_bait_id='bait' where id=bait_site;
 if app_private.auto_claim_production(u)<>1 then raise exception 'OFFLINE_HARVEST_FAILED'; end if;
 select inventory into inv from public.player_wallets where user_id=u;
 if inv<>'{"fuel":22,"bait":42}'::jsonb then raise exception 'WRONG_OFFLINE_TOTAL'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform public.equip_relic(null,gen_random_uuid(),500);
 update app_private.bait_production_sites set started_at=clock_timestamp()-interval '1 hour',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour',run_output=5,run_bait_id='bait' where id=bait_site;
 if app_private.auto_claim_production(u)<>0 then raise exception 'UNEQUIP_IGNORED'; end if;
 if has_function_privilege('authenticated','app_private.auto_claim_production(uuid)','EXECUTE') or has_function_privilege('anon','app_private.auto_claim_due_production()','EXECUTE') then raise exception 'WORKER_EXPOSED'; end if;
 if has_table_privilege('authenticated','app_private.production_auto_claims','SELECT,INSERT,UPDATE,DELETE') then raise exception 'RECEIPTS_EXPOSED'; end if;
end $smoke$;
