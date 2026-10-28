begin;
CREATE OR REPLACE FUNCTION app_private.exchange_asset(p_kind text, p_id text, p_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_name text;v_path text;v_subtype text;
begin
 if p_quantity is null or p_quantity<1 then raise exception 'INVALID_EXCHANGE_ASSET';end if;
 if p_kind='gold' and p_id='gold' and p_quantity<=1000000000 then
  return jsonb_build_object('kind','gold','id','gold','quantity',p_quantity,'name','골드','thumbnail_path',null);
 elsif p_kind='fuel' and p_id='fuel' and p_quantity<=9999 then
  return jsonb_build_object('kind','fuel','id','fuel','quantity',p_quantity,'name','기름','thumbnail_path','/app-icons/fuel.png');
 elsif p_kind='bait' and p_quantity<=9999 then
  raise exception 'EXCHANGE_BAIT_DISABLED';
 elsif p_kind='collectible' and p_quantity<=20 then
  select name,thumbnail_path,kind::text into v_name,v_path,v_subtype from public.collectible_species
   where id=p_id and kind in ('fish','trash','decoration') and id not like 'test-%';
 else raise exception 'INVALID_EXCHANGE_ASSET';end if;
 if v_name is null then raise exception 'INVALID_EXCHANGE_ASSET';end if;
 return jsonb_build_object('kind',p_kind,'id',p_id,'quantity',p_quantity,'name',v_name,'thumbnail_path',v_path,'subtype',v_subtype);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.exchange_inventory()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 return jsonb_build_object('gold',(select gold from public.player_wallets where user_id=v_uid),
 'assets',coalesce((select jsonb_agg(app_private.exchange_asset('collectible',s.id,1)||jsonb_build_object('available',(
  select count(*) from public.player_collectibles c where c.user_id=v_uid and c.species_id=s.id and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null
 ))) from public.collectible_species s where s.kind in ('fish','trash','decoration') and s.id not like 'test-%'),'[]'::jsonb)||
jsonb_build_array(app_private.exchange_asset('fuel','fuel',1)||jsonb_build_object('available',(select coalesce((inventory->>'fuel')::integer,0) from public.player_wallets where user_id=v_uid))));
end $function$
;
create function app_private.exchange_has_bait(p_asset jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_asset->>'kind'='bait',false) or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(p_asset->'items')='array' then p_asset->'items' else '[]'::jsonb end) x where x->>'kind'='bait')
$$;
-- Return the whole outstanding bundle, including non-bait lines, rather than strand any escrow.
do $$
declare l public.exchange_listings;parcel uuid;parcels uuid[];
begin
 perform 1 from public.player_wallets where user_id in(select owner_id from public.exchange_listings where status='active' and (app_private.exchange_has_bait(offer) or app_private.exchange_has_bait(wanted))) order by user_id for update;
 for l in select * from public.exchange_listings where status='active' and (app_private.exchange_has_bait(offer) or app_private.exchange_has_bait(wanted)) order by id for update loop
  select array_agg(gift_id order by gift_id) into parcels from app_private.exchange_bundle_gifts where listing_id=l.id;
  parcels:=coalesce(parcels,array[l.escrow_gift_id]);
  update public.exchange_listings set status='cancelled',closed_at=now() where id=l.id;
  foreach parcel in array parcels loop
   perform app_private.exchange_deliver(parcel,l.owner_id,'미끼 거래 종료로 맡긴 물품과 대금을 돌려보냈어요. 우편함에서 받아주세요.');
  end loop;
 end loop;
end $$;
create function app_private.block_exchange_bait() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status in ('active','completed') and (app_private.exchange_has_bait(new.offer) or app_private.exchange_has_bait(new.wanted)) then raise exception 'EXCHANGE_BAIT_DISABLED';end if;
 return new;
end $$;
create trigger block_exchange_bait before insert or update of status,offer,wanted on public.exchange_listings for each row execute function app_private.block_exchange_bait();
revoke all on function app_private.exchange_has_bait(jsonb),app_private.block_exchange_bait() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
