-- Generated from supabase/catalog/catalog.json. Review before migration deployment.
begin;
set constraints all deferred;
insert into public.island_shop_items ("id","family","name","price","width","height","terrain","rotations","text_label") values
('portal~owned:page:/flea-market','facility','벼룩시장',0,2,2,'land','[0]'::jsonb,false),
('portal~owned:page:/item-collection','facility','아이템 도감',0,1,1,'land','[0]'::jsonb,false),
('portal~owned:page:/voyage-bets','facility','만선 승부장',0,1,1,'land','[0]'::jsonb,false),
('portal~owned:page:/fishing-records','facility','오늘의 낚시 기록',0,1,1,'land','[0]'::jsonb,false)
on conflict(id) do update set "family"=excluded."family","name"=excluded."name","price"=excluded."price","width"=excluded."width","height"=excluded."height","terrain"=excluded."terrain","rotations"=excluded."rotations","text_label"=excluded."text_label";
-- Append only the missing facilities. Preserve remote-specific starter coordinates,
-- and never rewrite any player's saved island or reset an edited layout.
update public.island_starters s
set blueprint=jsonb_set(s.blueprint,'{document,layout}',
 (select jsonb_agg(case when node->>'id'='island-name-sign~zone-sea'
   then jsonb_set(node,'{label}',to_jsonb('낚시'::text)) else node end order by ord)
  from jsonb_array_elements(s.blueprint->'document'->'layout') with ordinality a(node,ord))
 ||coalesce((select jsonb_agg(to_jsonb(addition) order by addition.id) from(values
  ('portal~owned:page:/voyage-bets',12,13),
  ('portal~owned:page:/fishing-records',20,25),
  ('portal~owned:page:/flea-market',25,16),
  ('portal~owned:page:/item-collection',31,23)
 ) addition(id,x,y) where not exists(select 1 from jsonb_array_elements(s.blueprint->'document'->'layout') existing where existing->>'id'=addition.id)),'[]'::jsonb))
where s.id='default';
notify pgrst, 'reload schema';
commit;
