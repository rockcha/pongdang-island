-- Pets are account-bound rewards, separate from aquarium collectibles and gifts.
create table app_private.pet_species(id text primary key,definition jsonb not null);
create table app_private.pet_jobs(id text primary key,definition jsonb not null);
create table app_private.owned_pets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 species_id text not null references app_private.pet_species(id),name text not null check(char_length(name) between 1 and 8),
 level integer not null default 0 check(level between 0 and 5),
 fullness integer not null default 100 check(fullness between 0 and 100),affection integer not null default 100 check(affection between 0 and 100),
 decay_at timestamptz not null default clock_timestamp(),job jsonb,created_at timestamptz not null default clock_timestamp());
create index owned_pets_owner on app_private.owned_pets(user_id,created_at,id);
create unique index owned_pets_one_job on app_private.owned_pets(user_id) where job is not null;
alter table app_private.prepared_fishing_casts add column pet_species_id text references app_private.pet_species(id);
alter table app_private.prepared_fishing_casts drop constraint prepared_reward_shape;
alter table app_private.prepared_fishing_casts add constraint prepared_reward_shape check(
 eligible=(num_nonnulls(species_id,map_piece_number,relic_id,pet_species_id)=1)
 and num_nonnulls(species_id,map_piece_number,relic_id,pet_species_id)<=1
 and (map_piece_number is null or (map_region_id is not null and species_id is null)));
create table app_private.pet_houses(user_id uuid primary key references auth.users(id) on delete cascade,active_id uuid references app_private.owned_pets(id) on delete set null,care jsonb);
create table app_private.pet_operations(user_id uuid not null references auth.users(id) on delete cascade,operation_id uuid not null,signature jsonb not null,primary key(user_id,operation_id));
alter table app_private.pet_species enable row level security;
alter table app_private.pet_jobs enable row level security;
alter table app_private.owned_pets enable row level security;
alter table app_private.pet_houses enable row level security;
alter table app_private.pet_operations enable row level security;
revoke all on app_private.pet_species,app_private.pet_jobs,app_private.owned_pets,app_private.pet_houses,app_private.pet_operations from public,anon,authenticated;

create function app_private.pet_catch_payload(p_id text) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',id,'name',definition->>'name','description',definition->>'description','kind','pet','rarity','common',
 'sell_price',1000,'thumbnail_path','/pets/'||id||'_v1_thumbnail.png','sprite_sheet_path',null,'movement_type','fixed','speed',0,'size',1,'swim_y_min',null,'swim_y_max',null)
 from app_private.pet_species where id=p_id
$$;

create function app_private.pet_house_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w jsonb;t bigint:=floor(extract(epoch from clock_timestamp())*1000);
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 return jsonb_build_object('version',1,'catalogVersion',2,'gold',w->'gold','food',coalesce((w->'inventory'->>'pet_food')::integer,0),'offset',0,'nextId',1,'lastNow',t,'notice','','lastCatch',null,
 'activeId',(select active_id from app_private.pet_houses where user_id=u),'care',(select care from app_private.pet_houses where user_id=u),
 'pets',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'speciesId',p.species_id,'name',p.name,'level',p.level,'fullness',p.fullness,'affection',p.affection,'decayAt',floor(extract(epoch from p.decay_at)*1000),'job',p.job) order by p.created_at,p.id) from app_private.owned_pets p where p.user_id=u),'[]'::jsonb));
end $$;

