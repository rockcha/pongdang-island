-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.island_shop_items ("id","family","name","price","width","height","terrain","rotations","text_label") values
('beach-chair','decoration','비치체어',120,1,2,'land','[0,90,180,270]'::jsonb,false),
('beach-parasol','decoration','해변 파라솔',220,2,2,'land','[0]'::jsonb,false),
('bench','decoration','나무 벤치',120,2,1,'land','[0,90,180,270]'::jsonb,false),
('bread-display','decoration','빵 진열대',280,2,1,'land','[0]'::jsonb,false),
('butterfly-flowerbed','decoration','나비 화단',140,2,1,'land','[0]'::jsonb,false),
('coral-planter','decoration','산호 화분',160,1,1,'land','[0]'::jsonb,false),
('droplet-lamp','decoration','물방울 가로등',180,1,1,'land','[0]'::jsonb,false),
('farm-plot','decoration','밭',10,1,1,'land','[0]'::jsonb,false),
('fish-fountain','decoration','물고기 분수',900,2,2,'land','[0]'::jsonb,false),
('fishing-pongi-statue','decoration','낚시하는 퐁이 동상',800,2,2,'land','[0]'::jsonb,false),
('floor-brick','floor','벽돌길',20,1,1,'land','[0]'::jsonb,false),
('floor-dirt','floor','흙길',10,1,1,'land','[0]'::jsonb,false),
('floor-grass','floor','잔디 타일',10,1,1,'land','[0]'::jsonb,false),
('floor-gravel','floor','자갈길',10,1,1,'land','[0]'::jsonb,false),
('floor-moonstone','floor','푸른 달빛 돌길',30,1,1,'land','[0]'::jsonb,false),
('floor-sand','floor','모래 바닥',10,1,1,'land','[0]'::jsonb,false),
('floor-shell-mosaic','floor','조개 모자이크',40,1,1,'land','[0]'::jsonb,false),
('floor-star-mosaic','floor','별무늬 모자이크',40,1,1,'land','[0]'::jsonb,false),
('floor-stone','floor','돌 포장길',20,1,1,'land','[0]'::jsonb,false),
('floor-teal-glass','floor','청록 유리 타일',30,1,1,'land','[0]'::jsonb,false),
('floor-wood','floor','나무 데크',20,1,1,'land','[0]'::jsonb,false),
('flower-arch','decoration','꽃 아치',250,2,1,'land','[0,90,180,270]'::jsonb,false),
('flower-bicycle','decoration','꽃바구니 자전거',180,2,1,'land','[0,90,180,270]'::jsonb,false),
('flowers','decoration','봄꽃 화단',50,1,1,'land','[0,90,180,270]'::jsonb,false),
('hydrangea-blue','decoration','푸른 수국 화단',90,1,1,'land','[0]'::jsonb,false),
('hydrangea-lilac','decoration','보랏빛 수국 화단',90,1,1,'land','[0]'::jsonb,false),
('hydrangea-pink','decoration','분홍 수국 화단',90,1,1,'land','[0]'::jsonb,false),
('island-name-sign','decoration','이름 간판',120,2,1,'land','[0]'::jsonb,true),
('lamp','decoration','별빛 가로등',150,1,1,'land','[0,90,180,270]'::jsonb,false),
('land-piece','land','땅 조각',50,1,1,'any','[0]'::jsonb,false),
('mailbox-planter','decoration','우편함 화단',160,1,1,'land','[0]'::jsonb,false),
('pastel-surfboard','decoration','파스텔 서핑보드',140,1,2,'land','[0,90,180,270]'::jsonb,false),
('picnic-table','decoration','피크닉 테이블',300,2,2,'land','[0,90,180,270]'::jsonb,false),
('pine','decoration','솔솔 소나무',300,1,1,'land','[0,90,180,270]'::jsonb,false),
('pond','decoration','작은 연못',250,2,1,'land','[0,90,180,270]'::jsonb,false),
('reeds','decoration','물가 갈대',60,1,1,'any','[0]'::jsonb,false),
('rubber-duck','decoration','고무오리',100,1,1,'any','[0]'::jsonb,false),
('shell-fountain','decoration','조개 분수대',1200,2,2,'land','[0]'::jsonb,false),
('sleeping-cat','decoration','잠자는 고양이',450,1,1,'land','[0]'::jsonb,false),
('stepping-stones','decoration','물길 징검돌',80,1,1,'water','[0]'::jsonb,false),
('stone-wall','decoration','낮은 돌담',60,1,1,'land','[0,90,180,270]'::jsonb,false),
('tree','decoration','동글 나무',300,1,1,'land','[0,90,180,270]'::jsonb,false),
('water-lily','decoration','호수 수련',60,1,1,'water','[0]'::jsonb,false),
('wood-arrow-sign','decoration','나무 화살표 표지판',80,1,1,'land','[0,180]'::jsonb,true),
('wood-bridge-1','decoration','짧은 나무다리',100,1,1,'water','[0,90,180,270]'::jsonb,false),
('wood-bridge-2','decoration','나무다리',200,1,2,'water','[0,90,180,270]'::jsonb,false),
('wood-bridge-3','decoration','긴 나무다리',300,1,3,'water','[0,90,180,270]'::jsonb,false),
('wood-fence','decoration','나무 울타리',40,1,1,'land','[0,90,180,270]'::jsonb,false)
on conflict(id) do update set "family"=excluded."family","name"=excluded."name","price"=excluded."price","width"=excluded."width","height"=excluded."height","terrain"=excluded."terrain","rotations"=excluded."rotations","text_label"=excluded."text_label";
notify pgrst, 'reload schema';
-- Retire navigation buildings explicitly; decorations and materials stay available.
delete from public.island_shop_items where family='facility';

