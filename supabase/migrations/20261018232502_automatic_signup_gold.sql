begin;
-- This unpublished migration delivers a claimable gift. It never credits wallets.
-- The target remote lacks the system-gift constraints from the prior local history.
alter table public.collectible_gifts drop constraint collectible_gifts_source_check;
alter table public.collectible_gifts add constraint collectible_gifts_source_check check(source in ('friend','exchange','system'));
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape check (
 (reward_kind='collectible' and quantity between 1 and 20 and cardinality(collectible_ids)=quantity)
 or (source='exchange' and reward_kind='gold' and quantity between 1 and 1000000000 and cardinality(collectible_ids)=0)
 or (source='exchange' and reward_kind='bait' and quantity between 1 and 9999 and cardinality(collectible_ids)=0 and reward_id is not null)
 or (source='system' and reward_kind='gold' and reward_id='welcome' and quantity=500 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold)
);
create unique index if not exists one_signup_gift_per_player on public.collectible_gifts(recipient_id)
where source='system' and reward_id='welcome';

create function app_private.send_welcome_gift(p_user_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare gift uuid; player_name text;
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
 return gift;
end $$;
revoke all on function app_private.send_welcome_gift(uuid) from public,anon,authenticated;

create or replace function app_private.initialize_player_welcome() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- Preserve the optional starter title without requiring its remote installation.
 insert into public.player_titles(user_id,title_id)
 select new.id,id from public.title_catalog where id='beginner' on conflict do nothing;
 perform app_private.send_welcome_gift(new.id);
 return new;
end $$;
revoke all on function app_private.initialize_player_welcome() from public,anon,authenticated;
drop trigger if exists player_welcome on public.player_profiles;
create trigger player_welcome after insert on public.player_profiles
for each row execute function app_private.initialize_player_welcome();

do $$
declare player record;
begin
 for player in select id from public.player_profiles order by id loop
  perform app_private.send_welcome_gift(player.id);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
