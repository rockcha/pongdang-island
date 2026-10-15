-- Apply after 34. Repeatable; existing ownership and placements are unchanged.
begin;
-- Existing deferred native-habitat triggers must finish each backfill statement
-- before the next ALTER TABLE in this migration.
set constraints all immediate;
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='movement_type') then
  alter table public.collectible_species add column movement_type text not null default 'swim';
  update public.collectible_species set movement_type='fixed' where kind in ('decoration','map');
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='flip_with_direction') then
  alter table public.collectible_species add column flip_with_direction boolean not null default true;
  update public.collectible_species set flip_with_direction=false where kind<>'fish';
 end if;
end $$;
alter table public.collectible_species add column if not exists travel_direction text not null default 'both';
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.collectible_species'::regclass and conname='collectible_movement_type') then
  alter table public.collectible_species add constraint collectible_movement_type check(movement_type in ('swim','pulse','crawl','fixed'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.collectible_species'::regclass and conname='collectible_travel_direction') then
  alter table public.collectible_species add constraint collectible_travel_direction check(travel_direction in ('both','left','right'));
 end if;
end $$;

-- New non-fish catalog rows inherit their category's existing visual behavior.
create or replace function app_private.default_collectible_movement()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.kind in ('decoration','map') then
  new.movement_type:='fixed';new.flip_with_direction:=false;new.travel_direction:='both';
 elsif tg_op='INSERT' and new.kind='trash' then new.flip_with_direction:=false;
 elsif tg_op='UPDATE' and new.kind<>old.kind then
  new.movement_type:='swim';new.flip_with_direction:=(new.kind='fish');new.travel_direction:='both';
 end if;
 return new;
end $$;
drop trigger if exists collectible_movement_defaults on public.collectible_species;
create trigger collectible_movement_defaults before insert or update of kind on public.collectible_species
 for each row execute function app_private.default_collectible_movement();
revoke all on function app_private.default_collectible_movement() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
