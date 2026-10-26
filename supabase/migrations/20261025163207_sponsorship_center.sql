-- Escrow and receipts are private. Players can only use authenticated RPCs.
create table app_private.sponsorships (
 id uuid primary key,
 creator_id uuid references auth.users(id) on delete set null,
 creator_name text not null,
 creator_avatar text,
 gold_each integer not null check(gold_each between 1 and 1000000000),
 slots integer not null check(slots between 1 and 100),
 claimed_count integer not null default 0 check(claimed_count>=0 and claimed_count<=slots),
 message text not null default '' check(char_length(message)<=120),
 status text not null default 'active' check(status in ('active','completed','cancelled')),
 created_at timestamptz not null default clock_timestamp(),
 closed_at timestamptz,
 check(gold_each::bigint*slots<=1000000000),
 check((status='active' and claimed_count<slots and closed_at is null)
  or (status='completed' and claimed_count=slots and closed_at is not null)
  or (status='cancelled' and claimed_count=0 and closed_at is not null))
);
create unique index sponsorship_one_active on app_private.sponsorships(creator_id) where status='active';
create index sponsorship_feed on app_private.sponsorships(status,created_at desc,id);
create index sponsorship_creator on app_private.sponsorships(creator_id,created_at desc,id);
alter table app_private.sponsorships enable row level security;
revoke all on app_private.sponsorships from public,anon,authenticated;

