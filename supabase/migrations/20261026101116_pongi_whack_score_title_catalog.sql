-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('arcade-whack-score-50','퐁이 감별사',2,'arcade','퐁이 잡기 실전 한 판에서 50점 이상 달성 · 무료 연습 제외','arcade_whack_best',50,null,null,4525),
('arcade-whack-score-60','퐁이를 읽는 손끝',3,'arcade','퐁이 잡기 실전 한 판에서 60점 이상 달성 · 무료 연습 제외','arcade_whack_best',60,null,null,4526),
('arcade-whack-score-70','퐁이 잡기의 신',4,'arcade','퐁이 잡기 실전 한 판에서 70점 이상 달성 · 무료 연습 제외','arcade_whack_best',70,null,null,4527)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
