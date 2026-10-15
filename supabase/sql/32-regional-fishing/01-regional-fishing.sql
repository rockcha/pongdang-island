-- Apply after 31. Upload assets/storage-upload/new/regional-fishing/ first.
-- Repeatable; preserves ownership, placements, unlocks and operation IDs.
begin;
create or replace function app_private.apply_pongdang_native_region()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.name like '%퐁당%' and new.kind in ('fish','trash','decoration') then new.native_region_id:='pongdang';end if;
 return new;
end $$;
drop trigger if exists pongdang_native_region on public.collectible_species;
create trigger pongdang_native_region before insert or update of name,kind,native_region_id on public.collectible_species
 for each row execute function app_private.apply_pongdang_native_region();
revoke all on function app_private.apply_pongdang_native_region() from public,anon,authenticated;
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;
alter table public.collectible_species add constraint collectible_nonfish_common
 check(kind in ('fish','decoration','map') or rarity='common');

insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id)
values
 ('diver-pongdang','fish','잠수부 퐁당이','잠수복을 입고 퐁당 앞바다를 탐험하는 퐁당이. 둥근 헬멧 너머 미소를 지으며 물갈퀴와 꼬리를 움직여 헤엄친다.',.20,.75,.040,82,'epic','fish/epic/diver-pongdang-swimming_sprite.png','fish/epic/diver-pongdang-swimming_thumbnail.png',650,'pongdang'),
 ('pongdang-fish','fish','퐁당 물고기','살구빛 몸과 머리 위 분홍 불가사리가 퐁당이를 닮은 물고기. 퐁당 앞바다에서 둥근 지느러미를 팔랑이며 헤엄친다.',.25,.70,.045,66,'rare','fish/rare/pongdang-fish_sprite.png','fish/rare/pongdang-fish_thumbnail.png',180,'pongdang')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,
 speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,
 thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,native_region_id=excluded.native_region_id;

update public.collectible_species set native_region_id='pongdang'
where name like '%퐁당%' and kind in ('fish','trash','decoration');
delete from public.collectible_habitats h using public.collectible_species s
where h.species_id=s.id and s.name like '%퐁당%' and s.kind in ('fish','trash','decoration') and h.region_id<>'pongdang';
insert into public.collectible_habitats(species_id,region_id)
select id,'pongdang' from public.collectible_species where name like '%퐁당%' and kind in ('fish','trash','decoration')
on conflict do nothing;

insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price)
select 'map-'||r.id,'map',r.name||' 지도 조각',r.name||'의 풍경과 항로가 그려진 지도 조각. 아직 잠긴 바다로 향하는 길을 알려 준다.',
 null,null,0,60,r.rarity,null,'map/'||case r.rarity when 'common' then 'normal' else r.rarity::text end||'/map-'||r.id||'_thumbnail.png',0
from public.regions r
on conflict(id) do update set name=excluded.name,description=excluded.description,rarity=excluded.rarity,thumbnail_path=excluded.thumbnail_path;
-- Map habitat rows are destinations, not native habitats. Keep legacy owned
-- ocean-map individuals, but retire that template from future rolls.
delete from public.collectible_habitats where species_id='ocean-map';
delete from public.collectible_habitats h using public.collectible_species s
where h.species_id=s.id and s.kind='map' and s.id<>('map-'||h.region_id) and s.id in (select 'map-'||id from public.regions);
insert into public.collectible_habitats(species_id,region_id)
select 'map-'||id,id from public.regions on conflict do nothing;

