-- Synthetic accounts only. Caller must roll back the surrounding transaction.
do $test$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); r jsonb;
begin
 insert into auth.users(id,created_at) values(a,clock_timestamp()),(b,clock_timestamp()),(outsider,clock_timestamp());
 insert into public.player_profiles(id,nickname) values(a,'Like'||left(a::text,6)),(b,'Like'||left(b::text,6)),(outsider,'Like'||left(outsider::text,6));
 insert into public.friend_requests(sender_id,recipient_id,status) values(a,b,'accepted');
 perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 r:=public.set_aquarium_like(b,true);
 if (r->>'count')::integer<>1 or not (r->>'liked')::boolean then raise exception 'FIRST_LIKE_INVALID';end if;
 r:=public.set_aquarium_like(b,true);
 if (r->>'count')::integer<>1 then raise exception 'DUPLICATE_LIKE_COUNTED';end if;
 r:=public.set_aquarium_like(b,false);
 if (r->>'count')::integer<>1 or not (r->>'liked')::boolean then raise exception 'CUMULATIVE_LIKE_REMOVED';end if;
 begin perform public.set_aquarium_like(outsider,true);raise exception 'NONFRIEND_ALLOWED';exception when others then if sqlerrm<>'FRIENDSHIP_REQUIRED' then raise;end if;end;
 begin perform public.set_aquarium_like(a,true);raise exception 'SELF_ALLOWED';exception when others then if sqlerrm<>'FRIENDSHIP_REQUIRED' and sqlerrm<>'INVALID_LIKE' then raise;end if;end;
 begin insert into app_private.aquarium_likes(owner_id,visitor_id) values(b,a);raise exception 'DIRECT_WRITE_ALLOWED';exception when insufficient_privilege then null;end;
 reset role;
 update app_private.aquarium_likes set like_day=like_day-1,created_at=created_at-interval '1 day' where owner_id=b and visitor_id=a;
 set local role authenticated;
 r:=public.aquarium_like_state(b);
 if (r->>'count')::integer<>1 or (r->>'liked')::boolean then raise exception 'NEW_DAY_NOT_AVAILABLE';end if;
 r:=public.set_aquarium_like(b,true);
 if (r->>'count')::integer<>2 or not (r->>'liked')::boolean then raise exception 'CUMULATIVE_TOTAL_INVALID';end if;
 if (r->>'nextLikeAt')::timestamptz<>(((statement_timestamp() at time zone 'Asia/Seoul')::date+1)::timestamp at time zone 'Asia/Seoul') then raise exception 'KOREAN_MIDNIGHT_INVALID';end if;
 reset role;
 set local role anon;
 begin perform public.aquarium_like_state(b);raise exception 'ANON_ALLOWED';exception when insufficient_privilege then null;end;
 reset role;
end $test$;
