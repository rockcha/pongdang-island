-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.production_facilities ("id","name","description","kind","price","input_count","output_count","production_minutes","storage_minutes","image_path","enabled") values
('angry-puffer-compressor','성난 복어 압축기','통통한 압축기에 힘을 모아 한 번에','trash',2200,8,4,75,30,'/production/angry-puffer-compressor.png',true),
('baby-puffer-pressure-vat','꼬마 복어 압력통','작은 통 속에서 차곡차곡 쌓이는 압력','trash',700,5,2,60,30,'/production/baby-puffer-pressure-vat.png',true),
('baby-seal-press-vat','꼬마 물범 압착통','동그란 압착통에 힘을 모아 연료를 만들어요','fish',800,3,5,150,30,'/production/baby-seal-press-vat.png',true),
('black-current-deep-refining-tower','검은 조류 심층 정유탑','짙은 조류처럼 천천히 깊게 정제해요','fish',4800,6,20,720,50,'/production/black-current-deep-refining-tower.png',true),
('bottle-sunlight-concentrator','빈 병 햇볕농축기','빈 병과 햇살로 천천히 모으는 온기','trash',550,3,2,90,60,'/production/bottle-sunlight-concentrator.png',true),
('brave-puffer-steam-vat','씩씩한 복어 증기통','증기를 꾹 눌러 한 번에 연료를 모아요','fish',2400,5,9,180,25,'/production/brave-puffer-steam-vat.png',true),
('clockwork-compressor','똑딱 태엽 압축기','태엽을 감아 움직이는 작은 압축기','trash',450,3,1,30,60,'/production/clockwork-compressor.png',true),
('conch-spiral-distiller','소라 나선 증류기','나선 관을 따라 천천히 연료를 걸러내요','fish',1650,2,4,75,120,'/production/conch-spiral-distiller.png',true),
('coral-honeycomb-thermal-refinery','산호벌집 온열 정제소','산호 모양 온열칸에서 고르게 열을 나눠요','fish',2850,5,10,240,60,'/production/coral-honeycomb-thermal-refinery.png',true),
('deep-pearl-pressure-refiner','심해진주 압력 정제기','깊은 압력을 모아 알차게 정제해요','fish',3200,6,16,480,25,'/production/deep-pearl-pressure-refiner.png',true),
('deep-pressure-aging-vat','심해압 숙성통','깊은 수압처럼 천천히 압축하는 숙성통','trash',2600,14,8,300,180,'/production/deep-pressure-aging-vat.png',true),
('dewdrop-glass-distiller','물방울 유리 증류기','작은 유리관에서 연료를 한 방울씩 모아요','fish',400,3,4,120,120,'/production/dewdrop-glass-distiller.png',true),
('dock-express-furnace','부두 끝 급행화로','부두 끝에서 빠르게 불을 지피는 화로','trash',1800,12,5,60,60,'/production/dock-express-furnace.png',true),
('dock-grandma-refining-pot','부두 할머니의 정제솥','부두의 작은 솥에서 자주 조금씩 정제해요','fish',900,1,1,20,20,'/production/dock-grandma-refining-pot.png',true),
('gurgling-deep-pressure-cooker','꼬르륵 심해 압력솥','묵직한 압력을 모으는 커다란 압력솥','trash',3000,19,12,360,30,'/production/gurgling-deep-pressure-cooker.png',true),
('lighthouse-heat-storage-kiln','등대지기 축열가마','등대 아래에 열을 오래 간직하는 가마','trash',3700,24,14,480,1440,'/production/lighthouse-heat-storage-kiln.png',true),
('lighthouse-thermal-distillery','등대지기 축열 증류소','등대의 온기를 모아 연료를 오래 보관해요','fish',3900,8,18,600,1320,'/production/lighthouse-thermal-distillery.png',true),
('manta-twin-wing-centrifuge','가오리 양날개 원심분리기','양날개 회전통이 고르게 연료를 분리해요','fish',3500,8,14,210,150,'/production/manta-twin-wing-centrifuge.png',true),
('moon-jelly-cooling-vat','달해파리 냉각 정제통','차가운 냉각관에서 천천히 연료를 모아요','fish',2800,4,9,360,180,'/production/moon-jelly-cooling-vat.png',true),
('otter-hand-press','수달 아저씨의 손잡이 착유기','나무 손잡이를 돌려 차근차근 짜내요','fish',500,2,3,90,60,'/production/otter-hand-press.png',true),
('otter-moon-maturation-tank','해달 달맞이 숙성조','달빛 아래 둥근 숙성조가 천천히 연료를 만들어요','fish',3100,6,12,300,150,'/production/otter-moon-maturation-tank.png',true),
('scrap-engine','고철기관','고철과 증기기관이 만난 든든한 설비','trash',2000,15,8,240,900,'/production/scrap-engine.png',true),
('seahorse-brass-separator','해마 황동 분리기관','황동 분리기관이 완성된 연료를 오래 지켜줘요','fish',2200,4,8,240,900,'/production/seahorse-brass-separator.png',true),
('shell-coal-mini-kiln','조개탄 미니가마','조개껍데기 아래 따뜻한 불씨를 모아요','trash',350,3,1,45,120,'/production/shell-coal-mini-kiln.png',true),
('shell-compression-workshop','소라껍질 압축 공방','소라 모양 압축기로 자원을 꾹꾹 눌러요','trash',1500,6,3,75,120,'/production/shell-compression-workshop.png',true),
('shipwreck-incinerator','난파선 대형 소각로','난파선 선체를 다시 쓴 넉넉한 소각로','trash',2400,30,16,360,480,'/production/shipwreck-incinerator.png',true),
('shipwreck-triple-distillation-tower','난파선 삼단 증류탑','되살린 선체 안에서 세 번 나누어 걸러요','fish',2600,9,16,360,420,'/production/shipwreck-triple-distillation-tower.png',true),
('sleepy-whale-kiln','잠꾸러기 고래가마','고래 모양 가마가 오래도록 열을 품어요','trash',2800,16,10,480,480,'/production/sleepy-whale-kiln.png',true),
('sunny-shell-infusion-jar','햇살조개 냉침병','조개 받침 위 유리병이 햇살을 천천히 품어요','fish',600,4,7,300,60,'/production/sunny-shell-infusion-jar.png',true),
('tin-grandpa-hearth','깡통 할아범의 화덕','낡은 깡통에 작은 불씨를 지피는 화덕','trash',800,4,2,30,90,'/production/tin-grandpa-hearth.png',true),
('trench-black-pearl-reactor','해구의 검은 진주로','해구의 압력을 닮은 깊고 묵직한 설비','trash',4500,21,18,720,60,'/production/trench-black-pearl-reactor.png',true),
('twin-chimney-steamworks','쌍둥이 굴뚝 증기공장','두 화로를 번갈아 가동하는 증기공장','trash',3300,25,14,270,180,'/production/twin-chimney-steamworks.png',true),
('wavewheel-express-press','파도물레 급행 착유기','파도물레가 힘차게 돌아 빠르게 정제해요','fish',2000,5,6,60,40,'/production/wavewheel-express-press.png',true),
('whale-belly-maturation-refinery','고래배 숙성 정제소','고래를 닮은 큰 배 속에서 느긋하게 숙성해요','fish',3000,5,12,480,420,'/production/whale-belly-maturation-refinery.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","kind"=excluded."kind","price"=excluded."price","input_count"=excluded."input_count","output_count"=excluded."output_count","production_minutes"=excluded."production_minutes","storage_minutes"=excluded."storage_minutes","image_path"=excluded."image_path","enabled"=excluded."enabled";
notify pgrst, 'reload schema';
commit;
