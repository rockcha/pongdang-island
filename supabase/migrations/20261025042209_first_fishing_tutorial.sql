-- Only accounts created after installation enroll. Existing players are never
-- backfilled, including older Auth accounts that set their nickname later.
create table app_private.first_fishing_settings (
 id boolean primary key default true check(id),
 eligible_from timestamptz not null default clock_timestamp()
);
insert into app_private.first_fishing_settings(id) values(true);
alter table app_private.first_fishing_settings enable row level security;
revoke all on app_private.first_fishing_settings from public,anon,authenticated;

create table app_private.first_fishing_tutorials (
 user_id uuid primary key references auth.users(id) on delete cascade,
 step text not null default 'ready' check(step in('ready','fishing','caught','completed')),
 collectible_id uuid unique,
 started_at timestamptz,
 ready_at timestamptz,
 caught_at timestamptz,
 completed_at timestamptz,
 check((step='ready' and collectible_id is null and started_at is null and ready_at is null and caught_at is null and completed_at is null)
 or (step='fishing' and collectible_id is null and started_at is not null and ready_at is not null and caught_at is null and completed_at is null)
 or (step='caught' and collectible_id is not null and caught_at is not null and completed_at is null)
 or (step='completed' and collectible_id is not null and caught_at is not null and completed_at is not null))
);
alter table app_private.first_fishing_tutorials enable row level security;
revoke all on app_private.first_fishing_tutorials from public,anon,authenticated;

create function app_private.enroll_first_fishing_tutorial() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users u cross join app_private.first_fishing_settings s
  where u.id=new.id and s.id and u.created_at>=s.eligible_from) then
  insert into app_private.first_fishing_tutorials(user_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function app_private.enroll_first_fishing_tutorial() from public,anon,authenticated;
create trigger enroll_first_fishing_tutorial after insert on public.player_profiles
for each row execute function app_private.enroll_first_fishing_tutorial();

-- Protect the one introductory catch across every sale, gift and crafting RPC.
-- A successful placement completes the tutorial in the same transaction.
create function app_private.protect_first_fishing_catch() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from app_private.first_fishing_tutorials t
  where t.collectible_id=old.id and t.completed_at is null) then
  if tg_op='DELETE' then
   -- Permit Auth's account-deletion cascade without permitting reward recycling.
   if exists(select 1 from auth.users where id=old.user_id) then raise exception 'FIRST_FRIEND_PLACE_REQUIRED';end if;
   return old;
  end if;
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
   or new.species_id is distinct from old.species_id or new.sold_at is not null
   or new.consumed_at is not null or new.escrow_gift_id is not null
   then raise exception 'FIRST_FRIEND_PLACE_REQUIRED';end if;
  if new.tank_id is not null and not exists(select 1 from public.aquarium_tanks where id=new.tank_id and user_id=old.user_id)
   then raise exception 'TANK_NOT_FOUND';end if;
 end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end $$;
revoke all on function app_private.protect_first_fishing_catch() from public,anon,authenticated;
create trigger protect_first_fishing_catch before update or delete on public.player_collectibles
for each row execute function app_private.protect_first_fishing_catch();

create function app_private.complete_first_fishing_placement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.tank_id is not null and new.sold_at is null and new.escrow_gift_id is null and new.consumed_at is null then
  update app_private.first_fishing_tutorials set step='completed',completed_at=clock_timestamp()
  where collectible_id=new.id and user_id=new.user_id and step='caught';
 end if;
 return new;
end $$;
revoke all on function app_private.complete_first_fishing_placement() from public,anon,authenticated;
create trigger complete_first_fishing_placement after update of tank_id on public.player_collectibles
for each row execute function app_private.complete_first_fishing_placement();

create function app_private.first_fishing_tutorial(p_action text default 'state') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t app_private.first_fishing_tutorials;v_item uuid;v_aquarium jsonb;v_tank uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_action is null or p_action not in('state','start','catch','place') then raise exception 'INVALID_TUTORIAL_ACTION';end if;
 perform app_private.sync_player_profile();
 -- Serialize casts and their single award. Placement uses the existing tank /
 -- collectible lock order, without taking a progress-row lock first.
 if p_action in('start','catch') then perform pg_advisory_xact_lock(hashtextextended('first-fishing:'||u::text,0));end if;
 select * into t from app_private.first_fishing_tutorials where user_id=u;
 if not found then
  if p_action<>'state' then raise exception 'TUTORIAL_NOT_REQUIRED';end if;
  return jsonb_build_object('required',false,'step','inactive','species',null,'item',null,'tank',null,'aquarium',null,'readyAt',null,'serverNow',clock_timestamp());
 end if;
 if p_action='start' and t.step='ready' then
  update app_private.first_fishing_tutorials set step='fishing',started_at=clock_timestamp(),ready_at=clock_timestamp()+interval '2 seconds' where user_id=u returning * into t;
 elsif p_action='catch' and t.step not in('caught','completed') then
  if t.step<>'fishing' then raise exception 'TUTORIAL_CAST_REQUIRED';end if;
  if clock_timestamp()<t.ready_at then raise exception 'TUTORIAL_TOO_EARLY';end if;
  insert into public.player_collectibles(user_id,species_id) values(u,'goldfin-croaker') returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(u,'goldfin-croaker') on conflict do nothing;
  update app_private.first_fishing_tutorials set step='caught',collectible_id=v_item,caught_at=clock_timestamp() where user_id=u returning * into t;
 elsif p_action='place' and t.step<>'completed' then
  if t.step<>'caught' then raise exception 'TUTORIAL_CATCH_REQUIRED';end if;
  v_aquarium:=app_private.aquarium_state();
  select id into v_tank from public.aquarium_tanks where user_id=u order by is_default desc,created_at,id limit 1;
  perform app_private.move_collectibles(array[t.collectible_id],v_tank);
  select * into t from app_private.first_fishing_tutorials where user_id=u;
  if t.step<>'completed' then raise exception 'TUTORIAL_PLACEMENT_REQUIRED';end if;
 end if;
 v_aquarium:=app_private.aquarium_state();
 select id into v_tank from public.aquarium_tanks where user_id=u order by is_default desc,created_at,id limit 1;
 return jsonb_build_object('required',t.completed_at is null,'step',t.step,
  'species',app_private.species_payload('goldfin-croaker',null),
  'item',(select to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(c.species_id,c.map_region_id)) from public.player_collectibles c where id=t.collectible_id and user_id=u),
  'tank',(select to_jsonb(a) from public.aquarium_tanks a where id=v_tank),
  'aquarium',case when t.step='completed' then v_aquarium else null end,
  'readyAt',t.ready_at,'serverNow',clock_timestamp());
end $$;
revoke all on function app_private.first_fishing_tutorial(text) from public,anon,authenticated;
grant execute on function app_private.first_fishing_tutorial(text) to authenticated;
create function public.first_fishing_tutorial(p_action text default 'state') returns jsonb
language sql security invoker set search_path='' as $$select app_private.first_fishing_tutorial(p_action)$$;
revoke all on function public.first_fishing_tutorial(text) from public,anon,authenticated;
grant execute on function public.first_fishing_tutorial(text) to authenticated;
