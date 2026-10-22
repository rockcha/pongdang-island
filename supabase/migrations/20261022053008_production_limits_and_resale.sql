-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.production_facilities ("id","name","description","kind","price","input_count","output_count","production_minutes","storage_minutes","image_path","enabled") values
('angry-puffer-compressor','성난 복어 압축기','통통한 압축기에 힘을 모아 한 번에','trash',2200,9,3,120,30,'/production/angry-puffer-compressor.png',true),
('baby-puffer-pressure-vat','꼬마 복어 압력통','작은 통 속에서 차곡차곡 쌓이는 압력','trash',700,6,2,240,30,'/production/baby-puffer-pressure-vat.png',true),
('baby-seal-press-vat','꼬마 물범 압착통','동그란 압착통에 힘을 모아 연료를 만들어요','fish',800,3,4,480,30,'/production/baby-seal-press-vat.png',true),
('black-current-deep-refining-tower','검은 조류 심층 정유탑','짙은 조류처럼 천천히 깊게 정제해요','fish',4800,6,14,1440,50,'/production/black-current-deep-refining-tower.png',true),
('bottle-sunlight-concentrator','빈 병 햇볕농축기','빈 병과 햇살로 천천히 모으는 온기','trash',550,3,1,180,60,'/production/bottle-sunlight-concentrator.png',true),
('brave-puffer-steam-vat','씩씩한 복어 증기통','증기를 꾹 눌러 한 번에 연료를 모아요','fish',2400,5,6,250,25,'/production/brave-puffer-steam-vat.png',true),
('clockwork-compressor','똑딱 태엽 압축기','태엽을 감아 움직이는 작은 압축기','trash',450,4,1,60,60,'/production/clockwork-compressor.png',true),
('conch-spiral-distiller','소라 나선 증류기','나선 관을 따라 천천히 연료를 걸러내요','fish',1650,2,2,85,120,'/production/conch-spiral-distiller.png',true),
('coral-honeycomb-thermal-refinery','산호벌집 온열 정제소','산호 모양 온열칸에서 고르게 열을 나눠요','fish',2850,5,7,480,60,'/production/coral-honeycomb-thermal-refinery.png',true),
('deep-pearl-pressure-refiner','심해진주 압력 정제기','깊은 압력을 모아 알차게 정제해요','fish',3200,6,12,750,25,'/production/deep-pearl-pressure-refiner.png',true),
('deep-pressure-aging-vat','심해압 숙성통','깊은 수압처럼 천천히 압축하는 숙성통','trash',2600,15,6,720,180,'/production/deep-pressure-aging-vat.png',true),
('dewdrop-glass-distiller','물방울 유리 증류기','작은 유리관에서 연료를 한 방울씩 모아요','fish',400,4,3,135,120,'/production/dewdrop-glass-distiller.png',true),
('dock-express-furnace','부두 끝 급행화로','부두 끝에서 빠르게 불을 지피는 화로','trash',1800,18,4,60,60,'/production/dock-express-furnace.png',true),
('dock-grandma-refining-pot','부두 할머니의 정제솥','부두의 작은 솥에서 자주 조금씩 정제해요','fish',900,1,1,30,10,'/production/dock-grandma-refining-pot.png',true),
('gurgling-deep-pressure-cooker','꼬르륵 심해 압력솥','묵직한 압력을 모으는 커다란 압력솥','trash',3000,24,12,720,30,'/production/gurgling-deep-pressure-cooker.png',true),
('lighthouse-heat-storage-kiln','등대지기 축열가마','등대 아래에 열을 오래 간직하는 가마','trash',3700,30,12,720,1440,'/production/lighthouse-heat-storage-kiln.png',true),
('lighthouse-thermal-distillery','등대지기 축열 증류소','등대의 온기를 모아 연료를 오래 보관해요','fish',3900,8,12,750,1320,'/production/lighthouse-thermal-distillery.png',true),
('manta-twin-wing-centrifuge','가오리 양날개 원심분리기','양날개 회전통이 고르게 연료를 분리해요','fish',3500,8,10,330,150,'/production/manta-twin-wing-centrifuge.png',true),
('moon-jelly-cooling-vat','달해파리 냉각 정제통','차가운 냉각관에서 천천히 연료를 모아요','fish',2800,4,6,720,180,'/production/moon-jelly-cooling-vat.png',true),
('otter-hand-press','수달 아저씨의 손잡이 착유기','나무 손잡이를 돌려 차근차근 짜내요','fish',500,2,2,120,60,'/production/otter-hand-press.png',true),
('otter-moon-maturation-tank','해달 달맞이 숙성조','달빛 아래 둥근 숙성조가 천천히 연료를 만들어요','fish',3100,6,9,600,150,'/production/otter-moon-maturation-tank.png',true),
('scrap-engine','고철기관','고철과 증기기관이 만난 든든한 설비','trash',2000,16,5,390,900,'/production/scrap-engine.png',true),
('seahorse-brass-separator','해마 황동 분리기관','황동 분리기관이 완성된 연료를 오래 지켜줘요','fish',2200,4,5,390,900,'/production/seahorse-brass-separator.png',true),
('shell-coal-mini-kiln','조개탄 미니가마','조개껍데기 아래 따뜻한 불씨를 모아요','trash',350,5,1,45,120,'/production/shell-coal-mini-kiln.png',true),
('shell-compression-workshop','소라껍질 압축 공방','소라 모양 압축기로 자원을 꾹꾹 눌러요','trash',1500,7,2,90,120,'/production/shell-compression-workshop.png',true),
('shipwreck-incinerator','난파선 대형 소각로','난파선 선체를 다시 쓴 넉넉한 소각로','trash',2400,35,10,480,480,'/production/shipwreck-incinerator.png',true),
('shipwreck-triple-distillation-tower','난파선 삼단 증류탑','되살린 선체 안에서 세 번 나누어 걸러요','fish',2600,9,10,510,420,'/production/shipwreck-triple-distillation-tower.png',true),
('sleepy-whale-kiln','잠꾸러기 고래가마','고래 모양 가마가 오래도록 열을 품어요','trash',2800,18,8,960,480,'/production/sleepy-whale-kiln.png',true),
('sunny-shell-infusion-jar','햇살조개 냉침병','조개 받침 위 유리병이 햇살을 천천히 품어요','fish',600,4,5,900,60,'/production/sunny-shell-infusion-jar.png',true),
('tin-grandpa-hearth','깡통 할아범의 화덕','낡은 깡통에 작은 불씨를 지피는 화덕','trash',800,4,1,30,90,'/production/tin-grandpa-hearth.png',true),
('trench-black-pearl-reactor','해구의 검은 진주로','해구의 압력을 닮은 깊고 묵직한 설비','trash',4500,21,14,1440,60,'/production/trench-black-pearl-reactor.png',true),
('twin-chimney-steamworks','쌍둥이 굴뚝 증기공장','두 화로를 번갈아 가동하는 증기공장','trash',3300,30,10,300,180,'/production/twin-chimney-steamworks.png',true),
('wavewheel-express-press','파도물레 급행 착유기','파도물레가 힘차게 돌아 빠르게 정제해요','fish',2000,5,4,75,40,'/production/wavewheel-express-press.png',true),
('whale-belly-maturation-refinery','고래배 숙성 정제소','고래를 닮은 큰 배 속에서 느긋하게 숙성해요','fish',3000,5,8,990,420,'/production/whale-belly-maturation-refinery.png',true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","kind"=excluded."kind","price"=excluded."price","input_count"=excluded."input_count","output_count"=excluded."output_count","production_minutes"=excluded."production_minutes","storage_minutes"=excluded."storage_minutes","image_path"=excluded."image_path","enabled"=excluded."enabled";
-- Serialize purchases and sales using the existing wallet lock. Preserve legacy excess sites and running snapshots.
CREATE OR REPLACE FUNCTION app_private.production_apply(p_action text, p_operation_id uuid, p_facility text, p_materials jsonb, p_return_state boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;f public.production_facilities;s app_private.production_sites;
 prev app_private.production_operations;sig jsonb;receipt jsonb;ids uuid[];n integer;v_now timestamptz;fuel bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','sell','start','claim','discard') or p_facility is null then raise exception 'INVALID_PRODUCTION';end if;
 if p_materials is null or jsonb_typeof(p_materials)<>'object' then raise exception 'INVALID_MATERIALS';end if;
 if p_action<>'start' and p_materials<>'{}'::jsonb then raise exception 'INVALID_MATERIALS';end if;
 sig:=jsonb_build_object('action',p_action,'facility',p_facility,'materials',p_materials);
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return (case when p_return_state then app_private.production_state() else '{}'::jsonb end)||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 if p_action='buy' then
  select * into f from public.production_facilities where id=p_facility for share;
  if not found then raise exception 'PRODUCTION_NOT_FOUND';end if;
  if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
 if (select count(*) from app_private.production_sites owned_site where owned_site.user_id=u)+1>4 then raise exception 'PRODUCTION_OWNERSHIP_LIMIT';end if;
 if w.gold<f.price then raise exception 'INSUFFICIENT_GOLD';end if;
  v_now:=clock_timestamp();
  insert into app_private.production_sites(user_id,facility_id) values(u,f.id) returning * into s;
  update public.player_wallets set gold=gold-f.price,updated_at=v_now where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','production:'||f.id,-f.price);
  receipt:=jsonb_build_object('action','buy','facility',f.id,'siteId',s.id,'count',1);
 else
  s:=app_private.production_site(p_facility);
  select * into s from app_private.production_sites where id=s.id and user_id=u for update;
  select * into f from public.production_facilities where id=s.facility_id for share;
  v_now:=clock_timestamp();
  if p_action='sell' then
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if w.gold::bigint+(f.price/2)>1000000000 then raise exception 'GOLD_LIMIT';end if;
   delete from app_private.production_sites where id=s.id and user_id=u;
   update public.player_wallets set gold=gold+(f.price/2),updated_at=v_now where user_id=u;
   insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
    values(u,p_operation_id,'sell','production:'||f.id,f.price/2);
   receipt:=jsonb_build_object('action','sell','facility',f.id,'siteId',s.id,'gold',f.price/2,'count',1);
  elsif p_action='start' then
   if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
   if s.started_at is not null then raise exception 'PRODUCTION_BUSY';end if;
   if (select count(*) from jsonb_each(p_materials)) not between 1 and 100 then raise exception 'INVALID_MATERIALS';end if;
   if exists(select 1 from jsonb_each(p_materials) e where jsonb_typeof(e.value)<>'number' or e.value::text !~ '^[1-9][0-9]{0,2}$') then raise exception 'INVALID_MATERIALS';end if;
   if (select sum(value::integer) from jsonb_each_text(p_materials))<>f.input_count then raise exception 'INVALID_MATERIAL_COUNT';end if;
   select array_agg(p.id order by p.id) into ids from jsonb_each_text(p_materials) e
   cross join lateral(select c.id from public.player_collectibles c join public.collectible_species cs on cs.id=c.species_id
    where c.user_id=u and c.species_id=e.key and cs.kind::text=f.kind and c.sold_at is null and c.consumed_at is null
    and c.tank_id is null and c.escrow_gift_id is null order by c.id limit e.value::integer)p;
   if coalesce(cardinality(ids),0)<>f.input_count then raise exception 'INSUFFICIENT_MATERIALS';end if;
   perform 1 from public.player_collectibles where user_id=u and id=any(ids) order by id for update;
   select count(*) into n from public.player_collectibles c join public.collectible_species cs on cs.id=c.species_id
    where c.user_id=u and c.id=any(ids) and cs.kind::text=f.kind and c.sold_at is null and c.consumed_at is null and c.tank_id is null and c.escrow_gift_id is null;
   if n<>f.input_count then raise exception 'INSUFFICIENT_MATERIALS';end if;
   v_now:=clock_timestamp();
   update public.player_collectibles set sold_at=v_now,consumed_at=v_now where user_id=u and id=any(ids);
   update app_private.production_sites set started_at=v_now,completes_at=v_now+make_interval(mins=>f.production_minutes),
    expires_at=v_now+make_interval(mins=>f.production_minutes+f.storage_minutes),run_output=f.output_count where user_id=u and id=s.id;
   receipt:=jsonb_build_object('action','start','facility',f.id,'siteId',s.id,'consumedIds',ids);
  else
   if s.started_at is null then raise exception 'PRODUCTION_IDLE';end if;
   if p_action='claim' then
    if v_now<s.completes_at then raise exception 'PRODUCTION_NOT_READY';end if;
    if v_now>=s.expires_at then raise exception 'PRODUCTION_EXPIRED';end if;
    fuel:=coalesce((w.inventory->>'fuel')::bigint,0)+s.run_output;
    if fuel>1000000000 then raise exception 'FUEL_LIMIT';end if;
    update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel::integer)),updated_at=v_now where user_id=u;
   elsif v_now<s.expires_at then raise exception 'PRODUCTION_NOT_EXPIRED';end if;
   receipt:=jsonb_build_object('action',p_action,'facility',f.id,'siteId',s.id,'fuel',case when p_action='claim' then s.run_output else 0 end);
   update app_private.production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null where user_id=u and id=s.id;
  end if;
 end if;
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return (case when p_return_state then app_private.production_state() else '{}'::jsonb end)||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.production_purchase(p_facility text, p_quantity integer, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.player_wallets;f public.production_facilities;prev app_private.production_operations;
 sig jsonb;receipt jsonb;ids uuid[];total bigint;v_now timestamptz;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_facility is null or p_quantity is null or p_quantity not between 1 and 100 then raise exception 'INVALID_PRODUCTION_QUANTITY';end if;
 sig:=jsonb_build_object('action','purchase','facility',p_facility,'quantity',p_quantity);
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 select * into prev from app_private.production_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.production_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 select * into f from public.production_facilities where id=p_facility for share;
 if not found then raise exception 'PRODUCTION_NOT_FOUND';end if;
 if not f.enabled then raise exception 'PRODUCTION_UNAVAILABLE';end if;
 if (select count(*) from app_private.production_sites owned_site where owned_site.user_id=u)+p_quantity>4 then raise exception 'PRODUCTION_OWNERSHIP_LIMIT';end if;
 total:=f.price::bigint*p_quantity;
 if w.gold<total then raise exception 'INSUFFICIENT_GOLD';end if;
 v_now:=clock_timestamp();
 with purchased as(insert into app_private.production_sites(user_id,facility_id)
  select u,f.id from generate_series(1,p_quantity) returning id) select array_agg(id order by id) into ids from purchased;
 update public.player_wallets set gold=gold-total,updated_at=v_now where user_id=u;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','production:'||f.id,-total);
 receipt:=jsonb_build_object('action','purchase','facility',f.id,'siteIds',ids,'count',p_quantity);
 insert into app_private.production_operations(user_id,operation_id,signature,receipt) values(u,p_operation_id,sig,receipt);
 return app_private.production_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$
;
notify pgrst,'reload schema';
commit;
