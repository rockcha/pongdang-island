begin;

alter table public.fishing_relics add column sell_price integer not null default 0 check(sell_price>=0);
-- Discovery remains in the collection even when current ownership is sold.
create table app_private.player_fishing_relic_discoveries (
 user_id uuid not null references auth.users(id) on delete cascade,
 relic_id text not null references public.fishing_relics(id),
 discovered_at timestamptz not null default now(),primary key(user_id,relic_id)
);
alter table app_private.player_fishing_relic_discoveries enable row level security;
revoke all on app_private.player_fishing_relic_discoveries from public,anon,authenticated;
grant select on app_private.player_fishing_relic_discoveries to authenticated;
create policy relic_discoveries_owner on app_private.player_fishing_relic_discoveries for select to authenticated using(user_id=(select auth.uid()));
insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) select user_id,relic_id from app_private.player_fishing_relics on conflict do nothing;


CREATE OR REPLACE FUNCTION app_private.finish_fishing(p_operation_id uuid, p_won boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;v_first boolean:=false;
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
   insert into app_private.player_fishing_map_pieces(user_id,region_id,piece_number)
    values(v_uid,p.map_region_id,p.map_piece_number) on conflict do nothing;
   v_first:=found;
   if not exists(select 1 from public.fishing_map_blueprints b cross join lateral generate_series(1,b.piece_count) n(piece_number)
    where b.region_id=p.map_region_id and not exists(select 1 from app_private.player_fishing_map_pieces f
     where f.user_id=v_uid and f.region_id=b.region_id and f.piece_number=n.piece_number)) then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   -- Capture real collected count after success, not the random piece number.
   p.snapshot:=p.snapshot||jsonb_build_object(
    'name',app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'name',
    'pieceFoundCount',(app_private.fishing_map_piece_payload(p.map_region_id,p.map_piece_number,v_uid)->>'pieceFoundCount')::integer);
  elsif p.relic_id is not null then
   insert into app_private.player_fishing_relics(user_id,relic_id) values(v_uid,p.relic_id) on conflict do nothing;
   insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(v_uid,p.relic_id) on conflict do nothing;
   v_first:=found;
  else
   if p.map_region_id is not null then
    insert into public.player_map_fragments(user_id,region_id) values(v_uid,p.map_region_id) on conflict do nothing;
   end if;
   insert into public.player_collectibles(user_id,species_id,map_region_id) values(v_uid,p.species_id,p.map_region_id) returning id into v_item;
   insert into public.player_discoveries(user_id,species_id) values(v_uid,p.species_id) on conflict do nothing;
   v_first:=coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence
    where evidence.collectible_id=v_item and evidence.user_id=v_uid),false);
  end if;
 end if;
 -- Experience/title triggers read this immutable reward snapshot.
 update app_private.prepared_fishing_casts set snapshot=p.snapshot where user_id=v_uid and operation_id=p_operation_id;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,
 'firstDiscovery',v_first),'replayed',false,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at
  then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$;

CREATE OR REPLACE FUNCTION app_private.collection_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_regions jsonb;v_catalog jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order),'[]'::jsonb)
 into v_regions from public.regions r;
 select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('discovered',d.species_id is not null,'habitats',v_regions)
  order by s.kind,s.id),'[]'::jsonb) into v_catalog
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid where s.kind<>'map';
 v_catalog:=v_catalog||coalesce((select jsonb_agg(app_private.fishing_map_piece_payload(b.region_id,n.piece_number,v_uid)
  ||jsonb_build_object('discovered',exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=v_uid
    and f.region_id=b.region_id and f.piece_number=n.piece_number)
   or exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=b.region_id),'habitats',v_regions)
  order by r.sort_order,n.piece_number)
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number) where b.enabled),'[]'::jsonb);
 v_catalog:=v_catalog||coalesce((select jsonb_agg(app_private.fishing_relic_payload(r.id)||jsonb_build_object(
  'discovered',exists(select 1 from app_private.player_fishing_relic_discoveries f where f.user_id=v_uid and f.relic_id=r.id),
  'habitats',v_regions) order by r.rarity,r.id) from public.fishing_relics r where r.enabled),'[]'::jsonb);
 return jsonb_build_object('items',app_private.owned_collectibles(),'catalog',v_catalog);
end $function$;

CREATE OR REPLACE FUNCTION app_private.relic_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('equippedId',(select relic_id from app_private.player_relic_loadouts where user_id=u),'changeFee',500,
 'relics',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('discovered',exists(select 1 from app_private.player_fishing_relic_discoveries d where d.user_id=u and d.relic_id=r.id),'owned',exists(select 1 from app_private.player_fishing_relics d where d.user_id=u and d.relic_id=r.id)) order by r.effect_kind,r.effect_value,r.id) from public.fishing_relics r where r.enabled),'[]'::jsonb));
end$function$;

CREATE OR REPLACE FUNCTION app_private.fishing_relic_payload(p_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id','relic-'||id,'kind','relic','rarity',rarity,'name',name,'description',description,
 'thumbnail_path',thumbnail_path,'sell_price',0,'speed',0,'size',1,'swim_y_min',null,'swim_y_max',null,
 'sell_price',sell_price,'sprite_sheet_path',null,'movement_type','fixed','is_native',false,'native_region_id',null,'relicId',id)
 from public.fishing_relics where id=p_id
$function$;


