-- One-time 500-gold operator gift to players present when this migration runs.
begin;
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id in ('welcome'::text,'operator-gold-20261020'::text)) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) = 'welcome-bait'::text) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold))));
create unique index if not exists one_operator_gold_20261020_per_player on public.collectible_gifts(recipient_id) where source='system' and reward_id='operator-gold-20261020';
with gifts as (
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영자',p.id,p.nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','operator-gold-20261020','name','운영자의 500골드 선물'),500,
 '퐁당섬에 함께해 주셔서 고마워요! 모두에게 500골드를 선물로 보내드려요. 즐거운 낚시 되세요!','system','gold','operator-gold-20261020'
 from public.player_profiles p
 on conflict do nothing returning id,recipient_id
)
insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
select recipient_id,'gift','gift_received','운영자의 500골드 선물이 도착했어요!','우편함에서 500골드를 받아주세요. 즐거운 낚시 되세요!',id from gifts;
notify pgrst, 'reload schema';
commit;
