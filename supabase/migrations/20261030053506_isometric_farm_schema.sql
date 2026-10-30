begin;
alter table app_private.player_islands
 add column farm_store_level integer not null default 0 check(farm_store_level between 0 and 5),
 add column farm_barn_level integer not null default 0 check(farm_barn_level between 0 and 5),
 add column farm_inventory jsonb not null default '{}' check(jsonb_typeof(farm_inventory)='object');
create table public.farm_crops(
 id text primary key,name text not null,seed_price integer not null check(seed_price>=0),
 grow_seconds integer not null check(grow_seconds>0),yield_quantity integer not null check(yield_quantity>0),sell_price integer not null check(sell_price>=0)
);
create table public.farm_animal_types(
 id text primary key references public.island_shop_items(id),name text not null,
 produce_id text not null unique,produce_name text not null,produce_seconds integer not null check(produce_seconds>0),
 feed_quantity integer not null check(feed_quantity>0),yield_quantity integer not null check(yield_quantity>0),produce_sell_price integer not null check(produce_sell_price>=0)
);
create table public.farm_building_types(
 id text primary key references public.island_shop_items(id),name text not null,
 unit_cost integer not null check(unit_cost>0),limits jsonb not null check(jsonb_typeof(limits)='array' and jsonb_array_length(limits)=6)
);
create table app_private.farm_crop_jobs(
 user_id uuid not null,item_id text not null,crop_id text not null references public.farm_crops(id),
 planted_at timestamptz not null default now(),ready_at timestamptz not null,
 primary key(user_id,item_id),foreign key(user_id,item_id) references app_private.player_island_items(user_id,id) on delete cascade,
 check(ready_at>planted_at)
);
create table app_private.farm_animal_jobs(
 user_id uuid not null,item_id text not null,animal_id text not null references public.farm_animal_types(id),
 fed_at timestamptz not null default now(),ready_at timestamptz not null,
 primary key(user_id,item_id),foreign key(user_id,item_id) references app_private.player_island_items(user_id,id) on delete cascade,
 check(ready_at>fed_at)
);
alter table public.farm_crops enable row level security;
alter table public.farm_animal_types enable row level security;
alter table public.farm_building_types enable row level security;
alter table app_private.farm_crop_jobs enable row level security;
alter table app_private.farm_animal_jobs enable row level security;
revoke all on public.farm_crops,public.farm_animal_types,public.farm_building_types,app_private.farm_crop_jobs,app_private.farm_animal_jobs from anon,authenticated;
grant select on public.farm_crops,public.farm_animal_types,public.farm_building_types to authenticated;
create policy farm_crops_read on public.farm_crops for select to authenticated using(true);
create policy farm_animals_read on public.farm_animal_types for select to authenticated using(true);
create policy farm_buildings_read on public.farm_building_types for select to authenticated using(true);
create unique index player_island_one_core_building on app_private.player_island_items(user_id,item_id) where item_id in('farm-office','farm-store','farm-barn');
commit;
