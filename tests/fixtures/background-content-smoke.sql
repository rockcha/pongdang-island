-- Run inside a transaction and roll back: no player data is retained.
do $test$
declare author uuid:=gen_random_uuid();viewer uuid:=gen_random_uuid();s jsonb;baseline jsonb;
 stamp timestamptz:=date_trunc('second',clock_timestamp()+interval '100 years');
begin
 insert into auth.users(id) values(author),(viewer);
 insert into public.player_profiles(id,nickname) values(author,'부하검증'||left(author::text,6)),(viewer,'조회검증'||left(viewer::text,6));
 perform set_config('request.jwt.claim.sub',viewer::text,true);
 set local role authenticated;
 baseline:=public.new_content_state();
 reset role;
 perform set_config('request.jwt.claim.sub',author::text,true);
 insert into public.suggestion_posts(author_id,author_name,title,body,friends_only,created_at)
 values(author,'검증','비공개 검증','테스트',true,stamp);
 perform set_config('request.jwt.claim.sub',viewer::text,true);
 set local role authenticated;
 s:=public.new_content_state();
 if s->'suggestions' is distinct from baseline->'suggestions' then raise exception 'PRIVATE_TIMESTAMP_LEAK';end if;
 reset role;
 insert into public.friend_requests(sender_id,recipient_id,status) values(author,viewer,'accepted');
 set local role authenticated;
 s:=public.new_content_state();
 if (s->>'suggestions')::timestamptz<>stamp then raise exception 'FRIEND_POST_MISSING';end if;
 reset role;
 -- Own newer posts must not obscure the latest post by another player.
 insert into public.suggestion_posts(author_id,author_name,title,body,friends_only,created_at)
 values(viewer,'검증','내 글 검증','테스트',false,stamp+interval '1 day');
 set local role authenticated;
 s:=public.new_content_state();
 if (s->>'suggestions')::timestamptz<>stamp then raise exception 'OWN_POST_NOT_EXCLUDED';end if;
 reset role;
 update public.friend_requests set status='removed' where sender_id=author and recipient_id=viewer;
 set local role authenticated;
 s:=public.new_content_state();
 if s->'suggestions' is distinct from baseline->'suggestions' then raise exception 'REMOVED_FRIEND_LEAK';end if;
 perform public.sync_titles();
 reset role;
 if has_function_privilege('anon','public.new_content_state()','execute') then raise exception 'ANON_EXECUTE';end if;
 if not has_function_privilege('authenticated','public.new_content_state()','execute') then raise exception 'PLAYER_EXECUTE_MISSING';end if;
end $test$;
