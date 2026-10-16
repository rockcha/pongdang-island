-- Escrow-backed, all-or-nothing exchange. Existing friend gifts stay compatible.
begin;
alter table public.collectible_gifts add column source text not null default 'friend' check(source in ('friend','exchange'));
alter table public.collectible_gifts add column exchange_hold boolean not null default false;
alter table public.collectible_gifts add column reward_kind text not null default 'collectible' check(reward_kind in ('gold','bait','collectible'));
alter table public.collectible_gifts add column reward_id text;
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.collectible_gifts'::regclass and contype='c'
 and (pg_get_constraintdef(oid) like '%cardinality%' or pg_get_constraintdef(oid) like '%quantity%' or pg_get_constraintdef(oid) like '%sender_id <> recipient_id%') loop
  execute format('alter table public.collectible_gifts drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.collectible_gifts add constraint gift_asset_shape check(
 (reward_kind='collectible' and quantity between 1 and 20 and cardinality(collectible_ids)=quantity)
 or (source='exchange' and reward_kind='gold' and quantity between 1 and 1000000000 and cardinality(collectible_ids)=0)
 or (source='exchange' and reward_kind='bait' and quantity between 1 and 9999 and cardinality(collectible_ids)=0 and reward_id is not null));
alter table public.collectible_gifts add constraint gift_sender_shape check(source='exchange' or sender_id is null or recipient_id is null or sender_id<>recipient_id);
alter table public.collectible_gifts add constraint gift_hold_shape check(not exchange_hold or (source='exchange' and status='pending'));
drop policy gifts_participant_read on public.collectible_gifts;
create policy gifts_participant_read on public.collectible_gifts for select to authenticated
 using(not exchange_hold and (sender_id=(select auth.uid()) or recipient_id=(select auth.uid())));

create table public.exchange_listings(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.player_profiles(id) on delete cascade,
 owner_name text not null,side text not null check(side in ('buy','sell')),
 operation_id uuid not null,offer jsonb not null,wanted jsonb not null,
 escrow_gift_id uuid not null unique references public.collectible_gifts(id),
 status text not null default 'active' check(status in ('active','completed','cancelled')),
 taker_id uuid references public.player_profiles(id) on delete set null,
 created_at timestamptz not null default now(),closed_at timestamptz,
 unique(owner_id,operation_id),check(taker_id is null or taker_id<>owner_id)
);
create index exchange_active_feed on public.exchange_listings(created_at desc,id) where status='active';
create index exchange_owner_feed on public.exchange_listings(owner_id,created_at desc,id);
create index exchange_taker on public.exchange_listings(taker_id) where taker_id is not null;
alter table public.exchange_listings enable row level security;
revoke all on public.exchange_listings from public,anon,authenticated;
grant select on public.exchange_listings to authenticated;
create policy exchange_read on public.exchange_listings for select to authenticated
 using(status='active' or owner_id=(select auth.uid()) or taker_id=(select auth.uid()));

