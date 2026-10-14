-- Read-only post-install verification in Supabase SQL Editor.
select tablename, rowsecurity from pg_tables where schemaname='public'
  and tablename in ('player_profiles','friend_requests','notifications');
select schemaname,tablename from pg_publication_tables where pubname='supabase_realtime';
select tablename,policyname,cmd from pg_policies where schemaname='public'
  and tablename in ('player_profiles','friend_requests','notifications');
select routine_schema,routine_name,security_type from information_schema.routines
  where routine_schema in ('public','app_private') and routine_name in
  ('sync_player_profile','find_player_by_code','send_friend_request','respond_friend_request','remove_friend');
select
  has_table_privilege('authenticated','public.friend_requests','INSERT') as client_can_insert_request,
  has_table_privilege('authenticated','public.notifications','INSERT') as client_can_forge_notification,
  has_column_privilege('authenticated','public.notifications','title','UPDATE') as client_can_edit_title,
  has_column_privilege('authenticated','public.notifications','read_at','UPDATE') as client_can_mark_read;
-- Expected: false, false, false, true.
-- After 06-avatars: bucket configuration and protected avatar RPC.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='avatars';
select routine_schema,routine_name,security_type from information_schema.routines
  where routine_name='set_player_avatar' and routine_schema in ('public','app_private');

-- Gold setup (after 08): expected RLS true; client writes false.
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('player_wallets','gold_transactions');
select has_table_privilege('authenticated','public.player_wallets','UPDATE') as can_change_gold,
 has_table_privilege('authenticated','public.gold_transactions','INSERT') as can_forge_trade,
 has_function_privilege('anon','public.trade_gold(uuid,text,text)','EXECUTE') as anon_can_trade;

-- After 10: expected true, false, false.
select rowsecurity from pg_tables where schemaname='public' and tablename='aquarium_tanks';
select has_table_privilege('authenticated','public.aquarium_tanks','UPDATE') as can_forge_tank,
 has_function_privilege('anon','public.buy_aquarium_tank(uuid)','EXECUTE') as anon_can_buy;

-- After 11: expected RLS true, write privileges false.
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('regions','player_map_fragments','player_navigation');
select has_table_privilege('authenticated','public.player_map_fragments','INSERT') as can_forge_fragment,
 has_table_privilege('authenticated','public.player_navigation','UPDATE') as can_skip_unlock;
select name,rarity,sort_order from public.regions order by sort_order;

-- After 12: expected false for both.
select has_function_privilege('anon','public.set_region_test_lock(text,boolean)','EXECUTE') as anon_can_toggle,
 has_table_privilege('authenticated','app_private.region_settings','UPDATE') as client_can_enable_test_controls;

-- After 13: probabilities sum to 10000; direct write privileges false.
select id,price,common_bp+rare_bp+epic_bp+mythic_bp+failure_bp as total_bp from public.fishing_baits order by sort_order;
select has_table_privilege('authenticated','public.fishing_attempts','INSERT') as can_forge_catch,
 has_table_privilege('authenticated','public.player_collectibles','UPDATE') as can_forge_inventory,
 has_function_privilege('authenticated','app_private.resolve_fishing(text,integer)','EXECUTE') as can_choose_roll;

-- After 14: only bait has a price; bait_magnet is decoration, others fish.
select id,name,price,effect_kind from public.fishing_baits order by sort_order;

-- After 15: seven archetypes; personal writes false; legacy counters absent.
select kind,count(*) from public.collectible_species group by kind;
select to_regclass('public.player_catch_counts') as retired_counter_table;
select has_table_privilege('authenticated','public.player_collectibles','INSERT') as can_forge_collectible;

-- After 16: 7 rows; fish have one sheet; all non-fish rarity common.
select id,kind,rarity,sprite_sheet_path,thumbnail_path from public.collectible_species order by kind,rarity;
