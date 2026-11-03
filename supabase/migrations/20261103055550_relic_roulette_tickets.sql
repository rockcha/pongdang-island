-- Keep the existing direct-gold RPC compatible until the new client is deployed.
-- Ticket spins have their own receipts: a zero-gold ticket use must never be
-- mistaken for the daily free spin in the legacy operations table/menu summary.
create table app_private.relic_roulette_tickets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 quantity integer not null default 0 check (quantity between 0 and 1000000),
 updated_at timestamptz not null default clock_timestamp()
);
create table app_private.relic_roulette_ticket_purchases (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 quantity integer not null check (quantity between 1 and 1000),
 total_gold integer not null check (total_gold=quantity*500),
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
create table app_private.relic_roulette_ticket_spins (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 result jsonb not null check (jsonb_typeof(result)='object'),
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
create index relic_roulette_ticket_history on app_private.relic_roulette_ticket_spins(user_id,created_at desc,operation_id);
alter table app_private.relic_roulette_tickets enable row level security;
alter table app_private.relic_roulette_ticket_purchases enable row level security;
alter table app_private.relic_roulette_ticket_spins enable row level security;
revoke all on app_private.relic_roulette_tickets,app_private.relic_roulette_ticket_purchases,app_private.relic_roulette_ticket_spins from public,anon,authenticated,service_role;

create or replace function app_private.relic_roulette_state()
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();at_time timestamptz:=clock_timestamp();today date;available boolean;history jsonb;wallet jsonb;tickets integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 today:=(at_time at time zone 'Asia/Seoul')::date;
 wallet:=app_private.get_gold_wallet();
 available:=not exists(select 1 from app_private.relic_roulette_operations where user_id=u and spin_day=today and cost=0);
 select coalesce((select quantity from app_private.relic_roulette_tickets where user_id=u),0) into tickets;
 select coalesce(jsonb_agg(result order by created_at desc,operation_id),'[]'::jsonb) into history
 from (select result,created_at,operation_id from (
  (select result,created_at,operation_id from app_private.relic_roulette_operations where user_id=u order by created_at desc,operation_id limit 10)
  union all
  (select result,created_at,operation_id from app_private.relic_roulette_ticket_spins where user_id=u order by created_at desc,operation_id limit 10)
 ) recent order by created_at desc,operation_id limit 10) t;
 return jsonb_build_object('gold',(wallet->>'gold')::integer,'tickets',tickets,'ticketPrice',500,
  'freeAvailable',available,'nextCost',case when available then 0 else 500 end,
  'serverNow',at_time,'resetAt',(today+1)::timestamp at time zone 'Asia/Seoul','history',history,
  'odds',jsonb_build_object('none',60,'rare',34,'epic',5,'mythic',1));
end $function$;

create function app_private.relic_roulette_buy_tickets(p_operation_id uuid,p_quantity integer)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();balance integer;previous app_private.relic_roulette_ticket_purchases;
 total integer;tickets integer;receipt jsonb;at_time timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_ROULETTE_REQUEST';end if;
 if p_quantity is null or p_quantity not between 1 and 1000 then raise exception 'INVALID_ROULETTE_TICKET_QUANTITY';end if;
 perform app_private.get_gold_wallet();
 -- The same wallet lock serializes ticket purchases, ticket uses and legacy spins.
 select gold into balance from public.player_wallets where user_id=u for update;
 select * into previous from app_private.relic_roulette_ticket_purchases where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.quantity<>p_quantity then raise exception 'OPERATION_CONFLICT';end if;
  receipt:=jsonb_build_object('operationId',p_operation_id,'quantity',previous.quantity,'totalGold',previous.total_gold);
  return app_private.relic_roulette_state()||jsonb_build_object('purchase',receipt,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id)
  or exists(select 1 from app_private.relic_roulette_operations where user_id=u and operation_id=p_operation_id)
  or exists(select 1 from app_private.relic_roulette_ticket_spins where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 total:=p_quantity*500;
 if balance<total then raise exception 'INSUFFICIENT_GOLD';end if;
 at_time:=clock_timestamp();
 insert into app_private.relic_roulette_tickets(user_id,quantity,updated_at) values(u,p_quantity,at_time)
  on conflict(user_id) do update set quantity=app_private.relic_roulette_tickets.quantity+p_quantity,updated_at=excluded.updated_at
  where app_private.relic_roulette_tickets.quantity<=1000000-p_quantity returning quantity into tickets;
 if not found then raise exception 'ROULETTE_TICKET_LIMIT';end if;
 update public.player_wallets set gold=gold-total,updated_at=at_time where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','relic-roulette-ticket',-total);
 insert into app_private.relic_roulette_ticket_purchases(user_id,operation_id,quantity,total_gold,created_at) values(u,p_operation_id,p_quantity,total,at_time);
 receipt:=jsonb_build_object('operationId',p_operation_id,'quantity',p_quantity,'totalGold',total);
 return app_private.relic_roulette_state()||jsonb_build_object('purchase',receipt,'replayed',false);
end $function$;

create function app_private.relic_roulette_ticket_spin(p_operation_id uuid,p_expected_free boolean)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();legacy app_private.relic_roulette_operations;previous app_private.relic_roulette_ticket_spins;
 available boolean;at_time timestamptz;today date;tickets integer;grade text;reward public.fishing_relics;
 relic jsonb:=null;result jsonb;quantity_after integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_expected_free is null then raise exception 'INVALID_ROULETTE_REQUEST';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=u for update;
 select * into previous from app_private.relic_roulette_ticket_spins where user_id=u and operation_id=p_operation_id;
 if found then
  if p_expected_free then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_roulette_state()||jsonb_build_object('spin',previous.result,'replayed',true);
 end if;
 select * into legacy from app_private.relic_roulette_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if not p_expected_free or not legacy.expected_free then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_roulette_state()||jsonb_build_object('spin',legacy.result,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id)
  or exists(select 1 from app_private.relic_roulette_ticket_purchases where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 at_time:=clock_timestamp();today:=(at_time at time zone 'Asia/Seoul')::date;
 available:=not exists(select 1 from app_private.relic_roulette_operations where user_id=u and spin_day=today and cost=0);
 if available<>p_expected_free then raise exception 'ROULETTE_PRICE_CHANGED';end if;
 if available then return app_private.relic_roulette_spin(p_operation_id,true);end if;
 update app_private.relic_roulette_tickets set quantity=quantity-1,updated_at=at_time where user_id=u and quantity>0 returning quantity into tickets;
 if not found then raise exception 'INSUFFICIENT_ROULETTE_TICKETS';end if;
 grade:=app_private.relic_roulette_grade(floor(random()*10000)::integer);
 if grade<>'none' then
  select * into reward from public.fishing_relics where enabled and rarity::text=grade order by random() limit 1;
  if not found then raise exception 'ROULETTE_UNAVAILABLE';end if;
  insert into app_private.player_fishing_relics(user_id,relic_id,quantity) values(u,reward.id,1)
   on conflict(user_id,relic_id) do update set quantity=app_private.player_fishing_relics.quantity+1 returning quantity into quantity_after;
  insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,reward.id) on conflict do nothing;
  relic:=jsonb_build_object('id',reward.id,'name',reward.name,'description',reward.description,'rarity',reward.rarity,'thumbnail_path',reward.thumbnail_path,'quantityBefore',quantity_after-1,'quantityAfter',quantity_after);
 end if;
 -- A zero-gold ledger entry reserves the operation ID without charging twice.
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','relic-roulette-ticket-use',0);
 result:=jsonb_build_object('operationId',p_operation_id,'grade',grade,'cost',0,'ticketsUsed',1,'createdAt',at_time,'relic',relic);
 insert into app_private.relic_roulette_ticket_spins(user_id,operation_id,result,created_at) values(u,p_operation_id,result,at_time);
 return app_private.relic_roulette_state()||jsonb_build_object('spin',result,'replayed',false);
end $function$;

create function public.relic_roulette_buy_tickets(p_operation_id uuid,p_quantity integer)
returns jsonb language sql security invoker set search_path='' as $function$
 select app_private.relic_roulette_buy_tickets(p_operation_id,p_quantity)
$function$;
create function public.relic_roulette_ticket_spin(p_operation_id uuid,p_expected_free boolean)
returns jsonb language sql security invoker set search_path='' as $function$
 select app_private.relic_roulette_ticket_spin(p_operation_id,p_expected_free)
$function$;
revoke all on function app_private.relic_roulette_buy_tickets(uuid,integer),app_private.relic_roulette_ticket_spin(uuid,boolean),public.relic_roulette_buy_tickets(uuid,integer),public.relic_roulette_ticket_spin(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function app_private.relic_roulette_buy_tickets(uuid,integer),app_private.relic_roulette_ticket_spin(uuid,boolean),public.relic_roulette_buy_tickets(uuid,integer),public.relic_roulette_ticket_spin(uuid,boolean) to authenticated;
