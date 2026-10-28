begin;

create table app_private.flea_posts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.player_profiles(id),
 side text not null check(side in ('sell','buy')),
 title text not null check(char_length(title) between 1 and 80 and title !~ '[[:cntrl:]]'),
 status text not null default 'active' check(status in ('active','completed','cancelled')),
 escrow_gold bigint not null default 0 check(escrow_gold between 0 and 1000000000),
 created_at timestamptz not null default now(),closed_at timestamptz
);
create index flea_posts_feed on app_private.flea_posts(side,created_at desc,id) where status='active';
create index flea_posts_owner on app_private.flea_posts(owner_id,created_at desc,id);
create table app_private.flea_lines (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references app_private.flea_posts(id),
 kind text not null check(kind in ('collectible','fuel')),
 item_id text not null, asset jsonb not null,
 quantity integer not null check(quantity between 1 and 9999),
 remaining integer not null check(remaining between 0 and quantity),
 unit_price integer not null check(unit_price between 1 and 1000000000),
 escrow_gift_id uuid unique references public.collectible_gifts(id),
 unique(post_id,kind,item_id)
);
create table app_private.flea_receipts (
 user_id uuid not null references auth.users(id),operation_id uuid not null,
 request jsonb not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
alter table app_private.flea_posts enable row level security;
alter table app_private.flea_lines enable row level security;
alter table app_private.flea_receipts enable row level security;
revoke all on app_private.flea_posts,app_private.flea_lines,app_private.flea_receipts from public,anon,authenticated;

create function app_private.flea_post_payload(p_id uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'owner_id',p.owner_id,'owner_name',u.nickname,
 'side',p.side,'title',p.title,'status',p.status,'escrow_gold',p.escrow_gold,'created_at',p.created_at,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'asset',l.asset,'quantity',l.quantity,
 'remaining',l.remaining,'unit_price',l.unit_price) order by l.kind,l.item_id) from app_private.flea_lines l where l.post_id=p.id),'[]'::jsonb))
 from app_private.flea_posts p join public.player_profiles u on u.id=p.owner_id where p.id=p_id
$$;

create function app_private.flea_state(p_side text default 'sell',p_query text default '',p_kind text default 'all',p_mine boolean default false,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();v_ids uuid[];v_total bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_side is null or p_side not in ('sell','buy') or p_kind is null or p_kind not in ('all','fish','decoration','trash','fuel') or p_mine is null
 or p_offset is null or p_offset<0 or p_offset>100000 or p_query is null or char_length(p_query)>80 then raise exception 'INVALID_FLEA';end if;
 with matched as materialized (
  select p.id,p.created_at from app_private.flea_posts p
  where p.side=p_side and (case when p_mine then p.owner_id=u else p.status='active' end)
  and (btrim(p_query)='' or position(lower(btrim(p_query)) in lower(p.title))>0 or exists(
   select 1 from app_private.flea_lines l where l.post_id=p.id and position(replace(lower(btrim(p_query)),'연료','기름') in lower(l.asset->>'name'))>0))
  and (p_kind='all' or exists(select 1 from app_private.flea_lines l where l.post_id=p.id and
   (l.kind=p_kind or l.asset->>'subtype'=p_kind)))
 ) select (select count(*) from matched),(select array_agg(id order by created_at desc,id) from(select * from matched order by created_at desc,id limit 20 offset p_offset) q)
 into v_total,v_ids;
 return jsonb_build_object('items',coalesce((select jsonb_agg(app_private.flea_post_payload(id) order by ord) from unnest(v_ids) with ordinality q(id,ord)),'[]'::jsonb),'total',v_total);
end $$;

-- Split a held parcel without minting or losing any collectible instance.
create function app_private.flea_deliver(p_gift uuid,p_quantity integer,p_recipient uuid) returns void language plpgsql set search_path='' as $$
declare g public.collectible_gifts;parcel uuid;ids uuid[];
begin
 select * into g from public.collectible_gifts where id=p_gift and exchange_hold and source='exchange' for update;
 if not found or p_quantity<1 or p_quantity>g.quantity then raise exception 'FLEA_STOCK_CHANGED';end if;
 if p_quantity=g.quantity then parcel:=g.id;
 else
  ids:=case when g.reward_kind='collectible' then g.collectible_ids[1:p_quantity] else '{}'::uuid[] end;
  if g.reward_kind='collectible' and cardinality(ids)<>p_quantity then raise exception 'FLEA_STOCK_CHANGED';end if;
  insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,operation_id,collectible_ids,species,quantity,message,source,exchange_hold,reward_kind,reward_id)
  values(g.sender_id,g.recipient_id,g.sender_name,g.recipient_name,gen_random_uuid(),ids,g.species,p_quantity,'벼룩시장 거래 물품이에요.','exchange',true,g.reward_kind,g.reward_id) returning id into parcel;
  update public.collectible_gifts set quantity=quantity-p_quantity,
   collectible_ids=case when reward_kind='collectible' then collectible_ids[p_quantity+1:cardinality(collectible_ids)] else collectible_ids end where id=g.id;
  update public.player_collectibles set escrow_gift_id=parcel where id=any(ids) and escrow_gift_id=g.id;
 end if;
 perform app_private.exchange_deliver(parcel,p_recipient,'벼룩시장 물품이 도착했어요. 우편함에서 받아주세요.');
 update public.notifications set title='벼룩시장 물품이 도착했어요' where gift_id=parcel and kind='gift_received';
