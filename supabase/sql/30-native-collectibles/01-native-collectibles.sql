-- Apply after 29. Repeatable; preserves ownership, placements and map unlocks.
begin;
alter table public.collectible_species add column if not exists native_region_id text references public.regions(id);
alter table public.collectible_species add column if not exists is_native boolean
  generated always as (native_region_id is not null) stored;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.collectible_species'::regclass and conname='native_collectible_kind') then
  alter table public.collectible_species add constraint native_collectible_kind
   check(native_region_id is null or kind in ('fish','trash','decoration'));
 end if;
end $$;

-- Every habitat edit locks its parent catalog rows, serializing it with a
-- concurrent native-region change. ID order also handles species reassignment.
create or replace function app_private.lock_collectible_habitat_species()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_ids text[];
begin
 if tg_op='INSERT' then v_ids:=array[new.species_id];
 elsif tg_op='DELETE' then v_ids:=array[old.species_id];
 else v_ids:=array[old.species_id,new.species_id]; end if;
 perform 1 from public.collectible_species where id=any(v_ids) order by id for update;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;

-- Deferred validation permits setting the native region and replacing habitat
-- rows in one transaction, but never permits 0 or 2 habitats at commit.
create or replace function app_private.check_native_collectible_habitats()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_ids text[];v_id text;v_region text;v_count bigint;v_match bigint;
begin
 if tg_table_name='collectible_species' then
  if tg_op='DELETE' then v_ids:=array[old.id];
  elsif tg_op='INSERT' then v_ids:=array[new.id];
  else v_ids:=array[old.id,new.id]; end if;
 else
  if tg_op='DELETE' then v_ids:=array[old.species_id];
  elsif tg_op='INSERT' then v_ids:=array[new.species_id];
  else v_ids:=array[old.species_id,new.species_id]; end if;
 end if;
 for v_id in select distinct unnest(v_ids) loop
  select native_region_id into v_region from public.collectible_species where id=v_id;
  if found and v_region is not null then
   select count(*),count(*) filter(where region_id=v_region) into v_count,v_match
    from public.collectible_habitats where species_id=v_id;
   if v_count<>1 or v_match<>1 then
    raise exception 'NATIVE_HABITAT_REQUIRED: % must have exactly one habitat in %',v_id,v_region using errcode='23514';
   end if;
  end if;
 end loop;
 return null;
end $$;
drop trigger if exists collectible_habitat_species_lock on public.collectible_habitats;
create trigger collectible_habitat_species_lock before insert or update or delete on public.collectible_habitats
 for each row execute function app_private.lock_collectible_habitat_species();
drop trigger if exists native_species_habitats on public.collectible_species;
create constraint trigger native_species_habitats after insert or update on public.collectible_species
 deferrable initially deferred for each row execute function app_private.check_native_collectible_habitats();
drop trigger if exists native_habitat_count on public.collectible_habitats;
create constraint trigger native_habitat_count after insert or update or delete on public.collectible_habitats
 deferrable initially deferred for each row execute function app_private.check_native_collectible_habitats();
revoke all on function app_private.lock_collectible_habitat_species(),app_private.check_native_collectible_habitats() from public,anon,authenticated;

update public.collectible_species set rarity='rare' where id='coral-house' and kind='decoration';
update public.regions set rarity='rare' where id='mistmoon';
-- Map habitat entries describe destinations. The generic map's display rarity
-- is resolved from regions by species_payload; retain mistmoon's destination.
insert into public.collectible_habitats(species_id,region_id)
select id,'mistmoon' from public.collectible_species where id='ocean-map' and kind='map'
on conflict do nothing;
create or replace function app_private.species_payload(p_species_id text,p_map_region_id text default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(s)||case when s.kind='map' then jsonb_build_object(
  'name',coalesce(r.name||' 지도 조각',s.name),'rarity',coalesce(r.rarity,s.rarity),'map_region_id',r.id)
  else '{}'::jsonb end
 from public.collectible_species s left join public.regions r on r.id=p_map_region_id where s.id=p_species_id
$$;
-- Map catalog rows are common templates; destination rarity controls rolls.
do $$ declare v_oid oid;v_definition text; begin
 for v_oid in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname='cast_fishing' loop
  v_definition:=pg_get_functiondef(v_oid);
  v_definition:=replace(v_definition,
   'c.kind=''map'' and c.rarity=v_rarity and r.requires_map_fragment and r.rarity=c.rarity',
   'c.kind=''map'' and r.rarity=v_rarity and r.requires_map_fragment');
  v_definition:=replace(v_definition,
   'coalesce(s.rarity,(select rarity from public.regions where id=v_map_region))',
   'case when s.kind=''map'' then (select rarity from public.regions where id=v_map_region) else s.rarity end');
  execute v_definition;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;

select id,name,rarity,is_native,native_region_id from public.collectible_species order by id;
