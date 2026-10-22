begin;
set local lock_timeout='5s';
-- Opt-in blueprints only: existing regions/maps retain their current purchase contract.
create table public.fishing_map_blueprints (
 region_id text primary key references public.regions(id),
 piece_count integer not null check(piece_count between 1 and 32),
 thumbnail_path text not null,
 enabled boolean not null default true
);
alter table public.fishing_map_blueprints enable row level security;
grant select on public.fishing_map_blueprints to authenticated;
revoke all on public.fishing_map_blueprints from anon;
create policy blueprint_read on public.fishing_map_blueprints for select to authenticated using(true);
create table app_private.player_fishing_map_pieces (
 user_id uuid not null references auth.users(id) on delete cascade,
 region_id text not null references public.fishing_map_blueprints(region_id),
 piece_number integer not null check(piece_number between 1 and 32),
 acquired_at timestamptz not null default clock_timestamp(),
 primary key(user_id,region_id,piece_number)
);
alter table app_private.player_fishing_map_pieces enable row level security;
revoke all on app_private.player_fishing_map_pieces from public,anon,authenticated;
alter table app_private.prepared_fishing_casts add column map_piece_number integer check(map_piece_number between 1 and 32);
alter table app_private.prepared_fishing_casts drop constraint prepared_fishing_casts_check;
alter table app_private.prepared_fishing_casts add constraint prepared_fishing_casts_check
 check(eligible=(species_id is not null or map_piece_number is not null));
alter table app_private.prepared_fishing_casts add constraint prepared_map_piece_shape
 check(map_piece_number is null or (map_region_id is not null and species_id is null and rarity='rare'));

-- This hook runs only for fresh reservations, never retries or already-paid casts.
create function app_private.prepare_fishing_map_piece() returns trigger
language plpgsql security definer set search_path='' as $$
declare chosen record;pieces integer;species integer;
begin
 if not new.eligible or new.rarity<>'rare' or not coalesce((new.bait_snapshot->'target_kinds') ? 'fish',false) then return new;end if;
 select count(*) into pieces from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number)
 where b.enabled and r.requires_map_fragment
 and not exists(select 1 from public.player_map_fragments f where f.user_id=new.user_id and f.region_id=b.region_id)
 and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=new.user_id and f.region_id=b.region_id and f.piece_number=n.piece_number);
 if pieces=0 then return new;end if;
 select count(*) into species from public.collectible_species s where s.rarity='rare'
 and (new.bait_snapshot->'target_kinds') ? s.kind::text
 and (new.bait_snapshot->>'effect_kind'<>'common_only' or not s.is_native)
 and (new.bait_snapshot->>'effect_kind'<>'undiscovered' or not exists(select 1 from public.player_discoveries d where d.user_id=new.user_id and d.species_id=s.id));
 -- Each missing piece occupies one slot in the rare catch pool, never an extra rarity roll.
 if random()*(species+pieces)>=pieces then return new;end if;
 select b.region_id,b.piece_count,b.thumbnail_path,r.name,n.piece_number into chosen
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number)
 where b.enabled and r.requires_map_fragment
 and not exists(select 1 from public.player_map_fragments f where f.user_id=new.user_id and f.region_id=b.region_id)
 and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=new.user_id and f.region_id=b.region_id and f.piece_number=n.piece_number)
 order by random() limit 1;
 if not found then return new;end if;
 new.map_region_id:=chosen.region_id;new.map_piece_number:=chosen.piece_number;
 new.species_id:=null;new.rarity:='rare';
 new.snapshot:=jsonb_build_object('id','map-piece-'||chosen.region_id||'-'||chosen.piece_number,
 'kind','map','rarity','rare','name',chosen.name||' 지도 조각 '||chosen.piece_number||'/'||chosen.piece_count,
 'description','모든 지도 조각을 모으면 해역이 열려요. 지도에서 수집 현황을 확인하세요.',
 'thumbnail_path',chosen.thumbnail_path,'sell_price',0,'speed',0,'size',1,
 'mapPiece',true,'mapRegionId',chosen.region_id,'pieceNumber',chosen.piece_number,'pieceCount',chosen.piece_count);
 return new;
end $$;
revoke all on function app_private.prepare_fishing_map_piece() from public,anon,authenticated;
create trigger prepare_map_piece before insert on app_private.prepared_fishing_casts
 for each row execute function app_private.prepare_fishing_map_piece();