end $$;

create function app_private.flea_gold(p_user uuid,p_delta integer,p_post uuid) returns void language plpgsql set search_path='' as $$
begin
 if p_delta=0 then return;end if;
 update public.player_wallets set gold=(gold::bigint+p_delta)::integer,updated_at=now()
 where user_id=p_user and gold::bigint+p_delta between 0 and 2147483647;
 if not found then
  if p_delta<0 then raise exception 'INSUFFICIENT_GOLD';else raise exception 'FLEA_GOLD_LIMIT';end if;
 end if;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
 values(p_user,gen_random_uuid(),case when p_delta<0 then 'buy' else 'sell' end,'flea:'||p_post,p_delta);
end $$;

create function app_private.flea_post(p_side text,p_title text,p_items jsonb,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
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
  asset:=app_private.exchange_asset(part->>'kind',part->>'id',(part->>'quantity')::integer);
  if (part->>'unit_price')::bigint>1000000000 then raise exception 'INVALID_FLEA';end if;
  total:=total+(part->>'quantity')::integer*(part->>'unit_price')::bigint;
  if total>1000000000 then raise exception 'INVALID_FLEA';end if;
  if part->>'kind'='collectible' then collectibles:=collectibles+(part->>'quantity')::integer;end if;
  assets:=assets||jsonb_build_array(jsonb_build_object('asset',asset,'price',(part->>'unit_price')::integer));
 end loop;
 if collectibles>20 then raise exception 'FLEA_ITEM_LIMIT';end if;
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
end $$;

create function app_private.flea_trade(p_post_id uuid,p_items jsonb,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();owner uuid;p app_private.flea_posts;l app_private.flea_lines;old app_private.flea_receipts;request jsonb;result jsonb;part jsonb;qty integer;total bigint:=0;keys uuid[]:='{}';parcel uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_FLEA';end if;
 if jsonb_array_length(p_items) not between 1 and 5 then raise exception 'INVALID_FLEA';end if;
 request:=jsonb_build_object('action','trade','post',p_post_id,'items',p_items);
 select owner_id into owner from app_private.flea_posts where id=p_post_id;
 if owner is null then raise exception 'FLEA_NOT_FOUND';end if;
 if owner=u then raise exception 'FLEA_SELF_TRADE';end if;
 perform app_private.get_gold_wallet();
 -- All marketplace mutations lock wallets in the same order before their post.
 perform 1 from public.player_wallets where user_id in(u,owner) order by user_id for update;
 select * into old from app_private.flea_receipts where user_id=u and operation_id=p_operation_id;
 if found then if old.request<>request then raise exception 'OPERATION_CONFLICT';end if;return old.result;end if;
 select * into p from app_private.flea_posts where id=p_post_id for update;
 if p.status<>'active' then raise exception 'FLEA_CLOSED';end if;
 for part in select value from jsonb_array_elements(p_items) order by value->>'id' loop
  if coalesce(part->>'quantity','') !~ '^[1-9][0-9]{0,3}$' then raise exception 'INVALID_FLEA';end if;
  select * into l from app_private.flea_lines where post_id=p.id and id=(part->>'id')::uuid for update;
  if not found or l.id=any(keys) then raise exception 'INVALID_FLEA';end if;
  keys:=array_append(keys,l.id);qty:=(part->>'quantity')::integer;
  if qty>l.remaining then raise exception 'FLEA_STOCK_CHANGED';end if;
  total:=total+qty::bigint*l.unit_price;
  if p.side='sell' then perform app_private.flea_deliver(l.escrow_gift_id,qty,u);
  else
   parcel:=app_private.exchange_reserve(u,l.asset||jsonb_build_object('quantity',qty));
   perform app_private.flea_deliver(parcel,qty,owner);
  end if;
  update app_private.flea_lines set remaining=remaining-qty where id=l.id;
 end loop;
 if p.side='sell' then
  perform app_private.flea_gold(u,-total::integer,p.id);perform app_private.flea_gold(owner,total::integer,p.id);
 else
  if p.escrow_gold<total then raise exception 'FLEA_STOCK_CHANGED';end if;
  update app_private.flea_posts set escrow_gold=escrow_gold-total where id=p.id;
  perform app_private.flea_gold(u,total::integer,p.id);
 end if;
 if not exists(select 1 from app_private.flea_lines where post_id=p.id and remaining>0) then
  update app_private.flea_posts set status='completed',closed_at=now() where id=p.id;
 end if;
 result:=app_private.flea_post_payload(p.id);
 insert into app_private.flea_receipts(user_id,operation_id,request,result) values(u,p_operation_id,request,result);
 return result;
end $$;

create function app_private.flea_cancel(p_post_id uuid,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p app_private.flea_posts;l app_private.flea_lines;old app_private.flea_receipts;request jsonb;result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_FLEA';end if;
 request:=jsonb_build_object('action','cancel','post',p_post_id);
 perform app_private.get_gold_wallet();perform 1 from public.player_wallets where user_id=u for update;
 select * into old from app_private.flea_receipts where user_id=u and operation_id=p_operation_id;
 if found then if old.request<>request then raise exception 'OPERATION_CONFLICT';end if;return old.result;end if;
 select * into p from app_private.flea_posts where id=p_post_id for update;
 if not found then raise exception 'FLEA_NOT_FOUND';end if;
 if p.owner_id<>u then raise exception 'FLEA_FORBIDDEN';end if;
 if p.status<>'active' then raise exception 'FLEA_CLOSED';end if;
 if p.side='buy' then perform app_private.flea_gold(u,p.escrow_gold::integer,p.id);
 else
  for l in select * from app_private.flea_lines where post_id=p.id and remaining>0 order by id for update loop
   perform app_private.flea_deliver(l.escrow_gift_id,l.remaining,u);
  end loop;
 end if;
 update app_private.flea_posts set status='cancelled',escrow_gold=0,closed_at=now() where id=p.id;
 result:=app_private.flea_post_payload(p.id);
 insert into app_private.flea_receipts(user_id,operation_id,request,result) values(u,p_operation_id,request,result);
 return result;
end $$;

create function public.flea_state(p_side text default 'sell',p_query text default '',p_kind text default 'all',p_mine boolean default false,p_offset integer default 0)
returns jsonb language sql stable set search_path='' as $$select app_private.flea_state(p_side,p_query,p_kind,p_mine,p_offset)$$;
create function public.flea_post(p_side text,p_title text,p_items jsonb,p_operation_id uuid) returns jsonb language sql set search_path='' as $$select app_private.flea_post(p_side,p_title,p_items,p_operation_id)$$;
create function public.flea_trade(p_post_id uuid,p_items jsonb,p_operation_id uuid) returns jsonb language sql set search_path='' as $$select app_private.flea_trade(p_post_id,p_items,p_operation_id)$$;
create function public.flea_cancel(p_post_id uuid,p_operation_id uuid) returns jsonb language sql set search_path='' as $$select app_private.flea_cancel(p_post_id,p_operation_id)$$;
revoke all on function app_private.flea_post_payload(uuid),app_private.flea_deliver(uuid,integer,uuid),app_private.flea_gold(uuid,integer,uuid) from public,anon,authenticated;
revoke all on function app_private.flea_state(text,text,text,boolean,integer),app_private.flea_post(text,text,jsonb,uuid),app_private.flea_trade(uuid,jsonb,uuid),app_private.flea_cancel(uuid,uuid),public.flea_state(text,text,text,boolean,integer),public.flea_post(text,text,jsonb,uuid),public.flea_trade(uuid,jsonb,uuid),public.flea_cancel(uuid,uuid) from public,anon;
grant execute on function app_private.flea_state(text,text,text,boolean,integer),app_private.flea_post(text,text,jsonb,uuid),app_private.flea_trade(uuid,jsonb,uuid),app_private.flea_cancel(uuid,uuid),public.flea_state(text,text,text,boolean,integer),public.flea_post(text,text,jsonb,uuid),public.flea_trade(uuid,jsonb,uuid),public.flea_cancel(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
commit;
