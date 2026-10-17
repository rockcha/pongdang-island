begin;
create function app_private.notice_delete(p_id uuid,p_revision integer) returns void
language plpgsql security definer set search_path='' as $$
declare n public.notices;
begin
 if not app_private.notice_is_operator() then raise exception 'NOTICE_FORBIDDEN';end if;
 select * into n from public.notices where id=p_id for update;
 if not found then return;end if;
 if p_revision is distinct from n.revision then raise exception 'NOTICE_CHANGED';end if;
 -- Linked announcement notifications are removed by the foreign key cascade.
 delete from public.notices where id=p_id;
end $$;
create function public.notice_delete(p_id uuid,p_revision integer) returns void language sql security invoker set search_path='' as $$select app_private.notice_delete(p_id,p_revision)$$;
create function app_private.notifications_opened() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 update public.notifications set read_at=transaction_timestamp()
 where recipient_id=auth.uid() and read_at is null and created_at<=transaction_timestamp();
end $$;
create function public.notifications_opened() returns void language sql security invoker set search_path='' as $$select app_private.notifications_opened()$$;
revoke all on function app_private.notice_delete(uuid,integer),public.notice_delete(uuid,integer),app_private.notifications_opened(),public.notifications_opened() from public,anon;
grant execute on function app_private.notice_delete(uuid,integer),public.notice_delete(uuid,integer),app_private.notifications_opened(),public.notifications_opened() to authenticated;
notify pgrst,'reload schema';
commit;
