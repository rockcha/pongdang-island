begin;

create table app_private.bait_purchase_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 bait_id text not null,
 quantity integer not null check(quantity between 1 and 99),
 unit_price integer not null check(unit_price>0),
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
alter table app_private.bait_purchase_operations enable row level security;
revoke all on app_private.bait_purchase_operations from public,anon,authenticated;

create function app_private.buy_fishing_bait_bulk(p_bait_id text,p_quantity integer,p_operation_id uuid,p_expected_price integer)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();b public.fishing_baits;w public.player_wallets;
 previous app_private.bait_purchase_operations;price integer;total bigint;stock bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_bait_id is null or p_expected_price is null or p_expected_price<1 then raise exception 'INVALID_TRADE';end if;
 if p_quantity is null or p_quantity not between 1 and 99 then raise exception 'INVALID_QUANTITY';end if;
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from app_private.bait_purchase_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.bait_id is distinct from p_bait_id or previous.quantity<>p_quantity or previous.unit_price<>p_expected_price then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into b from public.fishing_baits where id=p_bait_id for share;
 if not found then raise exception 'INVALID_BAIT';end if;
 if b.price is null then raise exception 'BAIT_NOT_FOR_SALE';end if;
 price:=greatest(1,b.price-app_private.relic_bonus('bait_discount_gold')::integer);
 if p_expected_price<>price then raise exception 'BAIT_PRICE_CHANGED';end if;
 total:=price::bigint*p_quantity;
 if w.gold<total then raise exception 'INSUFFICIENT_GOLD';end if;
 stock:=coalesce((w.inventory->>p_bait_id)::bigint,0)+p_quantity;
 if stock>1000000000 then raise exception 'INVENTORY_LIMIT';end if;
 update public.player_wallets set gold=gold-total::integer,
  inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(stock::integer)),updated_at=clock_timestamp() where user_id=u;
 -- Keep the existing item identity so maintenance and accounting hooks apply.
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','fishing:'||p_bait_id,-total::integer);
 insert into app_private.bait_purchase_operations(user_id,operation_id,bait_id,quantity,unit_price) values(u,p_operation_id,p_bait_id,p_quantity,price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-total::integer,'replayed',false,'quantity',p_quantity);
end $function$;

create function public.buy_fishing_bait_bulk(p_bait_id text,p_quantity integer,p_operation_id uuid,p_expected_price integer)
returns jsonb language sql set search_path='' as $function$
 select app_private.buy_fishing_bait_bulk(p_bait_id,p_quantity,p_operation_id,p_expected_price)
$function$;
revoke all on function app_private.buy_fishing_bait_bulk(text,integer,uuid,integer) from public,anon,authenticated;
revoke all on function public.buy_fishing_bait_bulk(text,integer,uuid,integer) from public,anon,authenticated;
grant execute on function app_private.buy_fishing_bait_bulk(text,integer,uuid,integer) to authenticated;
grant execute on function public.buy_fishing_bait_bulk(text,integer,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
