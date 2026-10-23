begin;
-- Fixed cutoff: replaying this release must never enroll later signups.
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK (((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text, 'operator-gold-20261021-supply'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = ANY (ARRAY['welcome-bait'::text, 'operator-worm-20261020'::text])) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id ~~ 'arcade-weekly:%'::text) AND (quantity = ANY (ARRAY[2000, 1500, 1000, 650, 400, 200])) AND ((species ->> 'game'::text) = ANY (ARRAY['shadow'::text, 'memory'::text])) AND (reward_id = ((('arcade-weekly:'::text || (species ->> 'game'::text)) || ':'::text) || (species ->> 'week_start'::text))) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['giseong-catch-202610:giseong-fish'::text, 'giseong-catch-202610:giseong-webfoot-octopus'::text])) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 300) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)))) OR (source='system' and reward_kind='gold' and reward_id='operator-update-20261023-nyamnyam' and species->>'id'=reward_id and quantity=1000 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold));
create unique index if not exists one_nyamnyam_update_gold_per_player
 on public.collectible_gifts(recipient_id) where source='system' and reward_id='operator-update-20261023-nyamnyam';
with gifts as (
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영자',p.id,p.nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','operator-update-20261023-nyamnyam','name','냠냠 한상바다 업데이트 보상'),1000,
 '냠냠 한상바다 업데이트를 함께해 주셔서 감사합니다! 기존 주민 여러분께 1,000골드를 드려요.','system','gold','operator-update-20261023-nyamnyam'
 from public.player_profiles p where p.created_at <= timestamptz '2026-10-23 03:34:20.032188+00'
 on conflict do nothing returning id,recipient_id
)
insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
select recipient_id,'gift','gift_received','업데이트 보상 1,000골드가 도착했어요!','선물함에서 냠냠 한상바다 업데이트 보상을 받아주세요.',id from gifts;
notify pgrst,'reload schema';
commit;
