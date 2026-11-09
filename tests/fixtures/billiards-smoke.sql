-- Transactional deployment smoke test. Only a generated synthetic account is used.
-- Every player, wallet, run and transaction created here must be rolled back.
begin;
do $$
declare u uuid:=gen_random_uuid();op uuid:=gen_random_uuid();s jsonb;r uuid;replay jsonb:='{"version":1,"shots":[{"dx":0,"dy":-60}]}'::jsonb;
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'당구검증') on conflict(id) do nothing;
 insert into public.player_wallets(user_id,gold) values(u,1000) on conflict(user_id) do update set gold=1000;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 s:=public.billiards_start(op,1);r:=(s->'run'->>'id')::uuid;
 if (s->'wallet'->>'gold')::integer<>990 then raise exception 'ENTRY_FEE_MISMATCH';end if;
 s:=public.billiards_start(op,1);
 if (s->'run'->>'id')::uuid<>r or (s->'wallet'->>'gold')::integer<>990 then raise exception 'DUPLICATE_ENTRY_FEE';end if;
 s:=public.billiards_settle(u,r,10,replay,false,true);
 if (s->'wallet'->>'gold')::integer<>990 or (s->'run'->>'reward')::integer<>0 then raise exception 'EARLY_PAYMENT';end if;
 s:=public.billiards_settle(u,r,10,replay,true,true);
 if (s->'wallet'->>'gold')::integer<>1000 or (s->'run'->>'reward')::integer<>10 then raise exception 'REWARD_MISMATCH';end if;
 s:=public.billiards_settle(u,r,10,replay,true,true);
 if (s->'wallet'->>'gold')::integer<>1000 then raise exception 'DUPLICATE_REWARD';end if;
 if (select count(*) from public.gold_transactions where user_id=u and item_id='arcade:billiards:reward')<>1 then raise exception 'REWARD_LEDGER_MISMATCH';end if;
 if (public.billiards_leaderboard(0)->>'total')::integer<0 then raise exception 'INVALID_LEADERBOARD';end if;
end $$;
rollback;