-- Prevent a blueprint from accidentally turning a legacy sale map into fragment unlocks.
create function app_private.validate_fishing_map_blueprint() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.region_maps where region_id=new.region_id) then raise exception 'MAP_ALREADY_SOLD';end if;
 if not exists(select 1 from public.regions where id=new.region_id and requires_map_fragment) then raise exception 'MAP_MUST_BE_LOCKED';end if;
 if tg_op='UPDATE' and (new.region_id<>old.region_id or new.piece_count<>old.piece_count) then raise exception 'MAP_PIECES_IMMUTABLE';end if;
 return new;
end $$;
revoke all on function app_private.validate_fishing_map_blueprint() from public,anon,authenticated;
create trigger validate_map_blueprint before insert or update on public.fishing_map_blueprints
 for each row execute function app_private.validate_fishing_map_blueprint();
CREATE OR REPLACE FUNCTION app_private.buy_region_map(p_region_id text, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();m public.region_maps;w public.player_wallets;t public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if exists(select 1 from public.fishing_map_blueprints where region_id=p_region_id) then raise exception 'MAP_FOUND_BY_FISHING';end if;
 if p_operation_id is null or p_region_id is null then raise exception 'INVALID_TRADE';end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into t from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if t.action<>'buy' or t.item_id is distinct from 'map:'||p_region_id then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 select * into m from public.region_maps where region_id=p_region_id for share;
 if not found then raise exception 'INVALID_MAP';end if;
 if exists(select 1 from public.regions r where r.id=p_region_id and not r.requires_map_fragment)
 or exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'MAP_ALREADY_OWNED';end if;
 if w.gold<m.price then raise exception 'INSUFFICIENT_GOLD';end if;
 update public.player_wallets set gold=gold-m.price,updated_at=now() where user_id=v_uid;
 insert into public.player_map_fragments(user_id,region_id) values(v_uid,p_region_id);
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','map:'||p_region_id,-m.price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-m.price);
end $function$
;
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
 if p_won and p.confirm_bite and p.fight_started_at is null then raise exception 'CAST_NOT_STARTED';end if;
 if p_won and clock_timestamp()<(case when p.fight_started_at is null
  then p.created_at+make_interval(secs=>p.wait_seconds::double precision+3)
  else p.fight_started_at+interval '3 seconds' end) then raise exception 'CAST_TOO_EARLY';end if;
 v_success:=p_won and p.eligible and clock_timestamp()<=p.expires_at;
 if v_success then
  if p.map_piece_number is not null then
   insert into app_private.player_fishing_map_pieces(user_id,region_id,piece_number) values(v_uid,p.map_region_id,p.map_piece_number) on conflict do nothing;
   if not exists(select 1 from public.fishing_map_blueprints b cross join lateral generate_series(1,b.piece_count) n(piece_number) where b.region_id=p.map_region_id and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=v_uid and f.region_id=b.region_id and f.piece_number=n.piece_number)) then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
  else
  if p.map_region_id is not null then
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,map_region_id) values(v_uid,p.species_id,p.map_region_id) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,p.species_id) on conflict do nothing;
 end if;
 end if;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=v_item and evidence.user_id=v_uid),false)),
 'replayed',false,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.map_shop_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(jsonb_build_object(
 'region_id',r.id,'name',r.name||' 지도','description',r.description,'price',m.price,'thumbnail_path',m.thumbnail_path,
 'owned',not r.requires_map_fragment or exists(select 1 from public.player_map_fragments f where f.user_id=auth.uid() and f.region_id=r.id)
 ) order by r.sort_order,r.id),'[]'::jsonb) from public.region_maps m join public.regions r on r.id=m.region_id where not exists(select 1 from public.fishing_map_blueprints b where b.region_id=r.id)));
end $function$
;
CREATE OR REPLACE FUNCTION app_private.region_map()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 insert into public.player_navigation(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('currentRegion',(select region_id from public.player_navigation where user_id=v_uid),
 'canTestLocks',coalesce((select test_lock_controls from app_private.region_settings where id),false),
 'regions',(select jsonb_agg((to_jsonb(r)-'rarity')||jsonb_build_object('map_image_path',coalesce(b.thumbnail_path,m.thumbnail_path),
 'unlocked',not r.requires_map_fragment or f.region_id is not null,'hasFragment',f.region_id is not null,'mapPieceCount',b.piece_count,'mapPieces',(select coalesce(jsonb_agg(p.piece_number order by p.piece_number),'[]'::jsonb) from app_private.player_fishing_map_pieces p where p.user_id=v_uid and p.region_id=r.id)) order by r.sort_order)
 from public.regions r left join public.player_map_fragments f on f.region_id=r.id and f.user_id=v_uid
 left join public.region_maps m on m.region_id=r.id left join public.fishing_map_blueprints b on b.region_id=r.id));
end $function$
;

notify pgrst,'reload schema';
commit;
