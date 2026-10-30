begin;
CREATE OR REPLACE FUNCTION app_private.trade_island(p_action text, p_item_id text, p_quantity integer, p_expected_price integer, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_wallet public.player_wallets;v_profile app_private.player_islands;v_catalog public.island_shop_items;
 v_previous app_private.island_operations;v_signature jsonb;v_receipt jsonb;v_item app_private.player_island_items;v_ids jsonb:='[]';v_id text;v_delta integer;v_stock integer;v_count integer;v_placed integer;v_unit_price integer;v_build public.farm_building_types;v_level integer;
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
  select * into v_build from public.farm_building_types where id=p_item_id;
  v_level:=case p_item_id when 'farm-office' then v_profile.farm_office_level when 'farm-store' then v_profile.farm_store_level when 'farm-barn' then v_profile.farm_barn_level else 0 end;
  if v_build.id is not null then
   if p_quantity<>1 then raise exception 'INVALID_ISLAND_OPERATION';end if;
   if v_level>=5 then raise exception 'FARM_OFFICE_MAX_LEVEL';end if;
  end if;
  if exists(select 1 from public.farm_animal_types where id=p_item_id) and v_profile.farm_barn_level=0 then raise exception 'FARM_BARN_REQUIRED';end if;
  v_unit_price:=case when v_build.id is not null then (v_level+1)*v_build.unit_cost else v_catalog.price end;
  if p_expected_price is distinct from v_unit_price then raise exception 'ISLAND_PRICE_CHANGED';end if;
  v_delta:=-(v_unit_price*p_quantity);
  if v_wallet.gold+v_delta<0 then raise exception 'INSUFFICIENT_GOLD';end if;
  if v_catalog.family='decoration' then
   if v_build.id is not null and v_level>0 then
    select coalesce(jsonb_agg(id),'[]') into v_ids from app_private.player_island_items where user_id=v_uid and item_id=p_item_id;
    if jsonb_array_length(v_ids)<>1 then raise exception 'FARM_OFFICE_UNAVAILABLE';end if;
   else
   select count(*) into v_count from app_private.player_island_items where user_id=v_uid;
   if v_count+p_quantity>300 then raise exception 'ISLAND_INVENTORY_LIMIT';end if;
   for v_count in 1..p_quantity loop
    v_id:=p_item_id||'~'||gen_random_uuid()::text;
    insert into app_private.player_island_items(user_id,id,item_id,sale_value) values(v_uid,v_id,p_item_id,case when v_build.id is not null then 0 else v_catalog.price*7/10 end);
    v_ids:=v_ids||jsonb_build_array(v_id);
   end loop;
   end if;
  else
   select quantity into v_stock from app_private.player_island_stocks where user_id=v_uid and item_id=p_item_id;
   if coalesce(v_stock,0)+p_quantity>10000 then raise exception 'ISLAND_INVENTORY_LIMIT';end if;
   insert into app_private.player_island_stocks(user_id,item_id,quantity) values(v_uid,p_item_id,p_quantity) on conflict(user_id,item_id) do update set quantity=app_private.player_island_stocks.quantity+excluded.quantity;
  end if;
  if v_build.id is not null then
   update app_private.player_islands set farm_office_level=farm_office_level+case when p_item_id='farm-office' then 1 else 0 end,
    farm_store_level=farm_store_level+case when p_item_id='farm-store' then 1 else 0 end,
    farm_barn_level=farm_barn_level+case when p_item_id='farm-barn' then 1 else 0 end,updated_at=now() where user_id=v_uid;
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
   if exists(select 1 from public.farm_building_types where id=v_item.item_id) then raise exception 'FARM_OFFICE_NOT_SELLABLE';end if;
   if exists(select 1 from app_private.farm_crop_jobs where user_id=v_uid and item_id=p_item_id) then raise exception 'FARM_CROP_ACTIVE';end if;
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
end $function$
;
CREATE OR REPLACE FUNCTION app_private.my_island_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_island app_private.player_islands;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.island_ensure();
 select * into v_island from app_private.player_islands where user_id=v_uid;
 return jsonb_build_object('revision',v_island.revision,'document',v_island.document,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'type',i.item_id,'sellPrice',i.sale_value) order by i.acquired_at,i.id) from app_private.player_island_items i where i.user_id=v_uid),'[]'),
 'stocks',coalesce((select jsonb_object_agg(item_id,quantity) from app_private.player_island_stocks where user_id=v_uid),'{}'),
 'catalog',(select jsonb_agg(to_jsonb(c) order by family,price,id) from public.island_shop_items c),
 'farm',jsonb_build_object('officeLevel',v_island.farm_office_level,
  'plotLimit',(select (limits->>v_island.farm_office_level)::integer from public.farm_building_types where id='farm-office'),
  'nextCost',(select case when v_island.farm_office_level<5 then (v_island.farm_office_level+1)*unit_cost else null end from public.farm_building_types where id='farm-office'),
 'storeLevel',v_island.farm_store_level,'storeCapacity',(select (limits->>v_island.farm_store_level)::integer from public.farm_building_types where id='farm-store'),
 'barnLevel',v_island.farm_barn_level,'animalLimit',(select (limits->>v_island.farm_barn_level)::integer from public.farm_building_types where id='farm-barn'),
 'inventory',v_island.farm_inventory,'serverNow',clock_timestamp(),
 'crops',(select jsonb_agg(c order by grow_seconds,id) from public.farm_crops c),
 'animalTypes',(select jsonb_agg(a order by id) from public.farm_animal_types a),
 'buildings',(select jsonb_agg(to_jsonb(b)||jsonb_build_object('level',l.level,'limit',(b.limits->>l.level)::integer,'nextLimit',case when l.level<5 then (b.limits->>(l.level+1))::integer else null end,'nextCost',case when l.level<5 then (l.level+1)*b.unit_cost else null end) order by b.id) from public.farm_building_types b cross join lateral(select case b.id when 'farm-office' then v_island.farm_office_level when 'farm-store' then v_island.farm_store_level else v_island.farm_barn_level end level) l),
 'cropJobs',coalesce((select jsonb_agg(j order by item_id) from app_private.farm_crop_jobs j where user_id=v_uid),'[]'),
 'animalJobs',coalesce((select jsonb_agg(j order by item_id) from app_private.farm_animal_jobs j where user_id=v_uid),'[]')));

