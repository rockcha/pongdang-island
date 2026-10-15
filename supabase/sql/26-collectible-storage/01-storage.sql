-- Apply after 25 (and optionally 24). Repeatable; preserves existing placements.
begin;
create index if not exists collectible_storage_lookup on public.player_collectibles(user_id,acquired_at desc,id)
where sold_at is null and escrow_gift_id is null and tank_id is null;
create index if not exists collectible_tank_occupancy on public.player_collectibles(tank_id)
where sold_at is null and escrow_gift_id is null and tank_id is not null;

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
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
   from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is not null and s.kind in ('fish','trash','decoration')),'[]'::jsonb),
 'storageCount',(select count(*) from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind in ('fish','trash','decoration')),
 'tankCapacity',50,'tankPrice',200,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;

create or replace function app_private.collectible_storage(p_offset integer default 0,p_query text default '',p_kind text default 'all')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_total integer;v_items jsonb;v_query text:=btrim(coalesce(p_query,''));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_offset is null or p_offset<0 or char_length(v_query)>60 or p_kind is null or p_kind not in ('all','fish','trash','decoration') then raise exception 'INVALID_STORAGE_QUERY'; end if;
 select count(*) into v_total from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
   and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind) and strpos(s.name,v_query)>0;
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('species',app_private.species_payload(q.species_id,q.map_region_id)) order by q.acquired_at desc,q.id),'[]'::jsonb) into v_items
 from (select c.* from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.user_id=v_uid and c.tank_id is null and c.sold_at is null and c.escrow_gift_id is null
   and s.kind in ('fish','trash','decoration') and (p_kind='all' or s.kind::text=p_kind) and strpos(s.name,v_query)>0
 order by c.acquired_at desc,c.id limit 50 offset p_offset) q;
 return jsonb_build_object('items',v_items,'total',v_total,'pageSize',50);
end $$;

create or replace function app_private.move_collectibles(p_collectible_ids uuid[],p_tank_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_ids uuid[];v_count integer;v_occupancy integer;v_added integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if coalesce(cardinality(p_collectible_ids),0) not between 1 and 50 then raise exception 'INVALID_SELECTION'; end if;
 select array_agg(id order by id) into v_ids from(select distinct unnest(p_collectible_ids) as id) q;
 if cardinality(v_ids)<>cardinality(p_collectible_ids) or array_position(v_ids,null) is not null then raise exception 'INVALID_SELECTION'; end if;
 -- Serialize admissions to the same tank before locking individuals in ID order.
 if p_tank_id is not null then
  perform 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid for update;
  if not found then raise exception 'TANK_NOT_FOUND'; end if;
 end if;
 perform 1 from public.player_collectibles where id=any(v_ids) and user_id=v_uid order by id for update;
 select count(*) into v_count from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 where c.id=any(v_ids) and c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and s.kind in ('fish','trash','decoration');
 if v_count<>cardinality(v_ids) then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if p_tank_id is not null then
  if exists(select 1 from public.player_collectibles where id=any(v_ids) and tank_id is not null and tank_id<>p_tank_id) then raise exception 'STORAGE_REQUIRED'; end if;
  select count(*) into v_added from public.player_collectibles where id=any(v_ids) and tank_id is null;
  select count(*) into v_occupancy from public.player_collectibles where tank_id=p_tank_id and user_id=v_uid and sold_at is null and escrow_gift_id is null;
  if v_added>0 and v_occupancy+v_added>50 then raise exception 'TANK_FULL'; end if;
 end if;
 update public.player_collectibles set tank_id=p_tank_id,position_x=null,position_y=null
 where id=any(v_ids) and tank_id is distinct from p_tank_id;
 return app_private.aquarium_state();
end $$;

create or replace function public.collectible_storage(p_offset integer default 0,p_query text default '',p_kind text default 'all')
returns jsonb language sql security invoker set search_path='' as $$select app_private.collectible_storage(p_offset,p_query,p_kind)$$;
create or replace function public.move_collectibles(p_collectible_ids uuid[],p_tank_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select app_private.move_collectibles(p_collectible_ids,p_tank_id)$$;
revoke all on function app_private.collectible_storage(integer,text,text),public.collectible_storage(integer,text,text),app_private.move_collectibles(uuid[],uuid),public.move_collectibles(uuid[],uuid) from public,anon,authenticated;
grant execute on function app_private.collectible_storage(integer,text,text),public.collectible_storage(integer,text,text),app_private.move_collectibles(uuid[],uuid),public.move_collectibles(uuid[],uuid) to authenticated;

create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; s public.collectible_species;
 v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity; v_tank uuid; v_item uuid; v_decoration boolean; v_map_region text; v_species_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  select c.species_id,c.map_region_id into v_species_id,v_map_region from public.player_collectibles c where c.id=a.collectible_id;
  select * into s from public.collectible_species where id=v_species_id;
  return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',true);
 end if;
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 if not v_decoration then v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer); end if;
 if v_decoration or v_rarity is not null then
  select c.id,r.id into v_species_id,v_map_region
  from public.collectible_species c join public.collectible_habitats h on h.species_id=c.id
  left join public.regions r on c.kind='map' and r.id=h.region_id
  where
   (h.region_id=p_region_id and ((v_decoration and c.kind='decoration') or
     (not v_decoration and ((c.kind='fish' and c.rarity=v_rarity) or(c.kind='trash' and c.rarity=v_rarity)))))
   or (not v_decoration and c.kind='map' and c.rarity=v_rarity and r.requires_map_fragment and r.rarity=c.rarity
     and not exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=r.id))
  order by random() limit 1;
  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind='map' then
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,v_map_region) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,tank_id,map_region_id) values(v_uid,s.id,v_tank,v_map_region) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,s.id) on conflict do nothing;
 end if;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,coalesce(s.rarity,(select rarity from public.regions where id=v_map_region)),v_item) returning * into a;
 return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',false);
end $$;

create or replace function app_private.claim_collectible_gift(p_gift_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();g public.collectible_gifts;v_tank uuid;v_count integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into g from public.collectible_gifts where id=p_gift_id and recipient_id=v_uid for update;
 if not found then raise exception 'GIFT_NOT_FOUND'; end if;
 if g.status='claimed' then return to_jsonb(g); end if;
 perform app_private.aquarium_state();
 perform 1 from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id order by id for update;
 select count(*) into v_count from public.player_collectibles where user_id=v_uid and escrow_gift_id=g.id and sold_at is null;
 if v_count<>g.quantity then raise exception 'GIFT_UNAVAILABLE'; end if;
 update public.player_collectibles set tank_id=null,escrow_gift_id=null where user_id=v_uid and escrow_gift_id=g.id;
 insert into public.player_discoveries(user_id,species_id) values(v_uid,g.species->>'id') on conflict do nothing;
 update public.collectible_gifts set status='claimed',claimed_at=now() where id=g.id returning * into g;
 update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=v_uid and gift_id=g.id and kind='gift_received';
 if g.sender_id is not null then
  insert into public.notifications(recipient_id,actor_id,category,kind,title,body,gift_id) values(g.sender_id,v_uid,'gift','gift_claimed','선물을 받았어요',g.recipient_name||'님이 보낸 선물을 받았어요.',g.id) on conflict do nothing;
 end if;
 return to_jsonb(g);
end $$;

-- Fishing no longer downloads/renders the entire ownership inventory.
create or replace function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('baits',(select jsonb_agg(to_jsonb(b) order by b.sort_order) from public.fishing_baits b));
end $$;

notify pgrst,'reload schema';
commit;
