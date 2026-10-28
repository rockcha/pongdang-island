-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.island_shop_items ("id","family","name","price","width","height","terrain","rotations","text_label") values
('island-name-sign','decoration','이름 간판',120,2,1,'land','[0]'::jsonb,true)
on conflict(id) do update set "family"=excluded."family","name"=excluded."name","price"=excluded."price","width"=excluded."width","height"=excluded."height","terrain"=excluded."terrain","rotations"=excluded."rotations","text_label"=excluded."text_label";
notify pgrst, 'reload schema';
commit;
