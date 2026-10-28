begin;

-- The wallet and island keep the same lock order for every financial command.
-- A material stock is total ownership: only total minus currently placed units
-- can be sold. Layout saves share the island lock and cannot race this check.
create or replace function app_private.trade_island(p_action text,p_item_id text,p_quantity integer,p_expected_price integer,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_wallet public.player_wallets;v_profile app_private.player_islands;v_catalog public.island_shop_items;
 v_previous app_private.island_operations;v_signature jsonb;v_receipt jsonb;v_item app_private.player_island_items;v_ids jsonb:='[]';v_id text;v_delta integer;v_stock integer;v_count integer;v_placed integer;v_unit_price integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','sell') or p_item_id is null or p_quantity is null or p_quantity<1 or p_quantity>100 then raise exception 'INVALID_ISLAND_OPERATION';end if;
 insert into public.player_wallets(user_id) values(v_uid) on conflict do nothing;
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 perform app_private.island_ensure();
 select * into v_profile from app_private.player_islands where user_id=v_uid for update;
 v_signature:=jsonb_build_object('action',p_action,'item',p_item_id,'quantity',p_quantity,'price',p_expected_price);
 select * into v_previous from app_private.island_operations where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.signature<>v_signature then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('island',app_private.my_island_state(),'wallet',app_private.get_gold_wallet(),'receipt',v_previous.receipt||jsonb_build_object('applied',false));
 end if;
 if exists(select 1 from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 if p_action='buy' then
  select * into v_catalog from public.island_shop_items where id=p_item_id and family<>'facility';
  if not found then raise exception 'INVALID_ISLAND_ITEM';end if;
  if p_expected_price is distinct from v_catalog.price then raise exception 'ISLAND_PRICE_CHANGED';end if;
  v_delta:=-(v_catalog.price*p_quantity);
  if v_wallet.gold+v_delta<0 then raise exception 'INSUFFICIENT_GOLD';end if;
  if v_catalog.family='decoration' then
   select count(*) into v_count from app_private.player_island_items where user_id=v_uid;
   if v_count+p_quantity>300 then raise exception 'ISLAND_INVENTORY_LIMIT';end if;
   for v_count in 1..p_quantity loop
    v_id:=p_item_id||'~'||gen_random_uuid()::text;
    insert into app_private.player_island_items(user_id,id,item_id,sale_value) values(v_uid,v_id,p_item_id,v_catalog.price*7/10);
    v_ids:=v_ids||jsonb_build_array(v_id);
   end loop;
  else
   select quantity into v_stock from app_private.player_island_stocks where user_id=v_uid and item_id=p_item_id;
   if coalesce(v_stock,0)+p_quantity>10000 then raise exception 'ISLAND_INVENTORY_LIMIT';end if;
   insert into app_private.player_island_stocks(user_id,item_id,quantity) values(v_uid,p_item_id,p_quantity) on conflict(user_id,item_id) do update set quantity=app_private.player_island_stocks.quantity+excluded.quantity;
  end if;
 else
  select * into v_catalog from public.island_shop_items where id=p_item_id and family in ('floor','land');
  if found then
   v_unit_price:=v_catalog.price/2;
   if p_expected_price is distinct from v_unit_price then raise exception 'ISLAND_PRICE_CHANGED';end if;
   select quantity into v_stock from app_private.player_island_stocks where user_id=v_uid and item_id=p_item_id for update;
   if v_catalog.family='land' then
    v_placed:=784-jsonb_array_length(v_profile.document->'removedLand')+jsonb_array_length(v_profile.document->'land');
   else
    select count(*) into v_placed from jsonb_array_elements(v_profile.document->'paving') p where 'floor-'||(p->>'type')=p_item_id;
   end if;
   if coalesce(v_stock,0)-v_placed<p_quantity then raise exception 'ISLAND_STOCK_NOT_STORED';end if;
   v_delta:=v_unit_price*p_quantity;
   update app_private.player_island_stocks set quantity=quantity-p_quantity where user_id=v_uid and item_id=p_item_id;
  else
   if p_quantity<>1 then raise exception 'INVALID_ISLAND_OPERATION';end if;
   select * into v_item from app_private.player_island_items where user_id=v_uid and id=p_item_id for update;
   if not found then raise exception 'ISLAND_ITEM_NOT_OWNED';end if;
   if v_item.sale_value=0 then raise exception 'ISLAND_STARTER_NOT_FOR_SALE';end if;
   if p_expected_price is distinct from v_item.sale_value then raise exception 'ISLAND_PRICE_CHANGED';end if;
   v_delta:=v_item.sale_value;
   delete from app_private.player_island_items where user_id=v_uid and id=p_item_id;
   update app_private.player_islands set document=jsonb_set(document,'{layout}',(select coalesce(jsonb_agg(p),'[]') from jsonb_array_elements(document->'layout')p where p->>'id'<>p_item_id))#-array['signLabels',p_item_id],revision=revision+1,updated_at=now() where user_id=v_uid;
   v_ids:=jsonb_build_array(p_item_id);
  end if;
 end if;
 if v_wallet.gold::bigint+v_delta>1000000000 then raise exception 'GOLD_LIMIT';end if;
 update public.player_wallets set gold=gold+v_delta,updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,p_action,'island:'||p_item_id,v_delta);
 v_receipt:=jsonb_build_object('operationId',p_operation_id,'action',p_action,'itemId',p_item_id,'quantity',p_quantity,'itemIds',v_ids,'delta',v_delta,'applied',true);
 insert into app_private.island_operations(user_id,operation_id,signature,receipt) values(v_uid,p_operation_id,v_signature,v_receipt);
 return jsonb_build_object('island',app_private.my_island_state(),'wallet',app_private.get_gold_wallet(),'receipt',v_receipt);
end $$;
revoke all on function app_private.trade_island(text,text,integer,integer,uuid) from public,anon;
grant execute on function app_private.trade_island(text,text,integer,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