create or replace function app_private.regional_bait_odds(p_bait_id text,p_region_id text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare b public.fishing_baits;v_rank integer;v_success integer;v_c integer;v_r integer;v_e integer;v_m integer;
begin
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select case rarity when 'common' then 0 when 'rare' then 1 when 'epic' then 2 else 3 end into v_rank from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if b.effect_kind='decoration' then return jsonb_build_object('common_bp',0,'rare_bp',0,'epic_bp',0,'mythic_bp',0,'failure_bp',0); end if;
 v_success:=10000-b.failure_bp;
 if b.common_bp>0 then
  v_r:=1300+300*v_rank;v_e:=180+80*v_rank;v_m:=20+20*v_rank;
 elsif b.rare_bp>0 then
  v_r:=9870-50*v_rank;v_e:=100+40*v_rank;v_m:=30+10*v_rank;
 elsif b.epic_bp>0 then
  v_r:=0;v_e:=9970-20*v_rank;v_m:=30+20*v_rank;
 else v_r:=0;v_e:=0;v_m:=10000;end if;
 -- Integer basis points; all rounding remainder goes to the lowest allowed tier.
 v_m:=floor(v_success::numeric*v_m/10000);v_e:=floor(v_success::numeric*v_e/10000);
 if b.common_bp>0 then v_r:=floor(v_success::numeric*v_r/10000);v_c:=v_success-v_r-v_e-v_m;
 elsif b.rare_bp>0 then v_c:=0;v_r:=v_success-v_e-v_m;
 elsif b.epic_bp>0 then v_c:=0;v_r:=0;v_e:=v_success-v_m;
 else v_c:=0;v_r:=0;v_e:=0;v_m:=v_success;end if;
 return jsonb_build_object('common_bp',v_c,'rare_bp',v_r,'epic_bp',v_e,'mythic_bp',v_m,'failure_bp',b.failure_bp);
end $$;
create or replace function app_private.resolve_regional_fishing(p_bait_id text,p_region_id text,p_roll integer)
returns public.game_rarity language plpgsql stable security invoker set search_path='' as $$
declare o jsonb;v_m integer;v_e integer;v_r integer;v_c integer;
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 o:=app_private.regional_bait_odds(p_bait_id,p_region_id);
 if exists(select 1 from public.fishing_baits where id=p_bait_id and effect_kind='decoration') then raise exception 'DECORATION_NOT_READY'; end if;
 v_m:=(o->>'mythic_bp')::integer;v_e:=(o->>'epic_bp')::integer;v_r:=(o->>'rare_bp')::integer;v_c:=(o->>'common_bp')::integer;
 if p_roll<v_m then return 'mythic';elsif p_roll<v_m+v_e then return 'epic';elsif p_roll<v_m+v_e+v_r then return 'rare';elsif p_roll<v_m+v_e+v_r+v_c then return 'common';end if;
 return null;
end $$;

create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql volatile security invoker set search_path='' as $$
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 if not p_decoration and p_map_roll<500 then
  return query select c.id,r.id from public.collectible_species c
   join public.collectible_habitats h on h.species_id=c.id join public.regions r on r.id=h.region_id
   where c.kind='map' and c.id='map-'||r.id and c.rarity=p_rarity and r.rarity=p_rarity and r.requires_map_fragment
    and not exists(select 1 from public.player_map_fragments f where f.user_id=auth.uid() and f.region_id=r.id)
   order by random() limit 1;
  if found then return;end if;
 end if;
 return query select c.id,null::text from public.collectible_species c join public.collectible_habitats h on h.species_id=c.id
 where h.region_id=p_region_id and ((p_decoration and c.kind='decoration') or(not p_decoration and c.kind in ('fish','trash') and c.rarity=p_rarity))
 order by random() limit 1;
end $$;
revoke all on function app_private.regional_bait_odds(text,text),app_private.resolve_regional_fishing(text,text,integer),app_private.pick_regional_collectible(text,public.game_rarity,boolean,integer) from public,anon,authenticated;

create or replace function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_region text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 return jsonb_build_object('regionId',v_region,'regionName',(select name from public.regions where id=v_region),'mapChanceBp',500,
  'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region) order by b.sort_order) from public.fishing_baits b));
end $$;

update public.fishing_baits set effect_description=case id
 when 'bait_special' then '실패 없이 최소 희귀를 보장해요. 상위 해역에서는 특급·신화 확률이 조금 높아져요.'
 when 'bait_epic' then '실패 없이 최소 특급을 보장해요. 상위 해역에서는 신화 확률이 조금 높아져요.'
 when 'bait_magnet' then '현재 해역에 서식하는 장식물을 반드시 획득해요. 지도는 나오지 않아요.'
 when 'bait_safe' then '기본 실패 확률을 상대적으로 20% 줄여요. 등급 확률은 해역에 따라 달라져요.'
 else '해역 등급이 높아질수록 희귀·특급·신화 확률이 조금 높아져요. 실패해도 미끼 1개를 소모해요.' end;

create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; s public.collectible_species;
 v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity; v_tank uuid; v_item uuid; v_decoration boolean; v_map_region text; v_species_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  select c.species_id,c.map_region_id into v_species_id,v_map_region from public.player_collectibles c where c.id=a.collectible_id;
  select * into s from public.collectible_species where id=v_species_id;
  return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',true);
 end if;
 select effect_kind='decoration' into v_decoration from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 if not v_decoration then v_rarity:=app_private.resolve_regional_fishing(p_bait_id,p_region_id,floor(random()*10000)::integer); end if;
 if v_decoration or v_rarity is not null then
  select q.species_id,q.map_region_id into v_species_id,v_map_region
  from app_private.pick_regional_collectible(p_region_id,v_rarity,v_decoration,floor(random()*10000)::integer) q;
  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind='map' then
   insert into public.player_map_fragments(user_id,region_id) values(v_uid,v_map_region) on conflict do nothing;
  end if;
  insert into public.player_collectibles(user_id,species_id,tank_id,map_region_id) values(v_uid,s.id,v_tank,v_map_region) returning id into v_item;
  insert into public.player_discoveries(user_id,species_id) values(v_uid,s.id) on conflict do nothing;
 end if;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,coalesce(s.rarity,(select rarity from public.regions where id=v_map_region)),v_item) returning * into a;
 return jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when s.id is null then null else app_private.species_payload(s.id,v_map_region) end),'replayed',false);
end $$;


create or replace function app_private.collection_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('items',app_private.owned_collectibles(),
 'catalog',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object(
 'discovered',d.species_id is not null,'habitats',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order)
 from public.collectible_habitats h join public.regions r on r.id=h.region_id where h.species_id=s.id),'[]'::jsonb)) order by s.kind,s.id),'[]'::jsonb)
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid where s.id<>'ocean-map'));
end $$;
notify pgrst,'reload schema';
commit;
