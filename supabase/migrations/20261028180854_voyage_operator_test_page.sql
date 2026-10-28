begin;
create function app_private.voyage_race_test_sample()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t timestamptz:=clock_timestamp();departure timestamptz;opening timestamptz;
 rid uuid:=gen_random_uuid();sample jsonb:='{}'::jsonb;state jsonb;one_round jsonb;step text;at_time timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if not app_private.notice_is_operator() then raise exception 'OPERATOR_REQUIRED';end if;
 departure:=((t at time zone 'Asia/Seoul')::date+time '09:00') at time zone 'Asia/Seoul';
 if t>=departure-interval '30 minutes' then departure:=((t at time zone 'Asia/Seoul')::date+time '19:00') at time zone 'Asia/Seoul';end if;
 if t>=departure-interval '30 minutes' then departure:=(((t at time zone 'Asia/Seoul')::date+1)+time '09:00') at time zone 'Asia/Seoul';end if;
 opening:=departure-interval '30 minutes';
 -- This subtransaction is ALWAYS rolled back. Reuse the production engine,
 -- but never retain a round/plan, access a wallet, settle a real bet or enqueue
 -- a notification. The artificial unique day is not used for displayed times.
 begin
  insert into app_private.voyage_bet_rounds(id,voyage_day,slot,opens_at,departs_at,results_at,rules)
  values(rid,date '3000-01-01'+floor(random()*365000)::int,9,opening,departure,departure+interval '3 hours','ranking');
  perform app_private.voyage_bet_make_plans(rid,opening);
  foreach step in array array['scheduled','open','sailing','one','two','final'] loop
   at_time:=case step when 'scheduled' then opening-interval '1 minute' when 'open' then opening+interval '1 second'
    when 'sailing' then departure when 'one' then departure+interval '1 hour' when 'two' then departure+interval '2 hours' else departure+interval '3 hours' end;
   if step='final' then update app_private.voyage_bet_rounds set settled_at=at_time where id=rid;end if;
   state:=app_private.voyage_race_payload(u,at_time);
   select value into one_round from jsonb_array_elements(state->'rounds') where value->>'id'=rid::text;
   if one_round is null then raise exception 'VOYAGE_TEST_SAMPLE_UNAVAILABLE';end if;
   state:=jsonb_set(jsonb_set(state,'{rounds}',jsonb_build_array(one_round)),'{pendingPayout}','0'::jsonb);
   sample:=jsonb_set(sample,array[step],state);
  end loop;
  raise exception using errcode='ZX001',message='ROLLBACK_VOYAGE_TEST_SAMPLE';
 exception when sqlstate 'ZX001' then
  -- PL/pgSQL variables survive, all database writes above do not.
  null;
 end;
 return sample;
end $$;
create function public.voyage_race_test_sample()
returns jsonb language sql security invoker set search_path='' as $$select app_private.voyage_race_test_sample()$$;
revoke all on function public.voyage_race_test_sample(),app_private.voyage_race_test_sample() from public,anon;
grant execute on function public.voyage_race_test_sample(),app_private.voyage_race_test_sample() to authenticated;
notify pgrst,'reload schema';
commit;
