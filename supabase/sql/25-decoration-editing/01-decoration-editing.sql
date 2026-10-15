-- Apply after 23. Works with both the legacy and renamed catalog; repeatable.
-- Upload/move Storage images to decorations/ before switching the application.
begin;
do $$
begin
 if exists(select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace
   where n.nspname='public' and t.typname='collectible_kind' and e.enumlabel='structure') then
  alter type public.collectible_kind rename value 'structure' to 'decoration';
 end if;
end $$;

alter table public.player_collectibles add column if not exists rotation numeric not null default 0;
alter table public.player_collectibles add column if not exists scale numeric not null default 1;
do $$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.player_collectibles'::regclass and conname='decoration_rotation_range') then
  alter table public.player_collectibles add constraint decoration_rotation_range check(rotation between 0 and 360);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.player_collectibles'::regclass and conname='decoration_scale_range') then
  alter table public.player_collectibles add constraint decoration_scale_range check(scale between 0.5 and 2);
 end if;
end $$;

update public.collectible_species
set thumbnail_path='decorations/'||substr(thumbnail_path,length('structures/')+1)
where kind='decoration' and thumbnail_path like 'structures/%';
update public.collectible_gifts set species=jsonb_set(species,'{kind}','"decoration"'::jsonb)
where species->>'kind'='structure';
update public.collectible_gifts set species=jsonb_set(species,'{thumbnail_path}',to_jsonb('decorations/'||substr(species->>'thumbnail_path',length('structures/')+1)))
where species->>'kind'='decoration' and species->>'thumbnail_path' like 'structures/%';
update public.fishing_baits set effect_description=replace(effect_description,'구조물','장식물')
where effect_description like '%구조물%';

-- Enum rename updates stored enum values/constraints, but legacy PL/pgSQL bodies
-- keep their text. Refresh only the four existing functions containing kind checks.
-- CREATE OR REPLACE preserves their existing ownership and execute grants.
do $$
declare f record; definition text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname in ('cast_fishing','send_collectible_gift','place_collectible','sell_collectibles') loop
  definition:=pg_get_functiondef(f.oid);
  if strpos(definition,'''structure''')>0 then
   execute replace(definition,'''structure''','''decoration''');
  end if;
 end loop;
end $$;

create or replace function app_private.arrange_decoration(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_item public.player_collectibles;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1) or not(p_y between 0 and 1) then raise exception 'INVALID_POSITION'; end if;
 if p_rotation is null or not(p_rotation between 0 and 360) or p_scale is null or not(p_scale between 0.5 and 2) then raise exception 'INVALID_TRANSFORM'; end if;
 if not exists(select 1 from public.aquarium_tanks where id=p_tank_id and user_id=v_uid) then raise exception 'TANK_NOT_FOUND'; end if;
 select * into v_item from public.player_collectibles
 where id=p_collectible_id and user_id=v_uid and sold_at is null and escrow_gift_id is null for update;
 if not found or v_item.tank_id is distinct from p_tank_id then raise exception 'COLLECTIBLE_NOT_FOUND'; end if;
 if not exists(select 1 from public.collectible_species where id=v_item.species_id and kind='decoration') then raise exception 'INVALID_ITEM'; end if;
 update public.player_collectibles set position_x=p_x,position_y=p_y,rotation=mod(p_rotation,360),scale=p_scale where id=v_item.id;
 return jsonb_build_object('id',v_item.id,'position_x',p_x,'position_y',p_y,'rotation',mod(p_rotation,360),'scale',p_scale);
end $$;
create or replace function public.arrange_decoration(p_collectible_id uuid,p_tank_id uuid,p_x numeric,p_y numeric,p_rotation numeric,p_scale numeric)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.arrange_decoration(p_collectible_id,p_tank_id,p_x,p_y,p_rotation,p_scale)
$$;
revoke all on function app_private.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric),public.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric) from public,anon,authenticated;
grant execute on function app_private.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric),public.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric) to authenticated;
notify pgrst,'reload schema';
commit;

select id,name,kind,thumbnail_path from public.collectible_species where kind='decoration' order by id;