create function app_private.pet_house_command(p_operation_id uuid,p_command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.player_wallets;h app_private.pet_houses;p app_private.owned_pets;m app_private.owned_pets;
 previous jsonb;a text:=p_command->>'type';target uuid;j jsonb;c jsonb;t timestamptz:=clock_timestamp();ms bigint:=floor(extract(epoch from t)*1000);
 quantity integer;stock bigint;amount integer;lo integer;hi integer;job_key text;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_command is null then raise exception 'INVALID_TRADE';end if;
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 select signature into previous from app_private.pet_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if previous is distinct from p_command then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.pet_house_state()||jsonb_build_object('delta',0,'replayed',true);
 end if;
 if exists(select 1 from public.gold_transactions where user_id=u and operation_id=p_operation_id) then raise exception 'OPERATION_CONFLICT';end if;
 insert into app_private.pet_houses(user_id) values(u) on conflict do nothing;
 select * into h from app_private.pet_houses where user_id=u for update;
 -- Lazy decay preserves fractional ten-minute intervals, including offline/stored/working pets.
 update app_private.owned_pets set fullness=greatest(0,fullness-floor(extract(epoch from(t-decay_at))/600)::integer),
 affection=greatest(0,affection-floor(extract(epoch from(t-decay_at))/600)::integer),
 decay_at=decay_at+floor(extract(epoch from(t-decay_at))/600)*interval '10 minutes' where user_id=u and decay_at<=t-interval '10 minutes';
 if h.care is not null and a not in ('complete-care','buy-food') then raise exception 'PET_BUSY';end if;
 if a='buy-food' then
  quantity:=(p_command->>'quantity')::integer;
  if quantity is null or quantity not between 1 and 99 then raise exception 'INVALID_QUANTITY';end if;
  amount:=50*quantity;stock:=coalesce((w.inventory->>'pet_food')::bigint,0)+quantity;
  if w.gold<amount then raise exception 'INSUFFICIENT_GOLD';end if;
  if stock>1000000000 then raise exception 'INVENTORY_LIMIT';end if;
  update public.player_wallets set gold=gold-amount,inventory=jsonb_set(inventory,'{pet_food}',to_jsonb(stock::integer)),updated_at=t where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','pet:food',-amount);
 elsif a='select' then
  target:=(p_command->>'id')::uuid;
  if target is not null and not exists(select 1 from app_private.owned_pets where id=target and user_id=u) then raise exception 'PET_NOT_FOUND';end if;
  update app_private.pet_houses set active_id=target where user_id=u;
 elsif a='complete-care' then
  c:=h.care;
  if c is not null and c->>'id'=p_command->>'id' then
   if ms<(c->>'endsAt')::bigint then raise exception 'PET_CARE_TOO_EARLY';end if;
   target:=(c->>'petId')::uuid;
   if c->>'action'='feed' then
    if coalesce((w.inventory->>'pet_food')::integer,0)<1 then raise exception 'NO_PET_FOOD';end if;
    update public.player_wallets set inventory=jsonb_set(inventory,'{pet_food}',to_jsonb((inventory->>'pet_food')::integer-1)),updated_at=t where user_id=u;
    update app_private.owned_pets set fullness=least(100,fullness+50) where id=target and user_id=u;
   else update app_private.owned_pets set affection=least(100,affection+40) where id=target and user_id=u;end if;
   update app_private.pet_houses set care=null where user_id=u;
  end if;
 else
  target:=case when a='enhance' then (p_command->>'targetId')::uuid when a in ('care','feed','start-job') then h.active_id else (p_command->>'id')::uuid end;
  select * into p from app_private.owned_pets where id=target and user_id=u for update;
  if not found then raise exception 'PET_NOT_FOUND';end if;
  if p.job is not null and a not in ('claim-job','cancel-job') then raise exception 'PET_WORKING';end if;
  if a='rename' then
   if char_length(trim(p_command->>'name')) not between 1 and 8 or p_command->>'name' is null then raise exception 'INVALID_PET_NAME';end if;
   update app_private.owned_pets set name=trim(p_command->>'name') where id=p.id;
  elsif a in ('care','feed') then
   if a='care' and coalesce(p_command->>'action','') not in ('stroke','bath','sleep','play') then raise exception 'INVALID_PET_CARE';end if;
   if a='feed' and coalesce((w.inventory->>'pet_food')::integer,0)<1 then raise exception 'NO_PET_FOOD';end if;
   update app_private.pet_houses set care=jsonb_build_object('id',p_operation_id,'petId',p.id,'action',case when a='feed' then 'feed' else p_command->>'action' end,'endsAt',ms+3000) where user_id=u;
  elsif a='sell' then
   if w.gold>999999000 then raise exception 'GOLD_LIMIT';end if;
   delete from app_private.owned_pets where id=p.id;
   update public.player_wallets set gold=gold+1000,updated_at=t where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell','pet:'||p.id,1000);
  elsif a='enhance' then
   select * into m from app_private.owned_pets where id=(p_command->>'materialId')::uuid and user_id=u for update;
   if not found or m.id=p.id or m.species_id<>p.species_id or m.level<>0 or m.job is not null or p.level>=5 or p.level is distinct from (p_command->>'expectedLevel')::integer then raise exception 'INVALID_PET_MATERIAL';end if;
   delete from app_private.owned_pets where id=m.id;
   update app_private.owned_pets set level=level+1 where id=p.id;
  elsif a='start-job' then
   if exists(select 1 from app_private.owned_pets where user_id=u and job is not null) then raise exception 'PET_JOB_ACTIVE';end if;
   if p.fullness<80 or p.affection<80 then raise exception 'PET_NEEDS_LOW';end if;
   select definition into j from app_private.pet_jobs where id=p_command->>'jobId';
   if j is null or j->>'speciesId'<>p.species_id then raise exception 'INVALID_PET_JOB';end if;
   lo:=round((j->>'min')::numeric*(100+3*p.level)/100);hi:=round((j->>'max')::numeric*(100+3*p.level)/100);
   update app_private.owned_pets set job=jsonb_build_object('id',j->>'id','runId',p_operation_id,'startedAt',ms,'endsAt',ms+(j->>'minutes')::bigint*60000,'minReward',lo,'maxReward',hi,'reward',lo+floor(random()*(hi-lo+1))::integer) where id=p.id;
  elsif a in ('claim-job','cancel-job') then
   if p.job is null then raise exception 'PET_JOB_NOT_FOUND';end if;
   if a='cancel-job' then
    if p.job->>'runId' is distinct from p_command->>'runKey' then raise exception 'OPERATION_CONFLICT';end if;
    if ms>=(p.job->>'endsAt')::bigint then raise exception 'PET_JOB_ALREADY_COMPLETE';end if;
   else
    if ms<(p.job->>'endsAt')::bigint then raise exception 'PET_JOB_NOT_COMPLETE';end if;
    amount:=(p.job->>'reward')::integer;
    if w.gold>1000000000-amount then raise exception 'GOLD_LIMIT';end if;
    update public.player_wallets set gold=gold+amount,updated_at=t where user_id=u;
    insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'sell','pet-job:'||p.id,amount);
   end if;
   update app_private.owned_pets set job=null where id=p.id;
   update app_private.pet_houses set active_id=p.id where user_id=u;
  else raise exception 'INVALID_PET_COMMAND';end if;
 end if;
 insert into app_private.pet_operations(user_id,operation_id,signature) values(u,p_operation_id,p_command);
 return app_private.pet_house_state()||jsonb_build_object('delta',(select gold-w.gold from public.player_wallets where user_id=u),'replayed',false);
