-- Synthetic integration audit. The outer transaction always rolls back.
begin;
do $audit$
declare
 u uuid:=gen_random_uuid(); f public.production_facilities; site app_private.production_sites;
 op uuid; result jsonb; expected_fuel integer:=3; checked integer:=0;
begin
 insert into auth.users(id,email) values(u,'production-fish-audit-'||u::text||'@example.invalid');
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,100000,'{"fuel":3}'::jsonb)
 on conflict(user_id) do update set gold=100000,inventory=jsonb_set(public.player_wallets.inventory,'{fuel}','3');
 insert into public.player_collectibles(user_id,species_id)
 select u,'shared-drift-scrap-wood' from generate_series(1,100);
 for f in select * from public.production_facilities where kind='fish' and enabled order by price,id loop
  op:=gen_random_uuid();
  perform public.production_action('buy',op,f.id);
  result:=public.production_action('buy',op,f.id);
  if not (result->>'replayed')::boolean then raise exception 'Purchase replay failed';end if;
  begin
   perform public.production_action('start',gen_random_uuid(),f.id,jsonb_build_object('shared-drift-scrap-wood',f.input_count));
   raise exception 'Wrong kind accepted';
  exception when others then
   if sqlerrm<>'INSUFFICIENT_MATERIALS' then raise;end if;
  end;
  insert into public.player_collectibles(user_id,species_id)
  select u,'shared-refining-smelt' from generate_series(1,f.input_count);
  op:=gen_random_uuid();
  perform public.production_action('start',op,f.id,jsonb_build_object('shared-refining-smelt',f.input_count));
  result:=public.production_action('start',op,f.id,jsonb_build_object('shared-refining-smelt',f.input_count));
  if not (result->>'replayed')::boolean then raise exception 'Start replay failed';end if;
  select * into strict site from app_private.production_sites where user_id=u and facility_id=f.id;
  if site.completes_at-site.started_at<>make_interval(mins=>f.production_minutes)
   or site.expires_at-site.completes_at<>make_interval(mins=>f.storage_minutes)
   or site.run_output<>f.output_count then raise exception 'Snapshot mismatch: %',f.id;end if;
  update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',
   completes_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '1 hour'
   where user_id=u and facility_id=f.id;
  op:=gen_random_uuid();expected_fuel:=expected_fuel+f.output_count;
  result:=public.production_action('claim',op,f.id);
  if (result->>'fuel')::integer<>expected_fuel then raise exception 'Fuel mismatch: %',f.id;end if;
  result:=public.production_action('claim',op,f.id);
  if (result->>'fuel')::integer<>expected_fuel or not (result->>'replayed')::boolean then raise exception 'Claim replay failed';end if;
  checked:=checked+1;
 end loop;
 if checked<>18 then raise exception 'Expected 18 fish facilities, got %',checked;end if;
 if (select count(*) from public.player_collectibles where user_id=u and consumed_at is not null)
  <>(select sum(input_count) from public.production_facilities where kind='fish' and enabled)
  then raise exception 'Consumed count mismatch';end if;
 if exists(select 1 from public.player_collectibles where user_id=u and species_id='shared-drift-scrap-wood' and consumed_at is not null)
  then raise exception 'Trash was consumed';end if;
end $audit$;
rollback;
select 'PASS: 18 fish refineries; buy/start/claim retries; kind isolation; timing/output snapshots. Synthetic transaction rolled back.' as result;
