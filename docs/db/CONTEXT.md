# 로컬 DB 컨텍스트 (자동 생성)

원격 DB의 현재 상태가 아닙니다. migrations 전체를 PGlite에 재생한 기대 상태입니다.

- migration SHA-256: `4cccb877e1d5ba819d102a7f32d364e9d8441932b2acc288bd2613ee75321cac`
- migrations: 20261016015506_legacy_baseline.sql
- 전체 정의·컬럼·권한·정책: [local-schema.json](local-schema.json)
- 원격 상태와 전환 절차: [DB 관리](../systems/database-management.md)

## 테이블

| 테이블 | RLS | 컬럼 |
| --- | --- | --- |
| app_private.gold_settings | true | id: boolean, test_charge_enabled: boolean |
| app_private.region_settings | true | id: boolean, test_lock_controls: boolean |
| public.aquarium_backgrounds | true | id: text, name: text, price: integer, image_path: text |
| public.aquarium_tanks | true | id: uuid, user_id: uuid, name: text, background_id: text, is_default: boolean, created_at: timestamp with time zone |
| public.collectible_gifts | true | id: uuid, sender_id: uuid?, recipient_id: uuid?, sender_name: text, recipient_name: text, operation_id: uuid, collectible_ids: uuid[], species: jsonb, quantity: integer, message: text, status: text, reaction: text?, created_at: timestamp with time zone, claimed_at: timestamp with time zone?, reacted_at: timestamp with time zone? |
| public.collectible_habitats | true | species_id: text, region_id: text |
| public.collectible_species | true | id: text, kind: collectible_kind, name: text, description: text, swim_y_min: numeric?, swim_y_max: numeric?, speed: numeric, size: integer, rarity: game_rarity, thumbnail_path: text, sell_price: integer, sprite_sheet_path: text?, native_region_id: text?, is_native: boolean?, movement_type: text, flip_with_direction: boolean, travel_direction: text |
| public.fishing_attempts | true | user_id: uuid, operation_id: uuid, region_id: text, bait_id: text, rarity: game_rarity?, created_at: timestamp with time zone, collectible_id: uuid? |
| public.fishing_baits | true | id: text, name: text, description: text, price: integer?, image_path: text, sort_order: integer, common_bp: integer, rare_bp: integer, epic_bp: integer, mythic_bp: integer, failure_bp: integer, effect_kind: text, effect_description: text |
| public.friend_requests | true | id: uuid, sender_id: uuid, recipient_id: uuid, status: text, created_at: timestamp with time zone, updated_at: timestamp with time zone |
| public.gold_transactions | true | user_id: uuid, operation_id: uuid, action: text, item_id: text?, delta: integer, created_at: timestamp with time zone |
| public.notifications | true | id: uuid, recipient_id: uuid, actor_id: uuid?, category: text, kind: text, title: text, body: text, request_id: uuid?, read_at: timestamp with time zone?, created_at: timestamp with time zone, gift_id: uuid? |
| public.owned_aquarium_backgrounds | true | user_id: uuid, background_id: text, purchased_at: timestamp with time zone |
| public.player_aquariums | true | user_id: uuid, background_id: text |
| public.player_collectibles | true | id: uuid, user_id: uuid, species_id: text, tank_id: uuid?, map_region_id: text?, animation_seed: integer, position_x: numeric?, position_y: numeric?, acquired_at: timestamp with time zone, sold_at: timestamp with time zone?, escrow_gift_id: uuid?, rotation: numeric, scale: numeric |
| public.player_discoveries | true | user_id: uuid, species_id: text, discovered_at: timestamp with time zone |
| public.player_map_fragments | true | user_id: uuid, region_id: text, acquired_at: timestamp with time zone |
| public.player_navigation | true | user_id: uuid, region_id: text |
| public.player_profiles | true | id: uuid, nickname: text, friend_code: text, created_at: timestamp with time zone, avatar_path: text? |
| public.player_wallets | true | user_id: uuid, gold: integer, inventory: jsonb, test_claimed: boolean, updated_at: timestamp with time zone |
| public.regions | true | id: text, name: text, description: text, rarity: game_rarity, sort_order: integer, image_path: text, requires_map_fragment: boolean |

## 함수 (최종 정의)

아래 시그니처로 local-schema.json의 functions에서 본문을 찾습니다. 과거 SQL을 역순으로 추측하지 않습니다.