end $$;

create function public.pet_house_state() returns jsonb language sql set search_path='' as $$ select app_private.pet_house_state() $$;
create function public.pet_house_command(p_operation_id uuid,p_command jsonb) returns jsonb language sql set search_path='' as $$ select app_private.pet_house_command(p_operation_id,p_command) $$;
revoke all on function app_private.pet_catch_payload(text),app_private.pet_house_state(),app_private.pet_house_command(uuid,jsonb),public.pet_house_state(),public.pet_house_command(uuid,jsonb) from public,anon;
grant execute on function app_private.pet_house_state(),app_private.pet_house_command(uuid,jsonb),public.pet_house_state(),public.pet_house_command(uuid,jsonb) to authenticated;
create function app_private.buy_pet_food(p_operation_id uuid,p_quantity integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 r:=app_private.pet_house_command(p_operation_id,jsonb_build_object('type','buy-food','quantity',p_quantity));
 return app_private.get_gold_wallet()||jsonb_build_object('delta',r->'delta','replayed',r->'replayed');
end $$;
create function public.buy_pet_food(p_operation_id uuid,p_quantity integer) returns jsonb language sql set search_path='' as $$ select app_private.buy_pet_food(p_operation_id,p_quantity) $$;
revoke all on function app_private.buy_pet_food(uuid,integer),public.buy_pet_food(uuid,integer) from public,anon;
grant execute on function app_private.buy_pet_food(uuid,integer),public.buy_pet_food(uuid,integer) to authenticated;

insert into app_private.pet_species(id,definition) values
('sand-golem','{"id":"sand-golem","name":"모래뭉","description":"작은 돌손으로 마음을 전하는 느긋한 골렘.","color":"#c8a56b"}'::jsonb),
('wave-cat','{"id":"wave-cat","name":"파도냥","description":"물결 꼬리를 살랑이는 호기심 많은 고양이.","color":"#81b8c5"}'::jsonb),
('mochi-dragon','{"id":"mochi-dragon","name":"모찌룽","description":"간식과 낮잠을 좋아하는 말랑한 아기용.","color":"#e8b0a4"}'::jsonb),
('jelly-seal','{"id":"jelly-seal","name":"젤리코","description":"작은 지느러미로 박수치는 다정한 아기 물범.","color":"#b6cadb"}'::jsonb),
('maple-panda','{"id":"maple-panda","name":"단풍콩","description":"풍성한 꼬리를 안고 마음을 전하는 아기 레서판다.","color":"#c78d69","profile":"균형형","atlas":true}'::jsonb),
('poka-shark','{"id":"poka-shark","name":"포카롱","description":"작은 이빨로 활짝 웃는 듬직한 아기 상어.","color":"#8bb8c7","profile":"장시간형","atlas":true}'::jsonb),
('acorn-squirrel','{"id":"acorn-squirrel","name":"도토롱","description":"볼 가득 간식을 모으는 부지런한 아기 다람쥐.","color":"#b38c61","profile":"빠른 회전형","atlas":true}'::jsonb),
('hedge-pin','{"id":"hedge-pin","name":"토닥핀","description":"작은 앞발로 꼼꼼하게 정리하는 아기 고슴도치.","color":"#ac937c","profile":"안정형","atlas":true}'::jsonb),
('bonbon-triceratops','{"id":"bonbon-triceratops","name":"봉봉룡","description":"작은 뿔 세 개로 씩씩하게 돕는 아기 트리케라톱스.","color":"#a8c7ad","profile":"장시간형","atlas":true}'::jsonb),
('nurung-fox','{"id":"nurung-fox","name":"누룽콩","description":"커다란 귀로 이야기를 듣는 아기 사막여우.","color":"#d3b47f","profile":"빠른 회전형","atlas":true}'::jsonb),
('ppinu-penguin','{"id":"ppinu-penguin","name":"삐누","description":"짧은 날개를 가지런히 모으는 반듯한 아기 펭귄.","color":"#a5b3c3","profile":"균형·안정형","atlas":true}'::jsonb),
('coco-capybara','{"id":"coco-capybara","name":"코코팡","description":"느긋하게 곁을 지켜주는 아기 카피바라.","color":"#b79a7e","profile":"장시간 안정형","atlas":true}'::jsonb),
('peach-axolotl','{"id":"peach-axolotl","name":"복숭뇽","description":"꽃잎 아가미를 살랑이는 복숭아빛 아기 우파루파.","color":"#e6b6bb","profile":"중단시간형","atlas":true}'::jsonb),
('cloud-alpaca','{"id":"cloud-alpaca","name":"구름파카","description":"포실한 곱슬털에 온기를 품은 아기 알파카.","color":"#d5c8ae","profile":"중장시간형","atlas":true}'::jsonb);
insert into app_private.pet_jobs(id,definition) values
('sand-golem-clay','{"id":"sand-golem-clay","speciesId":"sand-golem","name":"도자기 공방 흙 고르기","minutes":120,"min":340,"max":420,"artwork":"bakery","description":"작은 돌손으로 도자기에 쓸 흙을 골라요."}'::jsonb),
('sand-golem-garden','{"id":"sand-golem-garden","speciesId":"sand-golem","name":"모래 정원 길 다지기","minutes":480,"min":1360,"max":1520,"artwork":"inn","description":"정원의 모래길을 단단하고 고르게 다져요."}'::jsonb),
('wave-cat-lost','{"id":"wave-cat-lost","speciesId":"wave-cat","name":"항구 분실물 분류","minutes":45,"min":135,"max":165,"artwork":"dock","description":"항구에 남겨진 물건을 주인별로 나눠요."}'::jsonb),
('wave-cat-cafe','{"id":"wave-cat-cafe","speciesId":"wave-cat","name":"해변 카페 테이블 정리","minutes":180,"min":540,"max":660,"artwork":"teahouse","description":"파도 소리를 들으며 찻잔을 정리해요."}'::jsonb),
('mochi-dragon-bread','{"id":"mochi-dragon-bread","speciesId":"mochi-dragon","name":"빵집 발효실 온기 돌보기","minutes":60,"min":180,"max":220,"artwork":"bakery","description":"반죽이 잘 부풀도록 포근한 온기를 지켜요."}'::jsonb),
('mochi-dragon-furnace','{"id":"mochi-dragon-furnace","speciesId":"mochi-dragon","name":"유리 공방 화로 지킴이","minutes":360,"min":1020,"max":1260,"artwork":"lighthouse","description":"작은 불씨가 고르게 타는지 살펴봐요."}'::jsonb),
('jelly-seal-ice','{"id":"jelly-seal-ice","speciesId":"jelly-seal","name":"빙과점 얼음 틀 정리","minutes":90,"min":270,"max":330,"artwork":"bakery","description":"깨끗한 얼음 틀을 차곡차곡 정리해요."}'::jsonb),
('jelly-seal-cold','{"id":"jelly-seal-cold","speciesId":"jelly-seal","name":"얼음 창고 야간 점검","minutes":600,"min":1700,"max":1900,"artwork":"market","description":"밤새 얼음 창고가 시원한지 확인해요."}'::jsonb),
('maple-panda-tea','{"id":"maple-panda-tea","speciesId":"maple-panda","name":"단풍 찻집 다과 포장","minutes":120,"min":340,"max":420,"artwork":"teahouse","description":"작은 앞발로 다과 상자에 리본을 매요."}'::jsonb),
('maple-panda-snacks','{"id":"maple-panda-snacks","speciesId":"maple-panda","name":"숲속 여관 간식 꾸러미 준비","minutes":300,"min":850,"max":1050,"artwork":"inn","description":"여행자를 위한 간식을 정성껏 담아요."}'::jsonb),
('poka-shark-buoy','{"id":"poka-shark-buoy","speciesId":"poka-shark","name":"해변 안전 부표 순찰","minutes":240,"min":680,"max":840,"artwork":"dock","description":"해변의 부표가 제자리에 있는지 살펴봐요."}'::jsonb),
('poka-shark-coral','{"id":"poka-shark-coral","speciesId":"poka-shark","name":"산호 양식장 야간 순찰","minutes":600,"min":1600,"max":2000,"artwork":"lighthouse","description":"조용한 밤바다의 어린 산호를 지켜요."}'::jsonb),
('acorn-squirrel-orders','{"id":"acorn-squirrel-orders","speciesId":"acorn-squirrel","name":"도토리 가게 주문 담기","minutes":30,"min":85,"max":115,"artwork":"market","description":"주문한 도토리를 빠짐없이 담아요."}'::jsonb),
('acorn-squirrel-mail','{"id":"acorn-squirrel-mail","speciesId":"acorn-squirrel","name":"숲속 우편함 편지 배달","minutes":90,"min":270,"max":330,"artwork":"post","description":"숲속 친구들에게 작은 편지를 전해요."}'::jsonb),
('hedge-pin-thread','{"id":"hedge-pin-thread","speciesId":"hedge-pin","name":"수선집 실패 정리","minutes":180,"min":540,"max":600,"artwork":"florist","description":"색색의 실을 엉키지 않게 정리해요."}'::jsonb),
('hedge-pin-seeds','{"id":"hedge-pin-seeds","speciesId":"hedge-pin","name":"씨앗 창고 재고 지킴이","minutes":480,"min":1360,"max":1520,"artwork":"inn","description":"내년에 심을 씨앗을 꼼꼼히 세어요."}'::jsonb),
('bonbon-triceratops-harvest','{"id":"bonbon-triceratops-harvest","speciesId":"bonbon-triceratops","name":"과수원 수확 바구니 운반","minutes":360,"min":1020,"max":1260,"artwork":"market","description":"잘 익은 과일 바구니를 조심히 옮겨요."}'::jsonb),
('bonbon-triceratops-fossil','{"id":"bonbon-triceratops-fossil","speciesId":"bonbon-triceratops","name":"화석 발굴장 흙더미 정리","minutes":720,"min":1920,"max":2400,"artwork":"observatory","description":"작은 화석이 다치지 않게 흙을 정리해요."}'::jsonb),
('nurung-fox-spice','{"id":"nurung-fox-spice","speciesId":"nurung-fox","name":"향신료 가게 주문 전달","minutes":45,"min":135,"max":165,"artwork":"market","description":"향긋한 주문 꾸러미를 손님에게 전해요."}'::jsonb),
('nurung-fox-oasis','{"id":"nurung-fox-oasis","speciesId":"nurung-fox","name":"오아시스 찻집 손님 안내","minutes":120,"min":360,"max":440,"artwork":"teahouse","description":"긴 귀로 손님의 이야기를 듣고 자리를 안내해요."}'::jsonb),
('ppinu-penguin-box','{"id":"ppinu-penguin-box","speciesId":"ppinu-penguin","name":"빙과점 아이스박스 정리","minutes":60,"min":180,"max":200,"artwork":"bakery","description":"아이스박스를 크기별로 반듯하게 정리해요."}'::jsonb),
('ppinu-penguin-temperature','{"id":"ppinu-penguin-temperature","speciesId":"ppinu-penguin","name":"냉장 창고 온도 확인","minutes":240,"min":720,"max":800,"artwork":"market","description":"차가운 창고의 온도를 꼼꼼히 기록해요."}'::jsonb),
('coco-capybara-towels','{"id":"coco-capybara-towels","speciesId":"coco-capybara","name":"온천 수건 바구니 돌보기","minutes":300,"min":880,"max":970,"artwork":"inn","description":"따뜻한 수건을 바구니에 채워 둬요."}'::jsonb),
('coco-capybara-yuzu','{"id":"coco-capybara-yuzu","speciesId":"coco-capybara","name":"유자탕 온도 지킴이","minutes":600,"min":1700,"max":1900,"artwork":"teahouse","description":"손님이 편안하도록 유자탕의 온기를 살펴요."}'::jsonb),
('peach-axolotl-sprouts','{"id":"peach-axolotl-sprouts","speciesId":"peach-axolotl","name":"수초 가게 새순 분류","minutes":90,"min":270,"max":330,"artwork":"florist","description":"여린 수초 새순을 크기별로 나눠요."}'::jsonb),
('peach-axolotl-lotus','{"id":"peach-axolotl-lotus","speciesId":"peach-axolotl","name":"연꽃 온실 물길 돌보기","minutes":180,"min":540,"max":660,"artwork":"inn","description":"연꽃 사이로 맑은 물이 흐르도록 돌봐요."}'::jsonb),
('cloud-alpaca-laundry','{"id":"cloud-alpaca-laundry","speciesId":"cloud-alpaca","name":"구름 세탁소 수건 개기","minutes":180,"min":510,"max":630,"artwork":"florist","description":"포근한 수건을 구름처럼 폭신하게 개어요."}'::jsonb),
('cloud-alpaca-bedding','{"id":"cloud-alpaca-bedding","speciesId":"cloud-alpaca","name":"별빛 여관 침구 준비","minutes":480,"min":1280,"max":1600,"artwork":"inn","description":"여행자의 잠자리에 깨끗한 이불을 준비해요."}'::jsonb);

CREATE OR REPLACE FUNCTION app_private.prepare_discovery_cast(p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean, p_discovery boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;w public.player_wallets;
 v_current text;v_required boolean;v_count integer;v_profile jsonb;v_started timestamptz;v_wait numeric;
 v_rarity public.game_rarity;v_species text;v_snapshot jsonb;v_reduction integer;
 v_pet text;v_weather jsonb;v_roll double precision;v_category text;v_reward record;v_map text;v_piece integer;v_relic text;
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
 -- Keep the exhausted discovery bait refusal before every random draw. Moving
 -- it after the category roll would permit unlimited free map/relic rerolls.
 if p_bait_id='bait_first_greeting' and not exists(select 1 from public.collectible_species s
  where app_private.collectible_available_at(s.id,statement_timestamp()) and s.kind in ('fish','trash','decoration')
  and not exists(select 1 from public.player_discoveries d where d.user_id=v_uid and d.species_id=s.id)) then
  raise exception 'ALL_COLLECTIBLES_DISCOVERED';
 end if;
 v_started:=clock_timestamp();
 v_profile:=app_private.fishing_bait_balance_at(p_bait_id,v_started);
 if p_bait_id in ('bait_pet_biscuit','bait_pet_macaron') then
 v_roll:=random()*10000;
 if v_roll < (case when p_bait_id='bait_pet_macaron' then 500 else 300 end) then
  select id into v_pet from app_private.pet_species order by random() limit 1;
  v_rarity:='common';v_snapshot:=app_private.pet_catch_payload(v_pet);
 else
  v_rarity:=case when v_roll<8500 then 'common'::public.game_rarity when v_roll<9700 then 'rare'::public.game_rarity when v_roll<9980 then 'epic'::public.game_rarity else 'mythic'::public.game_rarity end;
  v_species:=app_private.pick_profile_collectible(p_region_id,v_rarity,v_profile,true);
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  v_snapshot:=app_private.species_payload(v_species,null);
 end if;
 -- Absolute pet odds: weather, discovery categories and relic rarity bonuses do not reroll these ranges.
 v_profile:=v_profile||jsonb_build_object('pet_bp',case when p_bait_id='bait_pet_macaron' then 500 else 300 end,'common_bp',case when p_bait_id='bait_pet_macaron' then 8000 else 8200 end,'rare_bp',1200,'epic_bp',280,'mythic_bp',20);
else
v_weather:=app_private.fishing_weather_at(v_started);
 v_species:=app_private.pick_weather_collectible(v_weather->>'kind',v_started);
 if v_species is not null then
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,null);
 else
 v_rarity:=app_private.profile_fishing_rarity(v_profile);
 -- Grade-specific disjoint category ranges; absent categories return to the ordinary
 -- pool without increasing the other discovery category's chance.
 v_category:='ordinary';
 if p_discovery then
  v_roll:=random();
  v_category:=app_private.fishing_reward_category(v_roll,v_rarity);
 end if;
 if v_category<>'ordinary' then
  if v_category='map' then
   select * into v_reward from app_private.pick_progress_map_piece(v_rarity);
  else
   select * into v_reward from app_private.fishing_discovery_candidates(v_rarity)
   where category=v_category order by random() limit 1;
  end if;
  if found then
   if v_category='map' then
    v_map:=v_reward.region_id;v_piece:=v_reward.piece_number;
    v_snapshot:=app_private.fishing_map_piece_payload(v_map,v_piece,v_uid);
   else
    v_relic:=v_reward.reward_id;v_snapshot:=app_private.fishing_relic_payload(v_relic);
   end if;
  end if;
 end if;
 if v_snapshot is null then
  v_species:=app_private.pick_profile_collectible(p_region_id,v_rarity,v_profile,true);
  if v_species is null then raise exception 'NO_COLLECTIBLE_FOR_REGION';end if;
  select rarity into v_rarity from public.collectible_species where id=v_species;
  v_snapshot:=app_private.species_payload(v_species,null);
 end if;
 end if;
 end if;
 select r.wait_reduction_seconds into v_reduction from public.player_rod_loadouts l
 join public.player_fishing_rods o on o.user_id=l.user_id and o.rod_id=l.equipped_rod_id
 join public.fishing_rods r on r.id=o.rod_id where l.user_id=v_uid;
 v_wait:=greatest(1,13+12*random()-coalesce(v_reduction,0)-app_private.relic_bonus('fishing_wait_seconds'));
 insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,
  map_piece_number,relic_id,pet_species_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot,confirm_bite)
 values(v_uid,p_operation_id,p_region_id,p_bait_id,true,v_species,v_map,v_piece,v_relic,v_pet,v_rarity,v_snapshot,v_wait,4.5,'bait',v_started,
  case when p_confirm_bite then v_started+interval '24 hours'
   else v_started+make_interval(secs=>v_wait::double precision)+interval '3 minutes' end,
  v_profile||jsonb_build_object('weather',v_weather,'discovery_version',1,'relic_bait_refund_percent',least(5,greatest(0,app_private.relic_bonus('bait_refund_percent')))),p_confirm_bite) returning * into p;
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 return app_private.prepared_fishing_payload(p);
end $function$;
CREATE OR REPLACE FUNCTION app_private.finish_fishing(p_operation_id uuid, p_won boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();p app_private.prepared_fishing_casts;a public.fishing_attempts;
 v_item uuid;v_success boolean;v_result jsonb;v_first boolean:=false;v_refunded boolean:=false;v_refund_chance numeric;
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
  if p.pet_species_id is not null then
   perform app_private.get_gold_wallet();
   perform 1 from public.player_wallets where user_id=v_uid for update;
   insert into app_private.owned_pets(user_id,species_id,name) select v_uid,id,definition->>'name' from app_private.pet_species where id=p.pet_species_id returning id into v_item;
   if v_item is null then raise exception 'INVALID_PET';end if;
   -- A pet ID never enters the aquarium collectible_id foreign key.
   v_item:=null;
  elsif p.map_piece_number is not null then
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
   -- Follow the same wallet -> ownership lock order as equipment and sales.
   perform app_private.get_gold_wallet();
   perform 1 from public.player_wallets where user_id=v_uid for update;
   insert into app_private.player_fishing_relics as owned(user_id,relic_id) values(v_uid,p.relic_id)
    on conflict(user_id,relic_id) do update set quantity=owned.quantity+1;
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
 -- Refund only a successful consumed cast; the persisted result makes retries inert.
 v_refund_chance:=least(5,greatest(0,coalesce((p.bait_snapshot->>'relic_bait_refund_percent')::numeric,0)));
 if v_success and v_refund_chance>0 and random()*100<v_refund_chance then
  perform app_private.get_gold_wallet();
  perform 1 from public.player_wallets where user_id=v_uid for update;
  update public.player_wallets set inventory=jsonb_set(inventory,array[p.bait_id],
   to_jsonb(coalesce((inventory->>p.bait_id)::integer,0)+1)),updated_at=clock_timestamp() where user_id=v_uid;
  v_refunded:=true;
 end if;
 -- Experience/title triggers read this immutable reward snapshot.
 update app_private.prepared_fishing_casts set snapshot=p.snapshot where user_id=v_uid and operation_id=p_operation_id;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id)
 values(v_uid,p.operation_id,p.region_id,p.bait_id,case when v_success then p.rarity end,v_item) returning * into a;
 v_result:=jsonb_build_object('attempt',to_jsonb(a)||jsonb_build_object('species',case when v_success then p.snapshot end,
 'firstDiscovery',v_first),'replayed',false,'baitRefunded',v_refunded,'refundedBaitId',case when v_refunded then p.bait_id end,'failure_reason',case when v_success then null when clock_timestamp()>p.expires_at
  then 'expired' when not p.eligible then p.failure_reason else 'minigame' end);
 update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result=v_result where user_id=v_uid and operation_id=p_operation_id;
 return v_result;