-- Internal helpers are never callable by browser roles.
create function app_private.exchange_asset(p_kind text,p_id text,p_quantity integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_name text;v_path text;v_subtype text;
begin
 if p_quantity is null or p_quantity<1 then raise exception 'INVALID_EXCHANGE_ASSET';end if;
 if p_kind='gold' and p_id='gold' and p_quantity<=1000000000 then
  return jsonb_build_object('kind','gold','id','gold','quantity',p_quantity,'name','골드','thumbnail_path',null);
 elsif p_kind='bait' and p_quantity<=9999 then
  select name,image_path into v_name,v_path from public.fishing_baits where id=p_id;
 elsif p_kind='collectible' and p_quantity<=20 then
  select name,thumbnail_path,kind::text into v_name,v_path,v_subtype from public.collectible_species
   where id=p_id and kind in ('fish','trash','decoration') and id not like 'test-%';
 else raise exception 'INVALID_EXCHANGE_ASSET';end if;
 if v_name is null then raise exception 'INVALID_EXCHANGE_ASSET';end if;
 return jsonb_build_object('kind',p_kind,'id',p_id,'quantity',p_quantity,'name',v_name,'thumbnail_path',v_path,'subtype',v_subtype);
end $$;

create function app_private.exchange_reserve(p_owner uuid,p_asset jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_kind text:=p_asset->>'kind';v_item text:=p_asset->>'id';v_qty integer:=(p_asset->>'quantity')::integer;
 v_ids uuid[]:='{}';v_gift uuid;v_name text;v_count integer;v_operation uuid:=gen_random_uuid();v_species jsonb;
begin
 select nickname into v_name from public.player_profiles where id=p_owner;
 if v_name is null then raise exception 'PROFILE_REQUIRED';end if;
 if v_kind='collectible' then
  select array_agg(id order by id) into v_ids from (
   select id from public.player_collectibles where user_id=p_owner and species_id=v_item
    and sold_at is null and escrow_gift_id is null and tank_id is null
   order by id limit v_qty for update
  ) q;
  if coalesce(cardinality(v_ids),0)<>v_qty then raise exception 'EXCHANGE_INSUFFICIENT_ITEMS';end if;
  v_species:=app_private.species_payload(v_item);
 elsif v_kind='gold' then
  update public.player_wallets set gold=gold-v_qty,updated_at=now() where user_id=p_owner and gold>=v_qty;
  if not found then raise exception 'INSUFFICIENT_GOLD';end if;
  v_species:=p_asset;
 elsif v_kind='bait' then
  select coalesce((inventory->>v_item)::integer,0) into v_count from public.player_wallets where user_id=p_owner;
  if coalesce(v_count,0)<v_qty then raise exception 'EXCHANGE_INSUFFICIENT_ITEMS';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,array[v_item],to_jsonb(v_count-v_qty)),updated_at=now() where user_id=p_owner;
  v_species:=p_asset;
 else raise exception 'INVALID_EXCHANGE_ASSET';end if;
 insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,operation_id,collectible_ids,species,quantity,message,source,exchange_hold,reward_kind,reward_id)
 values(p_owner,p_owner,v_name,v_name,v_operation,v_ids,v_species,v_qty,'거래소에서 맡긴 물품이에요.','exchange',true,v_kind,v_item) returning id into v_gift;
 if v_kind='collectible' then
  update public.player_collectibles set escrow_gift_id=v_gift,position_x=null,position_y=null where id=any(v_ids);
 elsif v_kind='gold' then
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(p_owner,v_operation,'buy','exchange:reserve:'||v_gift,-v_qty);
 end if;
 return v_gift;
end $$;

create function app_private.exchange_deliver(p_gift uuid,p_recipient uuid,p_message text) returns void
language plpgsql security invoker set search_path='' as $$
declare g public.collectible_gifts;v_name text;
begin
 select nickname into v_name from public.player_profiles where id=p_recipient;
 if v_name is null then raise exception 'PROFILE_REQUIRED';end if;
 update public.collectible_gifts set recipient_id=p_recipient,recipient_name=v_name,exchange_hold=false,message=p_message
 where id=p_gift and exchange_hold and source='exchange' returning * into g;
 if not found then raise exception 'EXCHANGE_UNAVAILABLE';end if;
 update public.player_collectibles set user_id=p_recipient,tank_id=null where escrow_gift_id=p_gift;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id)
 values(p_recipient,g.sender_id,'gift','gift_received','거래소 물품이 도착했어요',p_message,g.id) on conflict do nothing;
end $$;

create function app_private.exchange_state(p_tab text default 'all',p_query text default '',p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_rows jsonb;v_total integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in ('all','buy','sell','mine') or p_query is null or char_length(p_query)>80 or p_offset is null or p_offset<0 then raise exception 'INVALID_EXCHANGE';end if;
 select count(*) into v_total from public.exchange_listings l
 where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and (p_tab='all' or l.side=p_tab) end)
 and (l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]') into v_rows from(
  select l.* from public.exchange_listings l
  where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and (p_tab='all' or l.side=p_tab) end)
  and (l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%')
  order by created_at desc,id limit 20 offset p_offset
 ) q;
 return jsonb_build_object('items',v_rows,'total',v_total);
end $$;

