-- Apply after 13. Existing bait inventory keys and fishing history are retained.
begin;
alter table public.fishing_baits alter column price drop not null;
alter table public.fishing_baits add column effect_kind text not null default 'fish' check(effect_kind in ('fish','decoration'));
alter table public.fishing_baits add column effect_description text not null default '';
update public.fishing_baits set
 name='퐁당 지렁이',
 description='퐁당섬의 촉촉한 모래와 풀숲에서만 서식하는 선홍빛 지렁이. 물속에서도 꼬물꼬물 움직여 물고기의 호기심을 자극한다. 매우 흔하고 구하기 쉬워, 섬의 초보 낚시꾼들이 가장 먼저 챙기는 미끼다.',
 effect_description='기본 확률로 낚시한다. 실패해도 미끼 1개를 소모한다.',
 image_path='/items/baits/pongdang-worm.png',price=30 where id='bait';
update public.fishing_baits set
 name='달빛 진주새우',
 description='달빛이 스며드는 얕은 바다에서 자라는 작은 진주새우. 반투명한 껍질 속 푸른 진주가 은은하게 빛나며, 평범한 먹이에는 다가오지 않던 진귀한 물고기까지 불러 모은다고 한다.',
 effect_description='실패 없이 최소 희귀 등급을 보장한다. 희귀 98.7% · 특급 1% · 신화 0.3%.',price=null where id='bait_special';
update public.fishing_baits set
 name='이슬잎 경단',
 description='새벽 이슬을 머금은 어린 잎에 향긋한 해초 반죽을 감싼 수제 미끼. 작은 쇠바늘에 단단히 붙어 쉽게 흩어지지 않고, 잎 사이로 퍼지는 순한 향이 경계심 많은 물고기를 안심시킨다.',
 effect_description='기본 실패 확률을 상대적으로 20% 줄인다. 실패 58.7% → 46.96%. 실패 시에도 소모된다.',
 image_path='/items/baits/dewleaf-dumpling.png',price=null where id='bait_safe';
insert into public.fishing_baits(id,name,description,price,image_path,sort_order,common_bp,rare_bp,epic_bp,mythic_bp,failure_bp,effect_kind,effect_description) values
('bait_magnet','심해 인력석','깊은 해구에서 건져 올린 푸른 자철석을 다듬어 만든 인양용 미끼. 물고기 대신 바다 아래 잠든 장식물에 반응하며, 오래전에 가라앉은 보물의 흔적을 조용히 끌어당긴다.',null,'/items/baits/abyss-lodestone.png',4,0,0,0,0,10000,'decoration','장식물 전용 미끼. 사용 시 장식물 획득을 보장하도록 준비 중이며, 현재는 사용하거나 소모할 수 없다.'),
('bait_epic','별잠의 유혹','별잠 유적의 틈에 맺힌 별가루를 자수정 조각에 봉인한 미끼. 물결에 닿으면 보랏빛 잔광이 길게 번져, 깊은 바다에 몸을 숨긴 비범한 생명까지 잠에서 깨운다고 전해진다.',null,'/items/baits/starlit-allure.png',5,0,0,9970,30,0,'fish','실패 없이 최소 특급 등급을 보장한다. 특급 99.7% · 신화 0.3%.');
create or replace function app_private.resolve_fishing(p_bait_id text,p_roll integer) returns public.game_rarity
language plpgsql stable set search_path='' as $$
declare b public.fishing_baits;
begin
 if p_roll is null or p_roll<0 or p_roll>=10000 then raise exception 'INVALID_ROLL'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 if b.effect_kind='decoration' then raise exception 'DECORATION_NOT_READY'; end if;
 if p_roll<b.mythic_bp then return 'mythic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp then return 'epic'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp then return 'rare'; end if;
 if p_roll<b.mythic_bp+b.epic_bp+b.rare_bp+b.common_bp then return 'common'; end if;
 return null;
end $$;

create or replace function app_private.buy_fishing_bait(p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); b public.fishing_baits; w public.player_wallets; prev public.gold_transactions;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 select * into b from public.fishing_baits where id=p_bait_id;
 if not found then raise exception 'INVALID_BAIT'; end if;
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into prev from public.gold_transactions where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if prev.action<>'buy' or prev.item_id is distinct from ('fishing:'||p_bait_id) then raise exception 'OPERATION_CONFLICT'; end if;
  return app_private.get_gold_wallet()||jsonb_build_object('delta',0);
 end if;
 if b.price is null then raise exception 'BAIT_NOT_FOR_SALE'; end if;
 if w.gold<b.price then raise exception 'INSUFFICIENT_GOLD'; end if;
 update public.player_wallets set gold=gold-b.price,
 inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(coalesce((inventory->>p_bait_id)::integer,0)+1)),updated_at=now() where user_id=v_uid;
 insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values(v_uid,p_operation_id,'buy','fishing:'||p_bait_id,-b.price);
 return app_private.get_gold_wallet()||jsonb_build_object('delta',-b.price);
end $$;

create or replace function app_private.cast_fishing(p_region_id text,p_bait_id text,p_operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); w public.player_wallets; a public.fishing_attempts; v_current text; v_required boolean; v_count integer; v_rarity public.game_rarity;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_operation_id is null then raise exception 'INVALID_TRADE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('region:'||v_uid::text,0));
 perform app_private.get_gold_wallet();
 select * into w from public.player_wallets where user_id=v_uid for update;
 select * into a from public.fishing_attempts where user_id=v_uid and operation_id=p_operation_id;
 if found then
  if a.region_id is distinct from p_region_id or a.bait_id is distinct from p_bait_id then raise exception 'OPERATION_CONFLICT'; end if;
  return jsonb_build_object('attempt',to_jsonb(a),'replayed',true);
 end if;
 if not exists(select 1 from public.fishing_baits where id=p_bait_id) then raise exception 'INVALID_BAIT'; end if;
 if exists(select 1 from public.fishing_baits where id=p_bait_id and effect_kind='decoration') then raise exception 'DECORATION_NOT_READY'; end if;
 select requires_map_fragment into v_required from public.regions where id=p_region_id;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 select region_id into v_current from public.player_navigation where user_id=v_uid;
 if v_current is distinct from p_region_id then raise exception 'NOT_IN_REGION'; end if;
 if v_required and not exists(select 1 from public.player_map_fragments where user_id=v_uid and region_id=p_region_id) then raise exception 'REGION_LOCKED'; end if;
 v_count:=coalesce((w.inventory->>p_bait_id)::integer,0);
 if v_count<1 then raise exception 'NO_BAIT'; end if;
 v_rarity:=app_private.resolve_fishing(p_bait_id,floor(random()*10000)::integer);
 update public.player_wallets set inventory=jsonb_set(inventory,array[p_bait_id],to_jsonb(v_count-1)),updated_at=now() where user_id=v_uid;
 insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity) values(v_uid,p_operation_id,p_region_id,p_bait_id,v_rarity) returning * into a;
 if v_rarity is not null then
  insert into public.player_catch_counts(user_id,rarity,quantity) values(v_uid,v_rarity,1)
  on conflict(user_id,rarity) do update set quantity=public.player_catch_counts.quantity+1;
 end if;
 return jsonb_build_object('attempt',to_jsonb(a),'replayed',false);
end $$;

notify pgrst,'reload schema';
commit;
