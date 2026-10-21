begin;
-- One reaction per user/comment; new emotions do not count as likes or dislikes.
alter table app_private.hall_section_comment_reactions drop constraint hall_section_comment_reactions_value_check;
alter table app_private.hall_section_comment_reactions add constraint hall_section_comment_reactions_value_check check(value in (-1,1,2,3));
CREATE OR REPLACE FUNCTION app_private.hall_section_wall(p_section text, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'INVALID_HALL';end if;
 if p_section is null or not exists(select 1 from app_private.hall_sections where id=p_section) then raise exception 'HALL_NOT_FOUND';end if;
 select jsonb_build_object(
  'total',(select count(*) from app_private.hall_section_comments where section_id=p_section),
  'comments',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc,c.id desc) from (
   select c.id,c.author_id,c.body,c.created_at,p.nickname,p.avatar_path,
    (select count(*) from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.value=2) sad,
    (select count(*) from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.value=3) angry,
    (select count(*) from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.value=1) likes,
    (select count(*) from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.value=-1) dislikes,
    coalesce((select r.value from app_private.hall_section_comment_reactions r where r.comment_id=c.id and r.user_id=auth.uid()),0) as "myReaction"
   from app_private.hall_section_comments c join public.player_profiles p on p.id=c.author_id
   where c.section_id=p_section order by c.created_at desc,c.id desc limit 30 offset p_offset
  ) c),'[]'::jsonb)
 ) into result;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.hall_section_action(p_section text, p_action text, p_body text DEFAULT ''::text, p_comment_id uuid DEFAULT NULL::uuid, p_value integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();author uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_section is null or not exists(select 1 from app_private.hall_sections where id=p_section) then raise exception 'HALL_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('hall-section:'||u::text,0));
 if p_action='comment' then
  if p_body is null or char_length(btrim(p_body)) not between 1 and 500 then raise exception 'INVALID_HALL';end if;
  if exists(select 1 from app_private.hall_section_comments where author_id=u and created_at>clock_timestamp()-interval '5 seconds') then raise exception 'HALL_RATE_LIMIT';end if;
  insert into app_private.hall_section_comments(section_id,author_id,body) values(p_section,u,btrim(p_body));
 elsif p_action='delete_comment' then
  delete from app_private.hall_section_comments where id=p_comment_id and section_id=p_section and author_id=u;
  if not found then raise exception 'NOT_ALLOWED';end if;
 elsif p_action='react' then
  if p_value is null or p_value not in (-1,0,1,2,3) then raise exception 'INVALID_HALL';end if;
  select c.author_id into author from app_private.hall_section_comments c where c.id=p_comment_id and c.section_id=p_section for update;
  if not found then raise exception 'HALL_NOT_FOUND';end if;
  if author=u then raise exception 'HALL_SELF_REACTION';end if;
  if p_value=0 then delete from app_private.hall_section_comment_reactions where comment_id=p_comment_id and user_id=u;
  else insert into app_private.hall_section_comment_reactions(comment_id,user_id,value) values(p_comment_id,u,p_value)
   on conflict(comment_id,user_id) do update set value=excluded.value;end if;
 else raise exception 'INVALID_HALL';end if;
 return app_private.hall_section_wall(p_section,0);
end $function$
;
commit;
