-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.production_facilities ("id","name","description","kind","price","input_count","output_count","production_minutes","storage_minutes","image_path","enabled") values
('angry-puffer-compressor','성난 복어 압축기','통통한 압축기에 힘을 모아 한 번에','trash',2200,5,4,75,30,'/production/angry-puffer-compressor.png',true),
('baby-puffer-pressure-vat','꼬마 복어 압력통','작은 통 속에서 차곡차곡 쌓이는 압력','trash',700,3,2,60,30,'/production/baby-puffer-pressure-vat.png',true),
('bottle-sunlight-concentrator','빈 병 햇볕농축기','빈 병과 햇살로 천천히 모으는 온기','trash',550,2,2,90,60,'/production/bottle-sunlight-concentrator.png',true),
('clockwork-compressor','똑딱 태엽 압축기','태엽을 감아 움직이는 작은 압축기','trash',450,2,1,30,60,'/production/clockwork-compressor.png',true),
('deep-pressure-aging-vat','심해압 숙성통','깊은 수압처럼 천천히 압축하는 숙성통','trash',2600,9,8,300,180,'/production/deep-pressure-aging-vat.png',true),
('dock-express-furnace','부두 끝 급행화로','부두 끝에서 빠르게 불을 지피는 화로','trash',1800,8,5,60,60,'/production/dock-express-furnace.png',true),
('gurgling-deep-pressure-cooker','꼬르륵 심해 압력솥','묵직한 압력을 모으는 커다란 압력솥','trash',3000,12,12,360,30,'/production/gurgling-deep-pressure-cooker.png',true),
('lighthouse-heat-storage-kiln','등대지기 축열가마','등대 아래에 열을 오래 간직하는 가마','trash',3700,15,14,480,1440,'/production/lighthouse-heat-storage-kiln.png',true),
('scrap-engine','고철기관','고철과 증기기관이 만난 든든한 설비','trash',2000,10,8,240,900,'/production/scrap-engine.png',true),
('shell-coal-mini-kiln','조개탄 미니가마','조개껍데기 아래 따뜻한 불씨를 모아요','trash',350,2,1,45,120,'/production/shell-coal-mini-kiln.png',true),
('shell-compression-workshop','소라껍질 압축 공방','소라 모양 압축기로 자원을 꾹꾹 눌러요','trash',1500,4,3,75,120,'/production/shell-compression-workshop.png',true),
('shipwreck-incinerator','난파선 대형 소각로','난파선 선체를 다시 쓴 넉넉한 소각로','trash',2400,20,16,360,480,'/production/shipwreck-incinerator.png',true),
('sleepy-whale-kiln','잠꾸러기 고래가마','고래 모양 가마가 오래도록 열을 품어요','trash',2800,10,10,480,480,'/production/sleepy-whale-kiln.png',true),
('tin-grandpa-hearth','깡통 할아범의 화덕','낡은 깡통에 작은 불씨를 지피는 화덕','trash',800,3,2,30,90,'/production/tin-grandpa-hearth.png',true),
('trench-black-pearl-reactor','해구의 검은 진주로','해구의 압력을 닮은 깊고 묵직한 설비','trash',4500,14,18,720,60,'/production/trench-black-pearl-reactor.png',true),
('twin-chimney-steamworks','쌍둥이 굴뚝 증기공장','두 화로를 번갈아 가동하는 증기공장','trash',3300,16,14,270,180,'/production/twin-chimney-steamworks.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","kind"=excluded."kind","price"=excluded."price","input_count"=excluded."input_count","output_count"=excluded."output_count","production_minutes"=excluded."production_minutes","storage_minutes"=excluded."storage_minutes","image_path"=excluded."image_path","enabled"=excluded."enabled";
notify pgrst, 'reload schema';
commit;
