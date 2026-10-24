-- New help only: existing daily notices do not backfill XP.
alter table app_private.experience_events drop constraint experience_events_source_check;
alter table app_private.experience_events add constraint experience_events_source_check
 check (source in ('manual','trap','harbor','friend_lure','friend_feeding','friend_cleaning'));
create function app_private.friend_help_experience_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_table_schema <> 'app_private' then raise exception 'INVALID_HELP_SOURCE'; end if;
 if tg_table_name = 'expedition_boosts' then
  perform app_private.award_experience(new.helper_id,'friend_lure',new.id,1);
 elsif tg_table_name in ('aquarium_feed_notices','aquarium_clean_notices') then
  perform app_private.award_experience(new.visitor_id,
   case when tg_table_name='aquarium_feed_notices' then 'friend_feeding' else 'friend_cleaning' end,
   pg_catalog.md5(new.visitor_id::text || ':' || new.owner_id::text || ':' || new.notice_day::text)::uuid,1);
 else raise exception 'INVALID_HELP_SOURCE';
 end if;
 return new;
end $$;
revoke all on function app_private.friend_help_experience_event() from public,anon,authenticated;
create trigger experience_friend_lure after insert on app_private.expedition_boosts
 for each row execute function app_private.friend_help_experience_event();
create trigger experience_friend_feeding after insert on app_private.aquarium_feed_notices
 for each row execute function app_private.friend_help_experience_event();
create trigger experience_friend_cleaning after insert on app_private.aquarium_clean_notices
 for each row execute function app_private.friend_help_experience_event();
