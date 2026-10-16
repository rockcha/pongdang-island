begin;
create table public.auction_listings(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references public.player_profiles(id) on delete set null,
 owner_name text not null,operation_id uuid not null,
 title text not null check(char_length(title) between 2 and 60),
 description text not null default '' check(char_length(description)<=1000),
 offer jsonb not null,escrow_gift_id uuid not null unique references public.collectible_gifts(id),
 minimum_price integer not null check(minimum_price between 1 and 1000000000),
 duration_days integer not null check(duration_days in(1,3,7)),
 highest_amount integer not null default 0 check(highest_amount between 0 and 1000000000),
 highest_bidder uuid references public.player_profiles(id) on delete set null,
 highest_gift_id uuid unique references public.collectible_gifts(id),
 status text not null default 'active' check(status in('active','sold','unsold','cancelled')),
 created_at timestamptz not null default clock_timestamp(),ends_at timestamptz not null,closed_at timestamptz,
 unique(owner_id,operation_id),check((highest_amount=0)=(highest_gift_id is null)),
 check(highest_amount=0 or highest_amount>=minimum_price),check(highest_bidder is null or highest_bidder<>owner_id)
);
create index auction_due on public.auction_listings(ends_at,id) where status='active';
create index auction_owner on public.auction_listings(owner_id,created_at desc,id);
create table public.auction_bids(
 id uuid primary key default gen_random_uuid(),auction_id uuid not null references public.auction_listings(id) on delete cascade,
 bidder_id uuid references public.player_profiles(id) on delete set null,
 operation_id uuid not null,amount integer not null check(amount between 1 and 1000000000),
 created_at timestamptz not null default clock_timestamp(),unique(bidder_id,operation_id)
);
create index auction_bidder on public.auction_bids(bidder_id,auction_id);
alter table public.auction_listings enable row level security;
alter table public.auction_bids enable row level security;
revoke all on public.auction_listings,public.auction_bids from public,anon,authenticated;
grant select on public.auction_listings,public.auction_bids to authenticated;
create policy auction_read on public.auction_listings for select to authenticated using(true);
create policy auction_bid_read on public.auction_bids for select to authenticated using(bidder_id=(select auth.uid()));

