begin;
-- Only the title is editable; escrow and trade conditions remain unchanged.
create function app_private.edit_exchange_listing_title(p_listing_id uuid,p_title text)
returns void language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid();l public.exchange_listings;v_title text:=btrim(p_title);
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if v_title is null or char_length(v_title) not between 1 and 80 or v_title~'[[:cntrl:]]' or v_title!~'[^[:space:]]' then raise exception 'INVALID_EXCHANGE_TITLE';end if;
 select * into l from public.exchange_listings where id=p_listing_id for update;
 if not found then raise exception 'EXCHANGE_NOT_FOUND';end if;
 if l.owner_id<>u then raise exception 'EXCHANGE_FORBIDDEN';end if;
 if l.side<>'sell' or l.status<>'active' then raise exception 'EXCHANGE_UNAVAILABLE';end if;
 update public.exchange_listings set title=v_title where id=l.id;
end;
$$;
create function public.edit_exchange_listing_title(p_listing_id uuid,p_title text)
returns void language sql security invoker set search_path=''
as $$select app_private.edit_exchange_listing_title(p_listing_id,p_title)$$;
revoke all on function app_private.edit_exchange_listing_title(uuid,text),public.edit_exchange_listing_title(uuid,text) from public,anon;
grant execute on function app_private.edit_exchange_listing_title(uuid,text),public.edit_exchange_listing_title(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
