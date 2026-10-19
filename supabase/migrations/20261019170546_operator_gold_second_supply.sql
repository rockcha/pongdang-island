-- A separate one-time second supply, independent of the first gift.
begin;
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = 'welcome-bait'::text) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold))));
create unique index if not exists one_operator_gold_20261020_round2_per_player on public.collectible_gifts(recipient_id) where source='system' and reward_id='operator-gold-20261020-round2';
with gifts as (
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영자',p.id,p.nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','operator-gold-20261020-round2','name','운영자의 500골드 추가 보급'),500,
 '운영자가 500골드를 한 번 더 보급해 드려요! 미끼도 챙기고 즐거운 낚시 되세요!','system','gold','operator-gold-20261020-round2'
 from public.player_profiles p
 on conflict do nothing returning id,recipient_id
)
insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
select recipient_id,'gift','gift_received','운영자의 500골드 추가 보급이 도착했어요!','우편함에서 500골드를 받아주세요. 즐거운 낚시 되세요!',id from gifts;
notify pgrst, 'reload schema';
commit;
