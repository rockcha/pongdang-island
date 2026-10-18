-- Preserve existing prepared casts; only newly prepared casts use the new chance.
-- Include idempotent reservation setup for databases migrating from the frozen baseline.
-- Apply after 61. Repeatable. One paid cast: prepare -> play -> finish.
-- Existing attempts, ownership and operation ID history are preserved.
begin;
create or replace function app_private.fishing_success_chance_bp(p_bait_id text)
returns integer language plpgsql stable security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 return case when p_bait_id='bait_safe' then 10000 else 4000 end;
end $$;
revoke all on function app_private.fishing_success_chance_bp(text) from public,anon,authenticated;
create table if not exists app_private.prepared_fishing_casts(
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,region_id text not null references public.regions(id),
 bait_id text not null references public.fishing_baits(id),
 eligible boolean not null,species_id text references public.collectible_species(id),
 map_region_id text references public.regions(id),rarity public.game_rarity not null,
 snapshot jsonb,wait_seconds numeric not null check(wait_seconds between 3 and 5),
 failure_at numeric not null check(failure_at between 4 and 9),
 failure_reason text not null check(failure_reason in ('bait','escape','wave')),
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null,
 finished_at timestamptz,result jsonb,
 primary key(user_id,operation_id),check(eligible=(species_id is not null))
);
create unique index if not exists prepared_fishing_one_active on app_private.prepared_fishing_casts(user_id) where finished_at is null;
alter table app_private.prepared_fishing_casts enable row level security;
revoke all on app_private.prepared_fishing_casts from public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.prepared_fishing_payload(p app_private.prepared_fishing_casts)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('operation_id',p.operation_id,'region_id',p.region_id,'bait_id',p.bait_id,
 'eligible',p.eligible,'species',p.snapshot,'rarity',p.rarity,'wait_seconds',p.wait_seconds,
 'failure_at',p.failure_at,'failure_reason',p.failure_reason,'expires_at',p.expires_at,
 'finished',p.finished_at is not null,'result',p.result)
$function$;

CREATE OR REPLACE FUNCTION app_private.finish_fishing(p_operation_id uuid, p_won boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_won is null then raise exception 'INVALID_RESULT';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id for update;
 if not found then raise exception 'CAST_NOT_FOUND';end if;
 if p.finished_at is not null then return p.result||jsonb_build_object('replayed',true);end if;
 if p_won and clock_timestamp()<p.created_at+make_interval(secs=>p.wait_seconds::double precision+3) then raise exception 'CAST_TOO_EARLY';end if;
 v_success:=p_won and p.eligible and clock_timestamp()<=p.expires_at;
 if v_success then
  if p.map_region_id is not null then
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,map_region_id) values(v_uid,p.species_id,p.map_region_id) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,p.species_id) on conflict do nothing;
 end if;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end),
 'replayed',false,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$;

CREATE OR REPLACE FUNCTION app_private.prepare_fishing(p_region_id text, p_bait_id text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
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
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT';end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 -- Success is drawn once, independently of the conditional rarity roll.
 v_eligible:=random()<app_private.fishing_success_chance_bp(p_bait_id)::numeric/10000;
 v_rarity:='common';
 if v_eligible then
  if not v_decoration then v_rarity:=app_private.resolve_regional_fishing(p_bait_id,p_region_id,floor(random()*10000)::integer);end if;
  select q.species_id,q.map_region_id into v_species,v_map from app_private.pick_regional_collectible(p_region_id,v_rarity,v_decoration,floor(random()*10000)::integer) q;
  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,v_map);
 end if;
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,expires_at)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,v_eligible,v_species,v_map,v_rarity,v_snapshot,3+random()*2,
  4.5+random()*3,(array['bait','escape','wave'])[1+floor(random()*3)::integer],clock_timestamp()+interval '3 minutes') returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$;

-- Disable the obsolete one-step reward route; it must not bypass the 40% draw.
create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 raise exception 'FISHING_FLOW_UPDATED';
end $$;

create or replace function public.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select app_private.prepare_fishing(p_region_id,p_bait_id,p_operation_id)$$;
create or replace function public.finish_fishing(p_operation_id uuid,p_won boolean)
returns jsonb language sql security invoker set search_path='' as $$select app_private.finish_fishing(p_operation_id,p_won)$$;
revoke all on function app_private.prepared_fishing_payload(app_private.prepared_fishing_casts) from public,anon,authenticated;
revoke all on function app_private.prepare_fishing(text,text,uuid),app_private.finish_fishing(uuid,boolean),public.prepare_fishing(text,text,uuid),public.finish_fishing(uuid,boolean) from public,anon,authenticated;
grant execute on function app_private.prepare_fishing(text,text,uuid),app_private.finish_fishing(uuid,boolean),public.prepare_fishing(text,text,uuid),public.finish_fishing(uuid,boolean) to authenticated;

CREATE OR REPLACE FUNCTION app_private.fishing_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_region text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 return jsonb_build_object('regionId',v_region,'regionName',(select name from public.regions where id=v_region),
 'successChanceBp',4000,
 'prepared',(select app_private.prepared_fishing_payload(p) from app_private.prepared_fishing_casts p where user_id=v_uid and finished_at is null and expires_at>clock_timestamp()),
 'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region)||jsonb_build_object('successChanceBp',app_private.fishing_success_chance_bp(b.id)) order by b.sort_order) from public.fishing_baits b));
end $function$;
notify pgrst,'reload schema';
commit;
