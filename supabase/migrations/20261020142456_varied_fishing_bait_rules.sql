begin;

alter table public.fishing_baits
 add column success_chance_bp integer check(success_chance_bp between 0 and 10000),
 add column fish_only boolean not null default false,
 add column alternating boolean not null default false;

-- Internal state: clients can neither read another player's phase nor advance it.
create table app_private.bait_cycles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 next_rarity public.game_rarity not null default 'common' check(next_rarity in ('common','rare'))
);
alter table app_private.bait_cycles enable row level security;
revoke all on app_private.bait_cycles from public,anon,authenticated;
create policy bait_cycles_owner on app_private.bait_cycles for select to authenticated using(user_id=(select auth.uid()));

create function app_private.consume_bait_cycle() returns public.game_rarity
language plpgsql set search_path='' as $$
declare r public.game_rarity;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 insert into app_private.bait_cycles(user_id,next_rarity) values(auth.uid(),'rare')
 on conflict(user_id) do update set next_rarity=case when bait_cycles.next_rarity='common' then 'rare'::public.game_rarity else 'common'::public.game_rarity end
 returning case when next_rarity='rare' then 'common'::public.game_rarity else 'rare'::public.game_rarity end into r;
 return r;
end $$;
revoke all on function app_private.consume_bait_cycle() from public,anon,authenticated;

create or replace function app_private.fishing_success_chance_bp(p_bait_id text) returns integer
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 return coalesce(b.success_chance_bp,case when p_bait_id='bait_safe' then 10000
 when p_bait_id in ('bait_grubby_magnet','bait_first_greeting','bait_magnet','bait_forbidden_star','bait_epic','bait_special') then 7000
 when p_bait_id='bait' then 3500 else 4000 end);
end $$;

create or replace function app_private.manual_fishing_success_chance_bp(p_bait_id text) returns integer
language plpgsql stable set search_path='' as $$
declare bonus integer;fixed integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select success_chance_bp into fixed from public.fishing_baits where id=p_bait_id;
 if fixed is not null then return fixed;end if;
 select r.failure_reduction_bp into bonus from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.id in ('bronze','calm');
 return least(10000,app_private.fishing_success_chance_bp(p_bait_id)+coalesce(bonus,0));
end $$;

create or replace function app_private.expedition_success_chance_bp(p_bait_id text,p_reduction integer) returns integer
language sql stable set search_path='' as $$
 select coalesce((select success_chance_bp from public.fishing_baits where id=p_bait_id),
 least(10000,app_private.fishing_success_chance_bp(p_bait_id)+greatest(0,coalesce(p_reduction,0))))
$$;

create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text) returns jsonb
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;r public.game_rarity;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 if not exists(select 1 from public.regions where id=p_region_id) then raise exception 'REGION_NOT_FOUND';end if;
 if b.effect_kind='decoration' then return jsonb_build_object('common_bp',0,'rare_bp',0,'epic_bp',0,'mythic_bp',0,'failure_bp',0);end if;
 if b.alternating then
  select next_rarity into r from app_private.bait_cycles where user_id=auth.uid();r:=coalesce(r,'common');
  return jsonb_build_object('common_bp',case when r='common' then 10000 else 0 end,'rare_bp',case when r='rare' then 10000 else 0 end,'epic_bp',0,'mythic_bp',0,'failure_bp',0,'nextRarity',r);
 end if;
 return jsonb_build_object('common_bp',b.common_bp,'rare_bp',b.rare_bp,'epic_bp',b.epic_bp,'mythic_bp',b.mythic_bp,'failure_bp',b.failure_bp);
end $$;

-- Fish-only pools never fall back to trash, decoration or another rarity.
create function app_private.pick_bait_fish(p_region text,p_rarity public.game_rarity,p_native boolean default false,p_manual boolean default false) returns text
language plpgsql set search_path='' as $$
declare ids text[];rod_region text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if not exists(select 1 from public.regions where id=p_region) then raise exception 'REGION_NOT_FOUND';end if;
 if p_manual then
  select r.region_id into rod_region from public.player_rod_loadouts l
  join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
  join public.fishing_rods r on r.id=o.rod_id where l.user_id=auth.uid() and r.native_bonus_bp>0;
 end if;
 select array_agg(id order by id) into ids from public.collectible_species where kind='fish' and rarity=p_rarity;
 return app_private.pick_habitat_group(ids,p_region,rod_region,case when p_native then 1.5 else 1 end,false);
end $$;
revoke all on function app_private.pick_bait_fish(text,public.game_rarity,boolean,boolean) from public,anon,authenticated;

