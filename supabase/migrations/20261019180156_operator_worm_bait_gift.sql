begin;
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR ((source = 'system'::text) AND (reward_kind = 'gold'::text) AND (reward_id = ANY (ARRAY['welcome'::text, 'operator-gold-20261020'::text, 'operator-gold-20261020-round2'::text])) AND (quantity = 500) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR ((source = 'exchange'::text) AND (reward_kind = 'fuel'::text) AND (reward_id = 'fuel'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'system'::text) AND (reward_kind = 'bait'::text) AND (reward_id = 'bait'::text) AND ((species ->> 'id'::text) in ('welcome-bait','operator-worm-20261020')) AND (quantity = 5) AND (cardinality(collectible_ids) = 0) AND (sender_id IS NULL) AND (NOT exchange_hold)) OR (source='system' AND reward_kind='gold' AND reward_id like 'arcade-weekly:%' AND quantity in (2000,1500,1000,650,400,200) AND species->>'game' in ('shadow','memory') AND reward_id='arcade-weekly:'||(species->>'game')||':'||(species->>'week_start') AND cardinality(collectible_ids)=0 AND sender_id IS NULL AND NOT exchange_hold)));
create unique index if not exists one_operator_worm_20261020_per_player on public.collectible_gifts(recipient_id) where source='system' and species->>'id'='operator-worm-20261020';
with gifts as (
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영자',p.id,p.nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','operator-worm-20261020','name',b.name,'thumbnail_path',b.image_path),5,
 '주민 여러분의 낚시를 응원해요! 지렁이 미끼 5개를 선물로 준비했어요.','system','bait','bait'
 from public.player_profiles p cross join public.fishing_baits b where b.id='bait'
 on conflict do nothing returning id,recipient_id
)
insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
select recipient_id,'gift','gift_received','운영자의 미끼 선물이 도착했어요!','지렁이 미끼 5개를 선물함에서 받아주세요.',id from gifts;
commit;
