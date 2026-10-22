-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.production_facilities ("id","name","description","kind","price","input_count","output_count","production_minutes","storage_minutes","image_path","enabled") values
('baby-seal-press-vat','꼬마 물범 압착통','동그란 압착통에 힘을 모아 연료를 만들어요','fish',800,3,4,480,30,'/production/baby-seal-press-vat.png',true),
('black-current-deep-refining-tower','검은 조류 심층 정유탑','짙은 조류처럼 천천히 깊게 정제해요','fish',4800,6,14,1440,50,'/production/black-current-deep-refining-tower.png',true),
('brave-puffer-steam-vat','씩씩한 복어 증기통','증기를 꾹 눌러 한 번에 연료를 모아요','fish',2400,5,6,250,25,'/production/brave-puffer-steam-vat.png',true),
('conch-spiral-distiller','소라 나선 증류기','나선 관을 따라 천천히 연료를 걸러내요','fish',1650,2,2,85,120,'/production/conch-spiral-distiller.png',true),
('coral-honeycomb-thermal-refinery','산호벌집 온열 정제소','산호 모양 온열칸에서 고르게 열을 나눠요','fish',2850,5,7,480,60,'/production/coral-honeycomb-thermal-refinery.png',true),
('deep-pearl-pressure-refiner','심해진주 압력 정제기','깊은 압력을 모아 알차게 정제해요','fish',3200,6,12,750,25,'/production/deep-pearl-pressure-refiner.png',true),
('dewdrop-glass-distiller','물방울 유리 증류기','작은 유리관에서 연료를 한 방울씩 모아요','fish',400,4,3,135,120,'/production/dewdrop-glass-distiller.png',true),
('dock-grandma-refining-pot','부두 할머니의 정제솥','부두의 작은 솥에서 자주 조금씩 정제해요','fish',900,1,1,30,20,'/production/dock-grandma-refining-pot.png',true),
('lighthouse-thermal-distillery','등대지기 축열 증류소','등대의 온기를 모아 연료를 오래 보관해요','fish',3900,8,12,750,1320,'/production/lighthouse-thermal-distillery.png',true),
('manta-twin-wing-centrifuge','가오리 양날개 원심분리기','양날개 회전통이 고르게 연료를 분리해요','fish',3500,8,10,330,150,'/production/manta-twin-wing-centrifuge.png',true),
('moon-jelly-cooling-vat','달해파리 냉각 정제통','차가운 냉각관에서 천천히 연료를 모아요','fish',2800,4,6,720,180,'/production/moon-jelly-cooling-vat.png',true),
('otter-hand-press','수달 아저씨의 손잡이 착유기','나무 손잡이를 돌려 차근차근 짜내요','fish',500,2,2,120,60,'/production/otter-hand-press.png',true),
('otter-moon-maturation-tank','해달 달맞이 숙성조','달빛 아래 둥근 숙성조가 천천히 연료를 만들어요','fish',3100,6,9,600,150,'/production/otter-moon-maturation-tank.png',true),
('seahorse-brass-separator','해마 황동 분리기관','황동 분리기관이 완성된 연료를 오래 지켜줘요','fish',2200,4,5,390,900,'/production/seahorse-brass-separator.png',true),
('shipwreck-triple-distillation-tower','난파선 삼단 증류탑','되살린 선체 안에서 세 번 나누어 걸러요','fish',2600,9,10,510,420,'/production/shipwreck-triple-distillation-tower.png',true),
('sunny-shell-infusion-jar','햇살조개 냉침병','조개 받침 위 유리병이 햇살을 천천히 품어요','fish',600,4,5,900,60,'/production/sunny-shell-infusion-jar.png',true),
('wavewheel-express-press','파도물레 급행 착유기','파도물레가 힘차게 돌아 빠르게 정제해요','fish',2000,5,4,75,40,'/production/wavewheel-express-press.png',true),
('whale-belly-maturation-refinery','고래배 숙성 정제소','고래를 닮은 큰 배 속에서 느긋하게 숙성해요','fish',3000,5,8,990,420,'/production/whale-belly-maturation-refinery.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","kind"=excluded."kind","price"=excluded."price","input_count"=excluded."input_count","output_count"=excluded."output_count","production_minutes"=excluded."production_minutes","storage_minutes"=excluded."storage_minutes","image_path"=excluded."image_path","enabled"=excluded."enabled";
notify pgrst, 'reload schema';
commit;
