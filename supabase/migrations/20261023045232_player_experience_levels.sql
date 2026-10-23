begin;

-- Wait for existing settlements, then hold the three sources through backfill
-- and trigger installation. No catch can fall between historical and live XP.
lock table public.fishing_attempts, public.fishing_expeditions, public.harbor_voyages in share row exclusive mode;

create table app_private.player_experience (
 user_id uuid primary key references auth.users(id) on delete cascade,
 total_xp bigint not null default 0 check(total_xp>=0),
 legacy_xp bigint not null default 0 check(legacy_xp>=0 and legacy_xp<=total_xp),
 updated_at timestamptz not null default now()
);
create table app_private.experience_events (
 source text not null check(source in ('manual','trap','harbor')),
 source_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 xp integer not null check(xp>=0),
 legacy boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(user_id,source,source_id)
);
alter table app_private.player_experience enable row level security;
alter table app_private.experience_events enable row level security;
revoke all on app_private.player_experience, app_private.experience_events from public,anon,authenticated;

-- Historical casts include failed attempts; automatic fishing counts actual
-- collected items, including bonuses, and excludes trips still awaiting claim.
insert into app_private.experience_events(source,source_id,user_id,xp,legacy)
 select 'manual',operation_id,user_id,15,true from public.fishing_attempts
 union all
 select 'trap',id,user_id,6*jsonb_array_length(coalesce(result->'items','[]'::jsonb)),true from public.fishing_expeditions where claimed_at is not null
 union all
 select 'harbor',id,user_id,6*jsonb_array_length(coalesce(result->'items','[]'::jsonb)),true from public.harbor_voyages where claimed_at is not null;
insert into app_private.player_experience(user_id,total_xp,legacy_xp)
 select user_id,sum(xp),sum(xp) from app_private.experience_events group by user_id;

create function app_private.catch_experience(p_kind text,p_rarity text,p_automatic boolean default false)
 returns integer language plpgsql immutable set search_path='' as $$
declare amount numeric;
begin
 if p_kind not in ('fish','trash','decoration','map') or p_kind is null or p_rarity not in ('common','rare','epic','mythic') or p_rarity is null or p_automatic is null then raise exception 'INVALID_EXPERIENCE_CATCH';end if;
 amount:=case when p_kind='map' then 30 else case p_rarity when 'common' then 10 when 'rare' then 30 when 'epic' then 100 else 400 end end;
 if p_kind='trash' then amount:=amount/2;end if;
 if p_automatic then amount:=amount*0.3;end if;
 return round(amount)::integer;
end $$;

create function app_private.award_experience(p_user uuid,p_source text,p_source_id uuid,p_xp integer)
 returns void language plpgsql security definer set search_path='' as $$
begin
 insert into app_private.experience_events(source,source_id,user_id,xp) values(p_source,p_source_id,p_user,p_xp) on conflict(user_id,source,source_id) do nothing;
 if not found then return;end if;
 insert into app_private.player_experience(user_id,total_xp) values(p_user,p_xp)
 on conflict(user_id) do update set total_xp=app_private.player_experience.total_xp+excluded.total_xp,updated_at=clock_timestamp();
end $$;

create function app_private.manual_experience_event() returns trigger
 language plpgsql security definer set search_path='' as $$
declare kind text;amount integer;
begin
 if new.rarity is null then amount:=2;
 else
  select p.snapshot->>'kind' into kind from app_private.prepared_fishing_casts p where p.user_id=new.user_id and p.operation_id=new.operation_id;
  if kind is null then select s.kind::text into kind from public.player_collectibles c join public.collectible_species s on s.id=c.species_id where c.id=new.collectible_id and c.user_id=new.user_id;end if;
  amount:=app_private.catch_experience(kind,new.rarity::text);
 end if;
 perform app_private.award_experience(new.user_id,'manual',new.operation_id,amount);
 return new;
end $$;

create function app_private.automatic_experience_event() returns trigger
 language plpgsql security definer set search_path='' as $$
declare amount integer;
begin
 if new.claimed_at is null then return new;end if;
 if tg_op='UPDATE' and old.claimed_at is not null then return new;end if;
 select coalesce(sum(app_private.catch_experience(item->'species'->>'kind',item->'species'->>'rarity',true)),0)::integer into amount
 from jsonb_array_elements(coalesce(new.result->'items','[]'::jsonb)) item;
 perform app_private.award_experience(new.user_id,case when tg_table_name='fishing_expeditions' then 'trap' else 'harbor' end,new.id,amount);
 return new;
end $$;

create trigger level_manual_catch after insert on public.fishing_attempts for each row execute function app_private.manual_experience_event();
create trigger level_trap_claim after insert or update of claimed_at on public.fishing_expeditions for each row execute function app_private.automatic_experience_event();
create trigger level_harbor_claim after insert or update of claimed_at on public.harbor_voyages for each row execute function app_private.automatic_experience_event();

create function app_private.experience_state() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();xp bigint:=0;legacy bigint:=0;lv integer;base bigint;needed bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select e.total_xp,e.legacy_xp into xp,legacy from app_private.player_experience e where e.user_id=uid;
 xp:=coalesce(xp,0);legacy:=coalesce(legacy,0);
 lv:=floor((-1+sqrt(9+4*xp::numeric/25))/2)::integer;
 base:=(25::numeric*(lv-1)*(lv+2))::bigint;
 needed:=50::bigint*lv+50;
 return jsonb_build_object('level',lv,'totalXp',xp,'currentXp',xp-base,'nextLevelXp',needed,'legacyXp',legacy);
end $$;
create function public.experience_state() returns jsonb language sql stable set search_path='' as $$ select app_private.experience_state() $$;

revoke all on function app_private.catch_experience(text,text,boolean),app_private.award_experience(uuid,text,uuid,integer),app_private.manual_experience_event(),app_private.automatic_experience_event(),app_private.experience_state(),public.experience_state() from public,anon,authenticated;
grant execute on function app_private.experience_state(),public.experience_state() to authenticated;
notify pgrst,'reload schema';
commit;
