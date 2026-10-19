-- Rod progression from the canonical catalog; preserve existing ownership and equipment.
begin;
insert into public.fishing_rods ("id","name","price","region_id","failure_reduction_bp","native_bonus_bp") values
('basic','입문용 낚싯대',0,null,0,0),
('bluegrove','푸른골 물길 낚싯대',1000,'bluegrove',200,200),
('bronze','청동 낚싯대',400,null,100,0),
('calm','잔물결 낚싯대',750,null,300,0),
('cloudferry','구름나루 바람 낚싯대',1800,'cloudferry',200,200),
('coral','산호꽃 낚싯대',900,'coral',200,200),
('dreamabyss','꿈실 낚싯대',1600,'dreamabyss',200,200),
('lunea','루네아의 축복',1500,'mistmoon',200,200),
('mistmoon','안개달 낚싯대',1100,'mistmoon',200,200),
('mukhyang','여백을 긋는 붓',2200,'mukhyang',200,200),
('pongdang','퐁당 나무 낚싯대',800,'pongdang',200,200),
('primal','호박화석 낚싯대',1400,'primal',200,200),
('scrapisle','녹빛 고철 낚싯대',2000,'scrapisle',200,200),
('siren','세이렌의 송가 낚싯대',2400,'siren',200,200),
('starruins','별잠 유물 낚싯대',1300,'starruins',200,200),
('whitenight','백야 서리 낚싯대',1200,'whitenight',200,200)
on conflict(id) do update set "price"=excluded."price";
commit;
