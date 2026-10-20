# 로컬 DB 컨텍스트 (자동 생성)

원격 DB의 현재 상태가 아닙니다. migrations 전체를 PGlite에 재생한 기대 상태입니다.

- migration SHA-256: `2fd8e42447b919b5b881fa6ead3145b3ed772f98b2c3f9d173caf6ee00c33900`
- migrations: 20261016015506_legacy_baseline.sql, 20261016074241_fishing_rod_inventory.sql, 20261016083949_attendance_streak.sql, 20261016092320_add_minimal_aquarium_backgrounds.sql, 20261016093649_add_seven_aquarium_themes.sql, 20261016095304_add_atmospheric_aquarium_backgrounds.sql, 20261016101729_shadow_guessing_arcade.sql, 20261016103215_shadow_score_cap.sql, 20261016105544_memory_card_arcade.sql, 20261016114524_shadow_eight_seconds.sql, 20261016120119_primal_island_catalog.sql, 20261016124501_odd_even_arcade.sql, 20261016131521_odd_even_rank_friends.sql, 20261016151410_attendance_28_day_sheet.sql, 20261016155535_bluegrove_region_catalog.sql, 20261016162605_exchange_escrow_market.sql, 20261016164527_exchange_sales_only.sql, 20261016180116_auction_gift_escrow.sql, 20261016181632_notice_board.sql, 20261016231528_notice_notifications.sql, 20261016232525_notice_delete_and_auto_read.sql, 20261017002343_retire_dawn_arowana.sql, 20261017003922_fixed_atlantean_sentinel.sql, 20261017005949_bluegrove_large_species.sql, 20261017045143_primal_prehistoric_species.sql, 20261017052918_primal_exclusive_fish.sql, 20261017054146_map_shop_routes.sql, 20261017054247_map_shop_catalog.sql, 20261017055506_correct_starruins_map_image.sql, 20261017055827_reorder_map_routes.sql, 20261017060959_whitenight_region_catalog.sql, 20261017061438_place_whitenight_after_mistmoon.sql, 20261017064137_whitenight_native_species.sql, 20261017074923_friend_aquarium_visits_feeding.sql, 20261017080527_friend_aquarium_cleaning.sql, 20261017082326_cloudferry_region_catalog.sql, 20261017085502_cloudferry_native_species.sql, 20261017093723_scrap_isle_region_and_species.sql, 20261017201704_allow_rare_collectible_trash.sql, 20261017201709_pongdang_natives_and_shared_mythics.sql, 20261018030010_shared_sea_creatures.sql, 20261018044936_dreamabyss_violet_deepsea_catalog.sql, 20261018070101_global_fishing_primary_habitats.sql, 20261018071445_equipped_rod_habitat_weights.sql, 20261018075922_fishing_forty_percent_safe_bait.sql, 20261018092426_suggestion_board.sql, 20261018094132_bug_report_board.sql, 20261018095755_special_bait_catalog.sql, 20261018095800_special_bait_effects.sql, 20261018101003_forbidden_star_success_bonus.sql, 20261018105905_shell_savings.sql, 20261018111616_savings_amount_limits.sql, 20261018112003_scrap_island_seven_creatures.sql, 20261018122329_mukhyang_region_and_brush_rod.sql, 20261018122353_mukhyang_brush_rod.sql, 20261018131214_mukhyang_native_creatures.sql, 20261018134143_rebalance_collectible_sizes.sql, 20261018134256_collectible_size_catalog.sql, 20261018134919_species_proportion_sizes.sql, 20261018142534_fishing_vessel_expeditions.sql, 20261018143528_expedition_failures_and_return_notifications.sql, 20261018161320_aquarium_tank_price_350.sql, 20261018163311_special_baits_sixty_percent_success.sql, 20261018170746_daily_weekly_quests.sql, 20261018171951_player_titles.sql, 20261018173739_signup_title_and_welcome_gift.sql, 20261018174001_success_effect_baits_sixty_percent.sql, 20261018183011_rebalance_rod_effects_and_quest_conditions.sql, 20261018183017_grubby_magnet_price_40.sql, 20261018184245_rebalance_fishing_vessel_bonuses.sql, 20261018184531_rebalance_region_map_prices.sql, 20261018232502_automatic_signup_gold.sql, 20261018234630_rebalance_purchasable_baits.sql, 20261018234911_lower_abyss_lodestone_price.sql, 20261018235409_seven_cozy_aquarium_themes.sql, 20261019000301_eight_story_aquarium_themes.sql, 20261019000553_aquarium_theme_tiers.sql, 20261019001110_six_tier_aquarium_themes.sql, 20261019002347_rebalance_aquarium_theme_tier_prices.sql, 20261019003406_twelve_marine_aquarium_themes.sql, 20261019003842_enrich_red_fan_coral_background.sql, 20261019004514_simplify_bait_effects_and_worm_success.sql, 20261019004931_calm_rod_price_750.sql, 20261019012808_friend_expedition_tailwind.sql, 20261019015603_distinguish_friend_expedition_returned.sql, 20261019015918_friend_expedition_visits.sql, 20261019020653_expedition_aquarium_growth_quests.sql, 20261019022758_rebalance_growth_quests_tailwind_titles.sql, 20261019023121_dinghy_duration_forty_minutes.sql, 20261019024254_enlarge_small_epic_creatures.sql, 20261019024703_rebalance_fish_rarity_sell_prices.sql, 20261019031038_siren_strait_catalog.sql, 20261019041637_progressive_fishing_rod_prices.sql, 20261019041853_halve_regional_fishing_rod_prices.sql, 20261019063956_music_library.sql, 20261019081506_harbor_idle_fishing.sql, 20261019085512_harbor_fleet_and_fuel_rewards.sql, 20261019091213_harbor_vessel_catalog.sql, 20261019093552_attendance_alternating_gold_fuel.sql, 20261019094406_attendance_bait_only_milestones.sql, 20261019105623_weekly_quest_reward_rebalance.sql, 20261019105951_fish_traps_fuel_limit_and_bait_chances.sql, 20261019110723_harbor_voyage_regions.sql, 20261019120009_rebalance_haeneomi_trawler.sql, 20261019120219_fishing_drone_and_free_raft.sql, 20261019120236_fishing_drone_catalog.sql, 20261019121721_specialized_harbor_vessels.sql, 20261019121735_specialized_harbor_catalog.sql, 20261019122848_random_range_fishing_boats.sql, 20261019123400_shrimp_bait_harbor_support.sql, 20261019123413_raft_nerf_and_premium_boats.sql, 20261019124040_conch_harbor_support.sql, 20261019124055_conch_explorer_catalog.sql, 20261019124757_rebalance_three_region_map_prices.sql, 20261019125011_unify_selected_rod_prices_800.sql, 20261019125934_rare_secret_titles.sql, 20261019133442_exchange_listing_titles.sql, 20261019134420_exchange_seller_avatar.sql, 20261019135517_exchange_fuel_trading.sql, 20261019135931_region_registration_dates.sql, 20261019152108_welcome_starter_bait.sql, 20261019163843_operator_gold_gift_support.sql, 20261019170546_operator_gold_second_supply.sql, 20261019174616_weekly_arcade_rank_rewards.sql, 20261019180156_operator_worm_bait_gift.sql, 20261019190142_rebalance_safe_bait_and_small_epics.sql, 20261019192547_reduce_foreign_native_weights.sql, 20261019193651_habitat_group_selection.sql, 20261019201440_pongdang_mascot_native_species.sql, 20261019231229_giseong_october_catch_event.sql, 20261019232722_include_trap_and_vessel_giseong_rewards.sql, 20261020001446_exchange_listing_discussion.sql, 20261020003356_edit_exchange_listing_title.sql, 20261020003941_exchange_parcel_display.sql
- 전체 정의·컬럼·권한·정책: [local-schema.json](local-schema.json)
- 원격 상태와 전환 절차: [DB 관리](../systems/database-management.md)

