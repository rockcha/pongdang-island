-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.title_catalog ("id","name","tier","category","description","metric","target","extra_metric","extra_target","sort_order") values
('challenge-buffet-member','바다 뷔페 연간회원',4,'moment','하루 동안 물고기·쓰레기·장식물을 모두 직접 잡은 날 30일 달성','challenge_buffet_days',30,null,null,3023),
('challenge-candle-god','촛불로 부른 신',4,'moment','별빛 밀랍으로 신화 물고기 3마리 직접 포획','challenge_wax',3,null,null,3018),
('challenge-captain-really','선장님 이거 실화예요?',4,'moment','항구 조업 한 번의 수령 결과에서 신화 물고기 2마리 이상 획득','challenge_harbor_pair',1,null,null,3029),
('challenge-cloud-gourmet','구름 맛만 아는 사람',4,'moment','솜구름 반죽으로 일반 물고기 500마리 직접 포획','challenge_cloud',500,null,null,3020),
('challenge-cracked-starlight','금 간 곳으로 별이',4,'moment','금 간 별조각으로 신화 물고기 5마리 직접 포획','challenge_star',5,null,null,3019),
('challenge-crumb-rebellion','부스러기의 반란',4,'moment','조개 부스러기로 희귀 물고기 30마리 직접 포획','challenge_crumbs',30,null,null,3015),
('challenge-delivery-encyclopedia','납품서가 도감보다 두꺼운',4,'collection','바다 상인에게 서로 다른 개체 60종 납품 완료','challenge_delivery_species',60,null,null,3026),
('challenge-divine-menu','신도 가리는 입맛',4,'collection','서로 다른 미끼 5종으로 신화 물고기를 직접 포획','challenge_mythic_baits',5,null,null,3010),
('challenge-express-conductor','특급열차 차장',4,'collection','서로 다른 특급 물고기 50종을 직접 포획','challenge_epic_unique',50,null,null,3013),
('challenge-fish-interview','물고기도 면접 보나요',4,'moment','직접 낚시에서 특급 이상 물고기 3마리 연속 포획','challenge_epic3',1,null,null,3004),
('challenge-gods-in-line','신도 줄을 섰다',4,'moment','직접 낚시에서 신화 물고기 2마리 연속 포획','challenge_mythic2',1,null,null,3005),
('challenge-habitual-miracle','기적도 습관입니다',4,'moment','하루 동안 일반·희귀·특급·신화 물고기를 모두 직접 잡은 날 10일 달성','challenge_rainbow_days',10,null,null,3011),
('challenge-harbor-address','항구에 주민등록한',4,'growth','항구 조업 결과 500회 수령 완료','challenge_harbor',500,null,null,3028),
('challenge-last-train-gods','막차 타는 신들',4,'moment','해당 미끼가 마지막 1개인 상태에서 신화 물고기 직접 포획 5회','challenge_last_mythic',5,null,null,3022),
('challenge-lightning-twenty','벼락은 스무 번 친다',4,'moment','벼락 별가루로 특급 물고기 20마리 직접 포획','challenge_lightning',20,null,null,3017),
('challenge-merchant-boss','사장님은 제가 할게요',4,'growth','바다 상인의 의뢰 300건 납품 완료','challenge_deliveries',300,null,null,3025),
('challenge-merchant-paycheck','상인의 월급 도둑',4,'growth','바다 상인의 의뢰 100건 납품 완료','challenge_deliveries',100,null,null,3024),
('challenge-mythic-business-trip','신화 출장 전문가',4,'collection','서로 다른 해역 10곳에서 신화 물고기를 직접 포획','challenge_mythic_seas',10,null,null,3009),
('challenge-mythic-editor','신화 도감 편집장',4,'collection','서로 다른 신화 물고기 20종을 직접 포획','challenge_mythic_unique',20,null,null,3014),
('challenge-mythic-parcel','신화도 택배 되나요?',4,'moment','신화 개체가 포함된 바다 상인의 의뢰 납품 완료','challenge_delivery_mythic',1,null,null,3027),
('challenge-no-ordinary','평범한 건 사양합니다',4,'moment','직접 낚시에서 희귀 이상 물고기 5마리 연속 포획','challenge_rare5',1,null,null,3003),
('challenge-overtime','바다도 퇴근했는데',4,'growth','직접 낚시 10,000회. 실패도 포함해요.','challenge_manual',10000,null,null,3000),
('challenge-pupa-dream','번데기의 꿈',4,'moment','반딧불 번데기로 특급 물고기 20마리 직접 포획','challenge_pupa',20,null,null,3016),
('challenge-rare-regular','희귀한데 단골입니다',4,'collection','서로 다른 희귀 물고기 80종을 직접 포획','challenge_rare_unique',80,null,null,3012),
('challenge-recycling-day','오늘은 분리수거',4,'moment','직접 낚시에서 쓰레기 7개 연속 포획','challenge_trash7',1,null,null,3006),
('challenge-sea-census','바다의 주민등록부',4,'collection','서로 다른 물고기 200종을 직접 낚시로 포획','challenge_unique',200,null,null,3008),
('challenge-sea-resident','출석은 바다에 찍어요',4,'growth','서로 다른 한국 날짜 100일에 직접 낚시하기','challenge_days',100,null,null,3001),
('challenge-unbroken-reel','릴을 놓는 법을 잊은',4,'moment','직접 낚시에서 물고기 12마리 연속 포획. 실패·쓰레기·장식물은 연속을 끊어요.','challenge_fish12',1,null,null,3002),
('challenge-worm-theology','지렁이로 신 낚기',4,'moment','퐁당 지렁이로 신화 물고기 3마리 직접 포획','challenge_worm',3,null,null,3021),
('challenge-you-again','우리 어디서 봤죠?',4,'collection','같은 종의 물고기를 직접 낚시로 100마리 포획','challenge_same_fish',100,null,null,3007)
on conflict(id) do update set "name"=excluded."name","tier"=excluded."tier","category"=excluded."category","description"=excluded."description","metric"=excluded."metric","target"=excluded."target","extra_metric"=excluded."extra_metric","extra_target"=excluded."extra_target","sort_order"=excluded."sort_order";
notify pgrst, 'reload schema';
commit;
