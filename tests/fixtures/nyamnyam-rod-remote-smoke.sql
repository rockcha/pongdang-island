begin;
do $$
declare uid uuid:=gen_random_uuid(); buy_op uuid:=gen_random_uuid(); sell_op uuid:=gen_random_uuid(); state jsonb;
begin
 insert into auth.users(id) values(uid);
 insert into public.player_profiles(id,nickname) values(uid,'장비검증');
 insert into public.player_wallets(user_id,gold,inventory) values(uid,1000,'{}') on conflict(user_id) do update set gold=1000;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform public.fishing_rod_state();
 perform public.trade_fishing_rod('nyamnyam','buy',buy_op);
 perform public.trade_fishing_rod('nyamnyam','buy',buy_op);
 if (select gold from public.player_wallets where user_id=uid)<>200 then raise exception 'PURCHASE_OR_RETRY_FAILED'; end if;
 perform public.equip_fishing_rod('nyamnyam');
 state:=public.fishing_rod_state();
 if state->>'selected'<>'nyamnyam' then raise exception 'EQUIP_FAILED'; end if;
 if app_private.rod_habitat_weight('nyamnyam','nyamnyam','nyamnyam')<>2.2 then raise exception 'HABITAT_BONUS_FAILED'; end if;
 if app_private.rod_habitat_weight('coral','nyamnyam','nyamnyam')<>0.05 then raise exception 'WRONG_HABITAT_BONUS'; end if;
 if (select wait_reduction_seconds from public.fishing_rods where id='nyamnyam')<>1 then raise exception 'WAIT_BONUS_FAILED'; end if;
 perform public.trade_fishing_rod('nyamnyam','sell',sell_op);
 perform public.trade_fishing_rod('nyamnyam','sell',sell_op);
 state:=public.fishing_rod_state();
 if state->>'selected'<>'basic' or (select gold from public.player_wallets where user_id=uid)<>600 then raise exception 'SELL_OR_RETRY_FAILED'; end if;
 if exists(select 1 from public.player_fishing_rods where user_id=uid and rod_id='nyamnyam') then raise exception 'SELL_INVENTORY_FAILED'; end if;
end $$;
rollback;
