-- Apply after 14. Requested reset: deletes ALL legacy fishing attempts and rarity counters.
-- Wallets, bait counts, gold history, tanks and backgrounds remain intact.
begin;
truncate table public.fishing_attempts;
create type public.collectible_kind as enum('fish','trash','structure','map');
create table public.collectible_species (
 id text primary key,kind public.collectible_kind not null,name text not null,description text not null,
 swim_y_min numeric,swim_y_max numeric,speed numeric not null default 0 check(speed between 0 and 0.5),
 size integer not null check(size between 16 and 180),rarity public.game_rarity,
 sprite_paths text[] not null default '{}',thumbnail_path text not null,sell_price integer not null check(sell_price between 0 and 1000000),
 check((kind in ('structure','map') and swim_y_min is null and swim_y_max is null and speed=0) or
 (kind in ('fish','trash') and swim_y_min>=0 and swim_y_max<=1 and swim_y_min<=swim_y_max and swim_y_min is not null and swim_y_max is not null and speed>0)),
 check((kind='fish' and cardinality(sprite_paths)=4) or(kind<>'fish' and cardinality(sprite_paths)=0)),
 check((kind in ('trash','map') and rarity is null) or(kind in ('fish','structure') and rarity is not null))
);
create table public.collectible_habitats (
 species_id text not null references public.collectible_species(id) on delete cascade,
 region_id text not null references public.regions(id),primary key(species_id,region_id)
);
create index collectible_habitats_region on public.collectible_habitats(region_id,species_id);
create unique index aquarium_tanks_id_owner on public.aquarium_tanks(id,user_id);
create table public.player_collectibles (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 species_id text not null references public.collectible_species(id),tank_id uuid, map_region_id text references public.regions(id),
 animation_seed integer not null default floor(random()*1000000)::integer,
 position_x numeric check(position_x between 0 and 1),position_y numeric check(position_y between 0 and 1),
 acquired_at timestamptz not null default now(),sold_at timestamptz,
 foreign key(tank_id,user_id) references public.aquarium_tanks(id,user_id)
);
create index collectibles_owner on public.player_collectibles(user_id,acquired_at desc) where sold_at is null;
create index collectibles_tank on public.player_collectibles(tank_id) where sold_at is null;
create table public.player_discoveries (
 user_id uuid not null references auth.users(id) on delete cascade,species_id text not null references public.collectible_species(id),
 discovered_at timestamptz not null default now(),primary key(user_id,species_id)
);
alter table public.fishing_attempts add column collectible_id uuid references public.player_collectibles(id);
alter table public.collectible_species enable row level security;
alter table public.collectible_habitats enable row level security;
alter table public.player_collectibles enable row level security;
alter table public.player_discoveries enable row level security;
revoke all on public.collectible_species,public.collectible_habitats,public.player_collectibles,public.player_discoveries from public,anon,authenticated;
grant select on public.collectible_species,public.collectible_habitats,public.player_collectibles,public.player_discoveries to authenticated;
create policy species_read on public.collectible_species for select to authenticated using(true);
create policy habitats_read on public.collectible_habitats for select to authenticated using(true);
create policy collectible_owner_read on public.player_collectibles for select to authenticated using(user_id=(select auth.uid()));
create policy discovery_owner_read on public.player_discoveries for select to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('collectibles','collectibles',true,10485760,array['image/png','image/webp']) on conflict(id) do nothing;

insert into public.collectible_species(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_paths,thumbnail_path,sell_price) values
('pongul','fish','퐁울복','퐁당섬의 잔잔한 물결을 따라 헤엄치는 작은 복어. 볼에 햇살 같은 무늬가 있어 언제나 웃는 것처럼 보인다.',0.20,0.65,0.055,72,'common',array['fish/swim-1.png','fish/swim-2.png','fish/swim-3.png','fish/swim-4.png'],'fish/thumbnail.png',40),
('moon-angelfish','fish','달물결 엔젤피쉬','은빛 초승달 무늬를 두른 푸른 엔젤피쉬. 길게 늘어진 지느러미가 달빛 물결처럼 흔들린다.',0.25,0.70,0.050,80,'rare',array['rare/swim-1.png','rare/swim-2.png','rare/swim-3.png','rare/swim-4.png'],'rare/thumbnail.png',180),
('star-ray','fish','별꼬리 가오리','보랏빛 날개에 작은 별무늬가 반짝이는 가오리. 어둑한 물속을 밤하늘처럼 미끄러져 간다.',0.30,0.75,0.045,88,'epic',array['epic/swim-1.png','epic/swim-2.png','epic/swim-3.png','epic/swim-4.png'],'epic/thumbnail.png',600),
('dawn-arowana','fish','여명 아로와나','진주빛 금색 비늘 사이로 새벽빛이 번지는 전설의 물고기. 긴 지느러미가 흘러가는 꿈처럼 물결을 감싼다.',0.20,0.70,0.040,96,'mythic',array['mythic/swim-1.png','mythic/swim-2.png','mythic/swim-3.png','mythic/swim-4.png'],'mythic/thumbnail.png',2000),
('glass-bottle','trash','잊힌 유리병','파도에 오래 씻겨 모서리가 둥글어진 빈 병. 작은 해초가 붙은 채 바닷속에서 빙글빙글 떠다닌다.',0.40,0.80,0.020,55,null,'{}','trash/thumbnail.png',8),
('coral-house','structure','산호빛 작은 집','분홍 산호와 매끈한 조약돌로 지어진 작은 집. 어항 한쪽에 놓으면 바다 친구들이 쉬어 가기 좋다.',null,null,0,94,'rare','{}','structures/thumbnail.png',120),
('ocean-map','map','잊힌 항로 조각','물결을 따라 떠내려온 작은 해도 조각. 아직 열리지 않은 항로의 이름과 바다의 기억이 담겨 있다.',null,null,0,60,null,'{}','map/thumbnail.png',0);
-- Sample content is available in every initial region; habitats support any subset later.
insert into public.collectible_habitats(species_id,region_id) select s.id,r.id from public.collectible_species s cross join public.regions r;

