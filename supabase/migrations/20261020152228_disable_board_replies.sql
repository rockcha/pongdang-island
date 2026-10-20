begin;
-- Preserve existing replies and their edits; reject every newly inserted reply,
-- including writes from an older client through the existing RPC.
create function app_private.reject_new_board_reply() returns trigger
language plpgsql set search_path='' as $$
begin
 raise exception 'BOARD_REPLIES_DISABLED';
end $$;
revoke all on function app_private.reject_new_board_reply() from public,anon,authenticated;
create trigger board_comments_no_new_replies
 before insert on public.board_comments
 for each row when (new.parent_id is not null)
 execute function app_private.reject_new_board_reply();
notify pgrst,'reload schema';
commit;
