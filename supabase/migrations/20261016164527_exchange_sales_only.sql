-- Sales only: inventory or bait for gold. Preserve history and return retired offers.
begin;
lock table public.exchange_listings in share row exclusive mode;
do $$declare l public.exchange_listings;begin
 for l in select * from public.exchange_listings where status='active' and
 (side<>'sell' or offer->>'kind' not in ('collectible','bait') or wanted->>'kind'<>'gold' or wanted->>'id'<>'gold') for update loop
  update public.exchange_listings set status='cancelled',closed_at=now() where id=l.id;
  perform app_private.exchange_deliver(l.escrow_gift_id,l.owner_id,'판매 전용 거래소로 변경되어 맡긴 물품을 돌려보냈어요.');
 end loop;
end $$;
alter table public.exchange_listings add constraint exchange_active_sale_only check(
 status<>'active' or (side='sell' and offer->>'kind' in ('collectible','bait') and wanted->>'kind'='gold' and wanted->>'id'='gold'));
create or replace function app_private.exchange_post(p_side text,p_offer_kind text,p_offer_id text,p_offer_quantity integer,p_wanted_kind text,p_wanted_id text,p_wanted_quantity integer,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_offer jsonb;v_wanted jsonb;l public.exchange_listings;v_gift uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_side is null or p_side<>'sell' or p_operation_id is null then raise exception 'INVALID_EXCHANGE';end if;
 v_offer:=app_private.exchange_asset(p_offer_kind,p_offer_id,p_offer_quantity);
 v_wanted:=app_private.exchange_asset(p_wanted_kind,p_wanted_id,p_wanted_quantity);
 if p_offer_kind not in ('collectible','bait') or p_wanted_kind<>'gold' or p_wanted_id<>'gold' then raise exception 'INVALID_EXCHANGE';end if;
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
create or replace function app_private.exchange_state(p_tab text default 'all',p_query text default '',p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_rows jsonb;v_total integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in ('all','mine') or p_query is null or char_length(p_query)>80 or p_offset is null or p_offset<0 then raise exception 'INVALID_EXCHANGE';end if;
 select count(*) into v_total from public.exchange_listings l
 where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
 and l.side='sell' and l.offer->>'kind' in ('collectible','bait') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]') into v_rows from(
  select l.* from public.exchange_listings l
  where (case when p_tab='mine' then l.owner_id=v_uid else l.status='active' and l.side='sell' end)
  and l.side='sell' and l.offer->>'kind' in ('collectible','bait') and l.wanted->>'kind'='gold' and l.wanted->>'id'='gold'
 and (l.offer->>'name' ilike '%'||p_query||'%' or l.wanted->>'name' ilike '%'||p_query||'%')
  order by created_at desc,id limit 20 offset p_offset
 ) q;
 return jsonb_build_object('items',v_rows,'total',v_total);
end $$;
create or replace function app_private.exchange_action(p_listing_id uuid,p_action text) returns jsonb
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
  if l.side<>'sell' or l.offer->>'kind' not in ('collectible','bait') or l.wanted->>'kind'<>'gold' then raise exception 'EXCHANGE_UNAVAILABLE';end if;
  v_gift:=app_private.exchange_reserve(v_uid,l.wanted);
  update public.exchange_listings set status='completed',taker_id=v_uid,closed_at=now() where id=l.id returning * into l;
  perform app_private.exchange_deliver(l.escrow_gift_id,v_uid,'교환이 완료되어 물품을 보냈어요.');
  perform app_private.exchange_deliver(v_gift,l.owner_id,'판매가 성사되어 판매 대금을 보냈어요.');
  update public.notifications set title='판매가 성사됐어요' where gift_id=v_gift and kind='gift_received';
  update public.notifications set title='구매가 완료됐어요',body='구매한 물품을 선물함에서 받아주세요.' where gift_id=l.escrow_gift_id and kind='gift_received';
 end if;
 return to_jsonb(l);
end $$;
notify pgrst,'reload schema';
commit;