create function app_private.species_payload(p_species_id text,p_map_region_id text default null) returns jsonb language sql stable set search_path='' as $$
 select to_jsonb(s)||case when s.kind='map' then jsonb_build_object('name',r.name||' 지도 조각','rarity',r.rarity,'map_region_id',r.id) else '{}'::jsonb end
 from public.collectible_species s left join public.regions r on r.id=p_map_region_id where s.id=p_species_id
$$;
revoke all on function app_private.species_payload(text,text) from public,anon,authenticated;
create function app_private.owned_collectibles() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('species',app_private.species_payload(s.id,c.map_region_id)) order by c.acquired_at desc)
 from public.player_collectibles c join public.collectible_species s on s.id=c.species_id where c.user_id=v_uid and c.sold_at is null),'[]'::jsonb);
end $$;
revoke all on function app_private.owned_collectibles() from public,anon,authenticated;
create function app_private.collection_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('items',app_private.owned_collectibles(),
 'catalog',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object(
 'discovered',d.species_id is not null,'habitats',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name) order by r.sort_order) from public.collectible_habitats h join public.regions r on r.id=h.region_id where h.species_id=s.id),'[]'::jsonb)) order by s.kind,s.id),'[]'::jsonb)
 from public.collectible_species s left join public.player_discoveries d on d.species_id=s.id and d.user_id=v_uid));
end $$;
create or replace function app_private.fishing_state() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 return jsonb_build_object('baits',(select jsonb_agg(to_jsonb(b) order by b.sort_order) from public.fishing_baits b),'items',app_private.owned_collectibles());
end $$;
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
 if not v_decoration then v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer); end if;
 if v_decoration or v_rarity is not null then
  select c.id,r.id into v_species_id,v_map_region
  from public.collectible_species c join public.collectible_habitats h on h.species_id=c.id
  left join public.regions r on c.kind='map' and r.id=h.region_id
  where
   (h.region_id=p_region_id and ((v_decoration and c.kind='structure') or
     (not v_decoration and ((c.kind='fish' and c.rarity=v_rarity) or(c.kind='trash' and v_rarity='common')))))
   or (not v_decoration and c.kind='map' and r.requires_map_fragment and r.rarity=v_rarity
     and not exists(select 1 from public.player_map_fragments f where f.user_id=v_uid and f.region_id=r.id))
  order by random() limit 1;  if not found then raise exception 'NO_COLLECTIBLE_FOR_REGION'; end if;
  select * into s from public.collectible_species where id=v_species_id;
  if s.kind<>'map' then
   perform app_private.aquarium_state();
   select id into v_tank from public.aquarium_tanks where user_id=v_uid and is_default;
  else
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
create function public.collection_state() returns jsonb language sql security invoker set search_path='' as $$select app_private.collection_state()$$;
revoke all on function app_private.collection_state(),public.collection_state() from public,anon;
grant execute on function app_private.collection_state(),public.collection_state() to authenticated;

update public.fishing_baits set effect_description='물고기 대신 서식 지역의 장식물을 반드시 끌어올린다. 획득한 구조물은 첫 어항에 보관된다.' where id='bait_magnet';
drop table public.player_catch_counts;
create or replace function app_private.aquarium_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.player_aquariums(user_id) values(v_uid) on conflict do nothing;
 insert into public.aquarium_tanks(user_id,background_id,is_default)
 select v_uid,background_id,true from public.player_aquariums where user_id=v_uid
 on conflict(user_id) where is_default do nothing;
 return jsonb_build_object(
 'background',(select background_id from public.aquarium_tanks where user_id=v_uid and is_default),
 'tanks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from public.aquarium_tanks t where user_id=v_uid),'[]'::jsonb),
 'inhabitants',app_private.owned_collectibles(),
 'tankPrice',200,
 'owned',coalesce((select jsonb_agg(background_id) from public.owned_aquarium_backgrounds where user_id=v_uid),'[]'::jsonb),
 'catalog',(select jsonb_agg(to_jsonb(b) order by b.price) from public.aquarium_backgrounds b));
end $$;

notify pgrst,'reload schema';
commit;