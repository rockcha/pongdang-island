-- 퐁당섬 고유개체 5종 + 공통 신화 5종: 원격 SQL Editor용 한정 패치
-- 보관용 참고 패치: 2026-10-18 MCP 연결 DB에서 10종 등록과 서식지 수를 확인했습니다.
-- 전체 필드·실행 이력은 미검증입니다. 일반 설치 순서로 재실행하지 않습니다.
-- 조회 범위와 프로젝트 식별 한계: docs/db/REMOTE_REVIEW.md
-- 기존 원격 capture와 로컬 schema 차이는 docs/db/REMOTE_REVIEW.md 참고.
-- 현재 원격 호환성을 확인했다는 의미가 아닙니다. 낚시/편집 RPC와 migration history는 변경하지 않습니다.
-- 카탈로그 전체 migration/baseline 대신 이번 10종만 UPSERT합니다.
-- 이미지 19개는 업로드 및 공개 URL SHA-256 대조 완료.
begin;
set local lock_timeout = '5s';
set constraints all deferred;

do $$
begin
 if not exists(select 1 from public.regions where id='pongdang') then
  raise exception 'PONGDANG_REGION_REQUIRED';
 end if;
end $$;

-- 기존 원격 capture에는 이미 없는 제약. 남아 있는 환경에서도 희귀 쓰레기를 허용합니다.
alter table public.collectible_species drop constraint if exists collectible_nonfish_common;

insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('horizon-whale','fish','수평선고래','등 위에 해와 달이 머무는 긴 고래. 어느 바다에서든 수평선을 따라 조용히 헤엄치며 낮과 밤의 경계를 잇는다.','0.18','0.78','0.018',156,'mythic','fish/mythic/horizon-whale_thumbnail.png',1900,'fish/mythic/horizon-whale_sprite.png',null,'swim',true,'both'),
('name-eating-conch','fish','이름먹는 소라','잊힌 이름을 먹고 사는 오래된 소라. 껍데기의 금빛 문양은 누군가 이름을 부를 때마다 다른 모습으로 바뀐다.','0.80','0.93','0.018',110,'mythic','fish/mythic/name-eating-conch_thumbnail.png',1850,'fish/mythic/name-eating-conch_sprite.png',null,'crawl',true,'both'),
('orpheon-abyssal-hymn','fish','오르페온, 심연의 성가','은빛 현을 품은 고대의 바다뱀. 몸을 부드럽게 굽힐 때마다 현이 울려 심연을 잠재우는 성가가 흐른다.','0.18','0.78','0.018',168,'mythic','fish/mythic/orpheon-abyssal-hymn_thumbnail.png',2300,'fish/mythic/orpheon-abyssal-hymn_sprite.png',null,'swim',true,'both'),
('pongdang-octopus','fish','퐁당 문어','불가사리를 머리핀처럼 얹은 작은 문어. 짧고 통통한 촉수를 오므렸다 펴며 퐁당섬 앞바다를 떠다닌다.','0.18','0.78','0.025',72,'rare','fish/rare/pongdang-octopus_thumbnail.png',190,'fish/rare/pongdang-octopus_sprite.png','pongdang','pulse',true,'both'),
('pongdang-pufferfish','fish','퐁당 복어','크림색 몸과 살구빛 지느러미를 가진 통통한 복어. 머리 위 불가사리가 물살에 흔들리면 볼을 살짝 부풀린다.','0.18','0.78','0.035',64,'rare','fish/rare/pongdang-pufferfish_thumbnail.png',180,'fish/rare/pongdang-pufferfish_sprite.png','pongdang','swim',true,'both'),
('pongdang-seahorse','fish','퐁당 해마','민트빛 몸과 크림색 배를 가진 작은 해마. 머리의 불가사리를 모자처럼 쓰고 꼬리를 말아 물살에 몸을 맡긴다.','0.18','0.78','0.025',70,'rare','fish/rare/pongdang-seahorse_thumbnail.png',200,'fish/rare/pongdang-seahorse_sprite.png','pongdang','pulse',true,'both'),
('pongdang-whale','fish','퐁당 고래','살구빛 지느러미와 둥근 크림색 몸을 가진 퐁당섬의 고래. 머리 위 불가사리를 소중히 얹고 잔잔한 바다를 누빈다.','0.18','0.78','0.035',112,'epic','fish/epic/pongdang-whale-starfish-v1_thumbnail.png',620,'fish/epic/pongdang-whale-starfish-v1_sprite.png','pongdang','swim',true,'both'),
('pongi-plush','trash','퐁이 인형','머리에 불가사리를 단 퐁이 봉제 인형. 바닷물에 젖었지만 따뜻한 표정과 꼼꼼한 바느질 자국은 그대로 남아 있다.','0.18','0.78','0.035',68,'rare','trash/rare/pongi-plush_thumbnail.png',160,null,'pongdang','swim',false,'both'),
('star-swallowing-priest','fish','별을 삼킨 제사장','청동 의식 가면을 두른 문어 제사장. 반투명한 머릿속에는 삼킨 별들이 돌고, 긴 촉수와 망토는 물살을 따라 흐른다.','0.18','0.78','0.018',144,'mythic','fish/mythic/star-swallowing-priest_thumbnail.png',2200,'fish/mythic/star-swallowing-priest_sprite.png',null,'pulse',true,'both'),
('three-faced-oracle-fish','fish','신탁의 삼면어','세 개의 작은 가면을 등에 두른 신탁의 물고기. 가면마다 지나간 밀물과 지금의 바다, 다가올 썰물을 바라본다고 한다.','0.18','0.78','0.018',136,'mythic','fish/mythic/three-faced-oracle-fish_thumbnail.png',2100,'fish/mythic/three-faced-oracle-fish_sprite.png',null,'swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";

-- 이번 10종의 서식지만 갱신합니다. 보유 개체·선물·지갑과 다른 종은 유지합니다.
delete from public.collectible_habitats where species_id in ('horizon-whale','name-eating-conch','orpheon-abyssal-hymn','pongdang-octopus','pongdang-pufferfish','pongdang-seahorse','pongdang-whale','pongi-plush','star-swallowing-priest','three-faced-oracle-fish');
insert into public.collectible_habitats(species_id,region_id) values
('pongdang-octopus','pongdang'),
('pongdang-pufferfish','pongdang'),
('pongdang-seahorse','pongdang'),
('pongdang-whale','pongdang'),
('pongi-plush','pongdang');

-- 공통 신화는 이 원격 DB에 등록된 모든 해역에서 등장하도록 합니다.
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('horizon-whale','name-eating-conch','orpheon-abyssal-hymn','star-swallowing-priest','three-faced-oracle-fish');

-- 적용 결과: 10행. 퐁당 고유종은 서식지 1개, 공통 신화는 등록된 전체 해역 수입니다.
select s.id,s.name,s.kind,s.rarity,s.native_region_id,s.sell_price,
 count(h.region_id)::integer as habitat_count,
 array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s
left join public.collectible_habitats h on h.species_id=s.id
where s.id in ('horizon-whale','name-eating-conch','orpheon-abyssal-hymn','pongdang-octopus','pongdang-pufferfish','pongdang-seahorse','pongdang-whale','pongi-plush','star-swallowing-priest','three-faced-oracle-fish')
group by s.id order by s.rarity,s.name;
commit;
