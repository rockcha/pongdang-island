begin;
CREATE OR REPLACE FUNCTION app_private.equip_relic(p_relic_id text, p_operation_id uuid, p_expected_fee integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;prev public.gold_transactions;current_id text;fee integer;item text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_OPERATION';end if;
 perform app_private.get_gold_wallet();select * into strict w from public.player_wallets where user_id=u for update;
 item:='relic-loadout:'||coalesce(p_relic_id,'unequip');
 select * into prev from public.gold_transactions where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.action<>'buy' or prev.item_id is distinct from item or (p_expected_fee is not null and prev.delta<>-p_expected_fee) then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('replayed',true);
 end if;
 select relic_id into current_id from app_private.player_relic_loadouts where user_id=u;
 if current_id is not distinct from p_relic_id then raise exception 'RELIC_ALREADY_EQUIPPED';end if;
 if p_relic_id is not null and not exists(select 1 from app_private.player_fishing_relics d join public.fishing_relics r on r.id=d.relic_id where d.user_id=u and d.relic_id=p_relic_id and r.enabled) then raise exception 'RELIC_NOT_OWNED';end if;
 -- Only removing the existing relic costs gold; the new equip itself is free.
 fee:=case when current_id is not null then 500 else 0 end;
 if p_expected_fee is not null and p_expected_fee<>fee then raise exception 'RELIC_LOADOUT_CHANGED';end if;
 if w.gold<fee then raise exception 'INSUFFICIENT_GOLD';end if;
 if p_relic_id is null then delete from app_private.player_relic_loadouts where user_id=u;
 else insert into app_private.player_relic_loadouts(user_id,relic_id) values(u,p_relic_id) on conflict(user_id) do update set relic_id=excluded.relic_id;end if;
 update public.player_wallets set gold=gold-fee,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy',item,-fee);
 return app_private.relic_state()||jsonb_build_object('replayed',false);
end$function$;

CREATE OR REPLACE FUNCTION app_private.relic_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('equippedId',(select relic_id from app_private.player_relic_loadouts where user_id=u),'changeFee',500,'equipFee',0,'unequipFee',500,
 'relics',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('discovered',exists(select 1 from app_private.player_fishing_relic_discoveries d where d.user_id=u and d.relic_id=r.id),'owned',exists(select 1 from app_private.player_fishing_relics d where d.user_id=u and d.relic_id=r.id)) order by r.effect_kind,r.effect_value,r.id) from public.fishing_relics r where r.enabled),'[]'::jsonb));
end$function$;
notify pgrst,'reload schema';
commit;
