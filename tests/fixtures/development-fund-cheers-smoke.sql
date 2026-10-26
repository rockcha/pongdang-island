-- Run in an enclosing transaction and roll back. No real players are accessed.
do $smoke$
declare u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); op uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid();
 denied boolean:=false; s jsonb; before_count bigint;
begin
 insert into auth.users(id) values(u),(v),(op);
 insert into public.player_profiles(id,nickname) values(u,'C'||left(u::text,7)),(v,'C'||left(v::text,7)),(op,'C'||left(op::text,7));
 insert into app_private.notice_operators(user_id) values(op);
 perform set_config('request.jwt.claim.sub',u::text,true);
 before_count:=(public.development_fund_state()->'summary'->>'donationCount')::bigint;
 if before_count is null then raise exception 'MISSING_DONATION_COUNT';end if;
 perform public.development_fund_cheer(cid,'Synthetic encouragement');
 perform public.development_fund_cheer(cid,'Synthetic encouragement');
 if (select count(*) from app_private.island_fund_cheers where id=cid)<>1 then raise exception 'CHEER_REPLAYED';end if;
 if (public.development_fund_state()->'summary'->>'donationCount')::bigint<>before_count then raise exception 'CHEER_COUNTED_AS_DONATION';end if;
 perform set_config('request.jwt.claim.sub',v::text,true);
 begin perform public.development_fund_cheer(cid,null,true);
 exception when others then if sqlerrm='FUND_FORBIDDEN' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'FOREIGN_DELETE';end if;
 perform set_config('request.jwt.claim.sub',op::text,true);
 perform public.development_fund_cheer(cid,null,true);
 if (select deleted_at is null from app_private.island_fund_cheers where id=cid) then raise exception 'OPERATOR_HIDE_FAILED';end if;
 s:=public.development_fund_cheers(0);
 if exists(select 1 from jsonb_array_elements(s->'items') x where x->>'id'=cid::text) then raise exception 'HIDDEN_CHEER_VISIBLE';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 denied:=false;
 begin perform public.development_fund_cheer(gen_random_uuid(),'Too soon');
 exception when others then if sqlerrm='FUND_CHEER_LIMIT' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'RATE_LIMIT_MISSING';end if;
 if has_table_privilege('authenticated','app_private.island_fund_cheers','SELECT,INSERT,UPDATE,DELETE') then raise exception 'CHEER_TABLE_EXPOSED';end if;
end $smoke$;
