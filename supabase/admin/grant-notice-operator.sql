-- Run in the intended project's Supabase SQL Editor after notice_board migration.
-- This targets the already-created account; it contains no password.
begin;
do $$
declare v_uid uuid;
begin
 if to_regclass('app_private.notice_operators') is null then
  raise exception 'Apply 20261016181632_notice_board.sql first';
 end if;
 select id into v_uid from auth.users
 where id='e50ad282-fb2a-485c-9124-303d560d05b1'::uuid and lower(email)='0@0.com';
 if v_uid is null then raise exception 'Expected 0@0.com account not found; verify target project';end if;
 insert into app_private.notice_operators(user_id) values(v_uid) on conflict do nothing;
end $$;
select u.email,p.nickname,true as notice_operator
from app_private.notice_operators o
join auth.users u on u.id=o.user_id
left join public.player_profiles p on p.id=u.id
where u.id='e50ad282-fb2a-485c-9124-303d560d05b1'::uuid;
commit;
