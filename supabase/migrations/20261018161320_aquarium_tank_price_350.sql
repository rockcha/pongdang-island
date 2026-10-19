begin;
CREATE OR REPLACE FUNCTION app_private.aquarium_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 insert into public.aquarium_tanks(user_id,background_id,is_default)
 select v_uid,background_id,true from public.player_aquariums where user_id=v_uid
 on conflict(user_id) where is_default do nothing;
 return jsonb_build_object(
 'background',(select background_id from public.aquarium_tanks where user_id=v_uid and is_default),
 'tanks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
   from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is not null and s.kind in ('fish','trash','decoration')),'[]'::jsonb),
 'storageCount',(select count(*) from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind in ('fish','trash','decoration')),
 'tankCapacity',50,'tankPrice',350,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.buy_aquarium_tank(p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_wallet public.player_wallets; v_previous public.gold_transactions; v_number integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform app_private.get_gold_wallet();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>'buy' or v_previous.item_id is distinct from 'aquarium:tank' then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if v_wallet.gold<350 then raise exception 'INSUFFICIENT_GOLD'; end if;
 perform app_private.aquarium_state();
 select count(*)+1 into v_number from public.aquarium_tanks where user_id=v_uid;
 update public.player_wallets set gold=gold-350,updated_at=now() where user_id=v_uid;
 insert into public.aquarium_tanks(user_id,name) values(v_uid,'어항 '||v_number::text);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','aquarium:tank',-350);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',-350);
end $function$
;
notify pgrst, 'reload schema';
commit;
