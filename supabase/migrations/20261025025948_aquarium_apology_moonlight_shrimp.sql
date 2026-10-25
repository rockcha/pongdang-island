-- One claimable apology gift for players registered at the fixed campaign cutoff.
-- Replaying this migration never credits inventory directly or duplicates a gift.
begin;
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape check (
 (((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text, 'operator-gold-20261021-supply'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = ANY (ARRAY['welcome-bait'::text, 'operator-worm-20261020'::text])) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id ~~ 'arcade-weekly:%'::text) AND (quantity = ANY (ARRAY[2000, 1500, 1000, 650, 400, 200])) AND ((species ->> 'game'::text) = ANY (ARRAY['shadow'::text, 'memory'::text])) AND (reward_id = ((('arcade-weekly:'::text || (species ->> 'game'::text)) || ':'::text) || (species ->> 'week_start'::text))) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['giseong-catch-202610:giseong-fish'::text, 'giseong-catch-202610:giseong-webfoot-octopus'::text])) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 300) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'operator-update-20261023-nyamnyam'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 1000) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (sender_id IS NULL) AND (NOT exchange_hold) AND (cardinality(collectible_ids) = 0) AND
CASE
    WHEN (reward_id ~ '^level-up:[1-9][0-9]{0,8}$'::text) THEN (((split_part(reward_id, ':'::text, 2))::bigint >= 2) AND (quantity = LEAST((1000000000)::bigint, (100 * (((split_part(reward_id, ':'::text, 2))::bigint + 9) / 10)))) AND ((species ->> 'id'::text) = reward_id))
    ELSE false
END) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'halloween-20261024-gold-500'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)))
 or (source='system' and reward_kind='bait' and reward_id='bait_special'
 and species->>'id'='aquarium-apology-20261025' and quantity=2
 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold)
);
create unique index if not exists one_aquarium_apology_20261025_per_player
 on public.collectible_gifts(recipient_id) where source='system' and species->>'id'='aquarium-apology-20261025';
with gifts as (
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영팀',p.id,p.nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','aquarium-apology-20261025','name',b.name,'thumbnail_path',b.image_path,'bait_id',b.id),2,'🙏 잦은 아쿠아리움 변경으로 이용에 혼란을 드려 죄송합니다. 사과와 감사의 마음을 담아 달빛 진주새우 2개를 보내드립니다. 더 편안하게 감상하고 꾸미실 수 있도록 살피겠습니다. 늘 함께해 주셔서 감사합니다. 🦐💙','system','bait',b.id
 from public.player_profiles p cross join public.fishing_baits b
 where p.created_at<=timestamptz '2026-10-25T02:59:12Z' and b.id='bait_special'
 on conflict do nothing returning id,recipient_id
)
insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
 select recipient_id,'gift','gift_received','🎁 아쿠아리움 사과 선물이 도착했어요','우편함에서 달빛 진주새우 2개를 받아주세요.',id from gifts;
commit;
