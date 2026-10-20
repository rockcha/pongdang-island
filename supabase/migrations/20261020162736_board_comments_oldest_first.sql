begin;
CREATE OR REPLACE FUNCTION app_private.board_detail(p_id uuid, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_offset<0 or p_offset>10000 then raise exception 'INVALID_BOARD_REQUEST'; end if;
  select app_private.board_post_json(p) into result from public.board_posts p where p.id=p_id;
  if result is null then return null; end if;
  return jsonb_build_object('post',result,'comments',coalesce((select jsonb_agg(q.item order by q.created_at asc,q.id asc) from (
    select c.id,c.created_at,to_jsonb(c)||jsonb_build_object(
      'author_name',a.nickname,'avatar_path',a.avatar_path,'equipped_title',a.equipped_title,
      'parent_author_name',pa.nickname,
      'likes',(select count(*) from public.board_reactions r where r.comment_id=c.id and r.value=1),
      'dislikes',(select count(*) from public.board_reactions r where r.comment_id=c.id and r.value=-1),
      'my_reaction',coalesce((select r.value from public.board_reactions r where r.comment_id=c.id and r.user_id=auth.uid()),0)
    ) item from public.board_comments c join public.player_profiles a on a.id=c.author_id
    left join public.board_comments parent on parent.id=c.parent_id left join public.player_profiles pa on pa.id=parent.author_id
    where c.post_id=p_id order by c.created_at asc,c.id asc limit 50 offset p_offset
  )q),'[]'::jsonb),'comment_total',(select count(*) from public.board_comments where post_id=p_id));
end $function$
;
notify pgrst,'reload schema';
commit;