create function app_private.sell_relic(p_relic_id text,p_operation_id uuid,p_expected_price integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w public.player_wallets; previous public.gold_transactions; price integer; item text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_relic_id is null or p_expected_price is null then raise exception 'INVALID_OPERATION';end if;
 item:='relic-sale:'||p_relic_id;
 perform app_private.get_gold_wallet();select * into strict w from public.player_wallets where user_id=u for update;
 select * into previous from public.gold_transactions where user_id=u and operation_id=p_operation_id;
 if found then
  if previous.action<>'sell' or previous.item_id<>item or previous.delta<>p_expected_price then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.relic_state()||jsonb_build_object('replayed',true);
 end if;
 if exists(select 1 from app_private.player_relic_loadouts where user_id=u and relic_id=p_relic_id) then raise exception 'RELIC_EQUIPPED';end if;
 if not exists(select 1 from app_private.player_fishing_relics where user_id=u and relic_id=p_relic_id) then raise exception 'RELIC_NOT_OWNED';end if;
 select sell_price into price from public.fishing_relics where id=p_relic_id and enabled;
 if price is null or price<=0 then raise exception 'RELIC_NOT_SELLABLE';end if;
 if price<>p_expected_price then raise exception 'RELIC_PRICE_CHANGED';end if;
 if w.gold::bigint+price>1000000000 then raise exception 'GOLD_LIMIT';end if;
 -- Preserve legacy ownership first; acquisition from now on also records history.
 insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values(u,p_relic_id) on conflict do nothing;
 delete from app_private.player_fishing_relics where user_id=u and relic_id=p_relic_id;
 update public.player_wallets set gold=gold+price,updated_at=clock_timestamp() where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell',item,price);
 return app_private.relic_state()||jsonb_build_object('replayed',false);
end $$;
create function public.sell_relic(p_relic_id text,p_operation_id uuid,p_expected_price integer) returns jsonb
language sql security invoker set search_path='' as $$select app_private.sell_relic(p_relic_id,p_operation_id,p_expected_price)$$;
revoke all on function app_private.sell_relic(text,uuid,integer),public.sell_relic(text,uuid,integer) from public,anon;
grant execute on function app_private.sell_relic(text,uuid,integer),public.sell_relic(text,uuid,integer) to authenticated;
notify pgrst,'reload schema';

-- Generated from supabase/catalog/catalog.json. Review before migration deployment.

set constraints all deferred;
insert into public.fishing_relics ("id","name","description","rarity","thumbnail_path","enabled","effect_kind","effect_value","sell_price") values
('abundant-conch','풍요의 소라고둥','미끼생산소 동시 가동 가능 횟수 +1 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/abundant-conch_thumbnail.png',true,'bait_active_slots',1,1300),
('current-piercing-needle','물살을 가르는 바늘','낚시 대기 시간 1초 단축 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/current-piercing-needle_thumbnail.png',true,'fishing_wait_seconds',1,1300),
('eternal-water-clock','영원의 물시계','나만의 미끼 생산소 최대 제작 시간 +8시간 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/eternal-water-clock_thumbnail.png',true,'personal_bait_hours',8,3000),
('fish-calling-bell','물고기를 부르는 방울','통발 미끼당 대기 시간 30초 단축 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/fish-calling-bell_thumbnail.png',true,'trap_seconds_per_bait',30,200),
('golden-anchor-seal','황금 닻 인장','배 구매 가격 150골드 할인 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/golden-anchor-seal_thumbnail.png',true,'boat_discount_gold',150,1300),
('instant-fishing-hook','찰나를 낚는 낚싯바늘','낚시 대기 시간 2초 단축 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/instant-fishing-hook_thumbnail.png',true,'fishing_wait_seconds',2,3000),
('ocean-seed','바다가 품은 씨앗','미끼생산소 동시 가동 가능 횟수 +2 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/ocean-seed_thumbnail.png',true,'bait_active_slots',2,3000),
('old-captain-seal','낡은 선장의 인장','배 구매 가격 50골드 할인 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/old-captain-seal_thumbnail.png',true,'boat_discount_gold',50,200),
('primordial-ember','태초의 불씨','연료생산소 동시 가동 가능 횟수 +2 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/primordial-ember_thumbnail.png',true,'fuel_active_slots',2,3000),
('sea-king-shipwright-edict','해왕의 조선 칙서','배 구매 가격 400골드 할인 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/sea-king-shipwright-edict_thumbnail.png',true,'boat_discount_gold',400,3000),
('sea-king-summoning-bell','해왕의 부름종','통발 미끼당 대기 시간 3분 단축 · 장착 중에만 효과가 적용돼요.','mythic','relics/mythic/sea-king-summoning-bell_thumbnail.png',true,'trap_seconds_per_bait',180,3000),
('shell-hourglass','조개 모래시계','나만의 미끼 생산소 최대 제작 시간 +2시간 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/shell-hourglass_thumbnail.png',true,'personal_bait_hours',2,200),
('silver-osprey-feather','은빛 물수리 깃털','낚시 대기 시간 0.5초 단축 · 장착 중에만 효과가 적용돼요.','rare','relics/rare/silver-osprey-feather_thumbnail.png',true,'fishing_wait_seconds',0.5,200),
('still-wave-clock','멈춘 파도의 시계','나만의 미끼 생산소 최대 제작 시간 +4시간 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/still-wave-clock_thumbnail.png',true,'personal_bait_hours',4,1300),
('tide-bell','밀물의 종','통발 미끼당 대기 시간 1분 30초 단축 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/tide-bell_thumbnail.png',true,'trap_seconds_per_bait',90,1300),
('undying-furnace-heart','꺼지지 않는 화로심장','연료생산소 동시 가동 가능 횟수 +1 · 장착 중에만 효과가 적용돼요.','epic','relics/epic/undying-furnace-heart_thumbnail.png',true,'fuel_active_slots',1,1300)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","enabled"=excluded."enabled","effect_kind"=excluded."effect_kind","effect_value"=excluded."effect_value","sell_price"=excluded."sell_price";
notify pgrst, 'reload schema';

commit;
