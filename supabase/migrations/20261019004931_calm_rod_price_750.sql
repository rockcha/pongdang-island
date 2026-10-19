begin;
update public.fishing_rods set price=750 where id='calm';
notify pgrst,'reload schema';
commit;
