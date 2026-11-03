begin;
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); operation uuid:=gen_random_uuid();
 state jsonb; saved jsonb; run_id uuid; hits jsonb; expected integer;
begin
 -- Synthetic accounts and a temporary release, all rolled back below.
 update app_private.pongi_whack_maintenance set released_at=clock_timestamp() where id;
 insert into auth.users(id) values(u),(other_user);
 insert into public.player_profiles(id,nickname) values(u,'개편검증'),(other_user,'격리검증');
 insert into public.player_wallets(user_id,gold) values(u,1000),(other_user,1000)
  on conflict(user_id) do update set gold=1000;
 perform set_config('request.jwt.claim.sub',u::text,true);
 state:=public.pongi_whack_action('start',operation);
 saved:=state->'run'->'targets';run_id:=(state->'run'->>'id')::uuid;
 if state->>'gold'<>'990' or jsonb_array_length(saved)<>144 or state->'run'->>'durationMs'<>'30000' then raise exception 'START_MISMATCH';end if;
 if exists(select 1 from jsonb_array_elements(saved) t where (t->>'at')::integer>=10000 group by t->>'at' having count(*)<>5) then raise exception 'WAVE_MISMATCH';end if;
 if exists(select 1 from jsonb_array_elements(saved) t where not ((t->>'sinkMs')::integer between 72 and 178)) then raise exception 'MOTION_MISMATCH';end if;
 if public.pongi_whack_action('start',operation)->'run'->'targets'<>saved then raise exception 'RETRY_REGENERATED_BOARD';end if;
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 begin perform public.pongi_whack_action('finish',null,run_id,'[]');raise exception 'OWNERSHIP_BYPASS';
 exception when others then if sqlerrm<>'RUN_NOT_FOUND' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',u::text,true);
 begin perform public.pongi_whack_action('finish',null,run_id,'[]');raise exception 'EARLY_PAYOUT';
 exception when others then if sqlerrm<>'TOO_EARLY' then raise;end if;end;
 select jsonb_agg(jsonb_build_object('id',(t->>'id')::integer,'ms',(t->>'at')::integer+150+60*(wave_index-1)) order by (t->>'at')::integer,wave_index),
  sum(case t->>'kind' when 'golden' then 10 else 1 end)::integer into hits,expected
 from (select t,row_number() over(partition by t->>'at' order by (t->>'id')::integer) wave_index
  from jsonb_array_elements(saved) t where t->>'kind' in('pongi','golden')) valid;
 update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds' where id=run_id;
 state:=public.pongi_whack_action('finish',null,run_id,hits);
 if (state->'run'->>'score')::integer<>expected or (state->'run'->>'rewardGold')::integer<>expected or (state->>'gold')::integer<>990+expected then raise exception 'PAYOUT_MISMATCH';end if;
 if public.pongi_whack_action('finish',null,run_id,hits)->>'gold'<>state->>'gold' then raise exception 'DOUBLE_PAYOUT';end if;
 if has_function_privilege('anon','public.pongi_whack_action(text,uuid,uuid,jsonb)','execute') or has_function_privilege('authenticated','app_private.pongi_whack_board()','execute') then raise exception 'HELPER_EXPOSED';end if;
end $$;
rollback;
