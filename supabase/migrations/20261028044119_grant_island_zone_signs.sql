begin;
-- Existing islands keep their terrain, layouts, paid purchases and wallets.
-- Give only the missing free category signs; the recommended layout is opt-in.
lock table app_private.player_islands in share row exclusive mode;
do $signs$
declare v_profile app_private.player_islands;v_sign jsonb;v_id text;v_label text;v_labels jsonb;v_changed boolean;
begin
 for v_profile in select * from app_private.player_islands order by user_id for update loop
  v_labels:=coalesce(v_profile.document->'signLabels','{}');v_changed:=false;
  for v_sign in select p from public.island_starters c cross join lateral jsonb_array_elements(c.blueprint#>'{document,layout}')p where c.id='default' and p->>'id' like 'island-name-sign~zone-%' loop
   v_id:=v_sign->>'id';v_label:=v_sign->>'label';
   if exists(select 1 from app_private.player_island_items i where i.user_id=v_profile.user_id and i.item_id='island-name-sign' and i.sale_value=0 and (i.id=v_id or v_labels->>i.id=v_label or exists(select 1 from jsonb_array_elements(v_profile.document->'layout')p where p->>'id'=i.id and p->>'label'=v_label))) then continue;end if;
   insert into app_private.player_island_items(user_id,id,item_id,sale_value) values(v_profile.user_id,v_id,'island-name-sign',0) on conflict do nothing;
   v_labels:=v_labels||jsonb_build_object(v_id,v_label);v_changed:=true;
  end loop;
  if v_changed then update app_private.player_islands set document=jsonb_set(document,'{signLabels}',v_labels),revision=revision+1,updated_at=now() where user_id=v_profile.user_id;end if;
 end loop;
end $signs$;
commit;