create table app_private.sponsorship_claims (
 id uuid primary key default gen_random_uuid(),
 sponsorship_id uuid not null references app_private.sponsorships(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 nickname text not null,
 avatar_path text,
 gold integer not null check(gold>0),
 slot integer not null check(slot between 1 and 100),
 claimed_at timestamptz not null default clock_timestamp(),
 unique(sponsorship_id,user_id),
 unique(sponsorship_id,slot)
);
create index sponsorship_claims_user on app_private.sponsorship_claims(user_id,sponsorship_id);
alter table app_private.sponsorship_claims enable row level security;
revoke all on app_private.sponsorship_claims from public,anon,authenticated;

-- Only the authenticated entry points below call this internal serializer.
create function app_private.sponsorship_payload(p_id uuid,p_full boolean default false)
returns jsonb language sql stable set search_path='' as $function$
 select jsonb_build_object(
  'id',s.id,'goldEach',s.gold_each,'slots',s.slots,'claimedCount',s.claimed_count,
  'totalGold',s.gold_each::bigint*s.slots,'message',s.message,'status',s.status,
  'createdAt',s.created_at,'closedAt',s.closed_at,
  'owner',jsonb_build_object('id',s.creator_id,'nickname',coalesce(p.nickname,s.creator_name),'avatarPath',case when p.id is not null then p.avatar_path else s.creator_avatar end),
  'mine',coalesce(s.creator_id=auth.uid(),false),
  'received',exists(select 1 from app_private.sponsorship_claims c where c.sponsorship_id=s.id and c.user_id=auth.uid()),
  'recipients',coalesce((select jsonb_agg(q.person order by q.slot) from (
   select c.slot,jsonb_build_object('id',c.user_id,'nickname',coalesce(r.nickname,c.nickname),
    'avatarPath',case when r.id is not null then r.avatar_path else c.avatar_path end,'slot',c.slot,'claimedAt',c.claimed_at) person
   from app_private.sponsorship_claims c left join public.player_profiles r on r.id=c.user_id
   where c.sponsorship_id=s.id order by c.slot limit case when p_full then 100 else 8 end
  )q),'[]'::jsonb)
 ) from app_private.sponsorships s left join public.player_profiles p on p.id=s.creator_id where s.id=p_id
$function$;
revoke all on function app_private.sponsorship_payload(uuid,boolean) from public,anon,authenticated;

create function app_private.sponsorship_state(p_tab text default 'active',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare u uuid:=auth.uid();items jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_tab is null or p_tab not in ('active','completed','mine') or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_SPONSORSHIP';end if;
 select coalesce(jsonb_agg(app_private.sponsorship_payload(q.id) order by q.created_at desc,q.id),'[]'::jsonb) into items from (
  select s.id,s.created_at from app_private.sponsorships s
  where (p_tab='active' and s.status='active') or (p_tab='completed' and s.status<>'active')
   or (p_tab='mine' and (s.creator_id=u or exists(select 1 from app_private.sponsorship_claims c where c.sponsorship_id=s.id and c.user_id=u)))
  order by s.created_at desc,s.id limit 11 offset p_offset
 )q;
 return jsonb_build_object('items',case when jsonb_array_length(items)>10 then items-10 else items end,
  'hasMore',jsonb_array_length(items)>10);
end $function$;

create function app_private.sponsorship_detail(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 result:=app_private.sponsorship_payload(p_id,true);
 if result is null then raise exception 'SPONSORSHIP_NOT_FOUND';end if;
 return result;
end $function$;

create function app_private.sponsorship_create(p_operation_id uuid,p_gold_each integer,p_slots integer,p_message text default '')
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();w public.player_wallets;p public.player_profiles;s app_private.sponsorships;
 total bigint;body text:=btrim(coalesce(p_message,''));
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation_id is null or p_gold_each is null or p_gold_each<1 or p_slots is null or p_slots not between 1 and 100 or char_length(body)>120 then raise exception 'INVALID_SPONSORSHIP';end if;
 total:=p_gold_each::bigint*p_slots;
 if total>1000000000 then raise exception 'INVALID_SPONSORSHIP';end if;
 select * into p from public.player_profiles where id=u;
 if not found then p:=app_private.sync_player_profile();end if;
 -- Every mutation takes only the caller's wallet, then the sponsorship row.
 -- Receiving never locks the donor's wallet, avoiding cross-player lock cycles.
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into s from app_private.sponsorships where id=p_operation_id;
 if found then
  if s.creator_id is distinct from u or s.gold_each<>p_gold_each or s.slots<>p_slots or s.message<>body then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.sponsorship_payload(s.id)||jsonb_build_object('replayed',true);
 end if;
 if exists(select 1 from app_private.sponsorships where creator_id=u and status='active') then raise exception 'SPONSORSHIP_ALREADY_ACTIVE';end if;
 if w.gold<total then raise exception 'INSUFFICIENT_GOLD';end if;
 insert into app_private.sponsorships(id,creator_id,creator_name,creator_avatar,gold_each,slots,message)
 values(p_operation_id,u,p.nickname,p.avatar_path,p_gold_each,p_slots,body);
 update public.player_wallets set gold=gold-total::integer,updated_at=clock_timestamp() where user_id=u;
 return app_private.sponsorship_payload(p_operation_id)||jsonb_build_object('replayed',false);
end $function$;

create function app_private.sponsorship_claim(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();w public.player_wallets;s app_private.sponsorships;p public.player_profiles;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_id is null then raise exception 'INVALID_SPONSORSHIP';end if;
 -- Initialize a newcomer before locking the wallet: profile signup hooks may
 -- credit that wallet too. All cap checks must use the resulting balance.
 select * into p from public.player_profiles where id=u;
 if not found then p:=app_private.sync_player_profile();end if;
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into s from app_private.sponsorships where id=p_id for update;
 if not found then raise exception 'SPONSORSHIP_NOT_FOUND';end if;
 -- A lost response can be retried even after the final slot has closed.
 if exists(select 1 from app_private.sponsorship_claims where sponsorship_id=p_id and user_id=u) then
  return app_private.sponsorship_payload(p_id)||jsonb_build_object('replayed',true);
 end if;
 if s.creator_id=u then raise exception 'SPONSORSHIP_SELF_CLAIM';end if;
 if s.status<>'active' then raise exception 'SPONSORSHIP_CLOSED';end if;
 if w.gold::bigint+s.gold_each>1000000000 then raise exception 'GOLD_LIMIT';end if;
 insert into app_private.sponsorship_claims(sponsorship_id,user_id,nickname,avatar_path,gold,slot)
 values(p_id,u,p.nickname,p.avatar_path,s.gold_each,s.claimed_count+1);
 update public.player_wallets set gold=gold+s.gold_each,updated_at=clock_timestamp() where user_id=u;
 update app_private.sponsorships set claimed_count=claimed_count+1,
  status=case when claimed_count+1=slots then 'completed' else 'active' end,
  closed_at=case when claimed_count+1=slots then clock_timestamp() else null end where id=p_id;
 return app_private.sponsorship_payload(p_id)||jsonb_build_object('replayed',false);
end $function$;

create function app_private.sponsorship_cancel(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid();w public.player_wallets;s app_private.sponsorships;total bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_id is null then raise exception 'INVALID_SPONSORSHIP';end if;
 perform app_private.get_gold_wallet();
 select * into strict w from public.player_wallets where user_id=u for update;
 select * into s from app_private.sponsorships where id=p_id for update;
 if not found then raise exception 'SPONSORSHIP_NOT_FOUND';end if;
 if s.creator_id is distinct from u then raise exception 'SPONSORSHIP_FORBIDDEN';end if;
 if s.status='cancelled' then return app_private.sponsorship_payload(p_id)||jsonb_build_object('replayed',true);end if;
 if s.status<>'active' or s.claimed_count<>0 then raise exception 'SPONSORSHIP_CANNOT_CANCEL';end if;
 total:=s.gold_each::bigint*s.slots;
 if w.gold::bigint+total>1000000000 then raise exception 'GOLD_LIMIT';end if;
 update public.player_wallets set gold=gold+total::integer,updated_at=clock_timestamp() where user_id=u;
 update app_private.sponsorships set status='cancelled',closed_at=clock_timestamp() where id=p_id;
 return app_private.sponsorship_payload(p_id)||jsonb_build_object('replayed',false);
end $function$;

-- Public entry points stay SECURITY INVOKER; private implementations check auth.uid().
create function public.sponsorship_state(p_tab text default 'active',p_offset integer default 0) returns jsonb
language sql set search_path='' as $function$select app_private.sponsorship_state(p_tab,p_offset)$function$;
create function public.sponsorship_detail(p_id uuid) returns jsonb
language sql set search_path='' as $function$select app_private.sponsorship_detail(p_id)$function$;
create function public.sponsorship_create(p_operation_id uuid,p_gold_each integer,p_slots integer,p_message text default '') returns jsonb
language sql set search_path='' as $function$select app_private.sponsorship_create(p_operation_id,p_gold_each,p_slots,p_message)$function$;
create function public.sponsorship_claim(p_id uuid) returns jsonb
language sql set search_path='' as $function$select app_private.sponsorship_claim(p_id)$function$;
create function public.sponsorship_cancel(p_id uuid) returns jsonb
language sql set search_path='' as $function$select app_private.sponsorship_cancel(p_id)$function$;
revoke all on function app_private.sponsorship_state(text,integer),app_private.sponsorship_detail(uuid),
 app_private.sponsorship_create(uuid,integer,integer,text),app_private.sponsorship_claim(uuid),app_private.sponsorship_cancel(uuid),
 public.sponsorship_state(text,integer),public.sponsorship_detail(uuid),public.sponsorship_create(uuid,integer,integer,text),
 public.sponsorship_claim(uuid),public.sponsorship_cancel(uuid) from public,anon,authenticated;
grant execute on function app_private.sponsorship_state(text,integer),app_private.sponsorship_detail(uuid),
 app_private.sponsorship_create(uuid,integer,integer,text),app_private.sponsorship_claim(uuid),app_private.sponsorship_cancel(uuid),
 public.sponsorship_state(text,integer),public.sponsorship_detail(uuid),public.sponsorship_create(uuid,integer,integer,text),
 public.sponsorship_claim(uuid),public.sponsorship_cancel(uuid) to authenticated;
notify pgrst,'reload schema';
