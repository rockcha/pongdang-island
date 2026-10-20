begin;
-- Enrich only the response. Never change payment records, balances, or trading.
create or replace function app_private.gift_detail(p_gift_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare g public.collectible_gifts;v_uid uuid:=auth.uid();v_offers jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into g from public.collectible_gifts where id=p_gift_id and not exchange_hold and (sender_id=v_uid or recipient_id=v_uid);
 if not found then raise exception 'GIFT_NOT_FOUND';end if;
 if g.source='exchange' and g.reward_kind='gold' then
  -- Payment creation and listing closure share the transaction's now(). Check
  -- both participants and the exact amount, and never guess ambiguous matches.
  select jsonb_agg(l.offer) into v_offers from public.exchange_listings l
  where l.side='sell' and l.status='completed'
   and l.owner_id=g.recipient_id and l.taker_id=g.sender_id and l.closed_at=g.created_at
   and l.wanted->>'kind'='gold' and l.wanted->>'id'=g.reward_id
   and (l.wanted->>'quantity')::integer=g.quantity;
  if jsonb_array_length(v_offers)=1 then
   g.species:=g.species||jsonb_build_object('exchange_offer',v_offers->0);
  end if;
 end if;
 return to_jsonb(g);
end;
$$;
notify pgrst,'reload schema';
commit;