| 함수 | 인자 | SECURITY DEFINER |
| --- | --- | --- |
| app_private.apply_pongdang_native_region |  | false |
| app_private.aquarium_background | p_id text, p_action text, p_operation_id uuid | true |
| app_private.aquarium_state |  | true |
| app_private.arrange_decoration | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric | true |
| app_private.buy_aquarium_tank | p_operation_id uuid | true |
| app_private.buy_fishing_bait | p_bait_id text, p_operation_id uuid | true |
| app_private.cast_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | true |
| app_private.check_native_collectible_habitats |  | false |
| app_private.claim_collectible_gift | p_gift_id uuid | true |
| app_private.collectible_storage | p_offset integer, p_query text, p_kind text | true |
| app_private.collection_state |  | true |
| app_private.default_collectible_movement |  | false |
| app_private.find_player_by_code | p_code text | true |
| app_private.fishing_state |  | true |
| app_private.get_gold_wallet |  | true |
| app_private.gift_detail | p_gift_id uuid | true |
| app_private.gift_mailbox | p_direction text, p_offset integer | true |
| app_private.lock_collectible_habitat_species |  | false |
| app_private.manage_aquarium_tank | p_tank_id uuid, p_action text, p_value text | true |
| app_private.move_collectibles | p_collectible_ids uuid[], p_tank_id uuid | true |
| app_private.owned_collectibles |  | true |
| app_private.pick_regional_collectible | p_region_id text, p_rarity game_rarity, p_decoration boolean, p_map_roll integer | false |
| app_private.place_collectible | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric | true |
| app_private.react_to_collectible_gift | p_gift_id uuid, p_reaction text | true |
| app_private.region_map |  | true |
| app_private.regional_bait_odds | p_bait_id text, p_region_id text | false |
| app_private.remove_friend | p_request_id uuid | true |
| app_private.resolve_fishing | p_bait_id text, p_roll integer | false |
| app_private.resolve_regional_fishing | p_bait_id text, p_region_id text, p_roll integer | false |
| app_private.respond_friend_request | p_request_id uuid, p_action text | true |
| app_private.sell_collectibles | p_collectible_ids uuid[], p_operation_id uuid | true |
| app_private.send_collectible_gift | p_recipient_id uuid, p_collectible_ids uuid[], p_message text, p_operation_id uuid | true |
| app_private.send_friend_request | p_code text | true |
| app_private.set_player_avatar | p_path text | true |
| app_private.set_region_test_lock | p_region_id text, p_locked boolean | true |
| app_private.species_payload | p_species_id text, p_map_region_id text | false |
| app_private.sync_player_profile |  | true |
| app_private.trade_gold | p_operation_id uuid, p_action text, p_item_id text | true |
| app_private.travel_region | p_region_id text | true |
| public.aquarium_background | p_id text, p_action text, p_operation_id uuid | false |
| public.aquarium_state |  | false |
| public.arrange_decoration | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric | false |
| public.buy_aquarium_tank | p_operation_id uuid | false |
| public.buy_fishing_bait | p_bait_id text, p_operation_id uuid | false |
| public.cast_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | false |
| public.claim_collectible_gift | p_gift_id uuid | false |
| public.collectible_storage | p_offset integer, p_query text, p_kind text | false |
| public.collection_state |  | false |
| public.find_player_by_code | p_code text | false |
| public.fishing_state |  | false |
| public.get_gold_wallet |  | false |
| public.gift_detail | p_gift_id uuid | false |
| public.gift_mailbox | p_direction text, p_offset integer | false |
| public.manage_aquarium_tank | p_tank_id uuid, p_action text, p_value text | false |
| public.move_collectibles | p_collectible_ids uuid[], p_tank_id uuid | false |
| public.place_collectible | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric | false |
| public.react_to_collectible_gift | p_gift_id uuid, p_reaction text | false |
| public.region_map |  | false |
| public.remove_friend | p_request_id uuid | false |
| public.respond_friend_request | p_request_id uuid, p_action text | false |
| public.sell_collectibles | p_collectible_ids uuid[], p_operation_id uuid | false |
| public.send_collectible_gift | p_recipient_id uuid, p_collectible_ids uuid[], p_message text, p_operation_id uuid | false |
| public.send_friend_request | p_code text | false |
| public.set_player_avatar | p_path text | false |
| public.set_region_test_lock | p_region_id text, p_locked boolean | false |
| public.sync_player_profile |  | false |
| public.trade_gold | p_operation_id uuid, p_action text, p_item_id text | false |
| public.travel_region | p_region_id text | false |
