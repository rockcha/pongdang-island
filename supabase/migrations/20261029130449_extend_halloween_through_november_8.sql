-- End is exclusive: allow Halloween draws throughout Sunday, November 8 in Korea.
do $$
begin
 update app_private.collectible_event_windows
 set ends_at=timestamptz '2026-11-09 00:00:00+09'
 where id='halloween_2026' and species_prefix='halloween-'
 and starts_at=timestamptz '2026-10-24 00:00:00+09'
 and ends_at in(timestamptz '2026-11-01 00:00:00+09',timestamptz '2026-11-09 00:00:00+09');
 if not found then raise exception 'HALLOWEEN_WINDOW_DRIFT';end if;
end$$;
