-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_rods ("id","name","price","region_id","failure_reduction_bp","native_bonus_bp") values
('basic','입문용 낚싯대',0,null,0,0),
('bluegrove','푸른골 물길 낚싯대',500,'bluegrove',200,200),
('bronze','청동 낚싯대',400,null,100,0),
('calm','잔물결 낚싯대',800,null,300,0),
('cloudferry','구름나루 바람 낚싯대',800,'cloudferry',200,200),
('coral','산호꽃 낚싯대',450,'coral',200,200),
('dreamabyss','꿈실 낚싯대',800,'dreamabyss',200,200),
('lunea','루네아의 축복',800,'mistmoon',200,200),
('mistmoon','안개달 낚싯대',550,'mistmoon',200,200),
('mukhyang','여백을 긋는 붓',800,'mukhyang',200,200),
('pongdang','퐁당 나무 낚싯대',400,'pongdang',200,200),
('primal','호박화석 낚싯대',800,'primal',200,200),
('scrapisle','녹빛 고철 낚싯대',800,'scrapisle',200,200),
('siren','세이렌의 송가 낚싯대',800,'siren',200,200),
('starruins','별잠 유물 낚싯대',800,'starruins',200,200),
('whitenight','백야 서리 낚싯대',800,'whitenight',200,200)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","region_id"=excluded."region_id","failure_reduction_bp"=excluded."failure_reduction_bp","native_bonus_bp"=excluded."native_bonus_bp";
notify pgrst, 'reload schema';
commit;
