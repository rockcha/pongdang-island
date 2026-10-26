-- Synthetic accounts and comments only. Always run in a rollback transaction.
do $test$
declare u uuid:=gen_random_uuid();listing jsonb;v_listing_id uuid;expected uuid[];actual uuid[];a jsonb;b jsonb;
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'Sort'||left(u::text,6));
 insert into public.player_wallets(user_id,gold,inventory) values(u,1000,'{"bait":2}') on conflict(user_id) do update set gold=1000,inventory=excluded.inventory;
 perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
 listing:=public.exchange_post('sell','bait','bait',1,'gold','gold',100,gen_random_uuid(),'Sort check');
 reset role;v_listing_id:=(listing->>'id')::uuid;
 insert into public.exchange_listing_comments(listing_id,user_id,body,created_at,operation_id)
 select v_listing_id,u,'comment '||i,timestamptz '2026-10-25 00:00:00+00'+(i/2)*interval '1 minute',gen_random_uuid() from generate_series(34,0,-1) i;
 select array_agg(c.id order by c.created_at,c.id) into expected from public.exchange_listing_comments c where listing_id=v_listing_id;
 set local role authenticated;
 a:=public.exchange_listing_detail(v_listing_id,0);b:=public.exchange_listing_detail(v_listing_id,30);
 if jsonb_array_length(a->'comments')<>30 or jsonb_array_length(b->'comments')<>5 then raise exception 'PAGINATION_FAILED';end if;
 select array_agg((value->>'id')::uuid order by ordinal) into actual from jsonb_array_elements((a->'comments')||(b->'comments')) with ordinality q(value,ordinal);
 if actual is distinct from expected then raise exception 'OLDEST_FIRST_FAILED';end if;
 reset role;
 if has_function_privilege('anon','public.exchange_listing_detail(uuid,integer)','execute') then raise exception 'ANON_ACCESS';end if;
end $test$;
