-- Run in a transaction, then roll back. Does not use existing player accounts.
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();op uuid:=gen_random_uuid();ids uuid[];g jsonb;r jsonb;
begin
 insert into auth.users(id) values(a),(b);
 insert into public.player_profiles(id,nickname) values(a,'소셜배포검증'||left(a::text,6)),(b,'소셜배포대조'||left(b::text,6));
 insert into public.friend_requests(sender_id,recipient_id,status) values(a,b,'accepted');
 perform set_config('request.jwt.claim.sub',a::text,true);
 r:=public.set_aquarium_like(b,true);
 if r<>jsonb_build_object('count',1,'liked',true) then raise exception 'LIKE_INSERT_FAILED';end if;
 r:=public.set_aquarium_like(b,true);
 if (r->>'count')::int<>1 then raise exception 'DUPLICATE_LIKE';end if;
 r:=public.set_aquarium_like(b,false);
 if r<>jsonb_build_object('count',0,'liked',false) then raise exception 'LIKE_REMOVE_FAILED';end if;
 with inserted as (insert into public.player_collectibles(user_id,species_id)
 select a,id from (select distinct on(kind) id,kind from public.collectible_species where kind in ('fish','trash','decoration') order by kind,id) candidates returning id)
 select array_agg(id order by id) into ids from inserted;
 g:=public.send_collectible_gift(b,ids,'세 종류를 함께 보내요',op);
 if (g->>'quantity')::int<>3 or jsonb_array_length(g->'species'->'bundle_items')<>3 then raise exception 'BUNDLE_SNAPSHOT_FAILED';end if;
 r:=public.send_collectible_gift(b,ids,'세 종류를 함께 보내요',op);
 if r->>'id'<>g->>'id' then raise exception 'GIFT_REPLAY_FAILED';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 r:=public.claim_collectible_gift((g->>'id')::uuid);
 if r->>'status'<>'claimed' then raise exception 'GIFT_CLAIM_FAILED';end if;
 if (select count(*) from public.player_collectibles where user_id=b and id=any(ids) and escrow_gift_id is null and tank_id is null)<>3 then raise exception 'BUNDLE_DELIVERY_FAILED';end if;
 perform public.claim_collectible_gift((g->>'id')::uuid);
end $fixture$;
