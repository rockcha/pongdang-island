-- Synthetic accounts only. Caller must run this fixture in a transaction and roll back.
do $fixture$
declare
 u uuid:=gen_random_uuid();other_user uuid:=gen_random_uuid();op uuid:=gen_random_uuid();
 r jsonb;result jsonb;pool jsonb;target text;seen text[]:='{}';question_id uuid;run_id uuid;
 odd_run jsonb;pearls integer;balance integer;
begin
 insert into auth.users(id) values(u),(other_user);
 insert into public.player_profiles(id,nickname) values(u,'Arc'||left(u::text,6)),(other_user,'Arc'||left(other_user::text,6));
 insert into public.player_wallets(user_id,gold) values(u,1000),(other_user,1000)
 on conflict(user_id) do update set gold=1000;
 perform set_config('request.jwt.claim.sub',u::text,true);
 r:=public.shadow_game('start',op)->'run';
 run_id:=(r->>'id')::uuid;
 question_id:=(r->'round'->>'id')::uuid;
 select target_id into target from app_private.shadow_game_rounds where id=question_id;
 -- Restrict this test run to a reproducible-sized subset including its first target.
 select jsonb_agg(item) into pool from (
  select item from public.shadow_game_runs s cross join lateral jsonb_array_elements(s.question_pool) item
  where s.id=run_id order by (item->>'id'=target) desc,item->>'id' limit 105
 ) chosen;
 if jsonb_array_length(pool)<>105 then raise exception 'Fixture needs at least 105 eligible catalog entries';end if;
 update public.shadow_game_runs set question_pool=pool where id=run_id;
 for i in 1..105 loop
  question_id:=(r->'round'->>'id')::uuid;
  select target_id into target from app_private.shadow_game_rounds where id=question_id;
  if target=any(seen) then raise exception 'Repeated shadow target';end if;
  seen:=array_append(seen,target);
  r:=public.shadow_game('answer',null,run_id,question_id,target)->'run';
  if (r->>'score')::int<>i then raise exception 'Incorrect score at %',i;end if;
  if i=100 and (r->>'finished')::boolean then raise exception 'Still capped at 100';end if;
  if i<105 then r:=public.shadow_game('next',null,run_id,question_id)->'run';end if;
 end loop;
 if not (r->>'finished')::boolean or (r->>'totalQuestions')::int<>105 or (r->>'lives')::int<>3 then raise exception 'Catalog completion failed';end if;
 result:=public.shadow_game('answer',null,run_id,question_id,target)->'run';
 if result<>r then raise exception 'Final answer replay changed the run';end if;
 if not exists(select 1 from app_private.arcade_weekly_rankings('shadow',date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date) w where w.user_id=u and w.score=105) then raise exception 'Weekly ranking did not retain >100';end if;
 -- Legacy active games retain their current deadline and can advance past 100.
 r:=public.shadow_game('start',gen_random_uuid())->'run';
 run_id:=(r->>'id')::uuid;question_id:=(r->'round'->>'id')::uuid;
 update public.shadow_game_runs set score=99,question_pool=null where id=run_id;
 select target_id into target from app_private.shadow_game_rounds where id=question_id;
 r:=public.shadow_game('answer',null,run_id,question_id,target)->'run';
 if (r->>'score')::int<>100 or (r->>'finished')::boolean or (r->>'totalQuestions')::int<=100 then raise exception 'Legacy continuation failed';end if;
 -- New odd/even starts debit 30 once. A wallet with 29 cannot start.
 update public.player_wallets set gold=29 where user_id=u;
 begin
  perform public.odd_even_game('start',gen_random_uuid());raise exception 'Low balance accepted';
 exception when raise_exception then if sqlerrm<>'INSUFFICIENT_GOLD' then raise;end if;end;
 update public.player_wallets set gold=100 where user_id=u;
 op:=gen_random_uuid();odd_run:=public.odd_even_game('start',op)->'run';
 if (odd_run->>'stake')::int<>30 or (odd_run->>'initialStake')::int<>30 then raise exception 'Wrong starting stake';end if;
 perform public.odd_even_game('start',op);perform public.odd_even_game('start',gen_random_uuid());
 select gold into balance from public.player_wallets where user_id=u;
 if balance<>70 or (select count(*) from public.gold_transactions where user_id=u and item_id='arcade:odd-even' and delta=-30)<>1 then raise exception 'Duplicate or incorrect debit';end if;
 run_id:=(odd_run->>'id')::uuid;
 update public.odd_even_runs set stake=15728640,wins=19,round=20,stage='choose' where id=run_id;
 perform setseed(0.12345);pearls:=1+floor(random()*10)::int;perform setseed(0.12345);
 odd_run:=public.odd_even_game('answer',null,run_id,20,case when pearls%2=1 then 'odd' else 'even' end)->'run';
 if (odd_run->>'stake')::int<>31457280 or (odd_run->>'wins')::int<>20 then raise exception '20th win failed';end if;
 begin
  perform public.odd_even_game('double',null,run_id,20);raise exception 'Win cap bypassed';
 exception when raise_exception then if sqlerrm<>'ODD_EVEN_LIMIT' then raise;end if;end;
 perform public.odd_even_game('cashout',null,run_id,20);perform public.odd_even_game('cashout',null,run_id,20);
 select gold into balance from public.player_wallets where user_id=u;
 if balance<>31457350 then raise exception 'Incorrect or duplicate cashout';end if;
 -- Old 10-gold runs are neither repriced nor charged again when resumed.
 insert into public.odd_even_runs(user_id,operation_id,stake,initial_stake) values(other_user,gen_random_uuid(),10,10) returning id into run_id;
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 odd_run:=public.odd_even_game('start',gen_random_uuid())->'run';
 if (odd_run->>'stake')::int<>10 or (odd_run->>'initialStake')::int<>10 then raise exception 'Legacy stake changed';end if;
 if (select gold from public.player_wallets where user_id=other_user)<>1000 then raise exception 'Legacy resume charged';end if;
end;
$fixture$;