create function app_private.exchange_inventory() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 return jsonb_build_object('gold',(select gold from public.player_wallets where user_id=v_uid),
 'assets',coalesce((select jsonb_agg(app_private.exchange_asset('collectible',s.id,1)||jsonb_build_object('available',(
  select count(*) from public.player_collectibles c where c.user_id=v_uid and c.species_id=s.id and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null
 ))) from public.collectible_species s where s.kind in ('fish','trash','decoration') and s.id not like 'test-%'),'[]'::jsonb)||
 coalesce((select jsonb_agg(app_private.exchange_asset('bait',b.id,1)||jsonb_build_object('available',coalesce((w.inventory->>b.id)::integer,0)))
 from public.fishing_baits b cross join public.player_wallets w where w.user_id=v_uid),'[]'::jsonb));
end $$;

create function app_private.exchange_post(p_side text,p_offer_kind text,p_offer_id text,p_offer_quantity integer,p_wanted_kind text,p_wanted_id text,p_wanted_quantity integer,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_offer jsonb;v_wanted jsonb;l public.exchange_listings;v_gift uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_side is null or p_side not in ('buy','sell') or p_operation_id is null then raise exception 'INVALID_EXCHANGE';end if;
 v_offer:=app_private.exchange_asset(p_offer_kind,p_offer_id,p_offer_quantity);
 v_wanted:=app_private.exchange_asset(p_wanted_kind,p_wanted_id,p_wanted_quantity);
 if (p_side='buy' and p_wanted_kind<>'collectible') or(p_side='sell' and p_offer_kind<>'collectible') or (p_offer_kind=p_wanted_kind and p_offer_id=p_wanted_id) then raise exception 'INVALID_EXCHANGE';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 select * into l from public.exchange_listings where owner_id=v_uid and operation_id=p_operation_id;
 if found then
  if l.side<>p_side or l.offer<>v_offer or l.wanted<>v_wanted then raise exception 'OPERATION_CONFLICT';end if;
  return to_jsonb(l);
 end if;
 if (select count(*) from public.exchange_listings where owner_id=v_uid and status='active')>=10 then raise exception 'EXCHANGE_LISTING_LIMIT';end if;
 v_gift:=app_private.exchange_reserve(v_uid,v_offer);
 insert into public.exchange_listings(owner_id,owner_name,side,operation_id,offer,wanted,escrow_gift_id)
 values(v_uid,(select nickname from public.player_profiles where id=v_uid),p_side,p_operation_id,v_offer,v_wanted,v_gift) returning * into l;
 return to_jsonb(l);
end $$;

create function app_private.exchange_action(p_listing_id uuid,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();l public.exchange_listings;v_owner uuid;v_gift uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('accept','cancel') then raise exception 'INVALID_EXCHANGE';end if;
 select owner_id into v_owner from public.exchange_listings where id=p_listing_id;
 if v_owner is null then raise exception 'EXCHANGE_NOT_FOUND';end if;
 perform app_private.get_gold_wallet();
 -- Match wallet-first transactions; both participants always lock in UUID order.
 perform 1 from public.player_wallets where user_id in(v_uid,v_owner) order by user_id for update;
 select * into l from public.exchange_listings where id=p_listing_id for update;
 if p_action='cancel' then
  if l.owner_id<>v_uid then raise exception 'EXCHANGE_FORBIDDEN';end if;
  if l.status='cancelled' then return to_jsonb(l);end if;
  if l.status<>'active' then raise exception 'EXCHANGE_UNAVAILABLE';end if;
  update public.exchange_listings set status='cancelled',closed_at=now() where id=l.id returning * into l;
  perform app_private.exchange_deliver(l.escrow_gift_id,v_uid,'거래를 취소하여 맡긴 물품을 돌려보냈어요.');
 else
  if l.owner_id=v_uid then raise exception 'EXCHANGE_SELF_TRADE';end if;
  if l.status='completed' and l.taker_id=v_uid then return to_jsonb(l);end if;
  if l.status<>'active' then raise exception 'EXCHANGE_UNAVAILABLE';end if;
  v_gift:=app_private.exchange_reserve(v_uid,l.wanted);
  update public.exchange_listings set status='completed',taker_id=v_uid,closed_at=now() where id=l.id returning * into l;
  perform app_private.exchange_deliver(l.escrow_gift_id,v_uid,'교환이 완료되어 물품을 보냈어요.');
  perform app_private.exchange_deliver(v_gift,l.owner_id,'교환이 완료되어 물품을 보냈어요.');
 end if;
 return to_jsonb(l);
end $$;

create or replace function app_private.claim_collectible_gift(p_gift_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
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
 elsif g.reward_kind='bait' then
  select coalesce((inventory->>g.reward_id)::integer,0) into v_inventory from public.player_wallets where user_id=v_uid;
  if v_inventory>2147483647-g.quantity then raise exception 'INVENTORY_LIMIT';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,array[g.reward_id],to_jsonb(v_inventory+g.quantity)),updated_at=now() where user_id=v_uid;
 else
  perform app_private.aquarium_state();
  perform 1 from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id order by id for update;
  select count(*) into v_count from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id and sold_at is null;
  if v_count<>g.quantity then raise exception 'GIFT_UNAVAILABLE';end if;
  update public.player_collectibles set tank_id=null,escrow_gift_id=null where user_id=v_uid and escrow_gift_id=g.id;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,g.species->>'id') on conflict do nothing;
 end if;
 update public.collectible_gifts set status='claimed',claimed_at=now() where id=g.id returning * into g;
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=v_uid and gift_id=g.id and kind='gift_received';
 if g.sender_id is not null and g.source='friend' then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id)
  values(g.sender_id,v_uid,'gift','gift_claimed','선물을 받았어요',g.recipient_name||'님이 보낸 선물을 받았어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $$;

create or replace function app_private.gift_mailbox(p_direction text default 'received',p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_total integer;v_items jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_direction is null or p_direction not in ('received','sent') or p_offset is null or p_offset<0 then raise exception 'INVALID_GIFT';end if;
 select count(*) into v_total from public.collectible_gifts where not exchange_hold and ((p_direction='received' and recipient_id=v_uid) or(p_direction='sent' and sender_id=v_uid));
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]') into v_items from(
  select * from public.collectible_gifts where not exchange_hold and ((p_direction='received' and recipient_id=v_uid) or(p_direction='sent' and sender_id=v_uid)) order by created_at desc,id limit 30 offset p_offset
 ) q;
 return jsonb_build_object('items',v_items,'total',v_total);
