-- Apply AFTER 22. Repeatable; no player data reset.
begin;
create table if not exists public.collectible_gifts (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid references public.player_profiles(id) on delete set null,
 recipient_id uuid references public.player_profiles(id) on delete set null,
 sender_name text not null,recipient_name text not null,
 operation_id uuid not null,collectible_ids uuid[] not null check(cardinality(collectible_ids) between 1 and 20),
 species jsonb not null,quantity integer not null check(quantity between 1 and 20),
 message text not null default '' check(char_length(message)<=300),
 status text not null default 'pending' check(status in ('pending','claimed')),
 reaction text check(reaction in ('thumbs_up','heart','thanks','laugh','celebrate')),
 created_at timestamptz not null default now(),claimed_at timestamptz,reacted_at timestamptz,
 unique(sender_id,operation_id),check(sender_id is null or recipient_id is null or sender_id<>recipient_id)
);
create index if not exists gifts_inbox on public.collectible_gifts(recipient_id,created_at desc);
create index if not exists gifts_outbox on public.collectible_gifts(sender_id,created_at desc);
alter table public.collectible_gifts enable row level security;
revoke all on public.collectible_gifts from public,anon,authenticated;
grant select on public.collectible_gifts to authenticated;
drop policy if exists gifts_participant_read on public.collectible_gifts;
create policy gifts_participant_read on public.collectible_gifts for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
alter table public.player_collectibles add column if not exists escrow_gift_id uuid references public.collectible_gifts(id);
drop policy if exists collectible_owner_read on public.player_collectibles;
create policy collectible_owner_read on public.player_collectibles for select to authenticated using(user_id=(select auth.uid()) and escrow_gift_id is null);

alter table public.notifications add column if not exists gift_id uuid references public.collectible_gifts(id) on delete cascade;
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.notifications'::regclass and contype='c' and (pg_get_constraintdef(oid) like '%category%' or pg_get_constraintdef(oid) like '%kind%') loop
  execute format('alter table public.notifications drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.notifications add constraint notification_categories check(
 (category='friend' and kind in ('friend_request','friend_accepted') and request_id is not null and gift_id is null) or
 (category='general' and kind in ('announcement','reward','system') and request_id is null and gift_id is null) or
 (category='gift' and kind in ('gift_received','gift_claimed','gift_reaction') and request_id is null and gift_id is not null));
create unique index if not exists gift_notification_once on public.notifications(recipient_id,kind,gift_id) where gift_id is not null;

