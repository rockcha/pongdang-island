begin;
do $$
declare u uuid:=gen_random_uuid();other_user uuid:=gen_random_uuid();buy_op uuid:=gen_random_uuid();free_op uuid:=gen_random_uuid();ticket_op uuid:=gen_random_uuid();
 state jsonb;first_result jsonb;spin_count integer;
begin
 insert into auth.users(id) values(u),(other_user);
 insert into public.player_profiles(id,nickname) values(u,'이용권검증'),(other_user,'이용권격리');
 insert into public.player_wallets(user_id,gold) values(u,5000),(other_user,5000) on conflict(user_id) do update set gold=5000;
 perform set_config('request.jwt.claim.sub',u::text,true);
 state:=public.relic_roulette_buy_tickets(buy_op,5);
 if state->>'gold'<>'2500' or state->>'tickets'<>'5' or state->>'freeAvailable'<>'true' or jsonb_array_length(state->'history')<>0 then raise exception 'PURCHASE_MISMATCH';end if;
 if public.relic_roulette_buy_tickets(buy_op,5)->>'gold'<>'2500' then raise exception 'DOUBLE_PURCHASE';end if;
 begin perform public.relic_roulette_buy_tickets(buy_op,1);raise exception 'QUANTITY_CONFLICT_NOT_REJECTED';exception when others then if sqlerrm<>'OPERATION_CONFLICT' then raise;end if;end;
 begin perform public.relic_roulette_ticket_spin(ticket_op,false);raise exception 'FREE_NOT_PRIORITIZED';exception when others then if sqlerrm<>'ROULETTE_PRICE_CHANGED' then raise;end if;end;
 state:=public.relic_roulette_ticket_spin(free_op,true);
 if state->>'tickets'<>'5' or state->>'gold'<>'2500' or state->>'freeAvailable'<>'false' then raise exception 'FREE_CONSUMED_TICKET';end if;
 state:=public.relic_roulette_ticket_spin(ticket_op,false);first_result:=state->'spin';
 if state->>'tickets'<>'4' or state->>'gold'<>'2500' or first_result->>'cost'<>'0' or first_result->>'ticketsUsed'<>'1' then raise exception 'TICKET_USE_MISMATCH';end if;
 state:=public.relic_roulette_ticket_spin(ticket_op,false);
 if state->'spin'<>first_result or state->>'tickets'<>'4' or state->>'replayed'<>'true' then raise exception 'DOUBLE_TICKET_USE';end if;
 begin perform public.relic_roulette_buy_tickets(ticket_op,1);raise exception 'CROSS_ACTION_CONFLICT';exception when others then if sqlerrm<>'OPERATION_CONFLICT' then raise;end if;end;
 if public.menu_status()->'relicRoulette'->>'freeAvailable'<>'false' then raise exception 'MENU_FREE_MISMATCH';end if;
 -- The server persists tickets independently of the daily free opportunity.
 update app_private.relic_roulette_operations set spin_day=spin_day-1 where user_id=u;
 state:=public.relic_roulette_ticket_spin(gen_random_uuid(),true);
 if state->>'tickets'<>'4' or state->>'gold'<>'2500' then raise exception 'MIDNIGHT_TICKET_LOSS';end if;
 -- Legacy frontend calls still charge 500 gold rather than consuming tickets.
 state:=public.relic_roulette_spin(gen_random_uuid(),false);
 if state->>'tickets'<>'4' or state->>'gold'<>'2000' then raise exception 'LEGACY_COMPATIBILITY';end if;
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 state:=public.relic_roulette_state();
 if state->>'tickets'<>'0' or jsonb_array_length(state->'history')<>0 then raise exception 'CROSS_ACCOUNT_STATE';end if;
 if has_table_privilege('authenticated','app_private.relic_roulette_tickets','select') or has_table_privilege('authenticated','app_private.relic_roulette_tickets','update')
  or has_function_privilege('anon','public.relic_roulette_buy_tickets(uuid,integer)','execute')
  or has_function_privilege('anon','public.relic_roulette_ticket_spin(uuid,boolean)','execute') then raise exception 'TICKETS_EXPOSED';end if;
end $$;
rollback;
