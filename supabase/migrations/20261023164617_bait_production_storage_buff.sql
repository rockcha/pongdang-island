-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.bait_production_facilities ("id","name","description","bait_id","price","fuel_cost","output_count","production_minutes","storage_minutes","enabled") values
('cloud-pearl-bottle','구름 진주 배양병','진주 거품방울을 정성껏 준비하는 작은 공방이에요.','bait_pearl_bubble',3000,5,14,240,960,true),
('dawn-coral-garden','새벽 산호 꽃밭','산호 꽃가루을 정성껏 준비하는 작은 공방이에요.','bait_coral_pollen',1100,4,10,150,120,true),
('deep-sleep-room','깊은잠 향실','깊은잠 향낭을 정성껏 준비하는 작은 공방이에요.','bait_deep_sleep_sachet',4500,12,5,480,720,true),
('dew-incubator','이슬 맺힌 부화통','퐁당 지렁이을 정성껏 준비하는 작은 공방이에요.','bait',450,3,10,90,120,true),
('firefly-greenhouse','반딧불 온실','반딧불 번데기을 정성껏 준비하는 작은 공방이에요.','bait_firefly_pupa',1200,3,7,120,180,true),
('fluffy-dough-bowl','몽실 반죽 그릇','솜구름 반죽을 정성껏 준비하는 작은 공방이에요.','bait_cloud_dough',650,1,4,30,240,true),
('leisure-compost-garden','느긋한 퇴비 정원','퐁당 지렁이을 정성껏 준비하는 작은 공방이에요.','bait',2800,6,24,480,1440,true),
('lightning-condenser','벼락 응축기','벼락 별가루을 정성껏 준비하는 작은 공방이에요.','bait_lightning_stardust',1800,6,4,240,120,true),
('overnight-soil-pot','밤새 익는 흙항아리','퐁당 지렁이을 정성껏 준비하는 작은 공방이에요.','bait',1200,8,28,360,180,true),
('scrap-magnet-bench','고물 자석 작업대','꼬질 자석경단을 정성껏 준비하는 작은 공방이에요.','bait_grubby_magnet',450,1,12,45,120,true),
('sea-memory-bottle','바다 기억 증류병','바다기억 조개알을 정성껏 준비하는 작은 공방이에요.','bait_sea_memory',1200,2,3,60,360,true),
('sweet-steam-basket','달콤한 찜 바구니','햇살 꿀경단을 정성껏 준비하는 작은 공방이에요.','bait_honey_dumpling',350,1,3,30,120,true),
('wave-mill','파도 맷돌','조개 부스러기을 정성껏 준비하는 작은 공방이에요.','bait_shell_crumbs',1000,4,16,180,240,true),
('wriggly-soil-box','꼬물꼬물 흙상자','퐁당 지렁이을 정성껏 준비하는 작은 공방이에요.','bait',300,1,3,30,120,true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","bait_id"=excluded."bait_id","price"=excluded."price","fuel_cost"=excluded."fuel_cost","output_count"=excluded."output_count","production_minutes"=excluded."production_minutes","storage_minutes"=excluded."storage_minutes","enabled"=excluded."enabled";
notify pgrst, 'reload schema';
commit;