create or replace function app_private.send_collectible_gift(p_recipient_id uuid,p_collectible_ids uuid[],p_message text,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ids uuid[]; g public.collectible_gifts; v_count integer; v_species text; v_name text; v_recipient text; v_message text:=btrim(coalesce(p_message,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_recipient_id is null or p_recipient_id=v_uid then raise exception 'INVALID_RECIPIENT'; end if;
 if p_operation_id is null or coalesce(cardinality(p_collectible_ids),0) not between 1 and 20 or char_length(v_message)>300 then raise exception 'INVALID_GIFT'; end if;
 select array_agg(id order by id) into v_ids from(select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_GIFT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('gift-send:'||v_uid::text,0));
 select * into g from public.collectible_gifts where sender_id=v_uid and operation_id=p_operation_id;
 if found then
  if g.recipient_id is distinct from p_recipient_id or g.collectible_ids<>v_ids or g.message<>v_message then raise exception 'OPERATION_CONFLICT'; end if;
  return to_jsonb(g);
 end if;
 perform 1 from public.friend_requests where status='accepted' and ((sender_id=v_uid and recipient_id=p_recipient_id) or(sender_id=p_recipient_id and recipient_id=v_uid)) for share;
 if not found then raise exception 'GIFT_FRIEND_REQUIRED'; end if;
 if (select count(*) from public.collectible_gifts where sender_id=v_uid and created_at>now()-interval '1 minute')>=5 then raise exception 'GIFT_RATE_LIMIT'; end if;
 select nickname into v_name from public.player_profiles where id=v_uid;
 select nickname into v_recipient from public.player_profiles where id=p_recipient_id;
 if v_name is null or v_recipient is null then raise exception 'INVALID_RECIPIENT'; end if;
 perform 1 from public.player_collectibles where user_id=v_uid and id=any(v_ids) order by id for update;
 select count(*),min(c.species_id) into v_count,v_species from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.id=any(v_ids) and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration');
 if v_count<>cardinality(v_ids) or (select count(distinct species_id) from public.player_collectibles where id=any(v_ids))<>1 then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,operation_id,collectible_ids,species,quantity,message)
 values(v_uid,p_recipient_id,v_name,v_recipient,p_operation_id,v_ids,app_private.species_payload(v_species),v_count,v_message) returning * into g;
 -- Recipient owns reserved items, so deletion of the sender cannot destroy the gift.
 update public.player_collectibles set tank_id=null,user_id=p_recipient_id,escrow_gift_id=g.id,position_x=null,position_y=null where id=any(v_ids);
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id)
 values(p_recipient_id,v_uid,'gift','gift_received','선물을 받았습니다',v_name||'님이 '||(g.species->>'name')||' ×'||v_count||'를 보냈어요.',g.id);
 return to_jsonb(g);
end $$;

create or replace function app_private.claim_collectible_gift(p_gift_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_tank uuid;v_count integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid for update;
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 if g.status='claimed' then return to_jsonb(g); end if;
 perform app_private.aquarium_state();
 select id into v_tank from public.aquarium_tanks where user_id=v_uid and is_default;
 perform 1 from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id order by id for update;
 select count(*) into v_count from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id and sold_at is null;
 if v_count<>g.quantity then raise exception 'GIFT_UNAVAILABLE'; end if;
 update public.player_collectibles set tank_id=v_tank,escrow_gift_id=null where user_id=v_uid and escrow_gift_id=g.id;
 insert into public.player_discoveries(user_id,species_id) values(v_uid,g.species->>'id') on conflict do nothing;
 update public.collectible_gifts set status='claimed',claimed_at=now() where id=g.id returning * into g;
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=v_uid and gift_id=g.id and kind='gift_received';
 if g.sender_id is not null then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id) values(g.sender_id,v_uid,'gift','gift_claimed','선물을 받았어요',g.recipient_name||'님이 보낸 선물을 받았어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $$;

create or replace function app_private.react_to_collectible_gift(p_gift_id uuid,p_reaction text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_title text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_reaction is null or p_reaction not in ('thumbs_up','heart','thanks','laugh','celebrate') then raise exception 'INVALID_REACTION'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid for update;
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 if g.status<>'claimed' then raise exception 'GIFT_NOT_CLAIMED'; end if;
 if g.reaction is not null then
  if g.reaction<>p_reaction then raise exception 'GIFT_ALREADY_REACTED'; end if;
  return to_jsonb(g);
 end if;
 update public.collectible_gifts set reaction=p_reaction,reacted_at=now() where id=g.id returning * into g;
 v_title:=case p_reaction when 'thumbs_up' then '따봉을 보냈어요' when 'heart' then '하트를 보냈어요' when 'thanks' then '고마움을 보냈어요' when 'laugh' then '웃음을 보냈어요' else '축하를 보냈어요' end;
 if g.sender_id is not null then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id) values(g.sender_id,v_uid,'gift','gift_reaction',v_title,g.recipient_name||'님이 선물에 답장했어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $$;

create or replace function app_private.gift_mailbox(p_direction text default 'received',p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_total integer;v_items jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_direction is null or p_direction not in ('received','sent') or p_offset is null or p_offset<0 then raise exception 'INVALID_GIFT'; end if;
 select count(*) into v_total from public.collectible_gifts where (p_direction='received' and recipient_id=v_uid) or(p_direction='sent' and sender_id=v_uid);
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id),'[]'::jsonb) into v_items from(select * from public.collectible_gifts where (p_direction='received' and recipient_id=v_uid) or(p_direction='sent' and sender_id=v_uid) order by created_at desc,id limit 30 offset p_offset) q;
 return jsonb_build_object('items',v_items,'total',v_total);
end $$;
create or replace function app_private.gift_detail(p_gift_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.collectible_gifts;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and (sender_id=v_uid or recipient_id=v_uid);
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 return to_jsonb(g);
end $$;

create or replace function public.send_collectible_gift(p_recipient_id uuid,p_collectible_ids uuid[],p_message text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.send_collectible_gift(p_recipient_id,p_collectible_ids,p_message,p_operation_id)$$;
create or replace function public.claim_collectible_gift(p_gift_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.claim_collectible_gift(p_gift_id)$$;
create or replace function public.react_to_collectible_gift(p_gift_id uuid,p_reaction text) returns jsonb language sql security invoker set search_path='' as $$select app_private.react_to_collectible_gift(p_gift_id,p_reaction)$$;
create or replace function public.gift_mailbox(p_direction text default 'received',p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select app_private.gift_mailbox(p_direction,p_offset)$$;
create or replace function public.gift_detail(p_gift_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.gift_detail(p_gift_id)$$;
revoke all on function app_private.send_collectible_gift(uuid,uuid[],text,uuid),public.send_collectible_gift(uuid,uuid[],text,uuid),app_private.claim_collectible_gift(uuid),public.claim_collectible_gift(uuid),app_private.react_to_collectible_gift(uuid,text),public.react_to_collectible_gift(uuid,text),app_private.gift_mailbox(text,integer),public.gift_mailbox(text,integer),app_private.gift_detail(uuid),public.gift_detail(uuid) from public,anon;
grant execute on function app_private.send_collectible_gift(uuid,uuid[],text,uuid),public.send_collectible_gift(uuid,uuid[],text,uuid),app_private.claim_collectible_gift(uuid),public.claim_collectible_gift(uuid),app_private.react_to_collectible_gift(uuid,text),public.react_to_collectible_gift(uuid,text),app_private.gift_mailbox(text,integer),public.gift_mailbox(text,integer),app_private.gift_detail(uuid),public.gift_detail(uuid) to authenticated;

-- Reserved items must be excluded from all existing ownership and trade operations.

create or replace function app_private.owned_collectibles() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(s.id,c.map_region_id)) order by c.acquired_at desc)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null),'[]'::jsonb);
end $$;

create or replace function app_private.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_item public.player_collectibles;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION'; end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_NOT_FOUND'; end if;
 select * into v_item from public.player_collectibles where id=p_collectible_id and user_id=v_uid and sold_at is null and escrow_gift_id is null for update;
 if not found or v_item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if not exists(select 1 from public.collectible_species where id=v_item.species_id and kind in ('fish','trash','decoration')) then raise exception 'INVALID_ITEM'; end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y where id=v_item.id;
 return jsonb_build_object('id',v_item.id,'position_x',p_x,'position_y',p_y);
end $$;

create or replace function app_private.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_ids uuid[]; v_key text; v_wallet public.player_wallets;
 v_previous public.gold_transactions; v_count integer; v_price bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null or coalesce(cardinality(p_collectible_ids),0) not between 1 and 100 then raise exception 'INVALID_TRADE'; end if;
 select array_agg(id order by id) into v_ids from (select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_TRADE'; end if;
 v_key:='collectibles:'||array_to_string(v_ids,',');
 perform app_private.get_gold_wallet();
 -- Same lock order as other gold operations: wallet, then collectibles ordered by ID.
 select * into v_wallet from public.player_wallets where user_id=v_uid for update;
 select * into v_previous from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if v_previous.action<>'sell' or v_previous.item_id is distinct from v_key then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 perform 1 from public.player_collectibles where user_id=v_uid and id=any(v_ids) order by id for update;
 select count(*),coalesce(sum(s.sell_price),0) into v_count,v_price
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.id=any(v_ids) and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration') and s.sell_price>0;
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if v_wallet.gold::bigint+v_price>1000000000 then raise exception 'GOLD_LIMIT'; end if;
 update public.player_collectibles set sold_at=now(),tank_id=null where user_id=v_uid and id=any(v_ids);
 update public.player_wallets set gold=gold+v_price::integer,updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'sell',v_key,v_price::integer);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',v_price);
end $$;

create or replace function public.place_collectible(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric)
returns jsonb language sql security invoker set search_path='' as $$select app_private.place_collectible(p_collectible_id,p_tank_id,p_x,p_y)$$;
create or replace function public.sell_collectibles(p_collectible_ids uuid[],p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select app_private.sell_collectibles(p_collectible_ids,p_operation_id)$$;
revoke all on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) from public,anon;
grant execute on function app_private.place_collectible(uuid,uuid,numeric,numeric),public.place_collectible(uuid,uuid,numeric,numeric),app_private.sell_collectibles(uuid[],uuid),public.sell_collectibles(uuid[],uuid) to authenticated;

notify pgrst,'reload schema';
commit;