## 테이블

| 테이블 | RLS | 컬럼 |
| --- | --- | --- |
| app_private.aquarium_clean_notices | true | visitor_id: uuid, owner_id: uuid, notice_day: date |
| app_private.aquarium_feed_notices | true | visitor_id: uuid, owner_id: uuid, notice_day: date |
| app_private.arcade_reward_settings | true | id: boolean, first_week: date |
| app_private.arcade_weekly_batches | true | game: text, week_start: date, settled_at: timestamp with time zone, players: integer, total_gold: bigint |
| app_private.arcade_weekly_rewards | true | game: text, week_start: date, user_id: uuid, rank: bigint, run_id: uuid, gold: integer, gift_id: uuid |
| app_private.expedition_boosts | true | id: uuid, expedition_id: uuid, helper_id: uuid, nickname: text, avatar_path: text?, minutes: integer, created_at: timestamp with time zone |
| app_private.expedition_operations | true | user_id: uuid, operation_id: uuid, signature: jsonb, receipt: jsonb |
| app_private.expedition_settings | true | id: boolean, instant_return_enabled: boolean |
| app_private.gold_settings | true | id: boolean, test_charge_enabled: boolean |
| app_private.harbor_operations | true | user_id: uuid, operation_id: uuid, signature: jsonb, receipt: jsonb, created_at: timestamp with time zone |
| app_private.memory_game_boards | true | run_id: uuid, deck: text[], matched: integer[], first_card: integer?, second_card: integer?, clear_at: timestamp with time zone? |
| app_private.notice_operators | true | user_id: uuid |
| app_private.prepared_fishing_casts | true | user_id: uuid, operation_id: uuid, region_id: text, bait_id: text, eligible: boolean, species_id: text?, map_region_id: text?, rarity: game_rarity, snapshot: jsonb?, wait_seconds: numeric, failure_at: numeric, failure_reason: text, created_at: timestamp with time zone, expires_at: timestamp with time zone, finished_at: timestamp with time zone?, result: jsonb?, last_bait: boolean |
| app_private.quest_claims | true | user_id: uuid, period_kind: text, period_start: date, quest_id: text, gold: integer, claimed_at: timestamp with time zone, fuel: integer |
| app_private.region_settings | true | id: boolean, test_lock_controls: boolean |
| app_private.savings_operations | true | user_id: uuid, operation_id: uuid, account_id: uuid, signature: jsonb, receipt: jsonb, created_at: timestamp with time zone |
| app_private.shadow_game_rounds | true | id: uuid, run_id: uuid, number: integer, target_id: text, target_name: text, image_path: text, options: jsonb, deadline: timestamp with time zone, answered_at: timestamp with time zone?, correct: boolean?, timed_out: boolean? |
| app_private.title_acquisition_evidence | true | collectible_id: uuid, user_id: uuid, species_id: text, first_discovery: boolean, last_mythic_discovery: boolean, native_collection_complete: boolean |
| app_private.title_dirty | true | user_id: uuid |
| app_private.title_fishing_log | true | id: bigint, user_id: uuid, event_key: text, occurred_at: timestamp with time zone, source: text, kind: text?, rarity: text?, species_id: text?, collectible_id: uuid?, region_id: text?, bait_id: text?, vessel_id: text?, batch_id: text?, last_bait: boolean |
| public.aquarium_backgrounds | true | id: text, name: text, price: integer, image_path: text, tier: text |
| public.aquarium_cleanings | true | id: uuid, visitor_id: uuid, owner_id: uuid, tank_id: uuid?, operation_id: uuid, strokes: integer, created_at: timestamp with time zone, completed_at: timestamp with time zone? |
| public.aquarium_feedings | true | id: uuid, visitor_id: uuid, owner_id: uuid, tank_id: uuid?, operation_id: uuid, clicks: integer, created_at: timestamp with time zone, completed_at: timestamp with time zone? |
| public.aquarium_tanks | true | id: uuid, user_id: uuid, name: text, background_id: text, is_default: boolean, created_at: timestamp with time zone |
| public.attendance_claims | true | user_id: uuid, claim_date: date, operation_id: uuid, streak: integer, sheet_day: integer, gold: integer, bait_id: text?, fuel: integer |
| public.auction_bids | true | id: uuid, auction_id: uuid, bidder_id: uuid?, operation_id: uuid, amount: integer, created_at: timestamp with time zone |
| public.auction_listings | true | id: uuid, owner_id: uuid?, owner_name: text, operation_id: uuid, title: text, description: text, offer: jsonb, escrow_gift_id: uuid, minimum_price: integer, duration_days: integer, highest_amount: integer, highest_bidder: uuid?, highest_gift_id: uuid?, status: text, created_at: timestamp with time zone, ends_at: timestamp with time zone, closed_at: timestamp with time zone? |
| public.bug_reports | true | id: uuid, author_id: uuid, author_name: text, title: text, body: text, created_at: timestamp with time zone, confirmed_at: timestamp with time zone?, confirmed_by: uuid?, reward: jsonb, updated_at: timestamp with time zone |
| public.collectible_gifts | true | id: uuid, sender_id: uuid?, recipient_id: uuid?, sender_name: text, recipient_name: text, operation_id: uuid, collectible_ids: uuid[], species: jsonb, quantity: integer, message: text, status: text, reaction: text?, created_at: timestamp with time zone, claimed_at: timestamp with time zone?, reacted_at: timestamp with time zone?, source: text, exchange_hold: boolean, reward_kind: text, reward_id: text? |
| public.collectible_habitats | true | species_id: text, region_id: text |
| public.collectible_species | true | id: text, kind: collectible_kind, name: text, description: text, swim_y_min: numeric?, swim_y_max: numeric?, speed: numeric, size: integer, rarity: game_rarity, thumbnail_path: text, sell_price: integer, sprite_sheet_path: text?, native_region_id: text?, is_native: boolean?, movement_type: text, flip_with_direction: boolean, travel_direction: text |
| public.exchange_listing_comments | true | id: uuid, listing_id: uuid, user_id: uuid, operation_id: uuid, body: text, created_at: timestamp with time zone |
| public.exchange_listing_likes | true | listing_id: uuid, user_id: uuid, created_at: timestamp with time zone |
| public.exchange_listings | true | id: uuid, owner_id: uuid, owner_name: text, side: text, operation_id: uuid, offer: jsonb, wanted: jsonb, escrow_gift_id: uuid, status: text, taker_id: uuid?, created_at: timestamp with time zone, closed_at: timestamp with time zone?, title: text? |
| public.fishing_attempts | true | user_id: uuid, operation_id: uuid, region_id: text, bait_id: text, rarity: game_rarity?, created_at: timestamp with time zone, collectible_id: uuid? |
| public.fishing_baits | true | id: text, name: text, description: text, price: integer?, image_path: text, sort_order: integer, common_bp: integer, rare_bp: integer, epic_bp: integer, mythic_bp: integer, failure_bp: integer, effect_kind: text, effect_description: text |
| public.fishing_expeditions | true | id: uuid, user_id: uuid, vessel_id: text, region_id: text, cargo: jsonb, vessel_snapshot: jsonb, departed_at: timestamp with time zone, returns_at: timestamp with time zone, claimed_at: timestamp with time zone?, result: jsonb?, notified_at: timestamp with time zone? |
| public.fishing_rods | true | id: text, name: text, price: integer, region_id: text?, failure_reduction_bp: integer, native_bonus_bp: integer |
| public.fishing_vessels | true | id: text, name: text, price: integer, duration_minutes: integer, min_baits: integer, max_baits: integer, bonus_kind: text, bonus_count: integer, bonus_description: text, sort_order: integer, bonus_basic_count: integer, failure_reduction_bp: integer |
| public.friend_requests | true | id: uuid, sender_id: uuid, recipient_id: uuid, status: text, created_at: timestamp with time zone, updated_at: timestamp with time zone |
| public.gold_transactions | true | user_id: uuid, operation_id: uuid, action: text, item_id: text?, delta: integer, created_at: timestamp with time zone |
| public.harbor_boats | true | id: uuid, user_id: uuid, vessel_id: text, instance_no: integer, dock_slot: integer?, purchased_at: timestamp with time zone |
| public.harbor_vessels | true | id: text, name: text, price: integer, duration_minutes: integer, fuel_cost: integer, fishing_count: integer, sprite_path: text, sort_order: integer, fishing_count_max: integer?, catch_bait_id: text, native_bonus: boolean |
| public.harbor_voyages | true | id: uuid, user_id: uuid, vessel_id: text, vessel_snapshot: jsonb, departed_at: timestamp with time zone, returns_at: timestamp with time zone, arrival_seen_at: timestamp with time zone?, claimed_at: timestamp with time zone?, result: jsonb?, boat_id: uuid, region_id: text |
| public.memory_game_runs | true | id: uuid, user_id: uuid, operation_id: uuid, created_at: timestamp with time zone, timer_started_at: timestamp with time zone?, finished_at: timestamp with time zone?, abandoned_at: timestamp with time zone?, elapsed_ms: bigint?, moves: integer |
| public.music_defaults | true | video_id: text, title: text, sort_order: integer |
| public.music_libraries | true | user_id: uuid, created_at: timestamp with time zone |
| public.music_tracks | true | user_id: uuid, video_id: text, title: text, custom_name: text, created_at: timestamp with time zone |
| public.notices | true | id: uuid, category: text, title: text, body: text, images: text[], status: text, pinned: boolean, starts_at: timestamp with time zone?, ends_at: timestamp with time zone?, author_id: uuid?, created_at: timestamp with time zone, updated_at: timestamp with time zone, published_at: timestamp with time zone?, revision: integer, notified_at: timestamp with time zone? |
| public.notifications | true | id: uuid, recipient_id: uuid, actor_id: uuid?, category: text, kind: text, title: text, body: text, request_id: uuid?, read_at: timestamp with time zone?, created_at: timestamp with time zone, gift_id: uuid?, notice_id: uuid?, expedition_id: uuid?, achievement_id: text?, expedition_boost_id: uuid? |
| public.odd_even_runs | true | id: uuid, user_id: uuid, operation_id: uuid, payout_operation_id: uuid, stake: integer, wins: integer, round: integer, stage: text, pearls: integer?, choice: text?, started_at: timestamp with time zone, finished_at: timestamp with time zone? |
| public.owned_aquarium_backgrounds | true | user_id: uuid, background_id: text, purchased_at: timestamp with time zone |
| public.player_aquariums | true | user_id: uuid, background_id: text |
| public.player_attendance | true | user_id: uuid, last_claim_date: date?, streak: integer, completed_sheets: integer, sheet_streak_offset: integer |
| public.player_collectibles | true | id: uuid, user_id: uuid, species_id: text, tank_id: uuid?, map_region_id: text?, animation_seed: integer, position_x: numeric?, position_y: numeric?, acquired_at: timestamp with time zone, sold_at: timestamp with time zone?, escrow_gift_id: uuid?, rotation: numeric, scale: numeric |
| public.player_discoveries | true | user_id: uuid, species_id: text, discovered_at: timestamp with time zone |
| public.player_fishing_rods | true | user_id: uuid, rod_id: text, acquired_at: timestamp with time zone |
| public.player_fishing_vessels | true | user_id: uuid, vessel_id: text, purchased_at: timestamp with time zone |
| public.player_harbor_vessels | true | user_id: uuid, vessel_id: text, purchased_at: timestamp with time zone |
| public.player_map_fragments | true | user_id: uuid, region_id: text, acquired_at: timestamp with time zone |
| public.player_navigation | true | user_id: uuid, region_id: text |
| public.player_profiles | true | id: uuid, nickname: text, friend_code: text, created_at: timestamp with time zone, avatar_path: text?, equipped_title: text? |
| public.player_rod_loadouts | true | user_id: uuid, equipped_rod_id: text |
| public.player_titles | true | user_id: uuid, title_id: text, earned_at: timestamp with time zone |
| public.player_wallets | true | user_id: uuid, gold: integer, inventory: jsonb, test_claimed: boolean, updated_at: timestamp with time zone |
| public.region_maps | true | region_id: text, price: integer, thumbnail_path: text |
| public.regions | true | id: text, name: text, description: text, rarity: game_rarity, sort_order: integer, image_path: text, requires_map_fragment: boolean, created_at: timestamp with time zone |
| public.shadow_game_runs | true | id: uuid, user_id: uuid, operation_id: uuid, score: integer, lives: integer, started_at: timestamp with time zone, finished_at: timestamp with time zone? |
| public.shell_savings | true | id: uuid, user_id: uuid, term_days: integer, daily_amount: integer, paid_count: integer, started_at: timestamp with time zone, closed_at: timestamp with time zone?, close_kind: text?, payout: integer? |
| public.suggestion_posts | true | id: uuid, author_id: uuid, author_name: text, title: text, body: text, friends_only: boolean, created_at: timestamp with time zone, adopted_at: timestamp with time zone?, adopted_by: uuid?, reward: jsonb, updated_at: timestamp with time zone |
| public.title_catalog | true | id: text, name: text, tier: integer, category: text, description: text, metric: text, target: integer, extra_metric: text?, extra_target: integer?, sort_order: integer |

