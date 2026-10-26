-- Synthetic accounts only. Run in a rollback-only, repeatable-read transaction.
do $test$
declare operator_id uuid:=gen_random_uuid(); donor uuid; ids uuid[]:='{}'; r jsonb; first_page jsonb; next_page jsonb; item jsonb;
 start_offset integer; expected_tier bigint; seen integer:=0; part integer; amount integer;
begin
 -- Only aggregate existing public totals; never output existing donor identities.
 select count(*) filter(where total>=1000000000),1+count(distinct total) filter(where total>1000000000)
 into start_offset,expected_tier
 from (select sum(r.confirmed_won)::bigint total from app_private.island_fund_reports r
  join public.player_profiles p on p.id=r.user_id where r.status='confirmed' and r.public_profile group by r.user_id) existing;
 if start_offset+20>10000 then raise exception 'SMOKE_PAGE_LIMIT';end if;
 insert into auth.users(id,created_at) values(operator_id,clock_timestamp());
 insert into public.player_profiles(id,nickname) values(operator_id,'H'||left(operator_id::text,7));
 insert into app_private.notice_operators(user_id) values(operator_id);
 for i in 1..23 loop
  donor:=gen_random_uuid();ids:=array_append(ids,donor);
  insert into auth.users(id,created_at) values(donor,clock_timestamp());
  insert into public.player_profiles(id,nickname) values(donor,'H'||left(donor::text,7));
  -- A split donation has the same honor as the same cumulative amount paid once.
  for part in 1..case when i=1 then 2 else 1 end loop
   amount:=case when i=1 then 500000000 else 1000000000 end;
   perform set_config('request.jwt.claim.sub',donor::text,true);set local role authenticated;
   r:=public.development_fund_submit(gen_random_uuid(),'Synthetic honor test',amount,clock_timestamp()-interval '1 hour','',true);
   reset role;perform set_config('request.jwt.claim.sub',operator_id::text,true);set local role authenticated;
   perform public.development_fund_review(gen_random_uuid(),(r->>'id')::uuid,'confirm',0,amount,'',null);
   reset role;
  end loop;
 end loop;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);set local role authenticated;
 first_page:=public.development_fund_state(start_offset);next_page:=public.development_fund_state(start_offset+20);
 if jsonb_array_length(first_page->'supporters')<>20 then raise exception 'PAGE_SIZE_CHANGED';end if;
 for item in select value from jsonb_array_elements((first_page->'supporters')||(next_page->'supporters')) loop
  if (item->>'userId')::uuid=any(ids) then
   seen:=seen+1;
   if (item->>'rank')::bigint<>expected_tier then raise exception 'EQUAL_TOTAL_DIFFERENT_HONOR';end if;
   if item->>'totalWon'<>'1000000000' then raise exception 'CUMULATIVE_TOTAL_CHANGED';end if;
  end if;
 end loop;
 if seen<>23 then raise exception 'PAGINATION_SKIPPED_DONOR';end if;
 reset role;
end $test$;
