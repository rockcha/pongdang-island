begin;

create table public.island_shop_items (
 id text primary key,
 family text not null check(family in ('decoration','facility','land','floor')),
 name text not null check(length(name) between 1 and 80),
 price integer not null check(price between 0 and 10000000),
 width integer not null check(width between 1 and 16),
 height integer not null check(height between 1 and 16),
 terrain text not null check(terrain in ('land','water','any','shore')),
 rotations jsonb not null check(jsonb_typeof(rotations)='array'),
 text_label boolean not null default false
);
create table public.island_starters (
 id text primary key,
 blueprint jsonb not null check(jsonb_typeof(blueprint)='object')
);
alter table public.island_shop_items enable row level security;
alter table public.island_starters enable row level security;
create policy island_shop_read on public.island_shop_items for select to authenticated using(true);
create policy island_starter_read on public.island_starters for select to authenticated using(true);
revoke all on public.island_shop_items,public.island_starters from public,anon,authenticated;
grant select on public.island_shop_items,public.island_starters to authenticated;

create table app_private.player_islands (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null check(jsonb_typeof(document)='object'),
 revision bigint not null default 0 check(revision>=0),
 updated_at timestamptz not null default now()
);
create table app_private.player_island_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 item_id text not null references public.island_shop_items(id),
 sale_value integer not null check(sale_value between 0 and 10000000),
 acquired_at timestamptz not null default now(),
 primary key(user_id,id)
);
create index player_island_items_type_idx on app_private.player_island_items(user_id,item_id);
create table app_private.player_island_stocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.island_shop_items(id),
 quantity integer not null check(quantity between 0 and 10000),
 primary key(user_id,item_id)
);
create table app_private.island_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 signature jsonb not null,
 receipt jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
alter table app_private.player_islands enable row level security;
alter table app_private.player_island_items enable row level security;
alter table app_private.player_island_stocks enable row level security;
alter table app_private.island_operations enable row level security;
revoke all on app_private.player_islands,app_private.player_island_items,app_private.player_island_stocks,app_private.island_operations from public,anon,authenticated;

-- Initial gifts are fixed server data. Browser prototype balances/inventories are
-- never imported. A conflicting insert waits for the first initializer to commit.
create function app_private.island_ensure() returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_created uuid;v_blueprint jsonb;v_doc jsonb;v_item jsonb;v_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if exists(select 1 from app_private.player_islands where user_id=v_uid) then return;end if;
 select blueprint into v_blueprint from public.island_starters where id='default';
 if v_blueprint is null then raise exception 'ISLAND_CATALOG_UNAVAILABLE';end if;
 v_doc:=v_blueprint->'document';
 insert into app_private.player_islands(user_id,document) values(v_uid,v_doc) on conflict do nothing returning user_id into v_created;
 if v_created is null then return;end if;
 for v_item in select value from jsonb_array_elements(v_blueprint->'items') loop
  v_id:=(v_item->>'item_id')||'~'||gen_random_uuid()::text;
  insert into app_private.player_island_items(user_id,id,item_id,sale_value) values(v_uid,v_id,v_item->>'item_id',0);
  v_doc:=jsonb_set(v_doc,'{layout}',(select coalesce(jsonb_agg(case when p->>'id'=v_item->>'id' then p||jsonb_build_object('id',v_id) else p end),'[]') from jsonb_array_elements(v_doc->'layout')p));
 end loop;
 insert into app_private.player_island_stocks(user_id,item_id,quantity)
 select v_uid,key,value::integer from jsonb_each_text(v_blueprint->'stocks');
 update app_private.player_islands set document=v_doc where user_id=v_uid;
end $$;

create function app_private.my_island_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_island app_private.player_islands;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.island_ensure();
 select * into v_island from app_private.player_islands where user_id=v_uid;
 return jsonb_build_object('revision',v_island.revision,'document',v_island.document,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'type',i.item_id,'sellPrice',i.sale_value) order by i.acquired_at,i.id) from app_private.player_island_items i where i.user_id=v_uid),'[]'),
 'stocks',coalesce((select jsonb_object_agg(item_id,quantity) from app_private.player_island_stocks where user_id=v_uid),'{}'),
 'catalog',(select jsonb_agg(to_jsonb(c) order by family,price,id) from public.island_shop_items c));
end $$;

create function app_private.island_land_at(p_document jsonb,p_x integer,p_y integer) returns boolean language sql immutable set search_path='' as $$
 select (p_x>=6 and p_x<34 and p_y>=3 and p_y<31 and not exists(select 1 from jsonb_array_elements(p_document->'removedLand')c where (c->>'x')::integer=p_x and (c->>'y')::integer=p_y))
 or exists(select 1 from jsonb_array_elements(p_document->'land')c where (c->>'x')::integer=p_x and (c->>'y')::integer=p_y)
