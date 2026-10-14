-- Apply after 08. Upload images manually to the public aquarium-backgrounds bucket.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('aquarium-backgrounds','aquarium-backgrounds',true,10485760,array['image/png','image/webp'])
on conflict(id) do nothing;
create table public.aquarium_backgrounds (
 id text primary key, name text not null, price integer not null check(price>=0), image_path text not null unique
);
insert into public.aquarium_backgrounds values
 ('default','맑은 물빛',0,'default.png'),('coral','산호 정원',100,'coral.png'),
 ('moon','달빛 바다',300,'moon.png'),('pearl','진주 동굴',500,'pearl.png');
create table public.player_aquariums (
 user_id uuid primary key references auth.users(id) on delete cascade,
 background_id text not null default 'default' references public.aquarium_backgrounds(id)
);
create table public.owned_aquarium_backgrounds (
 user_id uuid not null references auth.users(id) on delete cascade,
 background_id text not null references public.aquarium_backgrounds(id),
 purchased_at timestamptz not null default now(),primary key(user_id,background_id)
);
alter table public.aquarium_backgrounds enable row level security;
alter table public.player_aquariums enable row level security;
alter table public.owned_aquarium_backgrounds enable row level security;
revoke all on public.aquarium_backgrounds,public.player_aquariums,public.owned_aquarium_backgrounds from public,anon,authenticated;
grant select on public.aquarium_backgrounds,public.player_aquariums,public.owned_aquarium_backgrounds to authenticated;
create policy catalog_read on public.aquarium_backgrounds for select to authenticated using(true);
create policy aquarium_owner_read on public.player_aquariums for select to authenticated using(user_id=(select auth.uid()));
create policy backgrounds_owner_read on public.owned_aquarium_backgrounds for select to authenticated using(user_id=(select auth.uid()));
create function app_private.aquarium_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('background',(select background_id from public.player_aquariums where user_id=v_uid),
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;
create function app_private.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.aquarium_backgrounds; v_wallet public.player_wallets; v_old public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_action is null or p_action not in ('buy','equip') then raise exception 'INVALID_TRADE'; end if;
 select * into v_item from public.aquarium_backgrounds where id=p_id;
 if not found then raise exception 'INVALID_ITEM'; end if;
 perform app_private.get_gold_wallet();
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 if p_action='equip' then
  if p_id<>'default' and not exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_id) then raise exception 'BACKGROUND_NOT_OWNED'; end if;
  insert into public.player_aquariums(user_id,background_id) values(v_uid,p_id) on conflict(user_id) do update set background_id=excluded.background_id;
  return app_private.aquarium_state();
 end if;
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
create function public.aquarium_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.aquarium_state()$$;
create function public.aquarium_background(p_id text,p_action text,p_operation_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.aquarium_background(p_id,p_action,p_operation_id)$$;
revoke all on function app_private.aquarium_state(),public.aquarium_state(),app_private.aquarium_background(text,text,uuid),public.aquarium_background(text,text,uuid) from public,anon;
grant execute on function app_private.aquarium_state(),public.aquarium_state(),app_private.aquarium_background(text,text,uuid),public.aquarium_background(text,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;