CREATE OR REPLACE FUNCTION app_private.island_ensure()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_created uuid;v_blueprint jsonb;v_doc jsonb;v_item jsonb;v_id text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if not app_private.notice_is_operator() then raise exception 'FARM_PREPARING';end if;
 if exists(select 1 from app_private.player_islands where user_id=v_uid) then return;end if;
 select blueprint into v_blueprint from public.island_starters where id='default';
 if v_blueprint is null then raise exception 'ISLAND_CATALOG_UNAVAILABLE';end if;
 v_doc:=v_blueprint->'document';
 insert into app_private.player_islands(user_id,document) values(v_uid,v_doc) on conflict do nothing returning user_id into v_created;
 if v_created is null then return;end if;
 for v_item in select value from jsonb_array_elements(v_blueprint->'items') loop
  v_id:=(v_item->>'item_id')||'~'||gen_random_uuid()::text;
  insert into app_private.player_island_items(user_id,id,item_id,sale_value) values(v_uid,v_id,v_item->>'item_id',0);
  v_doc:=jsonb_set(v_doc,'{layout}',(select coalesce(jsonb_agg(case when p->>'id'=v_item->>'id' then p||jsonb_build_object('id',v_id) else p end),'[]') from jsonb_array_elements(v_doc->'layout')p));
 end loop;
 insert into app_private.player_island_stocks(user_id,item_id,quantity)
 select v_uid,key,value::integer from jsonb_each_text(v_blueprint->'stocks');
 update app_private.player_islands set document=v_doc where user_id=v_uid;
end $function$
;

-- One-time reset of existing operator farms, authorized by the owner.
-- Preserve wallets and the financial ledger. Advancing the revision rejects old tabs.
do $reset$
declare v record;v_revision bigint;v_previous_subject text:=current_setting('request.jwt.claim.sub',true);
begin
 for v in select i.user_id from app_private.player_islands i join app_private.notice_operators o on o.user_id=i.user_id order by i.user_id loop
  perform 1 from public.player_wallets where user_id=v.user_id for update;
  select revision into v_revision from app_private.player_islands where user_id=v.user_id for update;
  delete from app_private.island_operations where user_id=v.user_id;
  delete from app_private.player_island_items where user_id=v.user_id;
  delete from app_private.player_island_stocks where user_id=v.user_id;
  delete from app_private.player_islands where user_id=v.user_id;
  perform set_config('request.jwt.claim.sub',v.user_id::text,true);
  perform app_private.island_ensure();
  update app_private.player_islands set revision=v_revision+1 where user_id=v.user_id;
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(v_previous_subject,''),true);
end $reset$;
commit;
