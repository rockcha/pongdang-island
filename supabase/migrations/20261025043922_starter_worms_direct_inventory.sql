-- A private receipt makes the direct grant atomic and retry-safe. Mark existing
-- profiles as excluded without changing their wallets or legacy pending gifts.
create table app_private.starter_bait_receipts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 quantity smallint not null check(quantity in(0,10)),
 created_at timestamptz not null default clock_timestamp()
);
alter table app_private.starter_bait_receipts enable row level security;
revoke all on app_private.starter_bait_receipts from public,anon,authenticated;
insert into app_private.starter_bait_receipts(user_id,quantity)
 select id,0 from public.player_profiles on conflict do nothing;

create or replace function app_private.send_welcome_gift(p_user_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare gift uuid; bait_receipt uuid; player_name text;
begin
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
 insert into app_private.starter_bait_receipts(user_id,quantity) values(p_user_id,10)
 on conflict do nothing returning user_id into bait_receipt;
 if bait_receipt is not null then
  insert into public.player_wallets(user_id,inventory) values(p_user_id,jsonb_build_object('bait',10))
  on conflict(user_id) do update set
   inventory=jsonb_set(player_wallets.inventory,'{bait}',to_jsonb(coalesce((player_wallets.inventory->>'bait')::integer,0)+10)),
   updated_at=clock_timestamp();
 end if;
 return gift;
end $$;
revoke all on function app_private.send_welcome_gift(uuid) from public,anon,authenticated;
