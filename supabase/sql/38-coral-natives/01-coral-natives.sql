-- Apply after 37. Upload 11 PNGs from assets/storage-upload/new/20261015-133650/ first.
-- Repeatable; preserves owned individuals, discoveries and placements.
-- Deferred native-habitat constraints validate the single habitat at commit.
begin;
insert into public.collectible_species
 (id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction)
values
 ('coral-bean-shrimp','fish','산호콩 새우','작은 콩처럼 통통한 살구빛 몸에 하얀 점이 박혀 있다. 산호빛 여울의 산호 틈을 종종 걸으며 먹이를 찾는다.',0.85,0.94,0.018,48,'common','fish/normal/coral-bean-shrimp_sprite.png','fish/normal/coral-bean-shrimp_thumbnail.png',35,'coral','crawl',true,'both'),
 ('pinkchin-blenny','fish','분홍턱 베도라치','크림색 몸 아래 분홍빛 턱을 내민 작은 베도라치. 머리 위 짧은 산호 모양 더듬이를 흔들며 산호빛 여울을 살핀다.',0.5,0.83,0.032,54,'common','fish/normal/pinkchin-blenny_sprite.png','fish/normal/pinkchin-blenny_thumbnail.png',40,'coral','swim',true,'both'),
 ('flower-coral-seadragon','fish','꽃산호 해룡','길게 휘어진 몸을 따라 분홍 산호꽃을 닮은 돌기가 피어 있다. 산호빛 여울의 가지 사이를 조용히 스쳐 지나간다.',0.24,0.73,0.025,72,'rare','fish/rare/flower-coral-seadragon_sprite.png','fish/rare/flower-coral-seadragon_thumbnail.png',185,'coral','swim',true,'both'),
 ('coralfan-butterflyfish','fish','산호부채 나비고기','둥근 몸에 살구빛과 민트빛 무늬가 부채처럼 겹친다. 산호빛 여울의 물살을 타면 넓은 지느러미가 꽃잎처럼 펼쳐진다.',0.2,0.76,0.035,68,'rare','fish/rare/coralfan-butterflyfish_sprite.png','fish/rare/coralfan-butterflyfish_thumbnail.png',175,'coral','swim',true,'both'),
 ('coral-flower-anemone','decoration','산호꽃 말미잘','분홍 촉수 끝에 작은 꽃봉오리 같은 방울이 맺혀 있다. 산호빛 여울에서 자라난 꽃 한 송이를 어항에 옮겨 둔 듯하다.',null,null,0,62,'rare',null,'decorations/rare/coral-flower-anemone_thumbnail.png',165,'coral','fixed',false,'both'),
 ('coral-crowned-turtle','fish','산호왕관 거북','등껍질 위에 작은 산호 정원이 자라는 거북. 머리의 산호 왕관과 반투명 지느러미에 여울의 빛이 은은하게 번진다.',0.2,0.73,0.028,96,'epic','fish/epic/coral-crowned-turtle_sprite.png','fish/epic/coral-crowned-turtle_thumbnail.png',680,'coral','swim',true,'both')
on conflict(id) do update set
 kind=excluded.kind,name=excluded.name,description=excluded.description,
 swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,rarity=excluded.rarity,
 sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,sell_price=excluded.sell_price,
 native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
 flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction;
delete from public.collectible_habitats
where species_id in ('coral-bean-shrimp','pinkchin-blenny','flower-coral-seadragon','coralfan-butterflyfish','coral-flower-anemone','coral-crowned-turtle') and region_id<>'coral';
insert into public.collectible_habitats(species_id,region_id)
select id,'coral' from public.collectible_species where id in ('coral-bean-shrimp','pinkchin-blenny','flower-coral-seadragon','coralfan-butterflyfish','coral-flower-anemone','coral-crowned-turtle')
on conflict(species_id,region_id) do nothing;
commit;
select s.id,s.name,s.kind,s.rarity,s.is_native,s.native_region_id,s.movement_type,
 array_agg(h.region_id order by h.region_id) as habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('coral-bean-shrimp','pinkchin-blenny','flower-coral-seadragon','coralfan-butterflyfish','coral-flower-anemone','coral-crowned-turtle') group by s.id order by s.rarity,s.id;
