-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.collectible_species ("id","kind","name","description","swim_y_min","swim_y_max","speed","size","rarity","thumbnail_path","sell_price","sprite_sheet_path","native_region_id","movement_type","flip_with_direction","travel_direction") values
('mechsanctum-deus-zero','decoration','심장을 잃은 신, 데우스 제로','텅 빈 가슴으로 작은 물고기가 드나드는 기계 거인이에요. 머리 위에는 부서진 톱니 후광이 떠 있어요.',null,null,'0',175,'mythic','decorations/mythic/mechsanctum-deus-zero_v1_thumbnail.png',4000,'decorations/mythic/mechsanctum-deus-zero_compat_v1_sprite.png','mechsanctum','fixed',false,'both')
on conflict(id) do update set "kind"=excluded."kind","name"=excluded."name","description"=excluded."description","swim_y_min"=excluded."swim_y_min","swim_y_max"=excluded."swim_y_max","speed"=excluded."speed","size"=excluded."size","rarity"=excluded."rarity","thumbnail_path"=excluded."thumbnail_path","sell_price"=excluded."sell_price","sprite_sheet_path"=excluded."sprite_sheet_path","native_region_id"=excluded."native_region_id","movement_type"=excluded."movement_type","flip_with_direction"=excluded."flip_with_direction","travel_direction"=excluded."travel_direction";
delete from public.collectible_habitats where species_id in ('mechsanctum-deus-zero');
insert into public.collectible_habitats(species_id,region_id) values
('mechsanctum-deus-zero','mechsanctum');
-- Some existing projects expose this optional legacy animation flag; the
-- local baseline does not. New clients use the explicit decoration animator.
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then
    execute 'update public.collectible_species set idle_animated=true where id=''mechsanctum-deus-zero''';
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
