begin;

-- Expose only the same public player identity used by the showcase feed.
-- The reaction table remains inaccessible to direct client reads/writes.
create function app_private.showcase_reaction_people(p_post_id uuid,p_reaction text default null,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_post_id is null or p_offset is null or p_offset<0 or p_offset>100000 or
 (p_reaction is not null and p_reaction not in ('celebrate','love','wow','luck','sad','angry')) then
  raise exception 'INVALID_SHOWCASE';
 end if;
 if not exists(select 1 from public.fishing_showcase_posts where id=p_post_id) then raise exception 'SHOWCASE_NOT_FOUND';end if;
 with reactions as materialized (
  select r.user_id,r.reaction,p.nickname,p.avatar_path
  from public.fishing_showcase_reactions r join public.player_profiles p on p.id=r.user_id where r.post_id=p_post_id
 ), filtered as (select * from reactions where p_reaction is null or reaction=p_reaction),
 people as (select * from filtered order by user_id limit 50 offset p_offset)
 select jsonb_build_object(
  'counts',coalesce((select jsonb_object_agg(reaction,n) from (select reaction,count(*)::integer n from reactions group by reaction) c),'{}'::jsonb),
  'total',(select count(*)::integer from filtered),
  'items',coalesce((select jsonb_agg(to_jsonb(people) order by user_id) from people),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function app_private.showcase_reaction_people(uuid,text,integer) from public,anon;
grant execute on function app_private.showcase_reaction_people(uuid,text,integer) to authenticated;
create function public.showcase_reaction_people(p_post_id uuid,p_reaction text default null,p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.showcase_reaction_people(p_post_id,p_reaction,p_offset)
$$;
revoke all on function public.showcase_reaction_people(uuid,text,integer) from public,anon;
grant execute on function public.showcase_reaction_people(uuid,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