end $function$;
CREATE OR REPLACE FUNCTION app_private.fishing_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_region text;v_discount integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select region_id into v_region from public.player_navigation where user_id=v_uid;
 v_region:=coalesce(v_region,'pongdang');
 v_discount:=app_private.relic_bonus('bait_discount_gold')::integer;
 return jsonb_build_object('weather',app_private.fishing_weather_schedule(),'regionId',v_region,'regionName',(select name from public.regions where id=v_region),
 'successChanceBp',10000,'mechanicsVersion',2,
 'prepared',(select app_private.prepared_fishing_payload(p) from app_private.prepared_fishing_casts p where user_id=v_uid and finished_at is null and expires_at>clock_timestamp()),
 'baits',(select jsonb_agg(to_jsonb(b)||app_private.regional_bait_odds(b.id,v_region)||case when b.id in ('bait_pet_biscuit','bait_pet_macaron') then jsonb_build_object('pet_bp',case when b.id='bait_pet_macaron' then 500 else 300 end,'common_bp',case when b.id='bait_pet_macaron' then 8000 else 8200 end,'rare_bp',1200,'epic_bp',280,'mythic_bp',20) else '{}'::jsonb end||jsonb_build_object('base_price',b.price,'price',case when b.price is null then null else (case when b.price>=40 then greatest(1,b.price-v_discount) else b.price end) end,'priceDiscountGold',case when b.price is null then 0 else b.price-(case when b.price>=40 then greatest(1,b.price-v_discount) else b.price end) end,'baseSuccessChanceBp',10000,'successChanceBp',10000,'mechanicsVersion',2) order by b.sort_order) from public.fishing_baits b));