$$;

-- Validate geometry against server ownership and total material stock. Saving a
-- placement never creates inventory, grants gold, or trusts browser stock counts.
create function app_private.island_validate_document(p_document jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 for v_r in select key,value from jsonb_each(v_doc->'signLabels') loop
  if jsonb_typeof(v_r.value)<>'string' or length(v_r.value#>>'{}')>6 or not exists(select 1 from app_private.player_island_items i join public.island_shop_items c on c.id=i.item_id where i.user_id=v_uid and i.id=v_r.key and c.text_label) then raise exception 'INVALID_ISLAND_LABEL';end if;
 end loop;
 return v_doc;
end $$;

create function app_private.save_my_island(p_document jsonb,p_revision bigint,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_profile app_private.player_islands;v_signature jsonb;v_previous app_private.island_operations;v_doc jsonb;v_receipt jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_revision is null or p_revision<0 then raise exception 'INVALID_ISLAND_OPERATION';end if;
 perform app_private.island_ensure();
 select * into v_profile from app_private.player_islands where user_id=v_uid for update;
 v_signature:=jsonb_build_object('action','layout','document',p_document,'revision',p_revision);
 select * into v_previous from app_private.island_operations where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.signature<>v_signature then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('island',app_private.my_island_state(),'receipt',v_previous.receipt||jsonb_build_object('applied',false));
 end if;
 if v_profile.revision<>p_revision then raise exception 'ISLAND_REVISION_CHANGED';end if;
 v_doc:=app_private.island_validate_document(p_document);
 update app_private.player_islands set document=v_doc,revision=revision+1,updated_at=now() where user_id=v_uid returning * into v_profile;
 v_receipt:=jsonb_build_object('operationId',p_operation_id,'revision',v_profile.revision,'applied',true);
 insert into app_private.island_operations(user_id,operation_id,signature,receipt) values(v_uid,p_operation_id,v_signature,v_receipt);
 return jsonb_build_object('island',app_private.my_island_state(),'receipt',v_receipt);
end $$;

-- All financial writes lock the wallet first, then the island. The same operation
-- ID and signature return a receipt without granting items or charging twice.
create function app_private.trade_island(p_action text,p_item_id text,p_quantity integer,p_expected_price integer,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_wallet public.player_wallets;v_profile app_private.player_islands;v_catalog public.island_shop_items;
 v_previous app_private.island_operations;v_signature jsonb;v_receipt jsonb;v_item app_private.player_island_items;v_ids jsonb:='[]';v_id text;v_delta integer;v_stock integer;v_count integer;
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
 if v_wallet.gold::bigint+v_delta>1000000000 then raise exception 'GOLD_LIMIT';end if;
 update public.player_wallets set gold=gold+v_delta,updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,p_action,'island:'||p_item_id,v_delta);
 v_receipt:=jsonb_build_object('operationId',p_operation_id,'action',p_action,'itemId',p_item_id,'quantity',p_quantity,'itemIds',v_ids,'delta',v_delta,'applied',true);
 insert into app_private.island_operations(user_id,operation_id,signature,receipt) values(v_uid,p_operation_id,v_signature,v_receipt);
 return jsonb_build_object('island',app_private.my_island_state(),'wallet',app_private.get_gold_wallet(),'receipt',v_receipt);
end $$;

create function public.my_island_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.my_island_state()$$;
create function public.save_my_island(p_document jsonb,p_revision bigint,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.save_my_island(p_document,p_revision,p_operation_id)$$;
create function public.trade_island(p_action text,p_item_id text,p_quantity integer,p_expected_price integer,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.trade_island(p_action,p_item_id,p_quantity,p_expected_price,p_operation_id)$$;
revoke all on function app_private.island_ensure(),app_private.island_land_at(jsonb,integer,integer),app_private.island_validate_document(jsonb) from public,anon,authenticated;
revoke all on function public.my_island_state(),public.save_my_island(jsonb,bigint,uuid),public.trade_island(text,text,integer,integer,uuid),app_private.my_island_state(),app_private.save_my_island(jsonb,bigint,uuid),app_private.trade_island(text,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.my_island_state(),public.save_my_island(jsonb,bigint,uuid),public.trade_island(text,text,integer,integer,uuid),app_private.my_island_state(),app_private.save_my_island(jsonb,bigint,uuid),app_private.trade_island(text,text,integer,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
