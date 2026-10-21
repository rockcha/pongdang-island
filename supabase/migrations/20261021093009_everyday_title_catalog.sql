-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('cast-again','그래도 던진다',2,'moment','직접 낚시 실패 직후 다음 낚시에서 포획 성공 20회','recovery_catches',20,null,null,603),
('community-empathy','작은 공감 수집가',1,'social','자유게시판 내 글에 받은 좋아요 20개','community_likes',20,null,null,606),
('community-first-word','방파제의 첫마디',1,'social','자유게시판 첫 게시글 작성','community_posts',1,null,null,604),
('community-heart-angler','마음을 낚는 사람',3,'social','자유게시판 내 글에 받은 좋아요 100개','community_likes',100,null,null,607),
('community-storyteller','퐁당섬 이야기꾼',2,'social','자유게시판 게시글 30개 작성','community_posts',30,null,null,605),
('empty-hook','오늘도 빈 바늘',1,'moment','직접 낚시 실패 누적 30회','fishing_failures',30,null,null,602),
('merchant-regular','상인의 단골손님',1,'growth','바다 상인의 의뢰 10회 납품 완료','challenge_deliveries',10,null,null,608),
('merchant-solver','항구의 해결사',3,'growth','바다 상인의 의뢰 100회 납품 완료','challenge_deliveries',100,null,null,610),
('merchant-trusted','믿고 맡기는 손',2,'growth','바다 상인의 의뢰 50회 납품 완료','challenge_deliveries',50,null,null,609),
('operation-failure-1','손이 꼬인 사람',1,'moment','낚시 조작 실패 누적 10회','operation_failures',10,null,null,600),
('operation-failure-2','줄과 밀당하는 사람',2,'moment','낚시 조작 실패 누적 50회','operation_failures',50,null,null,601)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