end $function$;
-- Pet catch difficulty uses the common minigame profile, while ownership has no ordinary rarity.
create or replace function app_private.catch_experience(p_kind text,p_rarity text,p_automatic boolean default false)
returns integer language plpgsql immutable set search_path='' as $$
declare amount numeric;
begin
 if p_kind not in ('fish','trash','decoration','map','relic','pet') or p_kind is null
 or p_rarity not in ('common','rare','epic','mythic') or p_rarity is null or p_automatic is null then raise exception 'INVALID_EXPERIENCE_CATCH';end if;
 if p_kind='pet' then return case when p_automatic then 3 else 10 end;end if;
 amount:=case p_rarity when 'common' then 10 when 'rare' then 30 when 'epic' then 100 else 400 end;
 if p_kind='trash' then amount:=amount/2;end if;
 if p_automatic then amount:=amount*0.3;end if;
 return round(amount)::integer;
end $$;
notify pgrst, 'reload schema';

-- Pet snack baits are direct-fishing items; never silently consume them as ordinary trap bait.
CREATE OR REPLACE FUNCTION app_private.snapshot_trap_bait_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if coalesce((new.cargo->>'bait_pet_biscuit')::integer,0)>0 or coalesce((new.cargo->>'bait_pet_macaron')::integer,0)>0 then raise exception 'PET_BAIT_MANUAL_ONLY';end if;
 new.vessel_snapshot:=new.vessel_snapshot||jsonb_build_object('bait_rules_version',2,
  'bait_rules',(select jsonb_object_agg(b.id,app_private.fishing_bait_balance_at(b.id,new.departed_at)) from app_private.fishing_bait_balance_profiles b));
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.expedition_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('serverNow',clock_timestamp(),'testEnabled',(select instant_return_enabled from app_private.expedition_settings where id),
 'minutesPerBait',(app_private.trap_minutes_per_bait()*60-app_private.relic_bonus('trap_seconds_per_bait'))/60,
 'vessels',(select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',true)) from public.fishing_vessels v where id='dinghy'),
 'active',(select (to_jsonb(e)-'result')||jsonb_build_object('boosts',app_private.expedition_boosts_payload(e.id)) from public.fishing_expeditions e where user_id=u and claimed_at is null),
 'history',coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('boosts',app_private.expedition_boosts_payload(h.id)) order by departed_at desc) from (select * from public.fishing_expeditions where user_id=u and claimed_at is not null order by departed_at desc limit 5) h),'[]'::jsonb),
 'baits',(select jsonb_agg(to_jsonb(b) order by sort_order) from public.fishing_baits b where b.id not in ('bait_pet_biscuit','bait_pet_macaron')));
end $function$
;
