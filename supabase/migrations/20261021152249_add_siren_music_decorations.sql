-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('siren-cracked-idol','decoration','금이 간 신상','누군가의 소원을 품었던 작은 신상. 깊은 금 사이에 해초가 자랐어요.',null,null,'0',60,'common','trash/normal/siren-cracked-idol_thumbnail.png',35,null,'siren','fixed',false,'both'),
('siren-glass-music-box','decoration','세이렌의 유리 오르골','유리구 안 작은 조개 무대에 세이렌의 선율이 남아 있어요. 귀를 대면 파도도 잠깐 조용해져요.',null,null,'0',96,'rare','decorations/rare/siren-glass-music-box_thumbnail.png',200,null,'siren','fixed',false,'both'),
('siren-lost-song-gramophone','decoration','노래를 잃은 축음기','아무리 손잡이를 돌려도 노래 대신 기포만 나오는 축음기. 세이렌은 아직도 자기 차례를 기다리고 있어요.',null,null,'0',84,'common','decorations/normal/siren-lost-song-gramophone_thumbnail.png',35,null,'siren','fixed',false,'both'),
('siren-mermaid-vanity','decoration','인어의 빗질 자리','진주빗과 조개 거울을 놓아둔 인어의 작은 화장대. 긴 해초만 매일 머리를 빗고 가요.',null,null,'0',98,'rare','decorations/rare/siren-mermaid-vanity_thumbnail.png',40,null,'siren','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('siren-cracked-idol','siren-glass-music-box','siren-lost-song-gramophone','siren-mermaid-vanity');
insert into public.collectible_habitats(species_id,region_id) values
('siren-cracked-idol','siren'),
('siren-glass-music-box','siren'),
('siren-lost-song-gramophone','siren'),
('siren-mermaid-vanity','siren');
notify pgrst, 'reload schema';
commit;
