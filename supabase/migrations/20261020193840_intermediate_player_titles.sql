-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('intermediate-buffet-stamp','바다 한 상 단골',2,'moment','하루 동안 물고기·쓰레기·장식물을 모두 직접 잡은 날 5일 달성','challenge_buffet_days',5,null,null,2012),
('intermediate-cloud-snack','구름 간식 단골',2,'moment','솜구름 반죽으로 일반 물고기 80마리 직접 포획','challenge_cloud',80,null,null,2011),
('intermediate-crumb-talent','부스러기도 재주껏',2,'moment','조개 부스러기로 희귀 물고기 5마리 직접 포획','challenge_crumbs',5,null,null,2008),
('intermediate-epic-shelf','특별한 수집 선반',2,'collection','서로 다른 특급 물고기 8종을 직접 포획','challenge_epic_unique',8,null,null,2004),
('intermediate-familiar-face','물고기도 안면이 있다',2,'collection','같은 종의 물고기를 직접 낚시로 25마리 포획','challenge_same_fish',25,null,null,2001),
('intermediate-firefly-guest','반딧불의 초대장',2,'moment','반딧불 번데기로 특급 물고기 3마리 직접 포획','challenge_pupa',3,null,null,2009),
('intermediate-harbor-regular','선착장의 익숙한 발걸음',2,'growth','항구 조업 결과 30회 수령 완료','challenge_harbor',30,null,null,2015),
('intermediate-kind-neighbor','이웃 바다의 든든한 손',2,'social','친구 어항 돌보기 누적 15회와 친구 통발 물고기 유인 10회','care',15,'tailwind',10,2017),
('intermediate-lightning-spark','손끝에 작은 벼락',2,'moment','벼락 별가루로 특급 물고기 3마리 직접 포획','challenge_lightning',3,null,null,2010),
('intermediate-merchant-trust','상인이 기억하는 이름',2,'growth','바다 상인의 의뢰 10건 납품 완료','challenge_deliveries',10,null,null,2013),
('intermediate-mythic-notes','전설의 첫 페이지',2,'collection','서로 다른 신화 물고기 3종을 직접 포획','challenge_mythic_unique',3,null,null,2005),
('intermediate-pocket-guide','주머니 속 바다 도감',2,'collection','서로 다른 물고기 40종을 직접 낚시로 포획','challenge_unique',40,null,null,2002),
('intermediate-rare-eye','제법 귀한 눈썰미',2,'collection','서로 다른 희귀 물고기 15종을 직접 포획','challenge_rare_unique',15,null,null,2003),
('intermediate-sea-arranger','바다를 가꾸는 취미',2,'growth','쓰레기 포획 누적 50회와 장식물 포획 누적 25회','trash',50,'decor',25,2018),
('intermediate-sea-routine','바다가 일상이 된',2,'growth','서로 다른 한국 날짜 14일에 직접 낚시하기','challenge_days',14,null,null,2000),
('intermediate-steady-explorer','손맛도 취향도 제법',2,'growth','직접 낚시 300회와 서로 다른 물고기 20종 직접 포획','challenge_manual',300,'challenge_unique',20,2016),
('intermediate-three-seas','세 바다의 별을 따라',2,'collection','서로 다른 해역 3곳에서 신화 물고기를 직접 포획','challenge_mythic_seas',3,null,null,2006),
('intermediate-two-flavors','전설도 취향이 있대요',2,'collection','서로 다른 미끼 2종으로 신화 물고기를 직접 포획','challenge_mythic_baits',2,null,null,2007),
('intermediate-varied-parcel','꾸러미마다 다른 바다',2,'collection','바다 상인에게 서로 다른 개체 10종 납품 완료','challenge_delivery_species',10,null,null,2014),
('intermediate-weekly-journal','일주일의 바다 수첩',2,'growth','일일 퀘스트 전체 완료 보상 수령 누적 7일과 서로 다른 한국 날짜 7일에 직접 낚시','quest',7,'challenge_days',7,2019)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
