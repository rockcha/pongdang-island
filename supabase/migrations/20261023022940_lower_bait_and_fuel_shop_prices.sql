-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.fishing_baits ("id","name","description","price","image_path","sort_order","common_bp","rare_bp","epic_bp","mythic_bp","failure_bp","effect_kind","effect_description","success_chance_bp","fish_only","alternating") values
('bait','퐁당 지렁이','익숙한 향기로 바다 친구들을 부르는 기본 미끼예요.',48,'/items/baits/pongdang-worm.png',101,8650,1200,130,20,0,'fish','익숙한 향기로 바다 친구들을 부르는 기본 미끼예요.',10000,false,false),
('bait_aurora_clockwork_bug','오로라 태엽벌레','오색으로 빛나는 태엽이 물고기와 장식물을 끌어당겨요.',190,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/aurora-clockwork-bug.png',124,2420,7500,0,80,0,'fish','오색으로 빛나는 태엽이 물고기와 장식물을 끌어당겨요.',10000,false,false),
('bait_cloud_dough','솜구름 반죽','폭신한 구름 향기로 일반 등급 물고기를 불러요.',33,'/items/baits/cloud-dough.png',110,10000,0,0,0,0,'fish','폭신한 구름 향기로 일반 등급 물고기를 불러요.',10000,true,false),
('bait_coral_pollen','산호 꽃가루','은은한 산호꽃 향기로 물고기와 장식물을 모으며 특급도 만나요.',62,'/items/baits/coral-pollen.png',118,9600,0,400,0,0,'fish','은은한 산호꽃 향기로 물고기와 장식물을 모으며 특급도 만나요.',10000,false,false),
('bait_cracked_star','금 간 별조각','갈라진 별빛으로 희귀 물고기를 부르며, 드물게 신화 물고기도 만나요.',247,'/items/baits/cracked-star.png',115,0,9930,0,70,0,'fish','갈라진 별빛으로 희귀 물고기를 부르며, 드물게 신화 물고기도 만나요.',10000,true,false),
('bait_deep_sleep_sachet','깊은잠 향낭','깊은 향기로 희귀 등급 이상의 바다 손님을 불러요.',361,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/deep-sleep-sachet-v1.png',305,0,8600,1300,100,0,'fish','깊은 향기로 희귀 등급 이상의 바다 손님을 불러요.',10000,false,false),
('bait_epic','별잠의 유혹','신비로운 보랏빛 잔광이 특급 등급의 바다 친구들을 이끌어요.',null,'/items/baits/starlit-allure.png',108,0,0,9970,30,0,'fish','신비로운 보랏빛 잔광이 특급 등급의 바다 친구들을 이끌어요.',10000,false,false),
('bait_firefly_pupa','반딧불 번데기','깊은 곳까지 번지는 작은 불빛이 특급 물고기를 유혹해요.',67,'/items/baits/firefly-pupa.png',112,9550,0,450,0,0,'fish','깊은 곳까지 번지는 작은 불빛이 특급 물고기를 유혹해요.',10000,true,false),
('bait_first_greeting','소라의 첫인사','처음 맡는 향기로 아직 발견하지 못한 개체만 불러요.',null,'/items/baits/conch-first-greeting.png',109,8320,1500,150,30,0,'fish','처음 맡는 향기로 아직 발견하지 못한 개체만 불러요.',10000,false,false),
('bait_forbidden_star','금단의 별사탕','금지된 별가루의 달콤한 향기가 특급·신화 등급의 기회를 높여요.',133,'/items/baits/forbidden-star-candy.png',105,7720,1600,600,80,0,'fish','금지된 별가루의 달콤한 향기가 특급·신화 등급의 기회를 높여요.',10000,false,false),
('bait_goblin_bell_cherry','도깨비 방울체리','신비로운 방울 소리에 주로 희귀 물고기가 모이고, 가끔 특급 물고기도 찾아와요.',209,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/goblin-bell-cherry.png',123,2100,7500,400,0,0,'fish','신비로운 방울 소리에 주로 희귀 물고기가 모이고, 가끔 특급 물고기도 찾아와요.',10000,true,false),
('bait_grubby_magnet','꼬질 자석경단','꼬질한 향기로 물밑에 버려진 쓰레기만 끌어모아요.',15,'/items/baits/grubby-magnet-dumpling.png',103,9000,950,50,0,0,'fish','꼬질한 향기로 물밑에 버려진 쓰레기만 끌어모아요.',10000,false,false),
('bait_halfmoon_honey','반달 꿀젤리','반달 모양 꿀젤리에 일반·희귀 물고기가 고르게 모여요.',124,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/halfmoon-honey-jelly.png',120,5000,5000,0,0,0,'fish','반달 모양 꿀젤리에 일반·희귀 물고기가 고르게 모여요.',10000,true,false),
('bait_honey_dumpling','햇살 꿀경단','달콤한 꿀 향기로 일반·희귀 물고기와 쓰레기를 모아요.',52,'/items/baits/sunny-honey-dumpling.png',116,8200,1800,0,0,0,'fish','달콤한 꿀 향기로 일반·희귀 물고기와 쓰레기를 모아요.',10000,false,false),
('bait_lightning_stardust','벼락 별가루','강렬한 번개빛이 희귀·특급 물고기를 끌어당겨요.',266,'/items/baits/lightning-stardust.png',114,0,9450,550,0,0,'fish','강렬한 번개빛이 희귀·특급 물고기를 끌어당겨요.',10000,true,false),
('bait_magnet','심해 인력석','바닷속에 잠든 장식물만 끌어올리는 인양 미끼예요.',48,'/items/baits/abyss-lodestone.png',106,8700,1200,100,0,0,'decoration','바닷속에 잠든 장식물만 끌어올리는 인양 미끼예요.',10000,false,false),
('bait_mermaid_whisper_candy','인어의 귓속말 캔디','인어의 달콤한 노래가 희귀 물고기를 유혹해요.',157,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/mermaid-whisper-candy.png',125,4000,6000,0,0,0,'fish','인어의 달콤한 노래가 희귀 물고기를 유혹해요.',10000,true,false),
('bait_moonshade_dumpling','달그늘 경단','낮에는 일반, 밤에는 희귀 등급을 조금 더 자주 만나요.',109,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/moonshade-dumpling-v1.png',317,5500,4500,0,0,0,'fish','낮에는 일반, 밤에는 희귀 등급을 조금 더 자주 만나요.',10000,false,false),
('bait_pearl_bubble','진주 거품방울','반짝이는 거품이 희귀 장식물과 쓰레기를 끌어당겨요.',62,'/items/baits/pearl-bubble.png',117,6500,3500,0,0,0,'fish','반짝이는 거품이 희귀 장식물과 쓰레기를 끌어당겨요.',10000,false,false),
('bait_safe','이슬잎 경단','맑은 이슬 향기로 물고기만 불러요. 지렁이보다 희귀·특급 물고기를 조금 더 자주 만나요.',57,'/items/baits/dewleaf-dumpling.png',102,8300,1500,180,20,0,'fish','맑은 이슬 향기로 물고기만 불러요. 지렁이보다 희귀·특급 물고기를 조금 더 자주 만나요.',10000,true,false),
('bait_sea_memory','바다기억 조개알','익숙한 바다의 향기로 현재 해역의 토착종을 더 자주 만나요.',86,'/items/baits/sea-memory-clam-pearl.png',104,8650,1200,130,20,0,'fish','익숙한 바다의 향기로 현재 해역의 토착종을 더 자주 만나요.',10000,false,false),
('bait_shell_crumbs','조개 부스러기','고소한 조개 향기를 좋아하는 일반·희귀 물고기가 찾아와요.',48,'/items/baits/shell-crumbs.png',111,8600,1400,0,0,0,'fish','고소한 조개 향기를 좋아하는 일반·희귀 물고기가 찾아와요.',10000,true,false),
('bait_shooting_star_tail','별똥별 꼬리젤리','대부분 일반 쓰레기를 건지지만, 가끔 신화 등급의 뜻밖의 발견을 만나요.',48,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/shooting-star-tail-jelly-teal.png',122,9920,0,0,80,0,'fish','대부분 일반 쓰레기를 건지지만, 가끔 신화 등급의 뜻밖의 발견을 만나요.',10000,false,false),
('bait_snowflake_salt','눈꽃 소금사탕','토착종을 제외한 공통종 물고기·쓰레기·장식물을 불러요. 희귀·특급 공통종에 집중하며 신화는 나오지 않아요.',52,'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/items/baits/snowflake-salt-candy.png',121,6800,3000,200,0,0,'fish','토착종을 제외한 공통종 물고기·쓰레기·장식물을 불러요. 희귀·특급 공통종에 집중하며 신화는 나오지 않아요.',10000,false,false),
('bait_special','달빛 진주새우','진주새우의 반짝임으로 희귀 등급의 바다 친구들을 불러요.',null,'/items/baits/special.png',107,0,9870,100,30,0,'fish','진주새우의 반짝임으로 희귀 등급의 바다 친구들을 불러요.',10000,false,false),
('bait_starlight_wax','별빛 밀랍','은은하게 번지는 별빛에 드물게 신화 물고기가 이끌려 와요.',43,'/items/baits/starlight-wax.png',119,9950,0,0,50,0,'fish','은은하게 번지는 별빛에 드물게 신화 물고기가 이끌려 와요.',10000,true,false),
('bait_zigzag_jelly','지그재그 젤리','두 가지 맛으로 일반·희귀 물고기를 번갈아 불러요.',128,'/items/baits/zigzag-jelly.png',113,10000,0,0,0,0,'fish','두 가지 맛으로 일반·희귀 물고기를 번갈아 불러요.',10000,true,true)
on conflict(id) do update set "name"=excluded."name","description"=excluded."description","price"=excluded."price","image_path"=excluded."image_path","sort_order"=excluded."sort_order","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","failure_bp"=excluded."failure_bp","effect_kind"=excluded."effect_kind","effect_description"=excluded."effect_description","success_chance_bp"=excluded."success_chance_bp","fish_only"=excluded."fish_only","alternating"=excluded."alternating";
insert into app_private.fishing_bait_balance_profiles ("id","name","price","success_chance_bp","common_bp","rare_bp","epic_bp","mythic_bp","wait_min_seconds","wait_max_seconds","target_kinds","effect_kind","native_multiplier","night_common_bp","night_rare_bp","night_wait_min_seconds","night_wait_max_seconds") values
('bait','퐁당 지렁이',48,10000,8650,1200,130,20,12,24,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_aurora_clockwork_bug','오로라 태엽벌레',190,10000,2420,7500,0,80,12,24,'["fish","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_cloud_dough','솜구름 반죽',33,10000,10000,0,0,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_coral_pollen','산호 꽃가루',62,10000,9600,0,400,0,12,24,'["fish","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_cracked_star','금 간 별조각',247,10000,0,9930,0,70,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_deep_sleep_sachet','깊은잠 향낭',361,10000,0,8600,1300,100,12,24,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_epic','별잠의 유혹',null,10000,0,0,9970,30,12,24,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_firefly_pupa','반딧불 번데기',67,10000,9550,0,450,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_first_greeting','소라의 첫인사',null,10000,8320,1500,150,30,12,24,'["fish","trash","decoration"]'::jsonb,'undiscovered',1,null,null,null,null),
('bait_forbidden_star','금단의 별사탕',133,10000,7720,1600,600,80,12,24,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_goblin_bell_cherry','도깨비 방울체리',209,10000,2100,7500,400,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_grubby_magnet','꼬질 자석경단',15,10000,9000,950,50,0,12,24,'["trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_halfmoon_honey','반달 꿀젤리',124,10000,5000,5000,0,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_honey_dumpling','햇살 꿀경단',52,10000,8200,1800,0,0,12,24,'["fish","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_lightning_stardust','벼락 별가루',266,10000,0,9450,550,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_magnet','심해 인력석',48,10000,8700,1200,100,0,12,24,'["decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_mermaid_whisper_candy','인어의 귓속말 캔디',157,10000,4000,6000,0,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_moonshade_dumpling','달그늘 경단',109,10000,5500,4500,0,0,12,24,'["fish","trash","decoration"]'::jsonb,'day_night',1,4500,5500,12,24),
('bait_pearl_bubble','진주 거품방울',62,10000,6500,3500,0,0,12,24,'["decoration","trash"]'::jsonb,'standard',1,null,null,null,null),
('bait_safe','이슬잎 경단',57,10000,8300,1500,180,20,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_sea_memory','바다기억 조개알',86,10000,8650,1200,130,20,12,24,'["fish","trash","decoration"]'::jsonb,'native_boost',2.5,null,null,null,null),
('bait_shell_crumbs','조개 부스러기',48,10000,8600,1400,0,0,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_shooting_star_tail','별똥별 꼬리젤리',48,10000,9920,0,0,80,12,24,'["fish","trash","decoration"]'::jsonb,'shooting_star',1,null,null,null,null),
('bait_snowflake_salt','눈꽃 소금사탕',52,10000,6800,3000,200,0,12,24,'["fish","trash","decoration"]'::jsonb,'common_only',1,null,null,null,null),
('bait_special','달빛 진주새우',null,10000,0,9870,100,30,12,24,'["fish","trash","decoration"]'::jsonb,'standard',1,null,null,null,null),
('bait_starlight_wax','별빛 밀랍',43,10000,9950,0,0,50,12,24,'["fish"]'::jsonb,'standard',1,null,null,null,null),
('bait_zigzag_jelly','지그재그 젤리',128,10000,10000,0,0,0,12,24,'["fish"]'::jsonb,'alternating',1,null,null,null,null)
on conflict(id) do update set "name"=excluded."name","price"=excluded."price","success_chance_bp"=excluded."success_chance_bp","common_bp"=excluded."common_bp","rare_bp"=excluded."rare_bp","epic_bp"=excluded."epic_bp","mythic_bp"=excluded."mythic_bp","wait_min_seconds"=excluded."wait_min_seconds","wait_max_seconds"=excluded."wait_max_seconds","target_kinds"=excluded."target_kinds","effect_kind"=excluded."effect_kind","native_multiplier"=excluded."native_multiplier","night_common_bp"=excluded."night_common_bp","night_rare_bp"=excluded."night_rare_bp","night_wait_min_seconds"=excluded."night_wait_min_seconds","night_wait_max_seconds"=excluded."night_wait_max_seconds";
-- Keep the displayed unit price and the atomic charge in sync. Existing
-- operation receipts still replay without applying a second charge.
CREATE OR REPLACE FUNCTION app_private.harbor_state()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 w:=app_private.get_gold_wallet();
 return jsonb_build_object('serverNow',clock_timestamp(),'fuel',coalesce((w->'inventory'->>'fuel')::integer,0),'fuelPrice',57,'fuelDailyLimit',5,'fuelPurchasedToday',coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((clock_timestamp() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0),'dockSlots',2,
 'regions',(select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'unlocked',not r.requires_map_fragment or exists(select 1 from public.player_map_fragments m where m.user_id=u and m.region_id=r.id)) order by r.sort_order) from public.regions r),
 'vessels',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('owned',o.n>0,'ownedCount',o.n) order by v.sort_order)
  from public.harbor_vessels v cross join lateral(select count(*)::integer n from public.harbor_boats b where b.user_id=u and b.vessel_id=v.id and b.sold_at is null)o),'[]'::jsonb),
 'boats',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('id',b.id,'vessel_id',b.vessel_id,'instance_no',b.instance_no,'dock_slot',b.dock_slot,'owned',true) order by b.purchased_at,b.id)
  from public.harbor_boats b join public.harbor_vessels v on v.id=b.vessel_id where b.user_id=u and b.sold_at is null),'[]'::jsonb),
 'voyages',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('region_name',(select name from public.regions where id=v.region_id)) order by v.departed_at) from public.harbor_voyages v where v.user_id=u and v.claimed_at is null),'[]'::jsonb));
end $function$;

CREATE OR REPLACE FUNCTION app_private.settle_legacy_harbor(p_action text, p_operation_id uuid, p_vessel_id text DEFAULT NULL::text, p_voyage_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();v public.harbor_vessels;w public.player_wallets;trip public.harbor_voyages;
 prev app_private.harbor_operations;sig jsonb;receipt jsonb;fuel integer;cost integer;sid text;item uuid;i integer;purchase_at timestamptz;
 results jsonb:='[]'::jsonb;items jsonb;failed integer;attempts integer;claimed integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_action is null or p_action not in ('buy','fuel','depart','arrive','claim','claim_all') then raise exception 'INVALID_HARBOR_ACTION';end if;
 sig:=jsonb_build_object('action',p_action,'vessel',p_vessel_id,'voyage',p_voyage_id,'quantity',p_quantity);
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 select * into prev from app_private.harbor_operations where user_id=u and operation_id=p_operation_id;
 if found then
  if prev.signature<>sig then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.harbor_state()||jsonb_build_object('receipt',prev.receipt,'replayed',true);
 end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=u for update;
 fuel:=coalesce((w.inventory->>'fuel')::integer,0);purchase_at:=clock_timestamp();
 if p_action in ('buy','depart') then
  select * into v from public.harbor_vessels where id=p_vessel_id;
  if not found then raise exception 'VESSEL_NOT_FOUND';end if;
 end if;
 if p_action='buy' then
  if exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_ALREADY_OWNED';end if;
  if w.gold<v.price then raise exception 'INSUFFICIENT_GOLD';end if;
  insert into public.player_harbor_vessels(user_id,vessel_id) values(u,v.id);
  update public.player_wallets set gold=gold-v.price,updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','harbor-vessel:'||v.id,-v.price);
  receipt:=jsonb_build_object('action','buy','vesselId',v.id);
 elsif p_action='fuel' then
  if p_quantity is null or p_quantity<1 or p_quantity>5 or fuel>100000-p_quantity then raise exception 'INVALID_QUANTITY';end if;
  if coalesce((select sum((op.receipt->>'quantity')::integer) from app_private.harbor_operations op
   where op.user_id=u and op.receipt->>'action'='fuel' and op.created_at>=((purchase_at at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),0)+p_quantity>5 then raise exception 'FUEL_DAILY_LIMIT';end if;
  cost:=p_quantity*57;
  if w.gold<cost then raise exception 'INSUFFICIENT_GOLD';end if;
  update public.player_wallets set gold=gold-cost,inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel+p_quantity)),updated_at=now() where user_id=u;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(u,p_operation_id,'buy','fuel:'||p_quantity,-cost);
  receipt:=jsonb_build_object('action','fuel','quantity',p_quantity);
 elsif p_action='depart' then
  if not exists(select 1 from public.player_harbor_vessels where user_id=u and vessel_id=v.id) then raise exception 'VESSEL_NOT_OWNED';end if;
  if exists(select 1 from public.harbor_voyages where user_id=u and vessel_id=v.id and claimed_at is null) then raise exception 'VOYAGE_ACTIVE';end if;
  if fuel<v.fuel_cost then raise exception 'INSUFFICIENT_FUEL';end if;
  update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}',to_jsonb(fuel-v.fuel_cost)),updated_at=now() where user_id=u;
  insert into public.harbor_voyages(user_id,vessel_id,vessel_snapshot,returns_at)
   values(u,v.id,to_jsonb(v),clock_timestamp()+make_interval(mins=>v.duration_minutes)) returning * into trip;
  receipt:=jsonb_build_object('action','depart','voyageId',trip.id,'vesselId',v.id);
 elsif p_action='arrive' then
  select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u for update;
  if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
  if trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  update public.harbor_voyages set arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()) where id=trip.id;
  receipt:=jsonb_build_object('action','arrive','voyageId',trip.id);
 else
  if p_action='claim' then
   select * into trip from public.harbor_voyages where id=p_voyage_id and user_id=u;
   if not found then raise exception 'VOYAGE_NOT_FOUND';end if;
   if trip.claimed_at is not null then
    receipt:=jsonb_build_object('action','claim','results',jsonb_build_array(trip.result));
   elsif trip.returns_at>clock_timestamp() then raise exception 'VOYAGE_NOT_READY';end if;
  end if;
  if receipt is null then
   for trip in select * from public.harbor_voyages where user_id=u and claimed_at is null and returns_at<=clock_timestamp()
    and (p_action='claim_all' or id=p_voyage_id) order by id for update loop
    items:='[]'::jsonb;failed:=0;attempts:=(trip.vessel_snapshot->>'fishing_count')::integer;
    for i in 1..attempts loop
     sid:=app_private.harbor_draw(trip.region_id,trip.vessel_snapshot->'catch_rule');
     if sid is not null then
      insert into public.player_collectibles(user_id,species_id) values(u,sid) returning id into item;
      insert into public.player_discoveries(user_id,species_id) values(u,sid) on conflict do nothing;
      items:=items||jsonb_build_array(jsonb_build_object('id',item,'firstDiscovery',coalesce((select evidence.first_discovery from app_private.title_acquisition_evidence evidence where evidence.collectible_id=item and evidence.user_id=u),false),'species',app_private.species_payload(sid,null),'bonus',false));
     else failed:=failed+1;end if;
    end loop;
    update public.harbor_voyages set claimed_at=clock_timestamp(),arrival_seen_at=coalesce(arrival_seen_at,clock_timestamp()),
     result=jsonb_build_object('voyageId',trip.id,'regionId',trip.region_id,'regionName',(select name from public.regions where id=trip.region_id),'vesselName',trip.vessel_snapshot->>'name','items',items,'attempted',attempts,'failed',failed,'succeeded',jsonb_array_length(items)) where id=trip.id returning result into receipt;
    results:=results||jsonb_build_array(receipt);claimed:=claimed+1;
   end loop;
   receipt:=jsonb_build_object('action',p_action,'results',results,'claimed',claimed);
  end if;
 end if;
 insert into app_private.harbor_operations(user_id,operation_id,signature,receipt,created_at) values(u,p_operation_id,sig,receipt,purchase_at);
 return app_private.harbor_state()||jsonb_build_object('receipt',receipt,'replayed',false);
end $function$;
notify pgrst,'reload schema';
commit;
