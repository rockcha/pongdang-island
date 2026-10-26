begin;
do $$
declare uid uuid:=gen_random_uuid(); f public.production_facilities; site app_private.production_sites;
 species text; result jsonb; claim_op uuid; fuel integer:=0; actual integer;
begin
 insert into auth.users(id) values(uid);
 insert into public.player_profiles(id,nickname) values(uid,'정제검증');
 insert into public.player_wallets(user_id,gold,inventory) values(uid,100000,'{"fuel":0}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 for f in select * from public.production_facilities where kind='fish' or id in('baby-puffer-pressure-vat','angry-puffer-compressor','gurgling-deep-pressure-cooker') order by id loop
  species:=case when f.kind='fish' then 'shared-refining-smelt' else 'shared-drift-scrap-wood' end;
  perform public.production_action('buy',gen_random_uuid(),f.id,'{}');
  insert into public.player_collectibles(user_id,species_id) select uid,species from generate_series(1,f.input_count);
  perform public.production_action('start',gen_random_uuid(),f.id,jsonb_build_object(species,f.input_count));
  select * into strict site from app_private.production_sites where user_id=uid and facility_id=f.id;
  if site.run_output<>f.output_count or site.completes_at-site.started_at<>make_interval(mins=>f.production_minutes) or site.expires_at-site.completes_at<>make_interval(mins=>f.storage_minutes) then raise exception 'BALANCE_SNAPSHOT_MISMATCH %',f.id;end if;
  select count(*) into actual from public.player_collectibles where user_id=uid and consumed_at is null;
  if actual<>0 then raise exception 'BALANCE_CONSUMPTION_MISMATCH %',f.id;end if;
  update app_private.production_sites set started_at=clock_timestamp()-interval '2 days',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour' where id=site.id;
  claim_op:=gen_random_uuid();fuel:=fuel+f.output_count;
  result:=public.production_action('claim',claim_op,site.id::text,'{}');
  if (result->>'fuel')::integer<>fuel then raise exception 'BALANCE_PAYOUT_MISMATCH %',f.id;end if;
  result:=public.production_action('claim',claim_op,site.id::text,'{}');
  if (result->>'fuel')::integer<>fuel then raise exception 'BALANCE_DOUBLE_CLAIM %',f.id;end if;
 end loop;
 raise notice 'PASS: changed facility consumption, duration, storage, output and claim retry verified; synthetic data rolled back';
end $$;
rollback;
