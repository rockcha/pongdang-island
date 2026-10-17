-- Reviewed catalog diff: add 34 primal-native species only; preserve all existing species and player data.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('amber-bearing-root','decoration','호박 품은 나무뿌리','구부러진 나무뿌리 안에 호박빛 수지가 고여 있다.',null,null,'0',105,'common','decorations/normal/amber-bearing-root_thumbnail.png',16,null,'primal','fixed',false,'both'),
('ammonite-fossil-slab','decoration','암모나이트 화석 판석','납작한 사암에 암모나이트의 나선 흔적이 남아 있다.',null,null,'0',95,'common','decorations/normal/ammonite-fossil-slab_thumbnail.png',14,null,'primal','fixed',false,'both'),
('ancient-coral-pillar','decoration','고대 산호 기둥','오래된 산호 골격이 켜켜이 쌓여 기둥이 되었다.',null,null,'0',145,'rare','decorations/rare/ancient-coral-pillar_thumbnail.png',165,null,'primal','fixed',false,'both'),
('billowmouth-leedsichthys','fish','너울입 리즈시크티스','넓은 입으로 작은 먹이를 걸러 먹는 온순한 거대 물고기.','0.18','0.8','0.018',160,'common','fish/normal/billowmouth-leedsichthys_thumbnail.png',35,'fish/normal/billowmouth-leedsichthys_sprite.png','primal','swim',true,'both'),
('blackscale-mosasaurus','fish','흑청비늘 모사사우루스','흑청빛 비늘과 강한 꼬리로 태고의 깊은 바다를 가른다.','0.18','0.8','0.018',178,'epic','fish/epic/blackscale-mosasaurus_thumbnail.png',660,'fish/epic/blackscale-mosasaurus_sprite.png','primal','swim',true,'both'),
('blueback-shonisaurus','fish','푸른등 쇼니사우루스','푸른 등과 넓은 몸통을 지닌 거인이 느긋하게 헤엄친다.','0.18','0.8','0.018',180,'epic','fish/epic/blueback-shonisaurus_thumbnail.png',650,'fish/epic/blueback-shonisaurus_sprite.png','primal','swim',true,'both'),
('broadleaf-water-fern','decoration','넓은잎 물고사리','넓게 펼쳐진 초록 잎이 물살에 부드럽게 흔들린다.',null,null,'0',115,'common','decorations/normal/broadleaf-water-fern_thumbnail.png',18,null,'primal','fixed',false,'both'),
('broken-ancient-shell','decoration','부서진 고대 조개껍데기','세월에 닳은 고대 조개껍데기가 모래 위에 놓여 있다.',null,null,'0',85,'common','decorations/normal/broken-ancient-shell_thumbnail.png',12,null,'primal','fixed',false,'both'),
('bronze-spiral-ammonite','fish','청동나선 암모나이트','청동빛 나선 껍데기 아래로 짧은 촉수가 물살을 탄다.','0.18','0.8','0.028',80,'common','fish/normal/bronze-spiral-ammonite_thumbnail.png',24,'fish/normal/bronze-spiral-ammonite_sprite.png','primal','swim',true,'both'),
('bronzejaw-liopleurodon','fish','청동턱 리오플레우로돈','청동빛 턱과 네 지느러미로 깊은 원시 바다를 누빈다.','0.18','0.8','0.018',165,'epic','fish/epic/bronzejaw-liopleurodon_thumbnail.png',590,'fish/epic/bronzejaw-liopleurodon_sprite.png','primal','swim',true,'both'),
('fangjaw-xiphactinus','fish','송곳턱 크시팍티누스','큼직한 송곳니와 강한 꼬리를 지닌 원시 바다의 포식어.','0.18','0.8','0.018',150,'epic','fish/epic/fangjaw-xiphactinus_thumbnail.png',560,'fish/epic/fangjaw-xiphactinus_sprite.png','primal','swim',true,'both'),
('fern-forest-fragment','decoration','고사리 숲 조각','낡은 뿌리 틈에서 작은 고사리 잎이 펼쳐진다.',null,null,'0',105,'common','decorations/normal/fern-forest-fragment_thumbnail.png',15,null,'primal','fixed',false,'both'),
('giant-ammonite-fossil','decoration','거대 암모나이트 화석','커다란 나선 화석이 오래된 지층 사이로 드러나 있다.',null,null,'0',145,'rare','decorations/rare/giant-ammonite-fossil_thumbnail.png',170,null,'primal','fixed',false,'both'),
('giant-creature-ribs','decoration','거대 생물의 갈비뼈','거대한 생물의 갈비뼈가 작은 아치처럼 모래 위에 남았다.',null,null,'0',155,'rare','decorations/rare/giant-creature-ribs_thumbnail.png',180,null,'primal','fixed',false,'both'),
('giant-fan-water-fern','decoration','거대 부채 물고사리','커다란 부채 모양 잎이 물결에 천천히 너울거린다.',null,null,'0',155,'rare','decorations/rare/giant-fan-water-fern_thumbnail.png',185,null,'primal','fixed',false,'both'),
('longneck-elasmosaurus','fish','긴목 엘라스모사우루스','긴 목과 네 지느러미가 푸른 물살 속에서 유려하게 이어진다.','0.18','0.8','0.018',175,'epic','fish/epic/longneck-elasmosaurus_thumbnail.png',630,'fish/epic/longneck-elasmosaurus_sprite.png','primal','swim',true,'both'),
('paddlefoot-primal-shrimp','fish','넓적발 원시새우','넓적한 헤엄다리와 부채꼬리로 물살을 가르는 원시새우.','0.18','0.8','0.028',76,'common','fish/normal/paddlefoot-primal-shrimp_thumbnail.png',22,'fish/normal/paddlefoot-primal-shrimp_sprite.png','primal','swim',true,'both'),
('plios-blackwave-king','fish','검은파도의 왕, 플리오스','검은 물결을 다스리는 태고의 왕. 여섯 초마다 턱에서 꼬리로 푸른 파도 문양이 흐른다.','0.18','0.8','0.018',180,'mythic','fish/mythic/plios-blackwave-king_thumbnail.png',2300,'fish/mythic/plios-blackwave-king_sprite.png','primal','swim',true,'both'),
('primal-sea-eggshell','decoration','원시 바다의 알껍데기','무엇이 깨어났는지 알 수 없는 작은 알껍데기.',null,null,'0',78,'common','decorations/normal/primal-sea-eggshell_thumbnail.png',12,null,'primal','fixed',false,'both'),
('purple-fork-seaweed','decoration','자주빛 갈래해초','자주빛 갈래 잎이 원시 바다의 바닥을 물들인다.',null,null,'0',105,'common','decorations/normal/purple-fork-seaweed_thumbnail.png',18,null,'primal','fixed',false,'both'),
('reedneck-tanystropheus','fish','갈대목 타니스트로페우스','갈대처럼 길게 뻗은 목으로 얕은 물속을 살피는 파충류.','0.18','0.8','0.018',150,'rare','fish/rare/reedneck-tanystropheus_thumbnail.png',225,'fish/rare/reedneck-tanystropheus_sprite.png','primal','swim',true,'both'),
('round-triassurus','fish','동글이 트리아수루스','동글한 얼굴과 작은 다리로 얕은 물길을 누비는 원시 양서류.','0.18','0.8','0.028',70,'common','fish/normal/round-triassurus_thumbnail.png',20,'fish/normal/round-triassurus_sprite.png','primal','swim',true,'both'),
('shelljaw-placodus','fish','조개턱 플라코두스','둥근 턱으로 단단한 조개를 깨무는 통통한 원시 바다 파충류.','0.18','0.8','0.028',105,'common','fish/normal/shelljaw-placodus_thumbnail.png',28,'fish/normal/shelljaw-placodus_sprite.png','primal','swim',true,'both'),
('silverarmored-dapedium','fish','은갑 다페디우스','은빛 마름모 비늘이 갑옷처럼 몸을 감싼 둥근 물고기.','0.18','0.8','0.028',90,'common','fish/normal/silverarmored-dapedium_thumbnail.png',26,'fish/normal/silverarmored-dapedium_sprite.png','primal','swim',true,'both'),
('silvercurrent-ichthyosaurus','fish','은물살 이크티오사우루스','은빛 물살을 가르며 긴 주둥이와 유선형 몸으로 나아간다.','0.18','0.8','0.028',130,'rare','fish/rare/silvercurrent-ichthyosaurus_thumbnail.png',205,'fish/rare/silvercurrent-ichthyosaurus_sprite.png','primal','swim',true,'both'),
('sleeping-seadragon-skull','decoration','잠든 해룡의 두개골','잠든 듯 놓인 해룡의 두개골 위로 해초가 조용히 자란다.',null,null,'0',170,'epic','decorations/epic/sleeping-seadragon-skull_thumbnail.png',580,null,'primal','fixed',false,'both'),
('spineback-hybodus','fish','가시등 히보두스','등지느러미 앞의 단단한 가시가 돋보이는 고대 상어.','0.18','0.8','0.028',125,'rare','fish/rare/spineback-hybodus_thumbnail.png',195,'fish/rare/spineback-hybodus_sprite.png','primal','swim',true,'both'),
('spineshell-diplomoceras','fish','가시집 디플로모케라스','굽이진 긴 껍데기에 도드라진 마디가 이어지는 고대 두족류.','0.18','0.8','0.028',100,'common','fish/normal/spineshell-diplomoceras_thumbnail.png',27,'fish/normal/spineshell-diplomoceras_sprite.png','primal','swim',true,'both'),
('stoneshield-henodus','fish','돌방패 헤노두스','돌방패 같은 넓은 등갑 아래로 짧은 지느러미가 움직인다.','0.18','0.8','0.028',120,'rare','fish/rare/stoneshield-henodus_thumbnail.png',190,'fish/rare/stoneshield-henodus_sprite.png','primal','swim',true,'both'),
('straighttower-baculites','fish','곧은탑 바쿨리테스','곧게 뻗은 탑 같은 껍데기를 지닌 작은 고대 두족류.','0.18','0.8','0.028',95,'common','fish/normal/straighttower-baculites_thumbnail.png',25,'fish/normal/straighttower-baculites_sprite.png','primal','swim',true,'both'),
('submerged-primal-trunk','decoration','침수된 원시 고목','속이 빈 원시 고목 사이로 새로운 물길이 이어진다.',null,null,'0',160,'rare','decorations/rare/submerged-primal-trunk_thumbnail.png',190,null,'primal','fixed',false,'both'),
('trilobite-track-rock','decoration','삼엽충 흔적 바위','작은 발자국이 나란히 새겨진 퇴적암 바위.',null,null,'0',90,'common','decorations/normal/trilobite-track-rock_thumbnail.png',13,null,'primal','fixed',false,'both'),
('webfoot-marine-crocodile','fish','물갈퀴 바다악어','물갈퀴와 납작한 꼬리를 지닌 바다악어가 조용히 물길을 돈다.','0.18','0.8','0.028',135,'rare','fish/rare/webfoot-marine-crocodile_thumbnail.png',210,'fish/rare/webfoot-marine-crocodile_sprite.png','primal','swim',true,'both'),
('whorl-tetragonites','fish','소용돌이 테트라고니테스','매끈한 소용돌이 껍데기를 메고 촉수를 살랑이는 작은 암모나이트.','0.18','0.8','0.028',78,'common','fish/normal/whorl-tetragonites_thumbnail.png',23,'fish/normal/whorl-tetragonites_sprite.png','primal','swim',true,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('amber-bearing-root','ammonite-fossil-slab','ancient-coral-pillar','billowmouth-leedsichthys','blackscale-mosasaurus','blueback-shonisaurus','broadleaf-water-fern','broken-ancient-shell','bronze-spiral-ammonite','bronzejaw-liopleurodon','fangjaw-xiphactinus','fern-forest-fragment','giant-ammonite-fossil','giant-creature-ribs','giant-fan-water-fern','longneck-elasmosaurus','paddlefoot-primal-shrimp','plios-blackwave-king','primal-sea-eggshell','purple-fork-seaweed','reedneck-tanystropheus','round-triassurus','shelljaw-placodus','silverarmored-dapedium','silvercurrent-ichthyosaurus','sleeping-seadragon-skull','spineback-hybodus','spineshell-diplomoceras','stoneshield-henodus','straighttower-baculites','submerged-primal-trunk','trilobite-track-rock','webfoot-marine-crocodile','whorl-tetragonites');
insert into public.collectible_habitats(species_id,region_id) values
('amber-bearing-root','primal'),
('ammonite-fossil-slab','primal'),
('ancient-coral-pillar','primal'),
('billowmouth-leedsichthys','primal'),
('blackscale-mosasaurus','primal'),
('blueback-shonisaurus','primal'),
('broadleaf-water-fern','primal'),
('broken-ancient-shell','primal'),
('bronze-spiral-ammonite','primal'),
('bronzejaw-liopleurodon','primal'),
('fangjaw-xiphactinus','primal'),
('fern-forest-fragment','primal'),
('giant-ammonite-fossil','primal'),
('giant-creature-ribs','primal'),
('giant-fan-water-fern','primal'),
('longneck-elasmosaurus','primal'),
('paddlefoot-primal-shrimp','primal'),
('plios-blackwave-king','primal'),
('primal-sea-eggshell','primal'),
('purple-fork-seaweed','primal'),
('reedneck-tanystropheus','primal'),
('round-triassurus','primal'),
('shelljaw-placodus','primal'),
('silverarmored-dapedium','primal'),
('silvercurrent-ichthyosaurus','primal'),
('sleeping-seadragon-skull','primal'),
('spineback-hybodus','primal'),
('spineshell-diplomoceras','primal'),
('stoneshield-henodus','primal'),
('straighttower-baculites','primal'),
('submerged-primal-trunk','primal'),
('trilobite-track-rock','primal'),
('webfoot-marine-crocodile','primal'),
('whorl-tetragonites','primal');
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then
  execute 'update public.collectible_species set facing_direction=''right'' where id in (''amber-bearing-root'',''ammonite-fossil-slab'',''ancient-coral-pillar'',''billowmouth-leedsichthys'',''blackscale-mosasaurus'',''blueback-shonisaurus'',''broadleaf-water-fern'',''broken-ancient-shell'',''bronze-spiral-ammonite'',''bronzejaw-liopleurodon'',''fangjaw-xiphactinus'',''fern-forest-fragment'',''giant-ammonite-fossil'',''giant-creature-ribs'',''giant-fan-water-fern'',''longneck-elasmosaurus'',''paddlefoot-primal-shrimp'',''plios-blackwave-king'',''primal-sea-eggshell'',''purple-fork-seaweed'',''reedneck-tanystropheus'',''round-triassurus'',''shelljaw-placodus'',''silverarmored-dapedium'',''silvercurrent-ichthyosaurus'',''sleeping-seadragon-skull'',''spineback-hybodus'',''spineshell-diplomoceras'',''stoneshield-henodus'',''straighttower-baculites'',''submerged-primal-trunk'',''trilobite-track-rock'',''webfoot-marine-crocodile'',''whorl-tetragonites'')';
 end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then
  execute 'update public.collectible_species set idle_animated=true where id in (''broadleaf-water-fern'',''purple-fork-seaweed'',''giant-fan-water-fern'')';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