## 함수 (최종 정의)

아래 시그니처로 local-schema.json의 functions에서 본문을 찾습니다. 과거 SQL을 역순으로 추측하지 않습니다.

| 함수 | 인자 | SECURITY DEFINER |
| --- | --- | --- |
| app_private.add_exchange_listing_comment | p_listing_id uuid, p_body text, p_operation_id uuid | true |
| app_private.adopt_suggestion | p_id uuid | true |
| app_private.apply_pongdang_native_region |  | false |
| app_private.aquarium_background | p_id text, p_action text, p_operation_id uuid | true |
| app_private.aquarium_state |  | true |
| app_private.arcade_weekly_gold | p_rank bigint | false |
| app_private.arcade_weekly_leaderboard | p_game text, p_offset integer | true |
| app_private.arcade_weekly_rankings | p_game text, p_week_start date | false |
| app_private.arrange_decoration | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric | true |
| app_private.attendance_state |  | true |
| app_private.auction_bid | p_id uuid, p_amount integer, p_operation_id uuid | true |
| app_private.auction_cancel | p_id uuid | true |
| app_private.auction_post | p_kind text, p_item_id text, p_quantity integer, p_title text, p_description text, p_minimum_price integer, p_days integer, p_operation_id uuid | true |
| app_private.auction_settle | p_id uuid | false |
| app_private.auction_settle_due |  | true |
| app_private.auction_state | p_tab text, p_query text, p_offset integer | true |
| app_private.award_title | p_user uuid, p_title text | true |
| app_private.base_quest_period | p_kind text, p_now timestamp with time zone | true |
| app_private.boost_friend_expedition | p_expedition_id uuid | true |
| app_private.buy_aquarium_tank | p_operation_id uuid | true |
| app_private.buy_fishing_bait | p_bait_id text, p_operation_id uuid | true |
| app_private.buy_region_map | p_region_id text, p_operation_id uuid | true |
| app_private.capture_title_acquisition |  | true |
| app_private.cast_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | true |
| app_private.check_native_collectible_habitats |  | false |
| app_private.claim_attendance | p_day date | true |
| app_private.claim_collectible_gift | p_gift_id uuid | true |
| app_private.claim_quest | p_kind text, p_start date, p_quest_id text | true |
| app_private.clean_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | true |
| app_private.collectible_habitat_weight | p_primary_region text, p_region text | false |
| app_private.collectible_storage | p_offset integer, p_query text, p_kind text | true |
| app_private.collection_state |  | true |
| app_private.confirm_bug_report | p_id uuid | true |
| app_private.default_collectible_movement |  | false |
| app_private.delete_exchange_listing_comment | p_comment_id uuid | true |
| app_private.deliver_notice_publication |  | true |
| app_private.edit_exchange_listing_title | p_listing_id uuid, p_title text | true |
| app_private.equip_fishing_rod | p_rod_id text | true |
| app_private.equip_title | p_title text | true |
| app_private.exchange_action | p_listing_id uuid, p_action text | true |
| app_private.exchange_asset | p_kind text, p_id text, p_quantity integer | false |
| app_private.exchange_deliver | p_gift uuid, p_recipient uuid, p_message text | false |
| app_private.exchange_inventory |  | true |
| app_private.exchange_listing_detail | p_listing_id uuid, p_offset integer | true |
| app_private.exchange_post | p_side text, p_offer_kind text, p_offer_id text, p_offer_quantity integer, p_wanted_kind text, p_wanted_id text, p_wanted_quantity integer, p_operation_id uuid, p_title text | true |
| app_private.exchange_reserve | p_owner uuid, p_asset jsonb | false |
| app_private.exchange_state | p_tab text, p_query text, p_offset integer | true |
| app_private.expedition_action | p_action text, p_operation_id uuid, p_vessel_id text, p_region_id text, p_cargo jsonb, p_expedition_id uuid | true |
| app_private.expedition_boosts_payload | p_expedition uuid | false |
| app_private.expedition_pick | p_region text, p_bait text, p_native boolean, p_local_discovery boolean | false |
| app_private.expedition_return_notice |  | true |
| app_private.expedition_state |  | true |
| app_private.expedition_success_chance_bp | p_bait_id text, p_reduction integer | false |
| app_private.feed_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | true |
| app_private.find_player_by_code | p_code text | true |
| app_private.finish_fishing | p_operation_id uuid, p_won boolean | true |
| app_private.fishing_rod_state |  | true |
| app_private.fishing_state |  | true |
| app_private.fishing_success_chance_bp | p_bait_id text | false |
| app_private.friend_aquarium | p_owner uuid | true |
| app_private.friend_expedition | p_owner uuid | true |
| app_private.friend_expedition_status |  | true |
| app_private.get_gold_wallet |  | true |
| app_private.gift_detail | p_gift_id uuid | true |
| app_private.gift_mailbox | p_direction text, p_offset integer | true |
| app_private.giseong_catch_event |  | true |
| app_private.giseong_settled_capture_event |  | true |
| app_private.grant_giseong_capture_reward | p_user_id uuid, p_species_id text, p_captured_at timestamp with time zone, p_now timestamp with time zone | true |
| app_private.grant_giseong_catch_reward | p_user_id uuid, p_operation_id uuid, p_now timestamp with time zone | true |
| app_private.grant_special_bait_reward | p_recipient uuid, p_quantity integer | false |
| app_private.growth_quest_period |  | true |
| app_private.harbor_action | p_action text, p_operation_id uuid, p_vessel_id text, p_voyage_id uuid, p_quantity integer, p_boat_id uuid, p_slot integer, p_region_id text | true |
| app_private.harbor_state |  | true |
| app_private.initialize_player_welcome |  | true |
| app_private.lock_collectible_habitat_species |  | false |
| app_private.manage_aquarium_tank | p_tank_id uuid, p_action text, p_value text | true |
| app_private.manual_fishing_success_chance_bp | p_bait_id text | false |
| app_private.map_shop_state |  | true |
| app_private.mark_harbor_titles_dirty |  | true |
| app_private.memory_game | p_action text, p_operation_id uuid, p_run_id uuid, p_card integer | true |
| app_private.memory_leaderboard | p_offset integer | true |
| app_private.memory_response | p_id uuid | false |
| app_private.move_collectibles | p_collectible_ids uuid[], p_tank_id uuid | true |
| app_private.music_edit | p_action text, p_id text, p_title text, p_name text | true |
| app_private.music_library | p_import jsonb | true |
| app_private.notice_delete | p_id uuid, p_revision integer | true |
| app_private.notice_is_operator |  | true |
| app_private.notice_save | p_id uuid, p_category text, p_title text, p_body text, p_images text[], p_status text, p_pinned boolean, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_revision integer | true |
| app_private.notifications_opened |  | true |
| app_private.notify_due_expeditions | p_expedition_id uuid | true |
| app_private.odd_even_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round integer, p_choice text | true |
| app_private.odd_even_leaderboard | p_offset integer | true |
| app_private.odd_even_response | p_id uuid | false |
| app_private.owned_collectibles |  | true |
| app_private.pick_habitat_group | p_ids text[], p_region text, p_rod_region text, p_home_multiplier numeric, p_rarity_fallback boolean | false |
| app_private.pick_regional_collectible | p_region_id text, p_rarity game_rarity, p_decoration boolean, p_map_roll integer | false |
| app_private.pick_special_bait_collectible | p_region_id text, p_rarity game_rarity, p_bait_id text | false |
| app_private.place_collectible | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric | true |
| app_private.prepare_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | true |
| app_private.prepared_fishing_payload | p app_private.prepared_fishing_casts | false |
| app_private.process_title_queue |  | true |
| app_private.quest_period | p_kind text, p_now timestamp with time zone | true |
| app_private.quest_state |  | true |
| app_private.rare_title_metrics | p_user uuid | true |
| app_private.rare_title_tank_event |  | true |
| app_private.react_to_collectible_gift | p_gift_id uuid, p_reaction text | true |
| app_private.region_map |  | true |
| app_private.regional_bait_odds | p_bait_id text, p_region_id text | false |
| app_private.remove_friend | p_request_id uuid | true |
| app_private.require_aquarium_friend | p_owner uuid | false |
| app_private.resolve_fishing | p_bait_id text, p_roll integer | false |
| app_private.resolve_regional_fishing | p_bait_id text, p_region_id text, p_roll integer | false |
| app_private.respond_friend_request | p_request_id uuid, p_action text | true |
| app_private.rod_habitat_weight | p_primary_region text, p_region text, p_rod_region text | false |
| app_private.savings_action | p_action text, p_operation_id uuid, p_account_id uuid, p_term_days integer, p_daily_amount integer | true |
| app_private.savings_payload | a shell_savings, p_now timestamp with time zone | false |
| app_private.savings_state |  | true |
| app_private.sell_collectibles | p_collectible_ids uuid[], p_operation_id uuid | true |
| app_private.send_collectible_gift | p_recipient_id uuid, p_collectible_ids uuid[], p_message text, p_operation_id uuid | true |
| app_private.send_friend_request | p_code text | true |
| app_private.send_welcome_gift | p_user_id uuid | true |
| app_private.set_exchange_listing_like | p_listing_id uuid, p_liked boolean | true |
| app_private.set_player_avatar | p_path text | true |
| app_private.set_region_test_lock | p_region_id text, p_locked boolean | true |
| app_private.settle_arcade_weeks | p_now timestamp with time zone | true |
| app_private.settle_legacy_expedition | p_action text, p_operation_id uuid, p_vessel_id text, p_region_id text, p_cargo jsonb, p_expedition_id uuid | true |
| app_private.settle_legacy_harbor | p_action text, p_operation_id uuid, p_vessel_id text, p_voyage_id uuid, p_quantity integer | true |
| app_private.shadow_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round_id uuid, p_choice_id text | true |
| app_private.shadow_leaderboard | p_offset integer | true |
| app_private.shadow_new_round | p_run uuid | false |
| app_private.shadow_run_response | p_run uuid | false |
| app_private.species_payload | p_species_id text, p_map_region_id text | false |
| app_private.stamp_bug_report_author |  | false |
| app_private.stamp_suggestion_author |  | false |
| app_private.sync_player_profile |  | true |
| app_private.sync_player_titles | p_user uuid | true |
| app_private.sync_titles |  | true |
| app_private.title_activity_event |  | true |
| app_private.title_catch_event |  | true |
| app_private.title_last_bait |  | true |
| app_private.title_metrics | p_user uuid | true |
| app_private.title_state |  | true |
| app_private.title_tank_event |  | true |
| app_private.trade_fishing_rod | p_rod_id text, p_action text, p_operation_id uuid | true |
| app_private.trade_gold | p_operation_id uuid, p_action text, p_item_id text | true |
| app_private.travel_region | p_region_id text | true |
| public.add_exchange_listing_comment | p_listing_id uuid, p_body text, p_operation_id uuid | false |
| public.adopt_suggestion | p_id uuid | false |
| public.aquarium_background | p_id text, p_action text, p_operation_id uuid | false |
| public.aquarium_state |  | false |
| public.arrange_decoration | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric | false |
| public.attendance_state |  | false |
| public.auction_bid | p_id uuid, p_amount integer, p_operation_id uuid | false |
| public.auction_cancel | p_id uuid | false |
| public.auction_post | p_kind text, p_item_id text, p_quantity integer, p_title text, p_description text, p_minimum_price integer, p_days integer, p_operation_id uuid | false |
| public.auction_state | p_tab text, p_query text, p_offset integer | false |
| public.boost_friend_expedition | p_expedition_id uuid | false |
| public.buy_aquarium_tank | p_operation_id uuid | false |
| public.buy_fishing_bait | p_bait_id text, p_operation_id uuid | false |
| public.buy_region_map | p_region_id text, p_operation_id uuid | false |
| public.cast_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | false |
| public.claim_attendance | p_day date | false |
| public.claim_collectible_gift | p_gift_id uuid | false |
| public.claim_quest | p_kind text, p_start date, p_quest_id text | false |
| public.clean_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | false |
| public.collectible_storage | p_offset integer, p_query text, p_kind text | false |
| public.collection_state |  | false |
| public.confirm_bug_report | p_id uuid | false |
| public.delete_exchange_listing_comment | p_comment_id uuid | false |
| public.edit_exchange_listing_title | p_listing_id uuid, p_title text | false |
| public.equip_fishing_rod | p_rod_id text | false |
| public.equip_title | p_title text | false |
| public.exchange_action | p_listing_id uuid, p_action text | false |
| public.exchange_inventory |  | false |
| public.exchange_listing_detail | p_listing_id uuid, p_offset integer | false |
| public.exchange_post | p_side text, p_offer_kind text, p_offer_id text, p_offer_quantity integer, p_wanted_kind text, p_wanted_id text, p_wanted_quantity integer, p_operation_id uuid, p_title text | false |
| public.exchange_state | p_tab text, p_query text, p_offset integer | false |
| public.expedition_action | p_action text, p_operation_id uuid, p_vessel_id text, p_region_id text, p_cargo jsonb, p_expedition_id uuid | false |
| public.expedition_state |  | false |
| public.feed_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | false |
| public.find_player_by_code | p_code text | false |
| public.finish_fishing | p_operation_id uuid, p_won boolean | false |
| public.fishing_rod_state |  | false |
| public.fishing_state |  | false |
| public.friend_aquarium | p_owner uuid | false |
| public.friend_expedition | p_owner uuid | false |
| public.friend_expedition_status |  | false |
| public.get_gold_wallet |  | false |
| public.gift_detail | p_gift_id uuid | false |
| public.gift_mailbox | p_direction text, p_offset integer | false |
| public.harbor_action | p_action text, p_operation_id uuid, p_vessel_id text, p_voyage_id uuid, p_quantity integer, p_boat_id uuid, p_slot integer, p_region_id text | false |
| public.harbor_state |  | false |
| public.manage_aquarium_tank | p_tank_id uuid, p_action text, p_value text | false |
| public.map_shop_state |  | false |
| public.memory_game | p_action text, p_operation_id uuid, p_run_id uuid, p_card integer | false |
| public.memory_leaderboard | p_offset integer | false |
| public.move_collectibles | p_collectible_ids uuid[], p_tank_id uuid | false |
| public.music_edit | p_action text, p_id text, p_title text, p_name text | false |
| public.music_library | p_import jsonb | false |
| public.notice_delete | p_id uuid, p_revision integer | false |
| public.notice_is_operator |  | false |
| public.notice_save | p_id uuid, p_category text, p_title text, p_body text, p_images text[], p_status text, p_pinned boolean, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_revision integer | false |
| public.notifications_opened |  | false |
| public.odd_even_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round integer, p_choice text | false |
| public.odd_even_leaderboard | p_offset integer | false |
| public.place_collectible | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric | false |
| public.prepare_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | false |
| public.quest_state |  | false |
| public.react_to_collectible_gift | p_gift_id uuid, p_reaction text | false |
| public.region_map |  | false |
| public.remove_friend | p_request_id uuid | false |
| public.respond_friend_request | p_request_id uuid, p_action text | false |
| public.savings_action | p_action text, p_operation_id uuid, p_account_id uuid, p_term_days integer, p_daily_amount integer | false |
| public.savings_state |  | false |
| public.sell_collectibles | p_collectible_ids uuid[], p_operation_id uuid | false |
| public.send_collectible_gift | p_recipient_id uuid, p_collectible_ids uuid[], p_message text, p_operation_id uuid | false |
| public.send_friend_request | p_code text | false |
| public.set_exchange_listing_like | p_listing_id uuid, p_liked boolean | false |
| public.set_player_avatar | p_path text | false |
| public.set_region_test_lock | p_region_id text, p_locked boolean | false |
| public.shadow_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round_id uuid, p_choice_id text | false |
| public.shadow_leaderboard | p_offset integer | false |
| public.sync_player_profile |  | false |
| public.sync_titles |  | false |
| public.title_state |  | false |
| public.trade_fishing_rod | p_rod_id text, p_action text, p_operation_id uuid | false |
| public.trade_gold | p_operation_id uuid, p_action text, p_item_id text | false |
| public.travel_region | p_region_id text | false |