create or replace function app_private.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;b public.fishing_baits;
 v_current text;v_required boolean;v_count integer;v_decoration boolean;v_eligible boolean;
 v_rarity public.game_rarity;v_species text;v_map text;v_snapshot jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if p.region_id<>p_region_id or p.bait_id<>p_bait_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.prepared_fishing_payload(p);
 end if;
 if exists(select 1 from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and finished_at is null;
 if found then
  if p.expires_at<=clock_timestamp() then perform app_private.finish_fishing(p.operation_id,false);
  else return app_private.prepared_fishing_payload(p);end if;
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 v_decoration:=b.effect_kind='decoration';
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 if p_bait_id='bait_first_greeting' and not exists(select 1 from public.collectible_species s where s.kind in ('fish','trash','decoration')
 and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)) then raise exception 'ALL_COLLECTIBLES_DISCOVERED';end if;
 -- Advance once per committed bait consumption, including failures, never retries.
 v_rarity:=case when b.alternating then app_private.consume_bait_cycle() else 'common'::public.game_rarity end;
 v_eligible:=random()<app_private.manual_fishing_success_chance_bp(p_bait_id)::numeric/10000;
 if v_eligible then
  if not v_decoration and not b.alternating then v_rarity:=app_private.resolve_regional_fishing(p_bait_id,p_region_id,floor(random()*10000)::integer);end if;
  if b.fish_only then v_species:=app_private.pick_bait_fish(p_region_id,v_rarity,false,true);
  elsif p_bait_id in ('bait_grubby_magnet','bait_sea_memory','bait_first_greeting') then v_species:=app_private.pick_special_bait_collectible(p_region_id,v_rarity,p_bait_id);
  else select q.species_id,q.map_region_id into v_species,v_map from app_private.pick_regional_collectible(p_region_id,v_rarity,v_decoration,floor(random()*10000)::integer) q;
  end if;
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,v_map);
 end if;
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,expires_at)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,v_eligible,v_species,v_map,v_rarity,v_snapshot,3+random()*2,4.5+random()*3,
 (array['bait','escape','wave'])[1+floor(random()*3)::integer],clock_timestamp()+interval '3 minutes') returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $$;

create or replace function app_private.expedition_pick(p_region text,p_bait text,p_native boolean,p_local_discovery boolean default false) returns text
language plpgsql set search_path='' as $$
declare b public.fishing_baits;r public.game_rarity;roll integer:=floor(random()*10000);ids text[];fallback boolean;
begin
 select * into strict b from public.fishing_baits where id=p_bait;
 r:=case when b.alternating then app_private.consume_bait_cycle()
 when roll<b.mythic_bp then 'mythic'::public.game_rarity when roll<b.mythic_bp+b.epic_bp then 'epic'::public.game_rarity
 when roll<b.mythic_bp+b.epic_bp+b.rare_bp then 'rare'::public.game_rarity else 'common'::public.game_rarity end;
 if b.fish_only then return app_private.pick_bait_fish(p_region,r,p_native,false);end if;
 with candidates as materialized (
 select s.id,s.rarity from public.collectible_species s where case
 when p_bait='bait_first_greeting' then s.kind in ('fish','trash','decoration') and not exists(select 1 from public.player_discoveries d where d.user_id=auth.uid() and d.species_id=s.id)
 and (not p_local_discovery or exists(select 1 from public.collectible_habitats h where h.species_id=s.id and h.region_id=p_region))
 when p_bait='bait_grubby_magnet' then s.kind='trash'
 when b.effect_kind='decoration' then s.kind='decoration' else s.kind in ('fish','trash') and s.rarity=r end
 ),pool as(select * from candidates c where b.effect_kind='decoration' or c.rarity=r or not exists(select 1 from candidates c2 where c2.rarity=r))
 select array_agg(id order by id),not coalesce(bool_or(rarity=r),false) into ids,fallback from pool;
 return app_private.pick_habitat_group(ids,p_region,null,(case when p_native then 1.5 else 1 end)*(case when p_bait='bait_sea_memory' then 3 else 1 end),fallback and b.effect_kind<>'decoration');
end $$;

create or replace function app_private.fishing_rod_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform app_private.get_gold_wallet();
 perform 1 from public.player_wallets where user_id=v_uid for update;
 insert into public.player_fishing_rods(user_id,rod_id) values(v_uid,'basic') on conflict do nothing;
 insert into public.player_rod_loadouts(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object(
 'owned',(select jsonb_agg(rod_id order by rod_id) from public.player_fishing_rods where user_id=v_uid),
 'selected',(select equipped_rod_id from public.player_rod_loadouts where user_id=v_uid),
 'catalog',(select jsonb_agg(to_jsonb(r) order by price,id) from public.fishing_rods r),
 'baits',app_private.fishing_state()->'baits');
end $$;

notify pgrst,'reload schema';
commit;