end $$;
create or replace function app_private.gift_detail(p_gift_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.collectible_gifts;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into g from public.collectible_gifts where id=p_gift_id and not exchange_hold and (sender_id=v_uid or recipient_id=v_uid);
 if not found then raise exception 'GIFT_NOT_FOUND';end if;
 return to_jsonb(g);
end $$;

create function public.exchange_state(p_tab text default 'all',p_query text default '',p_offset integer default 0) returns jsonb
language sql security invoker set search_path='' as $$select app_private.exchange_state(p_tab,p_query,p_offset)$$;
create function public.exchange_inventory() returns jsonb language sql security invoker set search_path='' as $$select app_private.exchange_inventory()$$;
create function public.exchange_post(p_side text,p_offer_kind text,p_offer_id text,p_offer_quantity integer,p_wanted_kind text,p_wanted_id text,p_wanted_quantity integer,p_operation_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select app_private.exchange_post(p_side,p_offer_kind,p_offer_id,p_offer_quantity,p_wanted_kind,p_wanted_id,p_wanted_quantity,p_operation_id)$$;
create function public.exchange_action(p_listing_id uuid,p_action text) returns jsonb language sql security invoker set search_path='' as $$select app_private.exchange_action(p_listing_id,p_action)$$;
revoke all on function app_private.exchange_asset(text,text,integer),app_private.exchange_reserve(uuid,jsonb),app_private.exchange_deliver(uuid,uuid,text) from public,anon,authenticated;
revoke all on function app_private.exchange_state(text,text,integer),public.exchange_state(text,text,integer),app_private.exchange_inventory(),public.exchange_inventory(),app_private.exchange_post(text,text,text,integer,text,text,integer,uuid),public.exchange_post(text,text,text,integer,text,text,integer,uuid),app_private.exchange_action(uuid,text),public.exchange_action(uuid,text) from public,anon;
grant execute on function app_private.exchange_state(text,text,integer),public.exchange_state(text,text,integer),app_private.exchange_inventory(),public.exchange_inventory(),app_private.exchange_post(text,text,text,integer,text,text,integer,uuid),public.exchange_post(text,text,text,integer,text,text,integer,uuid),app_private.exchange_action(uuid,text),public.exchange_action(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
