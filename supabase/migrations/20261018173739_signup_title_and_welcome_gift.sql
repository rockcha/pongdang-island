begin;
-- The starter title is owned immediately, without an achievement notification.
insert into public.title_catalog(id,name,tier,category,description,metric,target,sort_order)
values('beginner','초보 낚시꾼',1,'growth','퐁당섬에 처음 발을 디딘 모든 낚시꾼의 칭호예요.','signup',1,0);
alter table public.player_profiles alter column equipped_title set default '초보 낚시꾼';
alter table public.collectible_gifts drop constraint collectible_gifts_source_check;
alter table public.collectible_gifts add constraint collectible_gifts_source_check check(source in ('friend','exchange','system'));
alter table public.collectible_gifts drop constraint gift_asset_shape;
alter table public.collectible_gifts add constraint gift_asset_shape CHECK ((((reward_kind = 'collectible'::text) AND ((quantity >= 1) AND (quantity <= 20)) AND (cardinality(collectible_ids) = quantity)) OR ((source = 'exchange'::text) AND (reward_kind = 'gold'::text) AND ((quantity >= 1) AND (quantity <= 1000000000)) AND (cardinality(collectible_ids) = 0)) OR ((source = 'exchange'::text) AND (reward_kind = 'bait'::text) AND ((quantity >= 1) AND (quantity <= 9999)) AND (cardinality(collectible_ids) = 0) AND (reward_id IS NOT NULL)) OR (source='system' and reward_kind='gold' and reward_id='welcome' and quantity=500 and cardinality(collectible_ids)=0 and sender_id is null and not exchange_hold)));

create unique index one_signup_gift_per_player on public.collectible_gifts(recipient_id)
where source='system' and reward_id='welcome';

create function app_private.initialize_player_welcome() returns trigger
language plpgsql security definer set search_path='' as $$
declare gift uuid;
begin
 insert into public.player_titles(user_id,title_id) values(new.id,'beginner') on conflict do nothing;
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 values('퐁당섬 운영자',new.id,new.nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','welcome-gold','name','가입 축하 골드'),500,
 '퐁당섬에 오신 것을 환영해요! 첫 모험을 응원하는 500골드를 보내드려요.','system','gold','welcome')
 on conflict do nothing returning id into gift;
 if gift is not null then
  insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
  values(new.id,'gift','gift_received','가입 축하 선물이 도착했어요!','운영자가 500골드를 보냈어요. 선물함에서 받아보세요.',gift);
 end if;
 return new;
end $$;
revoke all on function app_private.initialize_player_welcome() from public,anon,authenticated;
create trigger player_welcome after insert on public.player_profiles
for each row execute function app_private.initialize_player_welcome();

-- Existing members receive the same one-time welcome, preserving equipped titles.
insert into public.player_titles(user_id,title_id) select id,'beginner' from public.player_profiles on conflict do nothing;
update public.player_profiles set equipped_title='초보 낚시꾼' where equipped_title is null;
with gifts as (
 insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,message,source,reward_kind,reward_id)
 select '퐁당섬 운영자',id,nickname,gen_random_uuid(),'{}'::uuid[],
 jsonb_build_object('id','welcome-gold','name','가입 축하 골드'),500,
 '퐁당섬에 오신 것을 환영해요! 첫 모험을 응원하는 500골드를 보내드려요.','system','gold','welcome'
 from public.player_profiles on conflict do nothing returning id,recipient_id
)
insert into public.notifications(recipient_id,category,kind,title,body,gift_id)
select recipient_id,'gift','gift_received','가입 축하 선물이 도착했어요!','운영자가 500골드를 보냈어요. 선물함에서 받아보세요.',id from gifts;
notify pgrst,'reload schema';
commit;
