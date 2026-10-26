-- Synthetic accounts only. The caller must roll back the entire transaction.
do $smoke$
declare u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); op uuid:=gen_random_uuid();
 report_id uuid:=gen_random_uuid(); review_id uuid:=gen_random_uuid(); private_id uuid:=gen_random_uuid();
 at timestamptz:=clock_timestamp()-interval '1 hour'; r jsonb; s jsonb; denied boolean:=false;
begin
 insert into auth.users(id) values(u),(v),(op);
 insert into public.player_profiles(id,nickname) values(u,'F'||left(u::text,7)),(v,'F'||left(v::text,7)),(op,'F'||left(op::text,7));
 insert into app_private.notice_operators(user_id) values(op);
 perform set_config('request.jwt.claim.sub',u::text,true);
 r:=public.development_fund_submit(report_id,'Synthetic payer',5000,at,'Private message',true);
 if r->>'status'<>'pending' or r->>'confirmedWon' is not null then raise exception 'SUBMISSION_APPROVED_ITSELF';end if;
 -- Isolate assertions from real donors without reading their private details.
 if exists(select 1 from jsonb_array_elements(public.development_fund_state()->'supporters') x where x->>'userId'=u::text) then raise exception 'PENDING_PUBLIC_CREDIT';end if;
 begin
  perform public.development_fund_review(review_id,report_id,'confirm',0,4500);
 exception when others then if sqlerrm='FUND_FORBIDDEN' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'PLAYER_REVIEW_ALLOWED';end if;
 perform set_config('request.jwt.claim.sub',op::text,true);
 r:=public.development_fund_review(review_id,report_id,'confirm',0,4500,'','smoke-'||review_id);
 perform public.development_fund_review(review_id,report_id,'confirm',0,4500,'','smoke-'||review_id);
 if r->>'status'<>'confirmed' or (r->>'confirmedWon')::int<>4500 then raise exception 'WRONG_ACTUAL_AMOUNT';end if;
 if (select count(*) from app_private.island_fund_reviews where operation_id=review_id)<>1 then raise exception 'REVIEW_NOT_IDEMPOTENT';end if;
 perform set_config('request.jwt.claim.sub',v::text,true);
 s:=public.development_fund_reports('mine',0);
 if jsonb_array_length(s->'items')<>0 then raise exception 'FOREIGN_PRIVATE_REPORT';end if;
 denied:=false;
 begin perform public.development_fund_reports('pending',0);
 exception when others then if sqlerrm='FUND_FORBIDDEN' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'QUEUE_EXPOSED';end if;
 r:=public.development_fund_submit(private_id,'Hidden payer',1000,at,'Hidden message',false);
 if r->>'publicProfile'<>'true' then raise exception 'NEW_REPORT_NOT_PUBLIC';end if;
 -- A legacy client retry with false must still resolve to the same public report.
 r:=public.development_fund_submit(private_id,'Hidden payer',1000,at,'Hidden message',false);
 perform set_config('request.jwt.claim.sub',op::text,true);
 perform public.development_fund_review(gen_random_uuid(),private_id,'confirm',0,1000);
 perform public.development_fund_review(gen_random_uuid(),report_id,'reopen',1);
 if exists(select 1 from app_private.island_fund_reports where id=report_id and (status<>'pending' or confirmed_won is not null)) then raise exception 'REOPEN_LEFT_PUBLIC_CREDIT';end if;
 if (select count(*) from app_private.island_fund_reviews x where x.report_id=private_id)<>1 then raise exception 'PRIVATE_CONFIRM_MISSING';end if;
 if has_table_privilege('authenticated','app_private.island_fund_reports','SELECT,INSERT,UPDATE,DELETE')
  or has_table_privilege('anon','app_private.island_fund_reviews','SELECT,INSERT,UPDATE,DELETE') then raise exception 'DIRECT_TABLE_ACCESS';end if;
end $smoke$;
