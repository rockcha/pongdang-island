-- Only a generated synthetic account is used. All changes must roll back.
begin;
do $$
declare u uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'별진주검증') on conflict(id) do nothing;
 insert into public.player_wallets(user_id,gold) values(u,10000) on conflict(user_id) do update set gold=10000;
 insert into public.player_navigation(user_id,region_id) values(u,'pongdang') on conflict(user_id) do update set region_id='pongdang';
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
declare s jsonb;b jsonb;r jsonb;p jsonb;again jsonb;buy_op uuid:=gen_random_uuid();cast_op uuid:=gen_random_uuid();bait text:='bait_map_star_chart_pearl';
begin
 s:=public.fishing_state();
 select value into b from jsonb_array_elements(s->'baits') where value->>'id'=bait;
 if b is null or (b->>'price')::integer<>680 or (b->>'baseMapChanceBp')::integer<>2500 or (b->>'mapChanceBp')::integer<>2500 or (b->>'epic_bp')::integer<>3500 then raise exception 'PEARL_SHOP_MISMATCH';end if;
 r:=public.buy_fishing_bait_bulk(bait,2,buy_op,680);
 if (r->>'gold')::integer<>8640 or (r->'inventory'->>bait)::integer<>2 then raise exception 'PEARL_PURCHASE_MISMATCH';end if;
 r:=public.buy_fishing_bait_bulk(bait,2,buy_op,680);
 if (r->>'gold')::integer<>8640 or (r->>'delta')::integer<>0 or not (r->>'replayed')::boolean then raise exception 'PEARL_DUPLICATE_PURCHASE';end if;
 p:=public.prepare_discovery_fishing('pongdang',bait,cast_op,false);
 if (p->'bait_profile'->>'map_chance_bp')::integer<>2500 or (p->'bait_profile'->>'epic_bp')::integer<>3500 or (p->'bait_profile'->>'mythic_bp')::integer<>0 then raise exception 'PEARL_PREPARE_MISMATCH';end if;
 again:=public.prepare_discovery_fishing('pongdang',bait,cast_op,false);
 if again->'species' is distinct from p->'species' or again->'bait_profile' is distinct from p->'bait_profile' then raise exception 'PEARL_REROLLED';end if;
 s:=public.fishing_state();
 -- The purchase replay returns the current wallet without charging again.
 r:=public.buy_fishing_bait_bulk(bait,2,buy_op,680);
 if (r->'inventory'->>bait)::integer<>1 or (r->>'gold')::integer<>8640 then raise exception 'PEARL_DUPLICATE_BAIT_CONSUMPTION';end if;
end $$;
reset role;
select 'PASS: live shop payload, authenticated bulk purchase, no duplicate charge, fishing preparation and no reroll; transaction rolled back' result;
rollback;
