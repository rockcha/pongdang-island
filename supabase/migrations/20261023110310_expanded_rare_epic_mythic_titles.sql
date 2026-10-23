-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('expansion-2-care','이웃집 물때를 아는',2,'growth','친구 어항 돌보기 누적 15회','care',15,null,null,4206),
('expansion-2-challenge-epic-unique','세 번의 특별한 만남',2,'collection','서로 다른 특급 물고기 3종을 직접 포획','challenge_epic_unique',3,null,null,4203),
('expansion-2-challenge-mythic-unique','두 전설의 목격자',2,'collection','서로 다른 신화 물고기 2종을 직접 포획','challenge_mythic_unique',2,null,null,4204),
('expansion-2-challenge-rare-unique','귀한 손님 명부',2,'collection','서로 다른 희귀 물고기 8종을 직접 포획','challenge_rare_unique',8,null,null,4202),
('expansion-2-challenge-unique','스무 얼굴의 바다',2,'collection','서로 다른 물고기 20종을 직접 낚시로 포획','challenge_unique',20,null,null,4201),
('expansion-2-decor','조개보다 취향이 많은',2,'growth','장식물 포획 누적 25회','decor',25,null,null,4209),
('expansion-2-manual','백 번의 물결',2,'growth','직접 낚시 누적 100회','manual',100,null,null,4200),
('expansion-2-quest','닷새의 작은 약속',2,'growth','일일 퀘스트 전체 완료 보상 수령 누적 5일','quest',5,null,null,4208),
('expansion-2-trade','흥정에 맛들인',2,'growth','거래 성사 누적 15회','trade',15,null,null,4207),
('expansion-2-voyage','통발 기다리는 재미',2,'growth','통발 결과 수령 누적 15회','voyage',15,null,null,4205),
('expansion-3-care','육십 번의 다정한 방문',3,'growth','친구 어항 돌보기 누적 60회','care',60,null,null,4307),
('expansion-3-challenge-epic-unique','특별함을 모으는 서가',3,'collection','서로 다른 특급 물고기 20종을 직접 포획','challenge_epic_unique',20,null,null,4303),
('expansion-3-challenge-mythic-unique','여덟 전설의 항해도',3,'collection','서로 다른 신화 물고기 8종을 직접 포획','challenge_mythic_unique',8,null,null,4304),
('expansion-3-challenge-rare-unique','귀한 손님도 줄을 서는',3,'collection','서로 다른 희귀 물고기 40종을 직접 포획','challenge_rare_unique',40,null,null,4302),
('expansion-3-challenge-unique','백 가지 물결의 기록',3,'collection','서로 다른 물고기 100종을 직접 낚시로 포획','challenge_unique',100,null,null,4301),
('expansion-3-manual','육백 번의 손맛',3,'growth','직접 낚시 누적 600회','manual',600,null,null,4300),
('expansion-3-mythic','전설과의 열 번째 인사',3,'growth','신화 포획 누적 10회','mythic',10,null,null,4305),
('expansion-3-quest','한 달을 채운 약속',3,'growth','일일 퀘스트 전체 완료 보상 수령 누적 30일','quest',30,null,null,4309),
('expansion-3-trade','흥정 끝에 남은 신뢰',3,'growth','거래 성사 누적 60회','trade',60,null,null,4308),
('expansion-3-voyage','통발이 먼저 알아보는',3,'growth','통발 결과 수령 누적 60회','voyage',60,null,null,4306),
('expansion-4-care','온 바다에 남긴 다정함',4,'growth','친구 어항 돌보기 누적 600회','care',600,null,null,4407),
('expansion-4-challenge-epic-unique','일흔 전설의 문지기',4,'collection','서로 다른 특급 물고기 70종을 직접 포획','challenge_epic_unique',70,null,null,4403),
('expansion-4-challenge-mythic-unique','서른 신화가 머문 이름',4,'collection','서로 다른 신화 물고기 30종을 직접 포획','challenge_mythic_unique',30,null,null,4404),
('expansion-4-challenge-rare-unique','백 가지 희귀의 증명',4,'collection','서로 다른 희귀 물고기 100종을 직접 포획','challenge_rare_unique',100,null,null,4402),
('expansion-4-challenge-unique','삼백 얼굴을 기억하는 바다',4,'collection','서로 다른 물고기 300종을 직접 낚시로 포획','challenge_unique',300,null,null,4401),
('expansion-4-manual','바다가 먼저 퇴근을 권한',4,'growth','직접 낚시 누적 20,000회','manual',20000,null,null,4400),
('expansion-4-mythic','신화도 익숙해진 손끝',4,'growth','신화 포획 누적 100회','mythic',100,null,null,4405),
('expansion-4-quest','반년을 함께한 약속',4,'growth','일일 퀘스트 전체 완료 보상 수령 누적 180일','quest',180,null,null,4409),
('expansion-4-trade','수평선 너머의 상단주',4,'growth','거래 성사 누적 600회','trade',600,null,null,4408),
('expansion-4-voyage','육백 물길의 통발지기',4,'growth','통발 결과 수령 누적 600회','voyage',600,null,null,4406)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
