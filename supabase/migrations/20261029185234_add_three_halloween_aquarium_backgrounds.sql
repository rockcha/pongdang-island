-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.aquarium_backgrounds ("id","name","price","image_path","tier") values
('halloween-ghost-glasshouse','달빛에 잠든 유령 온실',1650,'halloween-ghost-glasshouse-panorama-v1.png','special'),
('halloween-pumpkin-teahouse','호박등 아래 작은 찻집',1500,'halloween-pumpkin-teahouse-panorama-v1.png','special'),
('halloween-witch-lavender-room','마녀가 비운 보랏빛 방',1800,'halloween-witch-lavender-room-panorama-v1.png','special')
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","image_path"=excluded."image_path","tier"=excluded."tier";
notify pgrst, 'reload schema';
commit;