end $function$
;
CREATE OR REPLACE FUNCTION app_private.island_validate_document(p_document jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_doc jsonb;v_key text;v_cell jsonb;v_place jsonb;v_item public.island_shop_items;v_labels jsonb;
 v_x integer;v_y integer;v_w integer;v_h integer;v_rotation integer;v_dx integer;v_dy integer;v_stock integer;v_count integer;
 v_seen jsonb:='{}';v_ids jsonb:='{}';v_surface jsonb:='{}';v_coord text;v_anchor boolean;v_water boolean;v_r record;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_document is null or jsonb_typeof(p_document)<>'object' or octet_length(p_document::text)>260000 then raise exception 'INVALID_ISLAND_LAYOUT';end if;
 v_doc:=jsonb_build_object('layout',coalesce(p_document->'layout','[]'),'land',coalesce(p_document->'land','[]'),'removedLand',coalesce(p_document->'removedLand','[]'),'paving',coalesce(p_document->'paving','[]'),'signLabels',coalesce(p_document->'signLabels','{}'));
 foreach v_key in array array['layout','land','removedLand','paving'] loop
  if jsonb_typeof(v_doc->v_key)<>'array' or jsonb_array_length(v_doc->v_key)>1440 then raise exception 'INVALID_ISLAND_LAYOUT';end if;
 end loop;
 if jsonb_array_length(v_doc->'layout')>400 or jsonb_typeof(v_doc->'signLabels')<>'object' then raise exception 'INVALID_ISLAND_LAYOUT';end if;
 foreach v_key in array array['land','removedLand','paving'] loop
  v_seen:='{}';
  for v_cell in select value from jsonb_array_elements(v_doc->v_key) loop
   if jsonb_typeof(v_cell)<>'object' or jsonb_typeof(v_cell->'x') is distinct from 'number' or jsonb_typeof(v_cell->'y') is distinct from 'number'
    or v_cell->>'x' !~ '^[0-9]{1,2}$' or v_cell->>'y' !~ '^[0-9]{1,2}$' then raise exception 'INVALID_ISLAND_LAYOUT';end if;
   v_x:=(v_cell->>'x')::integer;v_y:=(v_cell->>'y')::integer;v_coord:=v_x||','||v_y;
   if v_x>=40 or v_y>=36 or v_seen?v_coord then raise exception 'INVALID_ISLAND_LAYOUT';end if;
   v_seen:=v_seen||jsonb_build_object(v_coord,true);
   if v_key='removedLand' and not(v_x>=6 and v_x<34 and v_y>=3 and v_y<31) then raise exception 'INVALID_ISLAND_LAYOUT';end if;
   if v_key='land' and v_x>=6 and v_x<34 and v_y>=3 and v_y<31 then raise exception 'INVALID_ISLAND_LAYOUT';end if;
   if v_key='paving' then
    if not app_private.island_land_at(v_doc,v_x,v_y) or not exists(select 1 from public.island_shop_items where id='floor-'||(v_cell->>'type') and family='floor') then raise exception 'INVALID_ISLAND_TERRAIN';end if;
   end if;
  end loop;
 end loop;
 select quantity into v_stock from app_private.player_island_stocks where user_id=v_uid and item_id='land-piece';
 if 784-jsonb_array_length(v_doc->'removedLand')+jsonb_array_length(v_doc->'land')>coalesce(v_stock,0) then raise exception 'ISLAND_STOCK_REQUIRED';end if;
 for v_r in select p->>'type' type,count(*) amount from jsonb_array_elements(v_doc->'paving')p group by p->>'type' loop
  select quantity into v_stock from app_private.player_island_stocks where user_id=v_uid and item_id='floor-'||v_r.type;
  if v_r.amount>coalesce(v_stock,0) then raise exception 'ISLAND_STOCK_REQUIRED';end if;
 end loop;
 v_seen:='{}';
 for v_place in select value from jsonb_array_elements(v_doc->'layout') loop
  if jsonb_typeof(v_place)<>'object' or jsonb_typeof(v_place->'id') is distinct from 'string' or jsonb_typeof(v_place->'x') is distinct from 'number' or jsonb_typeof(v_place->'y') is distinct from 'number'
    or v_place->>'x' !~ '^[0-9]{1,2}$' or v_place->>'y' !~ '^[0-9]{1,2}$' or v_ids?(v_place->>'id') then raise exception 'INVALID_ISLAND_LAYOUT';end if;
  v_ids:=v_ids||jsonb_build_object(v_place->>'id',true);
  select c.* into v_item from app_private.player_island_items i join public.island_shop_items c on c.id=i.item_id where i.user_id=v_uid and i.id=v_place->>'id';
  if not found then select * into v_item from public.island_shop_items where family='facility' and id=v_place->>'id';end if;
  if v_item.id is null then raise exception 'ISLAND_ITEM_NOT_OWNED';end if;
  if v_place?'rotation' and (jsonb_typeof(v_place->'rotation')<>'number' or v_place->>'rotation' !~ '^[0-9]{1,3}$') then raise exception 'INVALID_ISLAND_ROTATION';end if;
  v_rotation:=coalesce((v_place->>'rotation')::integer,0);
  if not v_item.rotations@>jsonb_build_array(v_rotation) then raise exception 'INVALID_ISLAND_ROTATION';end if;
  if v_place?'label' and (not v_item.text_label or jsonb_typeof(v_place->'label')<>'string' or length(v_place->>'label')>6) then raise exception 'INVALID_ISLAND_LABEL';end if;
  v_x:=(v_place->>'x')::integer;v_y:=(v_place->>'y')::integer;
  v_w:=case when v_rotation%180=90 then v_item.height else v_item.width end;
  v_h:=case when v_rotation%180=90 then v_item.width else v_item.height end;
  if v_x+v_w>40 or v_y+v_h>36 then raise exception 'INVALID_ISLAND_LAYOUT';end if;
  v_anchor:=false;v_water:=false;
  for v_dx in 0..v_w-1 loop for v_dy in 0..v_h-1 loop
   v_coord:=(v_x+v_dx)||','||(v_y+v_dy);
   if v_seen?v_coord then raise exception 'ISLAND_PLACEMENT_OVERLAP';end if;
   v_seen:=v_seen||jsonb_build_object(v_coord,true);
   if v_item.terrain='land' and not app_private.island_land_at(v_doc,v_x+v_dx,v_y+v_dy) then raise exception 'INVALID_ISLAND_TERRAIN';end if;
   if v_item.terrain='water' and app_private.island_land_at(v_doc,v_x+v_dx,v_y+v_dy) then raise exception 'INVALID_ISLAND_TERRAIN';end if;
   if v_item.terrain='shore' then
    if (case v_rotation when 0 then v_dy=0 when 90 then v_dx=v_w-1 when 180 then v_dy=v_h-1 else v_dx=0 end) and app_private.island_land_at(v_doc,v_x+v_dx,v_y+v_dy) then v_anchor:=true;end if;
    if (case v_rotation when 0 then v_dy=v_h-1 when 90 then v_dx=0 when 180 then v_dy=0 else v_dx=v_w-1 end) then
     if not app_private.island_land_at(v_doc,v_x+v_dx,v_y+v_dy) or not app_private.island_land_at(v_doc,v_x+v_dx+case v_rotation when 90 then -1 when 270 then 1 else 0 end,v_y+v_dy+case v_rotation when 0 then 1 when 180 then -1 else 0 end) then v_water:=true;end if;
    end if;
   end if;
  end loop;end loop;
  if v_item.terrain='shore' and (not v_anchor or not v_water) then raise exception 'INVALID_ISLAND_TERRAIN';end if;
 end loop;
 select (b.limits->>p.farm_office_level)::integer into v_stock from app_private.player_islands p cross join public.farm_building_types b where p.user_id=v_uid and b.id='farm-office';
 select count(*) into v_count from jsonb_array_elements(v_doc->'layout') l
 join app_private.player_island_items i on i.user_id=v_uid and i.id=l->>'id' where i.item_id='farm-plot';
 if v_count>v_stock then raise exception 'FARM_PLOT_LIMIT:%',v_stock;end if;
 select (b.limits->>p.farm_barn_level)::integer into v_stock from app_private.player_islands p cross join public.farm_building_types b where p.user_id=v_uid and b.id='farm-barn';
 select count(*) into v_count from jsonb_array_elements(v_doc->'layout') l join app_private.player_island_items i on i.user_id=v_uid and i.id=l->>'id' join public.farm_animal_types a on a.id=i.item_id;
 if v_count>v_stock then raise exception 'FARM_ANIMAL_LIMIT:%',v_stock;end if;
 if exists(select 1 from app_private.farm_crop_jobs j where j.user_id=v_uid and not exists(select 1 from jsonb_array_elements(v_doc->'layout') l where l->>'id'=j.item_id)) then raise exception 'FARM_CROP_ACTIVE';end if;
 for v_r in select key,value from jsonb_each(v_doc->'signLabels') loop
  if jsonb_typeof(v_r.value)<>'string' or length(v_r.value#>>'{}')>6 or not exists(select 1 from app_private.player_island_items i join public.island_shop_items c on c.id=i.item_id where i.user_id=v_uid and i.id=v_r.key and c.text_label) then raise exception 'INVALID_ISLAND_LABEL';end if;
 end loop;
 return v_doc;
end $function$
;
create or replace function app_private.farm_action(p_action text,p_item_id text,p_kind text,p_quantity integer,p_expected_price integer,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();w public.player_wallets;p app_private.player_islands;i app_private.player_island_items;
 c public.farm_crops;a public.farm_animal_types;j app_private.farm_crop_jobs;aj app_private.farm_animal_jobs;
 previous app_private.island_operations;sig jsonb;receipt jsonb;inv jsonb;amount integer;unit_price integer:=0;delta integer:=0;
 quantity integer;capacity integer;used integer;product text;stamp timestamptz:=clock_timestamp();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in('plant','harvest','feed','collect','sell') or p_item_id is null or p_kind is null or p_quantity is null or p_quantity<1 or p_quantity>10000 or p_expected_price is null then raise exception 'INVALID_FARM_OPERATION';end if;
 if not app_private.notice_is_operator() then raise exception 'FARM_PREPARING';end if;
 -- All farm commands lock wallet before island, including first-time initialization.
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 perform app_private.island_ensure();
 select * into strict p from app_private.player_islands where user_id=u for update;
 sig:=jsonb_build_object('action','farm:'||p_action,'item',p_item_id,'kind',p_kind,'quantity',p_quantity,'price',p_expected_price);
 select * into previous from app_private.island_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('island',app_private.my_island_state(),'wallet',app_private.get_gold_wallet(),'receipt',previous.receipt||jsonb_build_object('applied',false));
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 inv:=p.farm_inventory;
 select coalesce(sum(value::integer),0) into used from jsonb_each_text(inv);
 select (limits->>p.farm_store_level)::integer into capacity from public.farm_building_types where id='farm-store';
 if p_action<>'sell' then
  if p_quantity<>1 then raise exception 'INVALID_FARM_OPERATION';end if;
  select * into i from app_private.player_island_items where user_id=u and id=p_item_id;
  if not found or not exists(select 1 from jsonb_array_elements(p.document->'layout') l where l->>'id'=p_item_id) then raise exception 'ISLAND_ITEM_NOT_OWNED';end if;
 end if;
 if p_action='plant' then
  if i.item_id<>'farm-plot' then raise exception 'FARM_PLOT_REQUIRED';end if;
  select * into c from public.farm_crops where id=p_kind;
  if not found then raise exception 'INVALID_FARM_CROP';end if;
  if exists(select 1 from app_private.farm_crop_jobs where user_id=u and item_id=p_item_id) then raise exception 'FARM_CROP_ACTIVE';end if;
  unit_price:=c.seed_price;delta:=-unit_price;
  if p_expected_price<>unit_price then raise exception 'ISLAND_PRICE_CHANGED';end if;
  if w.gold+delta<0 then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into app_private.farm_crop_jobs(user_id,item_id,crop_id,planted_at,ready_at) values(u,p_item_id,c.id,stamp,stamp+make_interval(secs=>c.grow_seconds));
 elsif p_action='harvest' then
  select * into j from app_private.farm_crop_jobs where user_id=u and item_id=p_item_id;
  if not found then raise exception 'FARM_CROP_MISSING';end if;
  if j.ready_at>stamp then raise exception 'FARM_NOT_READY';end if;
  select * into c from public.farm_crops where id=j.crop_id;
  quantity:=c.yield_quantity;product:=c.id;
  if used+quantity>capacity then raise exception 'FARM_STORAGE_FULL';end if;
  inv:=jsonb_set(inv,array[product],to_jsonb(coalesce((inv->>product)::integer,0)+quantity));
  delete from app_private.farm_crop_jobs where user_id=u and item_id=p_item_id;
 elsif p_action='feed' then
  select * into a from public.farm_animal_types where id=i.item_id;
  if not found then raise exception 'FARM_ANIMAL_REQUIRED';end if;
  if p_kind not in('wheat','corn') then raise exception 'FARM_FEED_REQUIRED';end if;
  if exists(select 1 from app_private.farm_animal_jobs where user_id=u and item_id=p_item_id) then raise exception 'FARM_ANIMAL_ACTIVE';end if;
  amount:=coalesce((inv->>p_kind)::integer,0);
  if amount<a.feed_quantity then raise exception 'FARM_FEED_REQUIRED';end if;
  inv:=jsonb_set(inv,array[p_kind],to_jsonb(amount-a.feed_quantity));
  insert into app_private.farm_animal_jobs(user_id,item_id,animal_id,fed_at,ready_at) values(u,p_item_id,a.id,stamp,stamp+make_interval(secs=>a.produce_seconds));
 elsif p_action='collect' then
  select * into aj from app_private.farm_animal_jobs where user_id=u and item_id=p_item_id;
  if not found then raise exception 'FARM_ANIMAL_MISSING';end if;
  if aj.ready_at>stamp then raise exception 'FARM_NOT_READY';end if;
  select * into a from public.farm_animal_types where id=aj.animal_id;
  quantity:=a.yield_quantity;product:=a.produce_id;
  if used+quantity>capacity then raise exception 'FARM_STORAGE_FULL';end if;
  inv:=jsonb_set(inv,array[product],to_jsonb(coalesce((inv->>product)::integer,0)+quantity));
  delete from app_private.farm_animal_jobs where user_id=u and item_id=p_item_id;
 else
  select sell_price into unit_price from public.farm_crops where id=p_item_id;
  if not found then select produce_sell_price into unit_price from public.farm_animal_types where produce_id=p_item_id;end if;
  if unit_price is null then raise exception 'INVALID_FARM_PRODUCT';end if;
  if p_expected_price<>unit_price then raise exception 'ISLAND_PRICE_CHANGED';end if;
  amount:=coalesce((inv->>p_item_id)::integer,0);
  if amount<p_quantity then raise exception 'FARM_INVENTORY_REQUIRED';end if;
  delta:=unit_price*p_quantity;
  if w.gold::bigint+delta>1000000000 then raise exception 'GOLD_LIMIT';end if;
  inv:=jsonb_set(inv,array[p_item_id],to_jsonb(amount-p_quantity));
 end if;
 if p_action not in('plant','sell') and p_expected_price<>0 then raise exception 'ISLAND_PRICE_CHANGED';end if;
 update app_private.player_islands set farm_inventory=inv,updated_at=stamp where user_id=u;
 update public.player_wallets set gold=gold+delta,updated_at=stamp where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,case when p_action='sell' then 'sell' else 'buy' end,'farm:'||p_action||':'||p_item_id,delta);
 receipt:=jsonb_build_object('operationId',p_operation_id,'action',p_action,'itemId',p_item_id,'product',product,'quantity',coalesce(quantity,p_quantity),'delta',delta,'applied',true);
 insert into app_private.island_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return jsonb_build_object('island',app_private.my_island_state(),'wallet',app_private.get_gold_wallet(),'receipt',receipt);
end $function$;
create or replace function public.farm_action(p_action text,p_item_id text,p_kind text,p_quantity integer,p_expected_price integer,p_operation_id uuid)
returns jsonb language sql set search_path='' as $function$select app_private.farm_action(p_action,p_item_id,p_kind,p_quantity,p_expected_price,p_operation_id)$function$;
revoke all on function public.farm_action(text,text,text,integer,integer,uuid),app_private.farm_action(text,text,text,integer,integer,uuid) from public,anon;
grant execute on function public.farm_action(text,text,text,integer,integer,uuid),app_private.farm_action(text,text,text,integer,integer,uuid) to authenticated;


-- Retire only island decorations requested for removal. Keep crops, buildings, gold and progression.
do $cleanup$
declare r record;doc jsonb;item text;n integer;x integer;y integer;
begin
 for r in select user_id from app_private.player_islands order by user_id loop
  perform 1 from public.player_wallets where user_id=r.user_id for update;
  select document into doc from app_private.player_islands where user_id=r.user_id for update;
  delete from app_private.player_island_items i where i.user_id=r.user_id and i.item_id in(select id from public.island_shop_items where family='decoration' and id not in('farm-plot','farm-office','farm-store','farm-barn','farm-white-fence','farm-chicken','farm-cow','farm-sheep'));
  doc:=jsonb_set(doc,'{layout}',coalesce((select jsonb_agg(l) from jsonb_array_elements(doc->'layout') l where exists(select 1 from app_private.player_island_items i where i.user_id=r.user_id and i.id=l->>'id')),'[]'));
  doc:=jsonb_set(doc,'{signLabels}',coalesce((select jsonb_object_agg(key,value) from jsonb_each(doc->'signLabels') where exists(select 1 from app_private.player_island_items i where i.user_id=r.user_id and i.id=key)),'{}'));
  for n in 0..3 loop
   item:='farm-white-fence~'||gen_random_uuid()::text;x:=17+n;y:=19;
   insert into app_private.player_island_items(user_id,id,item_id,sale_value) values(r.user_id,item,'farm-white-fence',0);
   if app_private.island_land_at(doc,x,y) and not exists(select 1 from jsonb_array_elements(doc->'layout') l join app_private.player_island_items i on i.user_id=r.user_id and i.id=l->>'id' join public.island_shop_items c on c.id=i.item_id where x>=(l->>'x')::integer and y>=(l->>'y')::integer and x<(l->>'x')::integer+case when coalesce((l->>'rotation')::integer,0)%180=90 then c.height else c.width end and y<(l->>'y')::integer+case when coalesce((l->>'rotation')::integer,0)%180=90 then c.width else c.height end) then
    doc:=jsonb_set(doc,'{layout}',(doc->'layout')||jsonb_build_array(jsonb_build_object('id',item,'x',x,'y',y,'rotation',0)));
   end if;
  end loop;
  update app_private.player_islands set document=doc,revision=revision+1,updated_at=now() where user_id=r.user_id;
 end loop;
end $cleanup$;
delete from public.island_shop_items where family='decoration' and id not in('farm-plot','farm-office','farm-store','farm-barn','farm-white-fence','farm-chicken','farm-cow','farm-sheep');

commit;
