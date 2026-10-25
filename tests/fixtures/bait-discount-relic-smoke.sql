-- Run in a transaction and roll back; only the temporary players own test state.
do $test$
declare u uuid:=gen_random_uuid();other uuid:=gen_random_uuid();r record;b record;s jsonb;unit integer;balance integer;stock integer;op uuid;last_op uuid;last_bait text;last_price integer;original_price integer;unavailable text;
begin
 insert into auth.users(id) values(u),(other);
 insert into public.player_profiles(id,nickname) values(u,'할인검증'||left(u::text,6)),(other,'할인대조'||left(other::text,6));
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,1000000,'{}') on conflict(user_id) do update set gold=1000000,inventory='{}';
 insert into app_private.player_fishing_relics(user_id,relic_id) select u,id from public.fishing_relics where effect_kind='bait_discount_gold';
 for r in select * from public.fishing_relics where effect_kind='bait_discount_gold' order by effect_value loop
  set local role authenticated;perform public.equip_relic(r.id,gen_random_uuid(),0);reset role;
  for b in select * from public.fishing_baits where price is not null order by id loop
   unit:=greatest(1,b.price-r.effect_value::integer);
   set local role authenticated;s:=public.fishing_state();reset role;
   if not exists(select 1 from jsonb_array_elements(s->'baits') x where x->>'id'=b.id and (x->>'price')::integer=unit and (x->>'base_price')::integer=b.price) then raise exception 'PRICE_DISPLAY_MISMATCH %',b.id;end if;
   select gold,coalesce((inventory->>b.id)::integer,0) into balance,stock from public.player_wallets where user_id=u;
   op:=gen_random_uuid();set local role authenticated;
   begin
    perform public.buy_fishing_bait_at_price(b.id,gen_random_uuid(),unit+1);raise exception 'WRONG_QUOTE_ACCEPTED';
   exception when others then if sqlerrm<>'BAIT_PRICE_CHANGED' then raise;end if;end;
   perform public.buy_fishing_bait_at_price(b.id,op,unit);perform public.buy_fishing_bait_at_price(b.id,op,unit);
   reset role;
   if (select gold from public.player_wallets where user_id=u)<>balance-unit or (select (inventory->>b.id)::integer from public.player_wallets where user_id=u)<>stock+1 then raise exception 'QUOTE_REPLAY_FAILED';end if;
   set local role authenticated;perform public.buy_fishing_bait(b.id,gen_random_uuid());reset role;
   if (select gold from public.player_wallets where user_id=u)<>balance-unit*2 then raise exception 'LEGACY_ROUTE_NOT_DISCOUNTED';end if;
   last_op:=op;last_bait:=b.id;last_price:=unit;
  end loop;
  select price into original_price from public.fishing_baits where id='bait';unit:=greatest(1,original_price-r.effect_value::integer);
  update public.player_wallets set gold=unit-1 where user_id=u;
  set local role authenticated;
  begin perform public.buy_fishing_bait_at_price('bait',gen_random_uuid(),unit);raise exception 'INSUFFICIENT_BALANCE_ACCEPTED';
  exception when others then if sqlerrm<>'INSUFFICIENT_GOLD' then raise;end if;end;
  reset role;
  update public.player_wallets set gold=unit where user_id=u;
  set local role authenticated;perform public.buy_fishing_bait_at_price('bait',gen_random_uuid(),unit);reset role;
  if (select gold from public.player_wallets where user_id=u)<>0 then raise exception 'DISCOUNT_AFFORDABILITY_FAILED';end if;
  update public.player_wallets set gold=1000000 where user_id=u;
  select gold into balance from public.player_wallets where user_id=u;
  set local role authenticated;perform public.trade_gold(gen_random_uuid(),'buy','bait');reset role;
  if (select gold from public.player_wallets where user_id=u)<>balance-greatest(1,(select price from public.fishing_baits where id='bait')-r.effect_value::integer) then raise exception 'WALLET_BUY_NOT_DISCOUNTED';end if;
  select gold into balance from public.player_wallets where user_id=u;
  set local role authenticated;perform public.trade_gold(gen_random_uuid(),'buy','shell');reset role;
  if (select gold from public.player_wallets where user_id=u)<>balance-300 then raise exception 'UNRELATED_ITEM_DISCOUNTED';end if;
  set local role authenticated;perform public.equip_relic(null,gen_random_uuid(),500);reset role;
  select gold into balance from public.player_wallets where user_id=u;
  set local role authenticated;
  perform public.buy_fishing_bait_at_price(last_bait,last_op,last_price);
  begin
   perform public.buy_fishing_bait_at_price(last_bait,gen_random_uuid(),last_price);raise exception 'STALE_QUOTE_AFTER_UNEQUIP_ACCEPTED';
  exception when others then if sqlerrm<>'BAIT_PRICE_CHANGED' then raise;end if;end;
  s:=public.fishing_state();reset role;
  if (select gold from public.player_wallets where user_id=u)<>balance then raise exception 'RETRY_CHARGED_AFTER_UNEQUIP';end if;
  if exists(select 1 from jsonb_array_elements(s->'baits') x where x->>'price' is distinct from x->>'base_price') then raise exception 'PRICES_NOT_RESTORED';end if;
 end loop;
 -- Another account gets the base prices; there is no cross-player discount.
 perform set_config('request.jwt.claim.sub',other::text,true);set local role authenticated;s:=public.fishing_state();reset role;
 if exists(select 1 from jsonb_array_elements(s->'baits') x where x->>'price' is distinct from x->>'base_price') then raise exception 'DISCOUNT_LEAKED';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 select price into original_price from public.fishing_baits where id='bait';
 update public.fishing_baits set price=1 where id='bait';
 set local role authenticated;perform public.equip_relic('sea-king-trade-ledger',gen_random_uuid(),0);reset role;
 select gold into balance from public.player_wallets where user_id=u;
 set local role authenticated;perform public.buy_fishing_bait_at_price('bait',gen_random_uuid(),1);reset role;
 if (select gold from public.player_wallets where user_id=u)<>balance-1 then raise exception 'MINIMUM_PRICE_FAILED';end if;
 update public.fishing_baits set price=original_price where id='bait';
 select id into unavailable from public.fishing_baits where price is null limit 1;
 if unavailable is not null then
  set local role authenticated;
  begin perform public.buy_fishing_bait_at_price(unavailable,gen_random_uuid(),1);raise exception 'UNAVAILABLE_BAIT_SOLD';
  exception when others then if sqlerrm<>'BAIT_NOT_FOR_SALE' then raise;end if;end;
  reset role;
 end if;
 begin update public.fishing_relics set rarity='rare' where id='sea-merchant-shell-token';raise exception 'RARE_DISCOUNT_RELIC_ACCEPTED';
 exception when check_violation then null;end;
end $test$;
