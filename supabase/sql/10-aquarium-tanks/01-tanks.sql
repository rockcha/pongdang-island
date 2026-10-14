-- Apply after 09. Existing equipped background becomes the user's free first tank.
begin;
create table public.aquarium_tanks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null default '나의 첫 어항' check(char_length(btrim(name)) between 1 and 20 and name !~ '[[:cntrl:]]'),
 background_id text not null default 'default' references public.aquarium_backgrounds(id),
 is_default boolean not null default false,
 created_at timestamptz not null default now()
);
create index aquarium_tanks_owner_idx on public.aquarium_tanks(user_id,created_at,id);
create unique index aquarium_tanks_one_default on public.aquarium_tanks(user_id) where is_default;
alter table public.aquarium_tanks enable row level security;
revoke all on public.aquarium_tanks from public,anon,authenticated;
grant select on public.aquarium_tanks to authenticated;
create policy tanks_owner_read on public.aquarium_tanks for select to authenticated using(user_id=(select auth.uid()));
insert into public.aquarium_tanks(user_id,background_id,is_default)
select user_id,background_id,true from public.player_aquariums;

create or replace function app_private.aquarium_state() returns jsonb language plpgsql security definer set search_path='' as $$
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
 'tankPrice',200,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;
create function app_private.buy_aquarium_tank(p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
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
 if v_wallet.gold<200 then raise exception 'INSUFFICIENT_GOLD'; end if;
 perform app_private.aquarium_state();
 select count(*)+1 into v_number from public.aquarium_tanks where user_id=v_uid;
 update public.player_wallets set gold=gold-200,updated_at=now() where user_id=v_uid;
 insert into public.aquarium_tanks(user_id,name) values(v_uid,'어항 '||v_number::text);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','aquarium:tank',-200);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',-200);
end $$;
create function app_private.manage_aquarium_tank(p_tank_id uuid,p_action text,p_value text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_tank public.aquarium_tanks; v_name text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_tank from public.aquarium_tanks where id=p_tank_id and user_id=v_uid for update;
 if not found then raise exception 'TANK_NOT_FOUND'; end if;
 if p_action='rename' then
  v_name:=btrim(p_value);
  if v_name is null or char_length(v_name) not between 1 and 20 or v_name ~ '[[:cntrl:]]' then raise exception 'INVALID_TANK_NAME'; end if;
  update public.aquarium_tanks set name=v_name where id=p_tank_id;
 elsif p_action='equip' then
  if p_value is null or not exists(select 1 from public.aquarium_backgrounds where id=p_value) then raise exception 'INVALID_ITEM'; end if;
  if p_value<>'default' and not exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_value) then raise exception 'BACKGROUND_NOT_OWNED'; end if;
  update public.aquarium_tanks set background_id=p_value where id=p_tank_id;
  if v_tank.is_default then update public.player_aquariums set background_id=p_value where user_id=v_uid; end if;
 else raise exception 'INVALID_TRADE';
 end if;
 return app_private.aquarium_state();
end $$;
create function public.buy_aquarium_tank(p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.buy_aquarium_tank(p_operation_id)$$;
create function public.manage_aquarium_tank(p_tank_id uuid,p_action text,p_value text) returns jsonb language sql security invoker set search_path='' as $$select app_private.manage_aquarium_tank(p_tank_id,p_action,p_value)$$;
revoke all on function app_private.buy_aquarium_tank(uuid),public.buy_aquarium_tank(uuid),app_private.manage_aquarium_tank(uuid,text,text),public.manage_aquarium_tank(uuid,text,text) from public,anon;
grant execute on function app_private.buy_aquarium_tank(uuid),public.buy_aquarium_tank(uuid),app_private.manage_aquarium_tank(uuid,text,text),public.manage_aquarium_tank(uuid,text,text) to authenticated;
-- Retire ambiguous old equip calls: all background changes must name a tank.
create or replace function public.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if p_action='equip' then raise exception 'TANK_REQUIRED'; end if;
 return app_private.aquarium_background(p_id,p_action,p_operation_id);
end $$;
create or replace function app_private.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.aquarium_backgrounds; v_wallet public.player_wallets; v_old public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_action is null or p_action not in ('buy','equip') then raise exception 'INVALID_TRADE'; end if;
 select * into v_item from public.aquarium_backgrounds where id=p_id;
 if not found then raise exception 'INVALID_ITEM'; end if;
 perform app_private.get_gold_wallet();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 if p_action='equip' then raise exception 'TANK_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 select * into v_old from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_old.action<>'buy' or v_old.item_id is distinct from ('background:'||p_id) then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet() || jsonb_build_object('delta',0);
 end if;
 if p_id='default' or exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_id) then raise exception 'BACKGROUND_ALREADY_OWNED'; end if;
 if v_wallet.gold<v_item.price then raise exception 'INSUFFICIENT_GOLD'; end if;
 update public.player_wallets set gold=gold-v_item.price,updated_at=now() where user_id=v_uid;
 insert into public.owned_aquarium_backgrounds(user_id,background_id) values(v_uid,p_id);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','background:'||p_id,-v_item.price);
 return app_private.get_gold_wallet() || jsonb_build_object('delta',-v_item.price);
end $$;

notify pgrst,'reload schema';
commit;