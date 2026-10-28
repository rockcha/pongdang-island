begin;

-- Trade parcels can hold 100 exact instances; ordinary friend gifts retain their cap.
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= CASE WHEN source='exchange'::text THEN 100 ELSE 20 END)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text, 'operator-gold-20261021-supply'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = ANY (ARRAY['welcome-bait'::text, 'operator-worm-20261020'::text])) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id ~~ 'arcade-weekly:%'::text) AND (quantity = ANY (ARRAY[2000, 1500, 1000, 650, 400, 200])) AND ((species ->> 'game'::text) = ANY (ARRAY['shadow'::text, 'memory'::text, 'pongi-whack'::text])) AND (reward_id = ((('arcade-weekly:'::text || (species ->> 'game'::text)) || ':'::text) || (species ->> 'week_start'::text))) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['giseong-catch-202610:giseong-fish'::text, 'giseong-catch-202610:giseong-webfoot-octopus'::text])) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 300) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'operator-update-20261023-nyamnyam'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 1000) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (sender_id IS NULL) AND (NOT exchange_hold) AND (cardinality(collectible_ids) = 0) AND
CASE
    WHEN (reward_id ~ '^level-up:[1-9][0-9]{0,8}$'::text) THEN (((split_part(reward_id, ':'::text, 2))::bigint >= 2) AND (quantity = LEAST((1000000000)::bigint, (100 * (((split_part(reward_id, ':'::text, 2))::bigint + 9) / 10)))) AND ((species ->> 'id'::text) = reward_id))
    ELSE false
END) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'halloween-20261024-gold-500'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait_special'::text) AND ((species ->> 'id'::text) = 'aquarium-apology-20261025'::text) AND (quantity = 2) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold))));

CREATE OR REPLACE FUNCTION app_private.flea_post(p_side text, p_title text, p_items jsonb, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();request jsonb;old app_private.flea_receipts;part jsonb;asset jsonb;assets jsonb:='[]';keys text[]:='{}';k text;
 total bigint:=0;collectibles integer:=0;parcel uuid;post_id uuid;result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_side is null or p_side not in ('sell','buy') or p_title is null or char_length(btrim(p_title)) not between 1 and 80
 or p_title ~ '[[:cntrl:]]' or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_FLEA';end if;
 if jsonb_array_length(p_items) not between 1 and 5 then raise exception 'FLEA_ITEM_LIMIT';end if;
 request:=jsonb_build_object('action','post','side',p_side,'title',btrim(p_title),'items',p_items);
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=u for update;
 select * into old from app_private.flea_receipts where user_id=u and operation_id=p_operation_id;
 if found then if old.request<>request then raise exception 'OPERATION_CONFLICT';end if;return old.result;end if;
 if(select count(*) from app_private.flea_posts where owner_id=u and status='active')>=5 then raise exception 'FLEA_POST_LIMIT';end if;
 for part in select value from jsonb_array_elements(p_items) order by value->>'kind',value->>'id' loop
  if jsonb_typeof(part) is distinct from 'object' or coalesce(part->>'kind','') not in ('collectible','fuel') or coalesce(part->>'quantity','') !~ '^[1-9][0-9]{0,3}$'
  or coalesce(part->>'unit_price','') !~ '^[1-9][0-9]{0,9}$' then raise exception 'INVALID_FLEA';end if;
  k:=(part->>'kind')||':'||(part->>'id');
  if k=any(keys) then raise exception 'INVALID_FLEA';end if;keys:=array_append(keys,k);
  if part->>'kind'='collectible' then
   if (part->>'quantity')::integer>100 then raise exception 'FLEA_ITEM_LIMIT';end if;
   -- Reuse catalog eligibility checks; flea quantities have their own 100-item cap.
   asset:=app_private.exchange_asset('collectible',part->>'id',1)||jsonb_build_object('quantity',(part->>'quantity')::integer);
  else
   asset:=app_private.exchange_asset(part->>'kind',part->>'id',(part->>'quantity')::integer);
  end if;
  if (part->>'unit_price')::bigint>1000000000 then raise exception 'INVALID_FLEA';end if;
  total:=total+(part->>'quantity')::integer*(part->>'unit_price')::bigint;
  if total>1000000000 then raise exception 'INVALID_FLEA';end if;
  if part->>'kind'='collectible' then collectibles:=collectibles+(part->>'quantity')::integer;end if;
  assets:=assets||jsonb_build_array(jsonb_build_object('asset',asset,'price',(part->>'unit_price')::integer));
 end loop;
 if collectibles>100 then raise exception 'FLEA_ITEM_LIMIT';end if;
 insert into app_private.flea_posts(owner_id,side,title,escrow_gold) values(u,p_side,btrim(p_title),case when p_side='buy' then total else 0 end) returning id into post_id;
 if p_side='buy' then perform app_private.flea_gold(u,-total::integer,post_id);end if;
 for part in select value from jsonb_array_elements(assets) loop
  asset:=part->'asset';parcel:=null;
  if p_side='sell' then parcel:=app_private.exchange_reserve(u,asset);end if;
  insert into app_private.flea_lines(post_id,kind,item_id,asset,quantity,remaining,unit_price,escrow_gift_id)
  values(post_id,asset->>'kind',asset->>'id',asset||jsonb_build_object('quantity',1),(asset->>'quantity')::integer,(asset->>'quantity')::integer,(part->>'price')::integer,parcel);
 end loop;
 result:=app_private.flea_post_payload(post_id);
 insert into app_private.flea_receipts(user_id,operation_id,request,result) values(u,p_operation_id,request,result);
 return result;
end $function$
;

commit;
