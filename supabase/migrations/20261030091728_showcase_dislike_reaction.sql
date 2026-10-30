begin;
set local lock_timeout='5s';

alter table public.fishing_showcase_reactions drop constraint fishing_showcase_reactions_reaction_check;
alter table public.fishing_showcase_reactions add constraint fishing_showcase_reactions_reaction_check
 check (reaction in ('celebrate','love','wow','luck','dislike','sad','angry'));

CREATE OR REPLACE FUNCTION app_private.react_fishing_showcase(p_post_id uuid, p_reaction text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.fishing_showcase_posts;u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_reaction is not null and p_reaction not in ('celebrate','love','wow','luck','dislike','sad','angry') then raise exception 'INVALID_SHOWCASE_REACTION';end if;
 select * into p from public.fishing_showcase_posts where id=p_post_id for share;
 if not found then raise exception 'SHOWCASE_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase-react:'||p_post_id::text||':'||u::text,0));
 if p_reaction is null then delete from public.fishing_showcase_reactions where post_id=p_post_id and user_id=u;
 else insert into public.fishing_showcase_reactions(post_id,user_id,reaction) values(p_post_id,u,p_reaction)
 on conflict(post_id,user_id) do update set reaction=excluded.reaction;end if;
 return app_private.showcase_post_json(p);
end $function$;

CREATE OR REPLACE FUNCTION app_private.showcase_reaction_people(p_post_id uuid, p_reaction text DEFAULT NULL::text, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_post_id is null or p_offset is null or p_offset<0 or p_offset>100000 or
 (p_reaction is not null and p_reaction not in ('celebrate','love','wow','luck','dislike','sad','angry')) then
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
end $function$;

commit;
