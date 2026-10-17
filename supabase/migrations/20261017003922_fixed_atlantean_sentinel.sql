-- Reviewed catalog diff: fixed sentinel only; preserve all other catalog rows.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('atlantean-sentinel','fish','아틀란티스 수호병','대리석 갑주와 청동 관절로 만들어진 고대 수호병. 삼지창을 들고 제자리에 서서 잠든 왕국을 지킨다. 물살에 망토가 흔들리고 갑옷 문양에 청록빛이 흐른다.',0.84,0.94,'0.012',150,'mythic','fish/mythic/atlantean-sentinel_thumbnail.png',1950,'fish/mythic/atlantean-sentinel-walk_sprite.png','starruins','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('atlantean-sentinel');
insert into public.collectible_habitats(species_id,region_id) values
('atlantean-sentinel','starruins');
-- The reviewed remote schema has this animation flag; older local baselines do not.
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then
  execute 'update public.collectible_species set idle_animated=true where id=''atlantean-sentinel''';
 end if;
end $$;
notify pgrst, 'reload schema';
commit;
