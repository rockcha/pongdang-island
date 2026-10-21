begin;

-- Additional escrow parcels belong to one listing and settle atomically.
create table app_private.exchange_bundle_gifts(
 listing_id uuid not null references public.exchange_listings(id) on delete cascade,
 gift_id uuid not null references public.collectible_gifts(id),
 primary key(listing_id,gift_id),unique(gift_id)
);
alter table app_private.exchange_bundle_gifts enable row level security;
revoke all on app_private.exchange_bundle_gifts from public,anon,authenticated;

create function app_private.exchange_post_bundle(p_items jsonb,p_price integer,p_operation_id uuid,p_title text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();part jsonb;asset jsonb;assets jsonb:='[]';v_offer jsonb;v_wanted jsonb;
 l public.exchange_listings;gifts uuid[]:='{}';v_title text;keys text[]:='{}';key text;collectibles integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_EXCHANGE';end if;
 if jsonb_array_length(p_items) not between 1 and 10 then raise exception 'EXCHANGE_BUNDLE_LIMIT';end if;
 for part in select value from jsonb_array_elements(p_items) order by value->>'kind',value->>'id' loop
  if jsonb_typeof(part) is distinct from 'object' or coalesce(part->>'kind','') not in ('collectible','bait','fuel')
   or coalesce(part->>'id','')='' or coalesce(part->>'quantity','') !~ '^[1-9][0-9]{0,3}$' then raise exception 'INVALID_EXCHANGE_ASSET';end if;
  key:=(part->>'kind')||':'||(part->>'id');
  if key=any(keys) then raise exception 'INVALID_EXCHANGE_ASSET';end if;
  keys:=array_append(keys,key);
  asset:=app_private.exchange_asset(part->>'kind',part->>'id',(part->>'quantity')::integer);
  if asset->>'kind'='collectible' then collectibles:=collectibles+(asset->>'quantity')::integer;end if;
  assets:=assets||jsonb_build_array(asset);
 end loop;
 if collectibles>20 then raise exception 'EXCHANGE_BUNDLE_LIMIT';end if;
 v_wanted:=app_private.exchange_asset('gold','gold',p_price);
 -- Keep the legacy first-item shape for old clients; items is authoritative for bundles.
 v_offer:=assets->0;
 if jsonb_array_length(assets)>1 then
  v_offer:=v_offer||jsonb_build_object('items',assets,'name',(select string_agg(value->>'name',' + ') from jsonb_array_elements(assets)),
   'quantity',(select sum((value->>'quantity')::integer) from jsonb_array_elements(assets)));
 end if;
 v_title:=coalesce(nullif(btrim(p_title),''),case when jsonb_array_length(assets)>1 then '묶음 판매합니다' else (v_offer->>'name')||' 판매합니다' end);
 if char_length(v_title)>80 or v_title ~ '[[:cntrl:]]' then raise exception 'INVALID_EXCHANGE_TITLE';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=u for update;
 select * into l from public.exchange_listings where owner_id=u and operation_id=p_operation_id;
 if found then
  if l.side<>'sell' or l.offer<>v_offer or l.wanted<>v_wanted or l.title<>v_title then raise exception 'OPERATION_CONFLICT';end if;
  return to_jsonb(l);
 end if;
 if (select count(*) from public.exchange_listings where owner_id=u and status='active')>=10 then raise exception 'EXCHANGE_LISTING_LIMIT';end if;
 -- A failure on any item rolls back every earlier reservation in this call.
 for asset in select value from jsonb_array_elements(assets) loop
  gifts:=array_append(gifts,app_private.exchange_reserve(u,asset));
 end loop;
 insert into public.exchange_listings(owner_id,owner_name,side,operation_id,offer,wanted,escrow_gift_id,title)
 values(u,(select nickname from public.player_profiles where id=u),'sell',p_operation_id,v_offer,v_wanted,gifts[1],v_title) returning * into l;
 if cardinality(gifts)>1 then
  insert into app_private.exchange_bundle_gifts(listing_id,gift_id) select l.id,unnest(gifts);
 end if;
 return to_jsonb(l);
end $$;

create function public.exchange_post_bundle(p_items jsonb,p_price integer,p_operation_id uuid,p_title text default null)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.exchange_post_bundle(p_items,p_price,p_operation_id,p_title);
$$;
revoke all on function app_private.exchange_post_bundle(jsonb,integer,uuid,text) from public,anon;
revoke all on function public.exchange_post_bundle(jsonb,integer,uuid,text) from public,anon;
grant execute on function app_private.exchange_post_bundle(jsonb,integer,uuid,text) to authenticated,service_role;
grant execute on function public.exchange_post_bundle(jsonb,integer,uuid,text) to authenticated,service_role;

create or replace function app_private.exchange_action(p_listing_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();l public.exchange_listings;owner uuid;payment uuid;parcel uuid;parcels uuid[];
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in ('accept','cancel') then raise exception 'INVALID_EXCHANGE';end if;
 select owner_id into owner from public.exchange_listings where id=p_listing_id;
 if owner is null then raise exception 'EXCHANGE_NOT_FOUND';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id in(u,owner) order by user_id for update;
 select * into l from public.exchange_listings where id=p_listing_id for update;
 select array_agg(gift_id order by gift_id) into parcels from app_private.exchange_bundle_gifts where listing_id=l.id;
 parcels:=coalesce(parcels,array[l.escrow_gift_id]);
 if p_action='cancel' then
  if l.owner_id<>u then raise exception 'EXCHANGE_FORBIDDEN';end if;
  if l.status='cancelled' then return to_jsonb(l);end if;
  if l.status<>'active' then raise exception 'EXCHANGE_UNAVAILABLE';end if;
  update public.exchange_listings set status='cancelled',closed_at=now() where id=l.id returning * into l;
  foreach parcel in array parcels loop
   perform app_private.exchange_deliver(parcel,u,'거래를 취소하여 맡긴 물품을 돌려보냈어요.');
  end loop;
 else
  if l.owner_id=u then raise exception 'EXCHANGE_SELF_TRADE';end if;
  if l.status='completed' and l.taker_id=u then return to_jsonb(l);end if;
  if l.status<>'active' then raise exception 'EXCHANGE_UNAVAILABLE';end if;
  if l.side<>'sell' or l.offer->>'kind' not in ('collectible','bait','fuel') or l.wanted->>'kind'<>'gold' then raise exception 'EXCHANGE_UNAVAILABLE';end if;
  payment:=app_private.exchange_reserve(u,l.wanted);
  update public.exchange_listings set status='completed',taker_id=u,closed_at=now() where id=l.id returning * into l;
  foreach parcel in array parcels loop
   perform app_private.exchange_deliver(parcel,u,'구매한 묶음 물품을 선물함에서 받아주세요.');
  end loop;
  perform app_private.exchange_deliver(payment,l.owner_id,'판매가 성사되어 판매 대금을 보냈어요.');
  update public.notifications set title='판매가 성사됐어요' where gift_id=payment and kind='gift_received';
  update public.notifications set title='구매가 완료됐어요',body='구매한 물품을 선물함에서 받아주세요.' where gift_id=any(parcels) and kind='gift_received';
 end if;
 return to_jsonb(l);
end $$;
notify pgrst,'reload schema';
commit;
