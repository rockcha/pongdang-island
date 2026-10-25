begin;
do $guard$ begin
 if (select md5(replace(pg_get_functiondef(to_regprocedure('app_private.equip_relic(text,uuid,integer)')),chr(13),'')))
  is distinct from '0773d53c517c94ddef008c927925c314' then raise exception 'RELIC_EQUIPMENT_SCHEMA_DRIFT';end if;
end $guard$;
CREATE OR REPLACE FUNCTION app_private.equip_relic(p_relic_id text, p_operation_id uuid, p_expected_fee integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;prev public.gold_transactions;current_id text;fee integer;item text;fuel_limit integer:=4;bait_limit integer:=4;
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
 -- Production starts share this wallet lock, so a concurrent start cannot
 -- exceed the capacity of the equipment committed by this transaction.
 if p_relic_id is not null then
  select 4+case when effect_kind='fuel_active_slots' then effect_value::integer else 0 end,
         4+case when effect_kind='bait_active_slots' then effect_value::integer else 0 end
   into fuel_limit,bait_limit from public.fishing_relics where id=p_relic_id and enabled;
  if not found then raise exception 'RELIC_NOT_OWNED';end if;
 end if;
 if app_private.production_active_count()>fuel_limit then raise exception 'RELIC_FUEL_PRODUCTION_ACTIVE:%',fuel_limit;end if;
 if app_private.bait_production_active_count()>bait_limit then raise exception 'RELIC_BAIT_PRODUCTION_ACTIVE:%',bait_limit;end if;
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
notify pgrst,'reload schema';
commit;
