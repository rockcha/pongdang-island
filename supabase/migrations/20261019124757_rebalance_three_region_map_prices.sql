-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.region_maps ("region_id","price","thumbnail_path") values
('bluegrove',800,'map/normal/map-bluegrove_thumbnail.png'),
('cloudferry',2000,'map/routes/map-cloudferry_thumbnail.png'),
('coral',500,'map/normal/map-coral_thumbnail.png'),
('dreamabyss',1400,'map/epic/map-dreamabyss_thumbnail.png'),
('mistmoon',1100,'map/rare/map-mistmoon_thumbnail.png'),
('mukhyang',2000,'map/rare/map-mukhyang_thumbnail.png'),
('primal',1800,'map/epic/map-primal_thumbnail.png'),
('scrapisle',1500,'map/routes/map-scrapisle_thumbnail.png'),
('siren',2200,'map/epic/map-siren_thumbnail.png'),
('starruins',1300,'map/epic/map-starruins_thumbnail.png'),
('whitenight',1900,'map/routes/map-whitenight_thumbnail.png')
on conflict(region_id) do update set "price"=excluded."price","thumbnail_path"=excluded."thumbnail_path";
notify pgrst, 'reload schema';
commit;
