-- Reviewed diff: seed the six map products only.
begin;
insert into public.region_maps ("region_id","price","thumbnail_path") values
('bluegrove',800,'map/normal/map-bluegrove_thumbnail.png'),
('coral',500,'map/normal/map-coral_thumbnail.png'),
('dreamabyss',3000,'map/epic/map-dreamabyss_thumbnail.png'),
('mistmoon',1500,'map/rare/map-mistmoon_thumbnail.png'),
('primal',3000,'map/epic/map-primal_thumbnail.png'),
('starruins',2000,'map/rare/map-starruins_thumbnail.png')
on conflict(region_id) do update set "price"=excluded."price","thumbnail_path"=excluded."thumbnail_path";
commit;
