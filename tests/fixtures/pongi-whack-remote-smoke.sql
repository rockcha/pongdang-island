begin;
do $$
declare uid uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); op uuid:=gen_random_uuid();
 first jsonb; second jsonb; done jsonb; taps jsonb; target jsonb; expected integer:=0;
begin
 insert into auth.users(id) values(uid),(other);
 insert into public.player_profiles(id,nickname) values(uid,'퐁이검증'),(other,'격리검증');
 insert into public.player_wallets(user_id,gold) values(uid,100),(other,100) on conflict(user_id) do update set gold=100;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 first:=public.pongi_whack_action('start',op);
 if first->'run'->>'durationMs'<>'30000' then raise exception 'SMOKE_DURATION';end if;
 second:=public.pongi_whack_action('start',op);
 if first->>'gold'<>'90' or first->'run'->>'id'<>second->'run'->>'id' or second->>'gold'<>'90' then raise exception 'SMOKE_FEE_RETRY';end if;
 if (select count(*) from public.gold_transactions where user_id=uid and operation_id=op)<>1 then raise exception 'SMOKE_LEDGER';end if;
 update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds' where id=(first->'run'->>'id')::uuid;
 select jsonb_agg(jsonb_build_object('id',t->'id','ms',(t->>'at')::int+150) order by (t->>'id')::int) into taps from jsonb_array_elements(first->'run'->'targets') t;
 for target in select value from jsonb_array_elements(first->'run'->'targets') loop
  expected:=greatest(0,expected+case target->>'kind' when 'pongi' then 1 when 'golden' then 10 else -2 end);
 end loop;
 done:=public.pongi_whack_action('finish',null,(first->'run'->>'id')::uuid,taps);
 if (done->'run'->>'score')::int<>expected then raise exception 'SMOKE_SCORE';end if;
 if (done->'run'->>'rewardGold')::int<>expected or (done->>'gold')::int<>90+expected then raise exception 'SMOKE_INSTANT_REWARD';end if;
 second:=public.pongi_whack_action('finish',null,(first->'run'->>'id')::uuid,'[]');
 if second->'run'->>'score'<>done->'run'->>'score' then raise exception 'SMOKE_FINISH_RETRY';end if;
 if second->>'gold'<>done->>'gold' then raise exception 'SMOKE_DOUBLE_PAYMENT';end if;
 if not exists(select 1 from jsonb_array_elements(public.pongi_whack_leaderboard(0)->'rows') x where x->>'userId'=uid::text and x->>'score'=expected::text) then raise exception 'SMOKE_WEEKLY_RANK';end if;
 perform set_config('request.jwt.claim.sub',other::text,true);
 begin
  perform public.pongi_whack_action('leave',null,(first->'run'->>'id')::uuid);
  raise exception 'SMOKE_OWNERSHIP';
 exception when others then if sqlerrm<>'RUN_NOT_FOUND' then raise;end if;end;
 if has_table_privilege('authenticated','app_private.pongi_whack_runs','insert') or has_function_privilege('anon','public.pongi_whack_action(text,uuid,uuid,jsonb)','execute') then raise exception 'SMOKE_PRIVILEGES';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('whack.test.expected_gold',(90+expected)::text,true);
 raise notice 'PASS: synthetic entry retry, ledger, score replay, finish retry, ownership and privileges; all rolled back';
end $$;
set local role authenticated;
do $$ begin
 if public.pongi_whack_action('state')->>'gold'<>current_setting('whack.test.expected_gold') then raise exception 'SMOKE_AUTHENTICATED_WRAPPER';end if;
 perform public.pongi_whack_leaderboard(0);
end $$;
reset role;
rollback;
