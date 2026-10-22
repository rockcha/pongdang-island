-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.production_facilities ("id","name","description","kind","price","input_count","output_count","production_minutes","storage_minutes","image_path","enabled") values
('angry-puffer-compressor','성난 복어 압축기','통통한 압축기에 힘을 모아 한 번에','trash',2200,8,3,120,30,'/production/angry-puffer-compressor.png',true),
('deep-pressure-aging-vat','심해압 숙성통','깊은 수압처럼 천천히 압축하는 숙성통','trash',2600,14,6,720,180,'/production/deep-pressure-aging-vat.png',true),
('dock-express-furnace','부두 끝 급행화로','부두 끝에서 빠르게 불을 지피는 화로','trash',1800,17,4,60,60,'/production/dock-express-furnace.png',true),
('gurgling-deep-pressure-cooker','꼬르륵 심해 압력솥','묵직한 압력을 모으는 커다란 압력솥','trash',3000,19,10,660,30,'/production/gurgling-deep-pressure-cooker.png',true),
('lighthouse-heat-storage-kiln','등대지기 축열가마','등대 아래에 열을 오래 간직하는 가마','trash',3700,24,10,720,1440,'/production/lighthouse-heat-storage-kiln.png',true),
('scrap-engine','고철기관','고철과 증기기관이 만난 든든한 설비','trash',2000,15,5,390,900,'/production/scrap-engine.png',true),
('shipwreck-incinerator','난파선 대형 소각로','난파선 선체를 다시 쓴 넉넉한 소각로','trash',2400,35,13,480,480,'/production/shipwreck-incinerator.png',true),
('sleepy-whale-kiln','잠꾸러기 고래가마','고래 모양 가마가 오래도록 열을 품어요','trash',2800,16,7,960,480,'/production/sleepy-whale-kiln.png',true),
('twin-chimney-steamworks','쌍둥이 굴뚝 증기공장','두 화로를 번갈아 가동하는 증기공장','trash',3300,25,9,390,180,'/production/twin-chimney-steamworks.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","kind"=excluded."kind","price"=excluded."price","input_count"=excluded."input_count","output_count"=excluded."output_count","production_minutes"=excluded."production_minutes","storage_minutes"=excluded."storage_minutes","image_path"=excluded."image_path","enabled"=excluded."enabled";
notify pgrst, 'reload schema';
commit;
