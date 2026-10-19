-- Generated catalog reviewed; update only the revised image path.
begin;
update public.aquarium_backgrounds set image_path='red-fan-coral-v2.png' where id='red-fan-coral';
notify pgrst, 'reload schema';
commit;
