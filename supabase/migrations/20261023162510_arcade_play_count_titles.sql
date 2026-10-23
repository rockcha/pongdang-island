-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('arcade-all-first','낚시는 잠깐 쉬는 중',1,'arcade','미니게임 누적 10회 플레이 · 무료 연습 제외','arcade_total',10,null,null,4520),
('arcade-all-legend','퐁당 오락실의 전설',4,'arcade','미니게임 누적 3,000회 플레이 · 무료 연습 제외','arcade_total',3000,null,null,4523),
('arcade-all-regular','오늘도 오락실 출근',2,'arcade','미니게임 누적 100회 플레이 · 무료 연습 제외','arcade_total',100,null,null,4521),
('arcade-all-resident','오락실 붙박이',3,'arcade','미니게임 누적 500회 플레이 · 무료 연습 제외','arcade_total',500,null,null,4522),
('arcade-all-tour','오락실 순례자',2,'arcade','다섯 미니게임을 각각 1회 이상 플레이 · 무료 연습 제외','arcade_variety',5,null,null,4524),
('arcade-brick-1','바닷속 철거 허가증',1,'arcade','벽돌깨기 누적 1회 플레이 · 무료 연습 제외','arcade_brick',1,null,null,4508),
('arcade-brick-2','철거반 신입',2,'arcade','벽돌깨기 누적 10회 플레이 · 무료 연습 제외','arcade_brick',10,null,null,4509),
('arcade-brick-3','파도의 반사각',3,'arcade','벽돌깨기 누적 50회 플레이 · 무료 연습 제외','arcade_brick',50,null,null,4510),
('arcade-brick-4','벽돌깨기의 왕',4,'arcade','벽돌깨기 누적 200회 플레이 · 무료 연습 제외','arcade_brick',200,null,null,4511),
('arcade-ladder-1','첫 발은 가볍게',1,'arcade','사다리 누적 1회 플레이 · 무료 연습 제외','arcade_ladder',1,null,null,4500),
('arcade-ladder-2','갈림길 단골',2,'arcade','사다리 누적 100회 플레이 · 무료 연습 제외','arcade_ladder',100,null,null,4501),
('arcade-ladder-3','갈림길에 집 지은 퐁이',3,'arcade','사다리 누적 500회 플레이 · 무료 연습 제외','arcade_ladder',500,null,null,4502),
('arcade-ladder-4','사다리의 왕',4,'arcade','사다리 누적 2,000회 플레이 · 무료 연습 제외','arcade_ladder',2000,null,null,4503),
('arcade-memory-1','두 장의 인연',1,'arcade','기억력 게임 누적 1회 플레이 · 무료 연습 제외','arcade_memory',1,null,null,4516),
('arcade-memory-2','짝 찾는 탐정',2,'arcade','기억력 게임 누적 10회 플레이 · 무료 연습 제외','arcade_memory',10,null,null,4517),
('arcade-memory-3','기억을 건져 올리는 자',3,'arcade','기억력 게임 누적 50회 플레이 · 무료 연습 제외','arcade_memory',50,null,null,4518),
('arcade-memory-4','심해의 기억 궁전',4,'arcade','기억력 게임 누적 200회 플레이 · 무료 연습 제외','arcade_memory',200,null,null,4519),
('arcade-odd-even-1','반반의 시작',1,'arcade','홀짝 누적 1회 플레이 · 무료 연습 제외','arcade_odd_even',1,null,null,4504),
('arcade-odd-even-2','반쪽짜리 예언자',2,'arcade','홀짝 누적 50회 플레이 · 무료 연습 제외','arcade_odd_even',50,null,null,4505),
('arcade-odd-even-3','한 번만 더의 끝',3,'arcade','홀짝 누적 200회 플레이 · 무료 연습 제외','arcade_odd_even',200,null,null,4506),
('arcade-odd-even-4','홀짝의 왕',4,'arcade','홀짝 누적 1,000회 플레이 · 무료 연습 제외','arcade_odd_even',1000,null,null,4507),
('arcade-shadow-1','어둠 속 첫 정답',1,'arcade','그림자 맞히기 누적 1회 플레이 · 무료 연습 제외','arcade_shadow',1,null,null,4512),
('arcade-shadow-2','어렴풋한 눈썰미',2,'arcade','그림자 맞히기 누적 10회 플레이 · 무료 연습 제외','arcade_shadow',10,null,null,4513),
('arcade-shadow-3','그림자에 이름을 붙이는 자',3,'arcade','그림자 맞히기 누적 50회 플레이 · 무료 연습 제외','arcade_shadow',50,null,null,4514),
('arcade-shadow-4','그림자의 왕',4,'arcade','그림자 맞히기 누적 200회 플레이 · 무료 연습 제외','arcade_shadow',200,null,null,4515)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
