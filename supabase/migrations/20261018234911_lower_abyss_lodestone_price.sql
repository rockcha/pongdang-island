-- Generated catalog reviewed; retain only the requested price change.
begin;
update public.fishing_baits set price=50 where id='bait_magnet';
notify pgrst, 'reload schema';
commit;
