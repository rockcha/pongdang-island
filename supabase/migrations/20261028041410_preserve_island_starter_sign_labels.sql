begin;
-- A sign in storage has no placement record. Keep its text in the owned sign
-- labels so taking it out does not fall back to an empty/default caption.
update app_private.player_islands s
set document=jsonb_set(s.document,'{signLabels}',coalesce(s.document->'signLabels','{}')||jsonb_build_object('wood-arrow-sign~aquarium-welcome',coalesce(
 (select p->>'label' from jsonb_array_elements(s.document->'layout')p where p->>'id'='wood-arrow-sign~aquarium-welcome' and p?'label' limit 1),
 (select p->>'label' from public.island_starters c cross join lateral jsonb_array_elements(c.blueprint#>'{document,layout}')p where c.id='default' and p->>'id'='wood-arrow-sign~starter-aquarium')
))),revision=s.revision+1,updated_at=now()
where exists(select 1 from app_private.player_island_items i where i.user_id=s.user_id and i.id='wood-arrow-sign~aquarium-welcome' and i.item_id='wood-arrow-sign')
 and not(coalesce(s.document->'signLabels','{}')?'wood-arrow-sign~aquarium-welcome');
commit;
