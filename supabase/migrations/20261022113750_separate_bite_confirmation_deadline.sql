-- Keep legacy clients/casts on their existing clock. New confirmation casts
-- have a long abandonment deadline until an idempotent, authenticated start.
alter table app_private.prepared_fishing_casts
 add column if not exists confirm_bite boolean not null default false,
 add column if not exists fight_started_at timestamptz;

alter table app_private.prepared_fishing_casts
 add constraint prepared_fishing_fight_start_check check (
  fight_started_at is null or (confirm_bite and fight_started_at>=created_at)
 );

create or replace function app_private.prepared_fishing_payload(p app_private.prepared_fishing_casts)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('operation_id',p.operation_id,'region_id',p.region_id,'bait_id',p.bait_id,
 'eligible',p.eligible,'species',p.snapshot,'rarity',p.rarity,'wait_seconds',p.wait_seconds,
 'failure_at',p.failure_at,'failure_reason',p.failure_reason,'expires_at',p.expires_at,
 'finished',p.finished_at is not null,'result',p.result,'bait_profile',p.bait_snapshot,
 'confirm_bite',p.confirm_bite,'fight_started_at',p.fight_started_at)
$$;

create function app_private.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid,p_confirm_bite boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_confirm_bite is null then raise exception 'INVALID_TRADE';end if;
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
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT';end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND';end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION';end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED';end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT';end if;
 if p_bait_id='bait_first_greeting' and not exists(select 1 from public.collectible_species s where s.kind in ('fish','trash','decoration')
 and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)) then raise exception 'ALL_COLLECTIBLES_DISCOVERED';end if;
 v_started:=clock_timestamp();
 v_profile:=app_private.fishing_bait_balance_at(p_bait_id,v_started);
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 v_species:=app_private.pick_profile_collectible(p_region_id,v_rarity,v_profile,true);
 if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
 select rarity into v_rarity from public.collectible_species where id=v_species;
 v_snapshot:=app_private.species_payload(v_species,null);
 v_wait:=(v_profile->>'wait_min_seconds')::numeric
  +((v_profile->>'wait_max_seconds')::numeric-(v_profile->>'wait_min_seconds')::numeric)*(random()+random())/2;
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,null,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile,p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $$;

create or replace function app_private.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid)
returns jsonb language sql security definer set search_path='' as $$
 select app_private.prepare_fishing(p_region_id,p_bait_id,p_operation_id,false)
$$;

create function public.prepare_fishing(p_region_id text,p_bait_id text,p_operation_id uuid,p_confirm_bite boolean)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.prepare_fishing(p_region_id,p_bait_id,p_operation_id,p_confirm_bite)
  ||jsonb_build_object('server_now',clock_timestamp())
$$;

create function app_private.start_fishing_fight(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;v_started timestamptz;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id for update;
 if not found then raise exception 'CAST_NOT_FOUND';end if;
 if p.finished_at is not null then return app_private.prepared_fishing_payload(p);end if;
 if clock_timestamp()>=p.expires_at then
  perform app_private.finish_fishing(p.operation_id,false);
  select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id;
  return app_private.prepared_fishing_payload(p);
 end if;
 if not p.confirm_bite or p.fight_started_at is not null then return app_private.prepared_fishing_payload(p);end if;
 if clock_timestamp()<p.created_at+make_interval(secs=>p.wait_seconds::double precision) then raise exception 'CAST_TOO_EARLY';end if;
 v_started:=clock_timestamp();
 update app_private.prepared_fishing_casts set fight_started_at=v_started,expires_at=v_started+interval '3 minutes'
 where user_id=v_uid and operation_id=p_operation_id returning * into p;
 return app_private.prepared_fishing_payload(p);
end $$;

create function public.start_fishing_fight(p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.start_fishing_fight(p_operation_id)||jsonb_build_object('server_now',clock_timestamp())
$$;

create or replace function app_private.finish_fishing(p_operation_id uuid,p_won boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_won is null then raise exception 'INVALID_RESULT';end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 select * into p from app_private.prepared_fishing_casts where user_id=v_uid and operation_id=p_operation_id for update;
 if not found then raise exception 'CAST_NOT_FOUND';end if;
 if p.finished_at is not null then return p.result||jsonb_build_object('replayed',true);end if;
 if p_won and p.confirm_bite and p.fight_started_at is null then raise exception 'CAST_NOT_STARTED';end if;
 if p_won and clock_timestamp()<(case when p.fight_started_at is null
  then p.created_at+make_interval(secs=>p.wait_seconds::double precision+3)
  else p.fight_started_at+interval '3 seconds' end) then raise exception 'CAST_TOO_EARLY';end if;
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
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=v_item and evidence.user_id=v_uid),false)),
 'replayed',false,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $$;

revoke all on function app_private.prepare_fishing(text,text,uuid,boolean) from public,anon;
revoke all on function public.prepare_fishing(text,text,uuid,boolean) from public,anon;
revoke all on function app_private.start_fishing_fight(uuid) from public,anon;
revoke all on function public.start_fishing_fight(uuid) from public,anon;
grant execute on function app_private.prepare_fishing(text,text,uuid,boolean) to authenticated;
grant execute on function public.prepare_fishing(text,text,uuid,boolean) to authenticated;
grant execute on function app_private.start_fishing_fight(uuid) to authenticated;
grant execute on function public.start_fishing_fight(uuid) to authenticated;
notify pgrst,'reload schema';
