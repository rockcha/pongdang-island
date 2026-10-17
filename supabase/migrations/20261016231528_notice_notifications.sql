begin;
alter table public.notifications add column notice_id uuid references public.notices(id) on delete cascade;
alter table public.notifications drop constraint notification_categories;
alter table public.notifications add constraint notification_categories check(
 (category='friend' and kind in('friend_request','friend_accepted') and request_id is not null and gift_id is null and notice_id is null)
 or(category='general' and kind in('announcement','reward','system') and request_id is null and gift_id is null and notice_id is null)
 or(category='gift' and kind in('gift_received','gift_claimed','gift_reaction') and request_id is null and gift_id is not null and notice_id is null)
 or(category='notice' and kind='announcement' and request_id is null and gift_id is null and notice_id is not null));
create unique index notifications_notice_recipient on public.notifications(recipient_id,notice_id) where notice_id is not null;
create index notifications_notice on public.notifications(notice_id) where notice_id is not null;
alter table public.notices add column notified_at timestamptz;
-- Existing publications are not announced again on their next edit.
update public.notices set notified_at=published_at where published_at is not null;
-- AFTER insertion is necessary for the notification foreign key to exist.
create function app_private.deliver_notice_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and new.notified_at is null then
  insert into public.notifications(recipient_id,category,kind,title,body,notice_id)
  select id,'notice','announcement',new.title,'새 공지가 등록됐어요.',new.id from public.player_profiles
  on conflict(recipient_id,notice_id) where notice_id is not null do nothing;
  update public.notices set notified_at=clock_timestamp() where id=new.id;
 end if;
 return null;
end $$;
revoke all on function app_private.deliver_notice_publication() from public,anon,authenticated;
create trigger notice_publication after insert or update of status on public.notices for each row execute function app_private.deliver_notice_publication();
alter policy notifications_owner_read on public.notifications using(
 recipient_id=(select auth.uid()) and (notice_id is null or exists(select 1 from public.notices n where n.id=notice_id and n.status='published')));
notify pgrst,'reload schema';
commit;
