-- Crafting is public: owners must also be able to equip the resulting relic.
-- Preserve ownership, fee, production capacity and idempotency checks.
begin;
CREATE OR REPLACE FUNCTION app_private.equip_relic(p_relic_id text, p_operation_id uuid, p_expected_fee integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;prev public.gold_transactions;current_id text;fee integer;item text;
 fuel_limit integer:=4;bait_limit integer:=4;candidate jsonb;is_crafted boolean;
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
 select coalesce(crafted_id,relic_id) into current_id from app_private.player_relic_loadouts where user_id=u;
 if current_id is not distinct from p_relic_id then raise exception 'RELIC_ALREADY_EQUIPPED';end if;
 if p_relic_id is not null then
  select r into candidate from jsonb_array_elements(app_private.relic_state()->'relics') r where r->>'id'=p_relic_id and (r->>'owned')::boolean;
  if candidate is null then raise exception 'RELIC_NOT_OWNED';end if;
  is_crafted:=coalesce((candidate->>'crafted')::boolean,false);

  if is_crafted then
   select 4+coalesce(sum((e->>'value')::integer) filter(where e->>'kind'='fuel_active_slots'),0),
          4+coalesce(sum((e->>'value')::integer) filter(where e->>'kind'='bait_active_slots'),0)
   into fuel_limit,bait_limit from jsonb_array_elements(candidate->'effects') e;
  else
   fuel_limit:=4+case when candidate->>'effect_kind'='fuel_active_slots' then (candidate->>'effect_value')::integer else 0 end;
   bait_limit:=4+case when candidate->>'effect_kind'='bait_active_slots' then (candidate->>'effect_value')::integer else 0 end;
  end if;
 end if;
 if app_private.production_active_count()>fuel_limit then raise exception 'RELIC_FUEL_PRODUCTION_ACTIVE:%',fuel_limit;end if;
 if app_private.bait_production_active_count()>bait_limit then raise exception 'RELIC_BAIT_PRODUCTION_ACTIVE:%',bait_limit;end if;
 fee:=case when current_id is not null then 500 else 0 end;
 if p_expected_fee is not null and p_expected_fee<>fee then raise exception 'RELIC_LOADOUT_CHANGED';end if;
 if w.gold<fee then raise exception 'INSUFFICIENT_GOLD';end if;
 if p_relic_id is null then delete from app_private.player_relic_loadouts where user_id=u;
 else
  insert into app_private.player_relic_loadouts(user_id,relic_id,crafted_id)
   values(u,case when not is_crafted then p_relic_id end,case when is_crafted then p_relic_id end)
   on conflict(user_id) do update set relic_id=excluded.relic_id,crafted_id=excluded.crafted_id;
 end if;
 update public.player_wallets set gold=gold-fee,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy',item,-fee);
 return app_private.relic_state()||jsonb_build_object('replayed',false);
end$function$
;
commit;
