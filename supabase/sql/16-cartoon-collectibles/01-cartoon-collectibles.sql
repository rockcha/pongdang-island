-- Apply AFTER 15, even if the old 15 catalog was already installed.
-- Replaces art/layout and rarity rules; existing ownership, wallets and tanks are preserved.
begin;
alter table public.collectible_species add column sprite_sheet_path text;
-- 15 used automatically named checks: identify only the retired sprite/rarity checks.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.collectible_species'::regclass and contype='c'
 and (pg_get_constraintdef(oid) like '%sprite_paths%' or pg_get_constraintdef(oid) like '%rarity%') loop
  execute format('alter table public.collectible_species drop constraint %I',c.conname);
 end loop;
end $$;
update public.collectible_species set rarity='common' where kind in ('trash','structure','map');
update public.collectible_species set sprite_sheet_path=case id
 when 'pongul' then 'fish/normal/pongul_sprite.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_sprite.png'
 when 'star-ray' then 'fish/epic/star-ray_sprite.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_sprite.png' end,
 thumbnail_path=case id
 when 'pongul' then 'fish/normal/pongul_thumbnail.png' when 'moon-angelfish' then 'fish/rare/moon-angelfish_thumbnail.png'
 when 'star-ray' then 'fish/epic/star-ray_thumbnail.png' when 'dawn-arowana' then 'fish/mythic/dawn-arowana_thumbnail.png'
 when 'glass-bottle' then 'trash/normal/glass-bottle_thumbnail.png' when 'coral-house' then 'structures/normal/coral-house_thumbnail.png'
 when 'ocean-map' then 'map/normal/ocean-map_thumbnail.png' else thumbnail_path end;
alter table public.collectible_species drop column sprite_paths;
alter table public.collectible_species alter column rarity set not null;
alter table public.collectible_species add constraint collectible_sheet_layout check
 ((kind='fish' and sprite_sheet_path is not null and btrim(sprite_sheet_path)<>'') or(kind<>'fish' and sprite_sheet_path is null));
alter table public.collectible_species add constraint collectible_nonfish_common check(kind='fish' or rarity='common');
-- This sample has only a COMMON map: its destinations are common, still-locked regions.
-- Habitat rows for maps describe eligible destinations; fish/trash/structure rows describe catch locations.
delete from public.collectible_habitats h using public.regions r
 where h.species_id='ocean-map' and r.id=h.region_id and (r.rarity<>'common' or not r.requires_map_fragment);
create or replace function app_private.species_payload(p_species_id text,p_map_region_id text default null) returns jsonb language sql stable set search_path='' as $$
 select to_jsonb(s)||case when s.kind='map' then jsonb_build_object('name',r.name||' 지도 조각','map_region_id',r.id) else '{}'::jsonb end
 from public.collectible_species s left join public.regions r on r.id=p_map_region_id where s.id=p_species_id
$$;

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
   (h.region_id=p_region_id and ((v_decoration and c.kind='structure') or
     (not v_decoration and ((c.kind='fish' and c.rarity=v_rarity) or(c.kind='trash' and c.rarity=v_rarity)))))
   or (not v_decoration and c.kind='map' and c.rarity=v_rarity and r.requires_map_fragment and r.rarity=c.rarity
     and not exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=r.id))
  order by random() limit 1;
  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind<>'map' then
   perform app_private.aquarium_state();
   select id into v_tank from public.aquarium_tanks where user_id=v_uid and is_default;
  else
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

notify pgrst,'reload schema';
commit;
