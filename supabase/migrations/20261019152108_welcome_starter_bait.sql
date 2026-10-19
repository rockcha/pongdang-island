-- Starter bait is a separate, claimable welcome gift; existing players are not backfilled.
begin;
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'welcome'::text) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR (source='system' AND reward_kind='bait' AND reward_id='bait' AND species->>'id'='welcome-bait' AND quantity=5 AND cardinality(collectible_ids)=0 AND sender_id IS NULL AND NOT exchange_hold)));
create unique index one_welcome_bait_per_player on public.collectible_gifts(recipient_id) where source='system' and species->>'id'='welcome-bait';
CREATE OR REPLACE FUNCTION app_private.send_welcome_gift(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare gift uuid; bait_gift uuid; player_name text;
begin
 -- Do not turn an uncorrected direct credit into a second payment.
 if exists(select 1 from public.gold_transactions where user_id=p_user_id and item_id='welcome:500')
 and not exists(select 1 from public.gold_transactions where user_id=p_user_id and item_id='welcome:500:reversal' and delta=-500)
 then raise exception 'WELCOME_DIRECT_CREDIT_REQUIRES_REVERSAL';end if;
 select nickname into strict player_name from public.player_profiles where id=p_user_id;
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 values('퐁당섬 운영자',p_user_id,player_name,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','welcome-gold','name','모험 응원 골드'),500,
 '첫 모험을 응원하는 500골드 선물이에요. 원하실 때 받아주세요!','system','gold','welcome')
 on conflict do nothing returning id into gift;
 if gift is not null then
  insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
  values(p_user_id,'gift','gift_received','운영자의 선물이 도착했어요!','500골드 선물이에요. 선물함에서 원하실 때 받아주세요.',gift);
 end if;
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영자',p_user_id,player_name,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','welcome-bait','name',b.name,'thumbnail_path',b.image_path),5,
 '첫 낚시를 위한 지렁이 미끼 5개를 준비했어요. 선물함에서 받아주세요!','system','bait','bait'
 from public.fishing_baits b where b.id='bait'
 on conflict do nothing returning id into bait_gift;
 if bait_gift is not null then
  insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
  values(p_user_id,'gift','gift_received','첫 낚시를 위한 미끼가 도착했어요!','환영 미끼 5개를 선물함에서 받아주세요.',bait_gift);
 end if;
 return gift;
end $function$
;
notify pgrst, 'reload schema';
commit;
