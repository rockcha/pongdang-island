begin;
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text, 'operator-gold-20261021-supply'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = ANY (ARRAY['welcome-bait'::text, 'operator-worm-20261020'::text])) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id ~~ 'arcade-weekly:%'::text) AND (quantity = ANY (ARRAY[2000, 1500, 1000, 650, 400, 200])) AND ((species ->> 'game'::text) = ANY (ARRAY['shadow'::text, 'memory'::text])) AND (reward_id = ((('arcade-weekly:'::text || (species ->> 'game'::text)) || ':'::text) || (species ->> 'week_start'::text))) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['giseong-catch-202610:giseong-fish'::text, 'giseong-catch-202610:giseong-webfoot-octopus'::text])) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 300) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = 'operator-update-20261023-nyamnyam'::text) AND ((species ->> 'id'::text) = reward_id) AND (quantity = 1000) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (sender_id IS NULL) AND (NOT exchange_hold) AND (cardinality(collectible_ids) = 0) AND
CASE
    WHEN (reward_id ~ '^level-up:[1-9][0-9]{0,8}$'::text) THEN (((split_part(reward_id, ':'::text, 2))::bigint >= 2) AND (quantity = LEAST((1000000000)::bigint, (100 * (((split_part(reward_id, ':'::text, 2))::bigint + 9) / 10)))) AND ((species ->> 'id'::text) = reward_id))
    ELSE false
END)) OR (source='system' and reward_kind='gold' and reward_id='halloween-20261024-gold-500' and species->>'id'=reward_id and quantity=500 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold));
create unique index one_halloween_20261024_gold_per_player on public.collectible_gifts(recipient_id) where source='system' and reward_id='halloween-20261024-gold-500';
with gifts as (
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영자',p.id,p.nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','halloween-20261024-gold-500','name','🎃 할로윈 기념 골드 꾸러미'),500,
 '🎃 해피 할로윈! 귀엽지만 오싹한 친구들을 찾아 떠나는 주민 여러분께 운영자가 500골드를 선물합니다. 즐거운 할로윈 낚시 되세요! 👻',
 'system','gold','halloween-20261024-gold-500'
 from public.player_profiles p where p.created_at <= timestamptz '2026-10-23 15:01:46+00'
 on conflict do nothing returning id,recipient_id
)
insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
 select recipient_id,'gift','gift_received','🎃 할로윈 기념 골드 꾸러미가 도착했어요!','운영자의 500골드 선물을 우편함에서 받아주세요.',id from gifts;
notify pgrst,'reload schema';
commit;
