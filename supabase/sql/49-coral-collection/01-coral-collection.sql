-- Apply after 48. Upload assets/storage-upload/new/20261015-192806/ first.
-- Repeatable; preserves owned individuals, placements and discoveries.
begin;
alter table public.collectible_species add column if not exists idle_animated boolean not null default false;
-- Fixed decorations may now have an optional animation sheet.
alter table public.collectible_species drop constraint if exists collectible_sheet_layout;
alter table public.collectible_species add constraint collectible_sheet_layout check(
 (kind='fish' and sprite_sheet_path is not null and btrim(sprite_sheet_path)<>'')
 or (kind='decoration' and (sprite_sheet_path is null or btrim(sprite_sheet_path)<>''))
 or (kind in ('trash','map') and sprite_sheet_path is null));
insert into public.collectible_species
(id,kind,name,description,swim_y_min,swim_y_max,speed,size,rarity,sprite_sheet_path,thumbnail_path,sell_price,native_region_id,movement_type,flip_with_direction,travel_direction,facing_direction,idle_animated)
values
('coral-carrier-crab','fish','산호짐꾼 게','살구빛 등껍질 위에 작은 산호와 해초를 얹고 다닌다. 산호빛 여울의 모랫길을 종종 걸으며 작은 정원을 옮긴다.',0.84,0.94,0.017,54,'common','fish/normal/coral-carrier-crab_sprite.png','fish/normal/coral-carrier-crab_thumbnail.png',40,'coral','crawl',true,'both','right',false),
('coral-blossom-arch','decoration','산호꽃 아치','연분홍 산호 두 줄기가 맞닿아 작은 문을 만들었다. 물고기들이 오가는 길목에 조용히 꽃을 피운다.',null,null,0,72,'common',null,'decorations/normal/coral-blossom-arch_thumbnail.png',45,'coral','fixed',false,'both','front',false),
('coral-shard','trash','산호 조각','물살에 떨어져 나온 작은 산호 가지. 닳은 끝과 옅은 해초 자국에 여울을 떠돈 시간이 남아 있다.',0.5,0.9,0.01,38,'common',null,'trash/normal/coral-shard_thumbnail.png',12,'coral','swim',false,'both','front',false),
('sea-music-box','trash','바다 오르골','조개 뚜껑과 작은 해마 장식이 남은 낡은 오르골. 녹슨 태엽은 멈췄지만 바다의 노래를 기억하는 듯하다.',0.5,0.9,0.01,48,'common',null,'trash/normal/sea-music-box_thumbnail.png',18,'coral','swim',false,'both','front',false),
('crimson-fin-seabream','fish','홍련 지느러미돔','크림빛 몸을 따라 붉은 꽃잎 같은 지느러미가 펼쳐진다. 산호빛 여울의 물살을 타면 꽃 한 송이가 흐르는 듯하다.',0.22,0.76,0.03,78,'rare','fish/rare/crimson-fin-seabream_sprite.png','fish/rare/crimson-fin-seabream_thumbnail.png',190,'coral','swim',true,'both','right',false),
('coral-hat-octopus','fish','산호모자 문어','머리 위 작은 가지산호를 소중히 얹은 살구빛 문어. 통통한 팔을 모았다 펼치며 여울 사이를 떠다닌다.',0.3,0.7,0.022,68,'rare','fish/rare/coral-hat-octopus_sprite.png','fish/rare/coral-hat-octopus_thumbnail.png',180,'coral','pulse',true,'both','right',false),
('pearlback-spider-crab','fish','진주등 산호거미게','진주빛 등껍질 위에 작은 부채산호가 자란다. 가느다란 다리로 산호 사이의 좁은 길을 조심스레 걷는다.',0.84,0.94,0.017,76,'rare','fish/rare/pearlback-spider-crab_sprite.png','fish/rare/pearlback-spider-crab_thumbnail.png',190,'coral','crawl',true,'both','right',false),
('tiny-reef-carousel','decoration','여울의 작은 회전목마','조개 지붕 아래 작은 해마 조각 세 개가 매달려 있다. 진주 장식 사이로 여울의 오래된 놀이가 남아 있다.',null,null,0,82,'rare',null,'decorations/rare/tiny-reef-carousel_thumbnail.png',200,'coral','fixed',false,'both','front',false),
('flower-island-crab','fish','꽃섬 등딱지게','넓은 등 위에 모래 언덕과 산호나무가 자라는 게. 작은 섬 하나가 여울 바닥을 느긋하게 걸어가는 듯하다.',0.84,0.94,0.017,86,'rare','fish/rare/flower-island-crab_sprite.png','fish/rare/flower-island-crab_thumbnail.png',210,'coral','crawl',true,'both','right',false),
('first-coral-cradle','decoration','첫 산호의 요람','커다란 흰 조개 안에서 작은 산호나무가 자란다. 가지 사이 진주알들이 여울의 첫 봄을 간직하고 있다.',null,null,0,78,'rare',null,'decorations/rare/first-coral-cradle_thumbnail.png',195,'coral','fixed',false,'both','front',false),
('fish-nap-sign','decoration','물고기 낮잠표지판','둥근 나무판에 잠든 물고기 그림이 새겨져 있다. 여울의 조용한 모퉁이에 작은 쉼을 알려 준다.',null,null,0,58,'rare',null,'decorations/rare/fish-nap-sign_thumbnail.png',150,'coral','fixed',false,'both','front',false),
('flowerveil-jellyfish','fish','꽃너울 해파리','겹겹의 살구빛 꽃잎 같은 종 아래로 진주빛 촉수가 흐른다. 안쪽의 은은한 빛이 여울의 고요한 길을 밝힌다.',0.3,0.7,0.022,92,'epic','fish/epic/flowerveil-jellyfish_sprite.png','fish/epic/flowerveil-jellyfish_thumbnail.png',720,'coral','pulse',true,'both','right',false),
('rubyeye-moray','fish','홍옥 눈동자 곰치','짙은 청록빛 몸과 홍옥 같은 눈동자를 가진 곰치. 살구색 등지느러미를 길게 펼치며 산호 그늘을 지난다.',0.22,0.76,0.03,104,'epic','fish/epic/rubyeye-moray_sprite.png','fish/epic/rubyeye-moray_thumbnail.png',740,'coral','swim',true,'both','right',false),
('flower-maned-sealion','fish','꽃갈기 바다사자','크림빛 얼굴 둘레로 살구빛 갈기가 꽃잎처럼 흐른다. 진주빛 지느러미를 펼치고 여울을 우아하게 가로지른다.',0.22,0.76,0.03,104,'epic','fish/epic/flower-maned-sealion_sprite.png','fish/epic/flower-maned-sealion_thumbnail.png',760,'coral','swim',true,'both','right',false),
('ancient-coral-giant-crab','fish','천년산호 거대게','천년 동안 자란 산호 군락을 등에 품은 거대한 게. 한자리에 머물며 산호 끝과 다리만 천천히 움직여 여울의 시간을 지킨다.',0.84,0.94,0.001,132,'mythic','fish/mythic/ancient-coral-giant-crab_sprite.png','fish/mythic/ancient-coral-giant-crab_thumbnail.png',1800,'coral','fixed',false,'both','right',true),
('coral-flower-anemone','decoration','산호꽃 말미잘','분홍 촉수 끝에 작은 꽃봉오리 같은 방울이 맺혀 있다. 산호빛 여울에서 자라난 꽃 한 송이를 어항에 옮겨 둔 듯하다.',null,null,0,62,'rare','decorations/rare/coral-flower-anemone_sprite.png','decorations/rare/coral-flower-anemone_thumbnail.png',165,'coral','fixed',false,'both','front',true)
on conflict(id) do update set
kind=excluded.kind,name=excluded.name,description=excluded.description,
swim_y_min=excluded.swim_y_min,swim_y_max=excluded.swim_y_max,speed=excluded.speed,size=excluded.size,
rarity=excluded.rarity,sprite_sheet_path=excluded.sprite_sheet_path,thumbnail_path=excluded.thumbnail_path,
sell_price=excluded.sell_price,native_region_id=excluded.native_region_id,movement_type=excluded.movement_type,
flip_with_direction=excluded.flip_with_direction,travel_direction=excluded.travel_direction,facing_direction=excluded.facing_direction,idle_animated=excluded.idle_animated;
delete from public.collectible_habitats where species_id in ('coral-carrier-crab','coral-blossom-arch','coral-shard','sea-music-box','crimson-fin-seabream','coral-hat-octopus','pearlback-spider-crab','tiny-reef-carousel','flower-island-crab','first-coral-cradle','fish-nap-sign','flowerveil-jellyfish','rubyeye-moray','flower-maned-sealion','ancient-coral-giant-crab','coral-flower-anemone') and region_id<>'coral';
insert into public.collectible_habitats(species_id,region_id)
select id,'coral' from public.collectible_species where id in ('coral-carrier-crab','coral-blossom-arch','coral-shard','sea-music-box','crimson-fin-seabream','coral-hat-octopus','pearlback-spider-crab','tiny-reef-carousel','flower-island-crab','first-coral-cradle','fish-nap-sign','flowerveil-jellyfish','rubyeye-moray','flower-maned-sealion','ancient-coral-giant-crab','coral-flower-anemone')
on conflict(species_id,region_id) do nothing;
update public.collectible_species set sprite_sheet_path='fish/rare/flower-coral-seadragon-v2_sprite.png'
where id='flower-coral-seadragon' and kind='fish';
notify pgrst,'reload schema';
commit;
select id,name,kind,rarity,native_region_id,movement_type,idle_animated,sprite_sheet_path
from public.collectible_species where id in ('coral-carrier-crab','coral-blossom-arch','coral-shard','sea-music-box','crimson-fin-seabream','coral-hat-octopus','pearlback-spider-crab','tiny-reef-carousel','flower-island-crab','first-coral-cradle','fish-nap-sign','flowerveil-jellyfish','rubyeye-moray','flower-maned-sealion','ancient-coral-giant-crab','coral-flower-anemone','flower-coral-seadragon')
order by rarity,kind,id;
