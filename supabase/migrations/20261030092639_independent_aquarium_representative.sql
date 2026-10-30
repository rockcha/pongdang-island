begin;
set local lock_timeout='5s';
alter table public.aquarium_tanks add column is_representative boolean not null default false;
-- Preserve the currently presented aquarium without changing any display order.
with ranked as (select id,row_number() over(partition by user_id order by display_order,created_at,id) n from public.aquarium_tanks)
update public.aquarium_tanks t set is_representative=true from ranked r where t.id=r.id and r.n=1;
create unique index aquarium_tanks_one_representative on public.aquarium_tanks(user_id) where is_representative;

CREATE OR REPLACE FUNCTION app_private.aquarium_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 insert into public.aquarium_tanks(user_id,background_id,is_default,is_representative)
 select v_uid,background_id,true,not exists(select 1 from public.aquarium_tanks where user_id=v_uid and is_representative) from public.player_aquariums where user_id=v_uid
 on conflict(user_id) where is_default do nothing;
 return jsonb_build_object(
 'background',(select background_id from public.aquarium_tanks where user_id=v_uid order by is_representative desc,display_order,created_at,id limit 1),
 'tanks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('capacity',coalesce((select capacity from app_private.player_aquarium_capacity where user_id=v_uid),50)+t.capacity_bonus,'nextCapacityExpansion',jsonb_build_object('capacity',coalesce((select capacity from app_private.player_aquarium_capacity where user_id=v_uid),50)+t.capacity_bonus+20,'price',1000)) order by t.display_order,t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
   from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is not null and s.kind in ('fish','trash','decoration')),'[]'::jsonb),
 'storageCount',(select count(*) from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
   where c.user_id=v_uid and c.sold_at is null and c.escrow_gift_id is null and c.tank_id is null and s.kind in ('fish','trash','decoration')),
 'tankCapacity',coalesce((select capacity from app_private.player_aquarium_capacity where user_id=v_uid),50),
 'nextCapacityExpansion',null,'tankPrice',350,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $function$;

CREATE OR REPLACE FUNCTION app_private.manage_aquarium_tank(p_tank_id uuid, p_action text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_tank public.aquarium_tanks; v_name text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_action='representative' then
  perform app_private.get_gold_wallet();
  perform 1 from public.player_wallets where user_id=v_uid for update;
 end if;
 select * into v_tank from public.aquarium_tanks where id=p_tank_id and user_id=v_uid for update;
 if not found then raise exception 'TANK_NOT_FOUND'; end if;
 if p_action='representative' then
  update public.aquarium_tanks set is_representative=false where user_id=v_uid and is_representative and id<>p_tank_id;
  update public.aquarium_tanks set is_representative=true where id=p_tank_id;
 elsif p_action='rename' then
  v_name:=btrim(p_value);
  if v_name is null or char_length(v_name) not between 1 and 20 or v_name ~ '[[:cntrl:]]' then raise exception 'INVALID_TANK_NAME'; end if;
  update public.aquarium_tanks set name=v_name where id=p_tank_id;
 elsif p_action='equip' then
  if p_value is null or not exists(select 1 from public.aquarium_backgrounds where id=p_value) then raise exception 'INVALID_ITEM'; end if;
  if p_value<>'default' and not exists(select 1 from public.owned_aquarium_backgrounds where user_id=v_uid and background_id=p_value) then raise exception 'BACKGROUND_NOT_OWNED'; end if;
  update public.aquarium_tanks set background_id=p_value where id=p_tank_id;
  if v_tank.is_default then update public.player_aquariums set background_id=p_value where user_id=v_uid; end if;
 else raise exception 'INVALID_TRADE';
 end if;
 return app_private.aquarium_state();
end $function$;

CREATE OR REPLACE FUNCTION app_private.friend_aquarium(p_owner uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_owner is null or not exists(select 1 from public.player_profiles where id=p_owner) then raise exception 'TANK_NOT_FOUND';end if;
 return jsonb_build_object(
 'isFriend',exists(select 1 from public.friend_requests where status='accepted' and ((sender_id=auth.uid() and recipient_id=p_owner) or (recipient_id=auth.uid() and sender_id=p_owner))),
 'owner',(select jsonb_build_object('id',id,'nickname',nickname,'avatar_path',avatar_path) from public.player_profiles where id=p_owner),
 'tanks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'background_id',background_id,'is_default',is_default,'is_representative',is_representative,'created_at',created_at,'display_order',display_order) order by display_order,created_at,id) from public.aquarium_tanks where user_id=p_owner),'[]'::jsonb),
 'inhabitants',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) order by c.acquired_at,c.id)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id
 join public.aquarium_tanks t on t.id=c.tank_id and t.user_id=p_owner
 where c.user_id=p_owner and c.sold_at is null and c.escrow_gift_id is null and s.kind in('fish','trash','decoration')),'[]'::jsonb),
 'backgrounds',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'image_path',image_path)),'[]'::jsonb) from public.aquarium_backgrounds));
end $function$;
commit;