-- No wallet is touched at settlement: all money and goods are already reserved.
create function app_private.auction_settle(p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare a public.auction_listings;
begin
 select * into a from public.auction_listings where id=p_id for update;
 if not found or a.status<>'active' or a.ends_at>clock_timestamp() then return;end if;
 if a.owner_id is not null and a.highest_bidder is not null then
  update public.auction_listings set status='sold',closed_at=clock_timestamp() where id=a.id;
  perform app_private.exchange_deliver(a.escrow_gift_id,a.highest_bidder,'경매에 낙찰된 물품을 보냈어요.');
  perform app_private.exchange_deliver(a.highest_gift_id,a.owner_id,'경매가 마감되어 낙찰 대금을 보냈어요.');
  update public.notifications set title='경매에 낙찰됐어요' where gift_id=a.escrow_gift_id and kind='gift_received';
  update public.notifications set title='경매 판매가 완료됐어요' where gift_id=a.highest_gift_id and kind='gift_received';
 else
  update public.auction_listings set status='unsold',closed_at=clock_timestamp() where id=a.id;
  if a.owner_id is not null then
   perform app_private.exchange_deliver(a.escrow_gift_id,a.owner_id,'낙찰자 없이 경매가 끝나 맡긴 물품을 돌려보냈어요.');
   update public.notifications set title='경매 물품이 반환됐어요' where gift_id=a.escrow_gift_id and kind='gift_received';
  end if;
  if a.highest_bidder is not null and a.highest_gift_id is not null then
   perform app_private.exchange_deliver(a.highest_gift_id,a.highest_bidder,'판매자 계정이 없어 입찰금을 전액 돌려보냈어요.');
   update public.notifications set title='경매 입찰금이 반환됐어요' where gift_id=a.highest_gift_id and kind='gift_received';
  end if;
 end if;
end $$;

create function app_private.auction_settle_due() returns integer
language plpgsql security definer set search_path='' as $$
declare r record;n integer:=0;
begin
 for r in select id from public.auction_listings where status='active' and ends_at<=clock_timestamp()
  order by ends_at,id limit 100 for update skip locked loop
  perform app_private.auction_settle(r.id);n:=n+1;
 end loop;
 return n;
end $$;

create function app_private.auction_post(p_kind text,p_item_id text,p_quantity integer,p_title text,p_description text,p_minimum_price integer,p_days integer,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_offer jsonb;a public.auction_listings;v_gift uuid;
 v_title text:=btrim(p_title);v_description text:=btrim(coalesce(p_description,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_kind is null or p_kind not in('collectible','bait') or v_title is null or char_length(v_title) not between 2 and 60
 or char_length(v_description)>1000 or p_minimum_price is null or p_minimum_price not between 1 and 1000000000 or p_days is null or p_days not in(1,3,7) then raise exception 'INVALID_AUCTION';end if;
 v_offer:=app_private.exchange_asset(p_kind,p_item_id,p_quantity);
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 select * into a from public.auction_listings where owner_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.offer<>v_offer or a.title<>v_title or a.description<>v_description or a.minimum_price<>p_minimum_price or a.duration_days<>p_days then raise exception 'OPERATION_CONFLICT';end if;
  return to_jsonb(a);
 end if;
 if(select count(*) from public.auction_listings where owner_id=v_uid and status='active')>=10 then raise exception 'AUCTION_LIMIT';end if;
 v_gift:=app_private.exchange_reserve(v_uid,v_offer);
 insert into public.auction_listings(owner_id,owner_name,operation_id,title,description,offer,escrow_gift_id,minimum_price,duration_days,ends_at)
 values(v_uid,(select nickname from public.player_profiles where id=v_uid),p_operation_id,v_title,v_description,v_offer,v_gift,p_minimum_price,p_days,clock_timestamp()+make_interval(days=>p_days)) returning * into a;
 return to_jsonb(a);
end $$;

create function app_private.auction_bid(p_id uuid,p_amount integer,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();a public.auction_listings;b public.auction_bids;v_gift uuid;v_delta integer;v_asset jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_amount is null or p_amount not between 1 and 1000000000 then raise exception 'INVALID_AUCTION_BID';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 select * into b from public.auction_bids where bidder_id=v_uid and operation_id=p_operation_id;
 if found then
  if b.auction_id<>p_id or b.amount<>p_amount then raise exception 'OPERATION_CONFLICT';end if;
  return (select to_jsonb(q) from public.auction_listings q where id=p_id);
 end if;
 select * into a from public.auction_listings where id=p_id for update;
 if not found then raise exception 'AUCTION_NOT_FOUND';end if;
 if a.status<>'active' or a.ends_at<=clock_timestamp() then raise exception 'AUCTION_ENDED';end if;
 if a.owner_id is null then raise exception 'AUCTION_UNAVAILABLE';end if;
 if a.owner_id=v_uid then raise exception 'AUCTION_SELF_BID';end if;
 if p_amount<a.minimum_price or p_amount<=a.highest_amount then raise exception 'AUCTION_BID_TOO_LOW';end if;
 if a.highest_bidder=v_uid then
  v_delta:=p_amount-a.highest_amount;
  update public.player_wallets set gold=gold-v_delta,updated_at=now() where user_id=v_uid and gold>=v_delta;
  if not found then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.collectible_gifts set quantity=p_amount,species=jsonb_set(species,'{quantity}',to_jsonb(p_amount))
   where id=a.highest_gift_id and exchange_hold;
  if not found then raise exception 'AUCTION_UNAVAILABLE';end if;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','auction:raise:'||a.id,-v_delta);
  v_gift:=a.highest_gift_id;
 else
  v_asset:=app_private.exchange_asset('gold','gold',p_amount);
  v_gift:=app_private.exchange_reserve(v_uid,v_asset);
  if a.highest_bidder is not null then
   perform app_private.exchange_deliver(a.highest_gift_id,a.highest_bidder,'더 높은 입찰이 들어와 입찰금 전액을 돌려보냈어요.');
   update public.notifications set title='입찰금이 반환됐어요' where gift_id=a.highest_gift_id and kind='gift_received';
  end if;
 end if;
 update public.auction_listings set highest_amount=p_amount,highest_bidder=v_uid,highest_gift_id=v_gift where id=a.id returning * into a;
 insert into public.auction_bids(auction_id,bidder_id,operation_id,amount) values(a.id,v_uid,p_operation_id,p_amount);
 return to_jsonb(a);
end $$;

create function app_private.auction_cancel(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();a public.auction_listings;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into a from public.auction_listings where id=p_id for update;
 if not found then raise exception 'AUCTION_NOT_FOUND';end if;
 if a.owner_id is distinct from v_uid then raise exception 'AUCTION_FORBIDDEN';end if;
 if a.status='cancelled' then return to_jsonb(a);end if;
 if a.status<>'active' or a.ends_at<=clock_timestamp() then raise exception 'AUCTION_ENDED';end if;
 if a.highest_amount>0 then raise exception 'AUCTION_HAS_BIDS';end if;
 update public.auction_listings set status='cancelled',closed_at=clock_timestamp() where id=a.id returning * into a;
 perform app_private.exchange_deliver(a.escrow_gift_id,v_uid,'경매를 취소하여 맡긴 물품을 돌려보냈어요.');
 return to_jsonb(a);
end $$;

create function app_private.auction_state(p_tab text default 'all',p_query text default '',p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_total integer;v_items jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in('all','mine','bids') or p_query is null or char_length(p_query)>80 or p_offset is null or p_offset<0 then raise exception 'INVALID_AUCTION';end if;
 perform app_private.auction_settle_due();
 select count(*) into v_total from public.auction_listings a where
 (case p_tab when 'mine' then a.owner_id=v_uid when 'bids' then exists(select 1 from public.auction_bids b where b.auction_id=a.id and b.bidder_id=v_uid) else a.status='active' end)
 and (a.title ilike '%'||p_query||'%' or a.offer->>'name' ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]') into v_items from(
 select a.* from public.auction_listings a where
 (case p_tab when 'mine' then a.owner_id=v_uid when 'bids' then exists(select 1 from public.auction_bids b where b.auction_id=a.id and b.bidder_id=v_uid) else a.status='active' end)
 and (a.title ilike '%'||p_query||'%' or a.offer->>'name' ilike '%'||p_query||'%')
 order by a.created_at desc,a.id limit 20 offset p_offset)q;
 return jsonb_build_object('items',v_items,'total',v_total,'serverNow',clock_timestamp());
end $$;

create function public.auction_state(p_tab text default 'all',p_query text default '',p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select app_private.auction_state(p_tab,p_query,p_offset)$$;
create function public.auction_post(p_kind text,p_item_id text,p_quantity integer,p_title text,p_description text,p_minimum_price integer,p_days integer,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.auction_post(p_kind,p_item_id,p_quantity,p_title,p_description,p_minimum_price,p_days,p_operation_id)$$;
create function public.auction_bid(p_id uuid,p_amount integer,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.auction_bid(p_id,p_amount,p_operation_id)$$;
create function public.auction_cancel(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.auction_cancel(p_id)$$;
revoke all on function app_private.auction_settle(uuid),app_private.auction_settle_due() from public,anon,authenticated;
revoke all on function public.auction_state(text,text,integer),app_private.auction_state(text,text,integer),public.auction_post(text,text,integer,text,text,integer,integer,uuid),app_private.auction_post(text,text,integer,text,text,integer,integer,uuid),public.auction_bid(uuid,integer,uuid),app_private.auction_bid(uuid,integer,uuid),public.auction_cancel(uuid),app_private.auction_cancel(uuid) from public,anon;
grant execute on function public.auction_state(text,text,integer),app_private.auction_state(text,text,integer),public.auction_post(text,text,integer,text,text,integer,integer,uuid),app_private.auction_post(text,text,integer,text,text,integer,integer,uuid),public.auction_bid(uuid,integer,uuid),app_private.auction_bid(uuid,integer,uuid),public.auction_cancel(uuid),app_private.auction_cancel(uuid) to authenticated;

-- Supabase Cron settles auctions every minute, even when nobody opens the app.
-- PGlite does not provide pg_cron; state reads still run the same settlement.
do $$begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  execute 'create extension if not exists pg_cron';
  execute $job$select cron.schedule('pongdang-auction-settlement','* * * * *','select app_private.auction_settle_due();')$job$;
 else
  raise notice 'pg_cron unavailable: enable Supabase Cron and schedule app_private.auction_settle_due() every minute before deploying.';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
