-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('flower-crab-plush','trash','꽃게 인형','넓적한 등딱지와 말랑한 집게를 가진 꽃게 봉제인형. 바닷물에 젖은 천 사이로 서툰 수선 자국이 남아 있다.','0.18','0.8','0.012',48,'rare','trash/rare/flower-crab-plush_thumbnail.png',135,null,null,'swim',false,'both'),
('jellyfish-plush','trash','해파리 인형','둥근 갓 아래로 천 촉수가 늘어진 해파리 인형. 젖어 축 처진 촉수 끝에는 작은 바느질 매듭이 남아 있다.','0.18','0.8','0.012',48,'rare','trash/rare/jellyfish-plush_thumbnail.png',130,null,null,'swim',false,'both'),
('turtle-plush','trash','거북이 인형','조각 천을 이어 만든 등껍질을 가진 거북이 인형. 한쪽 물갈퀴가 해져도 둥근 얼굴의 수놓은 미소는 남아 있다.','0.18','0.8','0.012',50,'rare','trash/rare/turtle-plush_thumbnail.png',140,null,null,'swim',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('flower-crab-plush','jellyfish-plush','turtle-plush');
insert into public.collectible_habitats(species_id,region_id) values
('flower-crab-plush','bluegrove'),
('flower-crab-plush','cloudferry'),
('flower-crab-plush','coral'),
('flower-crab-plush','dreamabyss'),
('flower-crab-plush','mistmoon'),
('flower-crab-plush','mukhyang'),
('flower-crab-plush','pongdang'),
('flower-crab-plush','primal'),
('flower-crab-plush','scrapisle'),
('flower-crab-plush','siren'),
('flower-crab-plush','starruins'),
('flower-crab-plush','whitenight'),
('jellyfish-plush','bluegrove'),
('jellyfish-plush','cloudferry'),
('jellyfish-plush','coral'),
('jellyfish-plush','dreamabyss'),
('jellyfish-plush','mistmoon'),
('jellyfish-plush','mukhyang'),
('jellyfish-plush','pongdang'),
('jellyfish-plush','primal'),
('jellyfish-plush','scrapisle'),
('jellyfish-plush','siren'),
('jellyfish-plush','starruins'),
('jellyfish-plush','whitenight'),
('turtle-plush','bluegrove'),
('turtle-plush','cloudferry'),
('turtle-plush','coral'),
('turtle-plush','dreamabyss'),
('turtle-plush','mistmoon'),
('turtle-plush','mukhyang'),
('turtle-plush','pongdang'),
('turtle-plush','primal'),
('turtle-plush','scrapisle'),
('turtle-plush','siren'),
('turtle-plush','starruins'),
('turtle-plush','whitenight');
notify pgrst, 'reload schema';
commit;
