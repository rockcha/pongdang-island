begin;
alter table public.harbor_vessels drop constraint harbor_vessels_catch_bait_check;
alter table public.harbor_vessels add constraint harbor_vessels_catch_bait_check check(catch_bait_id in ('bait','bait_magnet','bait_grubby_magnet','bait_special'));
notify pgrst, 'reload schema';
commit;
