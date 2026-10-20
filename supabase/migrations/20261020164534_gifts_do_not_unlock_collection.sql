-- Transfer ownership without granting discovery; existing discoveries remain intact.
begin;
CREATE OR REPLACE FUNCTION app_private.claim_collectible_gift(p_gift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_count integer;v_inventory integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid and not exchange_hold for update;
 if not found then raise exception 'GIFT_NOT_FOUND';end if;
 if g.status='claimed' then return to_jsonb(g);end if;
 if g.reward_kind='gold' then
  update public.player_wallets set gold=gold+g.quantity,updated_at=now() where user_id=v_uid and gold<=1000000000-g.quantity;
  if not found then raise exception 'GOLD_LIMIT';end if;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,g.id,'charge','exchange:claim:'||g.id,g.quantity);
 elsif g.reward_kind in ('bait','fuel') then
  select coalesce((inventory->>g.reward_id)::integer,0) into v_inventory from public.player_wallets where user_id=v_uid;
  if v_inventory>2147483647-g.quantity then raise exception 'INVENTORY_LIMIT';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,array[g.reward_id],to_jsonb(v_inventory+g.quantity)),updated_at=now() where user_id=v_uid;
 else
  perform app_private.aquarium_state();
  perform 1 from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id order by id for update;
  select count(*) into v_count from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id and sold_at is null;
  if v_count<>g.quantity then raise exception 'GIFT_UNAVAILABLE';end if;
  update public.player_collectibles set tank_id=null,escrow_gift_id=null where user_id=v_uid and escrow_gift_id=g.id;
  -- Gifts enter storage; only actual catches unlock the collection.
 end if;
 update public.collectible_gifts set status='claimed',claimed_at=now() where id=g.id returning * into g;
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=v_uid and gift_id=g.id and kind='gift_received';
 if g.sender_id is not null and g.source='friend' then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id)
  values(g.sender_id,v_uid,'gift','gift_claimed','선물을 받았어요',g.recipient_name||'님이 보낸 선물을 받았어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $function$
;
notify pgrst,'reload schema';
commit;
