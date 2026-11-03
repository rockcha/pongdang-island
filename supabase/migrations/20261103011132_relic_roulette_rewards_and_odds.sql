begin;
-- New spins use the revised distribution. Existing operation receipts stay exact.
create or replace function app_private.relic_roulette_grade(p_roll integer)
returns text language plpgsql immutable set search_path='' as $$
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'INVALID_ROULETTE_ROLL';end if;
 return case when p_roll<6000 then 'none' when p_roll<9400 then 'rare' when p_roll<9900 then 'epic' else 'mythic' end;
end $$;
revoke all on function app_private.relic_roulette_grade(integer) from public,anon,authenticated;

create or replace function app_private.relic_roulette_state()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();at_time timestamptz:=clock_timestamp();today date;available boolean;history jsonb;wallet jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 today:=(at_time at time zone 'Asia/Seoul')::date;
 wallet:=app_private.get_gold_wallet();
 available:=not exists(select 1 from app_private.relic_roulette_operations where user_id=u and spin_day=today and cost=0);
 select coalesce(jsonb_agg(result order by created_at desc,operation_id),'[]'::jsonb) into history
 from(select result,created_at,operation_id from app_private.relic_roulette_operations where user_id=u order by created_at desc,operation_id limit 10)t;
 return jsonb_build_object('gold',(wallet->>'gold')::integer,'freeAvailable',available,'nextCost',case when available then 0 else 1000 end,
  'serverNow',at_time,'resetAt',(today+1)::timestamp at time zone 'Asia/Seoul','history',history,
  'odds',jsonb_build_object('none',60,'rare',34,'epic',5,'mythic',1));
end $$;

create or replace function app_private.relic_roulette_spin(p_operation_id uuid,p_expected_free boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();previous app_private.relic_roulette_operations;available boolean;price integer;balance integer;
 at_time timestamptz;today date;grade text;reward public.fishing_relics;relic jsonb:=null;result jsonb;quantity_after integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_expected_free is null then raise exception 'INVALID_ROULETTE_REQUEST';end if;
 perform app_private.get_gold_wallet();
 select gold into balance from public.player_wallets where user_id=u for update;
 select * into previous from app_private.relic_roulette_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.expected_free<>p_expected_free then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_roulette_state()||jsonb_build_object('spin',previous.result,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 at_time:=clock_timestamp();today:=(at_time at time zone 'Asia/Seoul')::date;
 available:=not exists(select 1 from app_private.relic_roulette_operations where user_id=u and spin_day=today and cost=0);
 if available<>p_expected_free then raise exception 'ROULETTE_PRICE_CHANGED';end if;
 price:=case when available then 0 else 1000 end;
 if balance<price then raise exception 'INSUFFICIENT_GOLD';end if;
 grade:=app_private.relic_roulette_grade(floor(random()*10000)::integer);
 if grade<>'none' then
  select * into reward from public.fishing_relics where enabled and rarity::text=grade order by random() limit 1;
  if not found then raise exception 'ROULETTE_UNAVAILABLE';end if;
  insert into app_private.player_fishing_relics(user_id,relic_id,quantity) values(u,reward.id,1)
   on conflict(user_id,relic_id) do update set quantity=app_private.player_fishing_relics.quantity+1
   returning quantity into quantity_after;
  insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,reward.id) on conflict do nothing;
  relic:=jsonb_build_object('id',reward.id,'name',reward.name,'description',reward.description,'rarity',reward.rarity,'thumbnail_path',reward.thumbnail_path,
   'quantityBefore',quantity_after-1,'quantityAfter',quantity_after);
 end if;
 update public.player_wallets set gold=gold-price,updated_at=at_time where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','relic-roulette',-price);
 result:=jsonb_build_object('operationId',p_operation_id,'grade',grade,'cost',price,'createdAt',at_time,'relic',relic);
 insert into app_private.relic_roulette_operations(user_id,operation_id,spin_day,expected_free,cost,result,created_at)
  values(u,p_operation_id,today,p_expected_free,price,result,at_time);
 return app_private.relic_roulette_state()||jsonb_build_object('spin',result,'replayed',false);
end $$;
-- Keep the private-definer/public-invoker boundary and existing grants intact.
revoke all on function app_private.relic_roulette_state(),app_private.relic_roulette_spin(uuid,boolean) from public,anon;
grant execute on function app_private.relic_roulette_state(),app_private.relic_roulette_spin(uuid,boolean) to authenticated;
commit;
