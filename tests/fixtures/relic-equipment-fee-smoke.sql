-- Execute inside a transaction and roll back; never modifies a real account.
do $test$
declare u uuid:=gen_random_uuid();op uuid:=gen_random_uuid();replace_op uuid:=gen_random_uuid();remove_op uuid:=gen_random_uuid();s jsonb;
begin
 insert into auth.users(id) values(u);
 insert into public.player_profiles(id,nickname) values(u,'장착검증'||left(u::text,6));
 perform set_config('request.jwt.claim.sub',u::text,true);
 insert into public.player_wallets(user_id,gold,inventory) values(u,0,'{}') on conflict(user_id) do update set gold=0;
 insert into app_private.player_fishing_relics(user_id,relic_id) select u,id from public.fishing_relics;
 set local role authenticated;
 s:=public.equip_relic('shell-hourglass',op,0);perform public.equip_relic('shell-hourglass',op,0);
 if s->>'equippedId'<>'shell-hourglass' or (s->>'equipFee')::integer<>0 or (s->>'unequipFee')::integer<>500 then raise exception 'FREE_EQUIP_FAILED';end if;
 reset role;
 if (select gold from public.player_wallets where user_id=u)<>0 then raise exception 'FREE_EQUIP_CHARGED';end if;
 if (select count(*) from public.gold_transactions where user_id=u and operation_id=op and delta=0)<>1 then raise exception 'FREE_REPLAY_INVALID';end if;
 update public.player_wallets set gold=1000 where user_id=u;
 set local role authenticated;
 begin
  perform public.equip_relic('eternal-water-clock',gen_random_uuid(),1000);raise exception 'STALE_QUOTE_ACCEPTED';
 exception when others then if sqlerrm<>'RELIC_LOADOUT_CHANGED' then raise;end if;end;
 perform public.equip_relic('eternal-water-clock',replace_op,500);perform public.equip_relic('eternal-water-clock',replace_op,500);
 reset role;
 if (select gold from public.player_wallets where user_id=u)<>500 then raise exception 'REPLACEMENT_FEE_WRONG';end if;
 set local role authenticated;
 perform public.equip_relic(null,remove_op,500);perform public.equip_relic(null,remove_op,500);
 reset role;
 if (select gold from public.player_wallets where user_id=u)<>0 or exists(select 1 from app_private.player_relic_loadouts where user_id=u) then raise exception 'UNEQUIP_FEE_WRONG';end if;
 set local role authenticated;
 perform public.equip_relic('primordial-ember',gen_random_uuid(),0);
 begin
  perform public.equip_relic(null,gen_random_uuid(),500);raise exception 'UNAFFORDABLE_REMOVAL_ALLOWED';
 exception when others then if sqlerrm<>'INSUFFICIENT_GOLD' then raise;end if;end;
 reset role;
 if (select relic_id from app_private.player_relic_loadouts where user_id=u)<>'primordial-ember' then raise exception 'FAILED_REMOVAL_CHANGED_EQUIPMENT';end if;
end $test$;
