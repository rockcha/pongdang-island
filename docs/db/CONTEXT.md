# 로컬 DB 컨텍스트 (자동 생성)

원격 DB의 현재 상태가 아닙니다. migrations 전체를 PGlite에 재생한 기대 상태입니다.

- migration SHA-256: `96202f24cf2e33483e496dca1d7db14ab4b73c155bf0e6df5b737a1abf1880d2`
- migrations: 20261016015506_legacy_baseline.sql, 20261016074241_fishing_rod_inventory.sql, 20261016083949_attendance_streak.sql, 20261016092320_add_minimal_aquarium_backgrounds.sql, 20261016093649_add_seven_aquarium_themes.sql, 20261016095304_add_atmospheric_aquarium_backgrounds.sql, 20261016101729_shadow_guessing_arcade.sql, 20261016103215_shadow_score_cap.sql, 20261016105544_memory_card_arcade.sql, 20261016114524_shadow_eight_seconds.sql, 20261016120119_primal_island_catalog.sql, 20261016124501_odd_even_arcade.sql, 20261016131521_odd_even_rank_friends.sql, 20261016151410_attendance_28_day_sheet.sql, 20261016155535_bluegrove_region_catalog.sql, 20261016162605_exchange_escrow_market.sql, 20261016164527_exchange_sales_only.sql, 20261016180116_auction_gift_escrow.sql, 20261016181632_notice_board.sql, 20261016231528_notice_notifications.sql, 20261016232525_notice_delete_and_auto_read.sql, 20261017002343_retire_dawn_arowana.sql, 20261017003922_fixed_atlantean_sentinel.sql, 20261017005949_bluegrove_large_species.sql, 20261017045143_primal_prehistoric_species.sql, 20261017052918_primal_exclusive_fish.sql, 20261017054146_map_shop_routes.sql, 20261017054247_map_shop_catalog.sql, 20261017055506_correct_starruins_map_image.sql, 20261017055827_reorder_map_routes.sql, 20261017060959_whitenight_region_catalog.sql, 20261017061438_place_whitenight_after_mistmoon.sql, 20261017064137_whitenight_native_species.sql, 20261017074923_friend_aquarium_visits_feeding.sql, 20261017080527_friend_aquarium_cleaning.sql, 20261017082326_cloudferry_region_catalog.sql, 20261017085502_cloudferry_native_species.sql, 20261017093723_scrap_isle_region_and_species.sql, 20261017201704_allow_rare_collectible_trash.sql, 20261017201709_pongdang_natives_and_shared_mythics.sql, 20261018030010_shared_sea_creatures.sql, 20261018044936_dreamabyss_violet_deepsea_catalog.sql, 20261018070101_global_fishing_primary_habitats.sql, 20261018071445_equipped_rod_habitat_weights.sql, 20261018075922_fishing_forty_percent_safe_bait.sql, 20261018092426_suggestion_board.sql, 20261018094132_bug_report_board.sql, 20261018095755_special_bait_catalog.sql, 20261018095800_special_bait_effects.sql, 20261018101003_forbidden_star_success_bonus.sql, 20261018105905_shell_savings.sql, 20261018111616_savings_amount_limits.sql, 20261018112003_scrap_island_seven_creatures.sql, 20261018122329_mukhyang_region_and_brush_rod.sql, 20261018122353_mukhyang_brush_rod.sql, 20261018131214_mukhyang_native_creatures.sql, 20261018134143_rebalance_collectible_sizes.sql, 20261018134256_collectible_size_catalog.sql, 20261018134919_species_proportion_sizes.sql, 20261018142534_fishing_vessel_expeditions.sql, 20261018143528_expedition_failures_and_return_notifications.sql, 20261018161320_aquarium_tank_price_350.sql, 20261018163311_special_baits_sixty_percent_success.sql, 20261018170746_daily_weekly_quests.sql, 20261018171951_player_titles.sql, 20261018173739_signup_title_and_welcome_gift.sql, 20261018174001_success_effect_baits_sixty_percent.sql, 20261018183011_rebalance_rod_effects_and_quest_conditions.sql, 20261018183017_grubby_magnet_price_40.sql, 20261018184245_rebalance_fishing_vessel_bonuses.sql, 20261018184531_rebalance_region_map_prices.sql, 20261018232502_automatic_signup_gold.sql, 20261018234630_rebalance_purchasable_baits.sql, 20261018234911_lower_abyss_lodestone_price.sql, 20261018235409_seven_cozy_aquarium_themes.sql, 20261019000301_eight_story_aquarium_themes.sql, 20261019000553_aquarium_theme_tiers.sql, 20261019001110_six_tier_aquarium_themes.sql, 20261019002347_rebalance_aquarium_theme_tier_prices.sql, 20261019003406_twelve_marine_aquarium_themes.sql, 20261019003842_enrich_red_fan_coral_background.sql, 20261019004514_simplify_bait_effects_and_worm_success.sql, 20261019004931_calm_rod_price_750.sql, 20261019012808_friend_expedition_tailwind.sql, 20261019015603_distinguish_friend_expedition_returned.sql, 20261019015918_friend_expedition_visits.sql, 20261019020653_expedition_aquarium_growth_quests.sql, 20261019022758_rebalance_growth_quests_tailwind_titles.sql, 20261019023121_dinghy_duration_forty_minutes.sql, 20261019024254_enlarge_small_epic_creatures.sql, 20261019024703_rebalance_fish_rarity_sell_prices.sql, 20261019031038_siren_strait_catalog.sql, 20261019041637_progressive_fishing_rod_prices.sql, 20261019041853_halve_regional_fishing_rod_prices.sql, 20261019063956_music_library.sql, 20261019081506_harbor_idle_fishing.sql, 20261019085512_harbor_fleet_and_fuel_rewards.sql, 20261019091213_harbor_vessel_catalog.sql, 20261019093552_attendance_alternating_gold_fuel.sql, 20261019094406_attendance_bait_only_milestones.sql, 20261019105623_weekly_quest_reward_rebalance.sql, 20261019105951_fish_traps_fuel_limit_and_bait_chances.sql, 20261019110723_harbor_voyage_regions.sql, 20261019120009_rebalance_haeneomi_trawler.sql, 20261019120219_fishing_drone_and_free_raft.sql, 20261019120236_fishing_drone_catalog.sql, 20261019121721_specialized_harbor_vessels.sql, 20261019121735_specialized_harbor_catalog.sql, 20261019122848_random_range_fishing_boats.sql, 20261019123400_shrimp_bait_harbor_support.sql, 20261019123413_raft_nerf_and_premium_boats.sql, 20261019124040_conch_harbor_support.sql, 20261019124055_conch_explorer_catalog.sql, 20261019124757_rebalance_three_region_map_prices.sql, 20261019125011_unify_selected_rod_prices_800.sql, 20261019125934_rare_secret_titles.sql, 20261019133442_exchange_listing_titles.sql, 20261019134420_exchange_seller_avatar.sql, 20261019135517_exchange_fuel_trading.sql, 20261019135931_region_registration_dates.sql, 20261019152108_welcome_starter_bait.sql, 20261019163843_operator_gold_gift_support.sql, 20261019170546_operator_gold_second_supply.sql, 20261019174616_weekly_arcade_rank_rewards.sql, 20261019180156_operator_worm_bait_gift.sql, 20261019190142_rebalance_safe_bait_and_small_epics.sql, 20261019192547_reduce_foreign_native_weights.sql, 20261019193651_habitat_group_selection.sql, 20261019201440_pongdang_mascot_native_species.sql, 20261019231229_giseong_october_catch_event.sql, 20261019232722_include_trap_and_vessel_giseong_rewards.sql, 20261020001446_exchange_listing_discussion.sql, 20261020003356_edit_exchange_listing_title.sql, 20261020003941_exchange_parcel_display.sql, 20261020031737_pause_abyss_lodestone_sales.sql, 20261020033152_harbor_boat_resale.sql, 20261020034706_regional_species_value_progression.sql, 20261020051038_rebalance_habitat_group_odds.sql, 20261020072750_brick_breaker_verified_runs.sql, 20261020094725_brick_breaker_round_rewards_v2.sql, 20261020101140_habitat_group_35_60_5.sql, 20261020105908_rebalance_standard_bait_economy.sql, 20261020111314_brick_breaker_ball_speed_v3.sql, 20261020111636_brick_breaker_drop_odds_v4.sql, 20261020111824_brick_breaker_compact_bricks_v5.sql, 20261020112041_brick_breaker_missed_ball_restart_v6.sql, 20261020113640_ladder_arcade_game.sql, 20261020135020_community_board.sql, 20261020142456_varied_fishing_bait_rules.sql, 20261020142504_varied_fishing_bait_catalog.sql, 20261020144131_rebalance_four_varied_baits.sql, 20261020144317_four_gentle_fishing_baits.sql, 20261020144755_harbor_fuel_efficiency_buffs.sql, 20261020145642_increase_star_candy_price.sql, 20261020150002_dewleaf_dumpling_price_90.sql, 20261020151117_operator_gold_supply_20261021.sql, 20261020151633_repair_manta_and_wolf_swim_sprites.sql, 20261020152228_disable_board_replies.sql, 20261020152229_dewleaf_dumpling_price_80.sql, 20261020155038_decoration_grade_before_species.sql, 20261020155134_reopen_lodestone_catalog.sql, 20261020155643_ranking_friend_requests.sql, 20261020160842_cloud_dough_price_40.sql, 20261020161303_buff_bait_prices_and_small_mukhyang_species.sql, 20261020162430_catch_first_discovery_badges.sql, 20261020162736_board_comments_oldest_first.sql, 20261020164534_gifts_do_not_unlock_collection.sql, 20261020164549_lower_sixteen_bait_prices.sql, 20261020170440_sea_merchant_daily_orders.sql, 20261020172951_merchant_mixed_orders_and_delivery_messages.sql, 20261020173537_merchant_current_avatar_for_completed_orders.sql, 20261020174917_merchant_unlimited_deliveries_and_fixed_rewards.sql, 20261020182428_merchant_sale_price_plus_bonus.sql, 20261020182939_merchant_easier_mixed_quantities.sql, 20261020184227_merchant_forty_weighted_orders.sql, 20261020190242_challenging_title_metrics.sql, 20261020190358_challenging_title_catalog.sql, 20261020190901_collectible_storage_concept_filters.sql, 20261020191401_pongdang_whale_sisters.sql, 20261020193840_intermediate_player_titles.sql, 20261021005824_bluegrove_mistmoon_and_shared_creatures.sql, 20261021015952_buff_collectible_sell_prices.sql, 20261021021403_complete_collectible_price_buff.sql, 20261021025451_shared_collectibles_and_tall_decorations.sql, 20261021032416_plush_crab_jellyfish_turtle.sql, 20261021033040_lower_plush_trash_sell_prices.sql, 20261021033316_animate_and_regrade_shared_decorations.sql, 20261021033812_reduce_rare_trash_and_decoration_prices.sql, 20261021034622_animate_sponge_waterwheel_and_stone_spire.sql, 20261021045952_feedback_reactions.sql, 20261021051612_feedback_author_avatars.sql, 20261021052243_return_notification_alerts.sql, 20261021060650_add_regional_aquarium_backgrounds.sql, 20261021061542_add_lunea_and_emerald_aquarium_themes.sql, 20261021061906_lunea_lullaby_lavender_image.sql, 20261021062231_enlarge_mythic_collectibles.sql, 20261021074102_fix_ground_crab_movement.sql, 20261021083238_exchange_bundle_sales.sql, 20261021090145_positive_trash_sell_prices.sql, 20261021092013_regional_collection_growth_and_weekly_help.sql, 20261021093004_everyday_fishing_and_community_titles.sql, 20261021093009_everyday_title_catalog.sql, 20261021094332_persist_trash_placement_lock.sql, 20261021095448_allow_trash_drag_placement.sql, 20261021103433_balanced_fishing_bait_rules.sql, 20261021103435_balanced_fishing_bait_catalog.sql, 20261021104539_balanced_fishing_bait_image_urls.sql, 20261021105654_recolor_shooting_star_tail_bait.sql, 20261021113213_fishing_showcase_posts.sql, 20261021120643_storage_free_fishing_showcases.sql, 20261021125920_feedback_comments.sql, 20261021132853_hall_of_fame.sql, 20261021144118_nerf_cloud_dough_price.sql, 20261021144433_add_rare_focused_fishing_baits.sql, 20261021145822_expand_hall_record_categories.sql, 20261021150902_hall_section_discussions.sql, 20261021152249_add_siren_music_decorations.sql, 20261021160057_hall_comment_emotions.sql, 20261021160948_add_siren_myth_fish.sql, 20261021161616_add_cozy_undersea_doll_room.sql, 20261021161814_soften_cozy_doll_room_artwork.sql, 20261021162003_redesign_cozy_doll_room_as_toy_playset.sql, 20261021165000_dewleaf_dumpling_price_75.sql, 20261021170444_dewleaf_dumpling_price_70.sql, 20261021170844_dewleaf_dumpling_price_69.sql, 20261021181226_showcase_sad_angry_reactions.sql, 20261021183627_ladder_five_modes_six_lanes.sql, 20261021185859_rebalance_four_baits.sql, 20261021192321_add_shared_ocean_creatures_and_cloud_trash.sql, 20261022002724_cloud_broken_broom_rare.sql, 20261022011711_add_common_fuel_material_collectibles.sql, 20261022012741_align_common_fuel_swim_sheets.sql, 20261022022421_production_facilities.sql, 20261022022454_production_facility_catalog.sql, 20261022025526_production_bulk_actions.sql, 20261022033504_grubby_magnet_price_16.sql, 20261022035148_add_fish_fuel_refineries.sql, 20261022041313_production_multiple_sites.sql, 20261022053008_production_limits_and_resale.sql, 20261022061406_scheduled_fishing_maintenance.sql, 20261022064959_independent_harbor_catch_rules.sql, 20261022073838_staged_fishing_bait_balance.sql, 20261022074010_staged_fishing_bait_catalog.sql, 20261022074953_fishing_maintenance_cast_tester.sql, 20261022082534_activate_fishing_bait_mechanics.sql, 20261022082839_activate_fishing_bait_catalog.sql, 20261022084717_trap_duration_and_fishing_bait_display.sql, 20261022085333_trap_duration_one_and_half.sql, 20261022085809_lower_goblin_lightning_epic_odds.sql, 20261022085814_lower_all_fish_sale_prices.sql, 20261022091112_shorten_all_bait_waits_two_seconds.sql, 20261022101208_add_moonshade_and_deep_sleep_bait_art.sql, 20261022102055_add_seven_salvaged_treasure_trash.sql, 20261022113750_separate_bite_confirmation_deadline.sql, 20261022120523_production_ready_notifications.sql, 20261022121911_universal_baits_include_decorations.sql, 20261022141034_rebalance_fishing_habitat_weights.sql, 20261022144034_restore_production_resale.sql, 20261022145038_rebalance_worm_bait_rarity.sql, 20261022150134_lower_common_and_rare_sale_prices.sql, 20261022150835_progressive_collectible_sale_prices.sql, 20261022152047_rebalance_all_baits_and_uniform_wait.sql, 20261022152105_uniform_fishing_wait_sampler.sql, 20261022153720_lower_deep_sleep_epic_probability.sql, 20261022154253_adjust_inksea_rare_and_epic_baits.sql, 20261022161705_bait_production_facilities.sql, 20261022161810_bait_production_catalog.sql, 20261022163942_remove_fuel_production_ownership_limit.sql, 20261022164056_shared_production_active_limit.sql, 20261022170608_distinguish_dewleaf_and_snowflake_baits.sql, 20261022172148_fishing_rod_wait_reduction.sql, 20261022172151_fishing_rod_wait_catalog.sql, 20261022172256_bronze_rod_wait_catalog.sql, 20261022172833_rebalance_trash_production_facilities.sql, 20261022173346_increase_attendance_gold_and_fuel.sql, 20261022174739_fishing_map_piece_unlocks.sql, 20261022180155_nyamnyam_region_and_four_map_pieces.sql, 20261022181106_map_piece_display_names.sql, 20261022181540_map_piece_test_controls.sql, 20261022182248_nyamnyam_food_scenery_and_chart.sql, 20261022193526_nyamnyam_food_collectibles.sql, 20261022194720_nyamnyam_pastry_and_cone_lobster.sql, 20261022195113_buff_bait_production_efficiency.sql, 20261022200143_nyamnyam_hotdog_hotpot_croissant.sql, 20261022202327_shared_epic_creatures_and_primal_nemerion.sql, 20261022230946_nemerion_ancient_sea_serpent_artwork.sql, 20261023020731_showcase_reaction_people.sql, 20261023021839_grimhowl_refined_artwork.sql, 20261023022940_lower_bait_and_fuel_shop_prices.sql, 20261023023513_common_rare_fish_value_plus_five.sql, 20261023031135_resize_aquarium_fish.sql, 20261023031545_buff_bait_production_yields.sql, 20261023031840_rebalance_fuel_production_facilities.sql, 20261023033653_nyamnyam_update_gold_reward.sql, 20261023035924_separate_fuel_and_bait_active_limits.sql, 20261023040714_bait_production_resale.sql, 20261023041235_fixed_suggestion_bait_reward.sql, 20261023042026_add_swift_fishing_rod.sql, 20261023043107_more_single_item_merchant_orders.sql, 20261023043335_strengthen_three_kind_merchant_orders.sql, 20261023045232_player_experience_levels.sql, 20261023050138_friend_level_badges.sql, 20261023052858_shared_player_level_badges.sql, 20261023053430_arcade_ranking_avatar_badges.sql, 20261023054902_beginner_baits_and_magnet_price.sql, 20261023055259_beginner_baits_all_catch_kinds.sql, 20261023055657_beginner_bait_artwork.sql, 20261023060832_four_common_medium_fish.sql, 20261023062419_avatar_level_progress.sql, 20261023063652_level_curve_and_mailbox_rewards.sql, 20261023083118_web_push_notifications.sql, 20261023093219_web_push_expiry_reminders.sql, 20261023102632_storage_rarity_price_name_order.sql, 20261023110310_expanded_rare_epic_mythic_titles.sql, 20261023114437_halloween_collectible_window.sql, 20261023131804_halloween_collectible_catalog.sql, 20261023134706_halloween_mythic_ghost_refinement.sql, 20261023135830_halloween_costumes_underwater_ornaments.sql, 20261023141631_halloween_fish_price_buff.sql, 20261023141635_halloween_ten_creatures_and_patchwork_shark.sql, 20261023144733_halloween_values_rarities_and_grubby_magnet.sql, 20261023145940_halloween_rare_value_plus_100.sql, 20261023150132_halloween_20261024_operator_gold_gift.sql, 20261023153807_halloween_pumpkin_garden_theme.sql, 20261023160641_halloween_five_creatures_release.sql, 20261023160642_rare_trash_value_plus_20.sql, 20261023161408_hall_arcade_play_count_records.sql, 20261023162509_arcade_title_metrics.sql, 20261023162510_arcade_play_count_titles.sql, 20261023164617_bait_production_storage_buff.sql, 20261023165053_bait_production_fuel_cost_buff.sql, 20261023165054_trash_production_material_buff.sql, 20261023165055_horizon_whale_value_plus_300.sql, 20261023165811_friend_presence.sql, 20261024020327_add_harbor_vessel_routes.sql, 20261024020746_add_eleven_harbor_vessels.sql, 20261024022048_red_lantern_fourteen_hours.sql, 20261024022437_buff_three_starter_boats.sql, 20261024022532_tin_dinghy_five_minutes.sql, 20261024023016_aquarium_tank_display_order.sql, 20261024160449_collectible_display_layer.sql, 20261024182416_add_developer_tears_bottle.sql, 20261024185621_player_directory.sql, 20261024190422_friend_help_experience.sql, 20261024191416_harbor_dock_expansion.sql, 20261024191757_harbor_second_expansion_price_30000.sql, 20261024192516_aquarium_capacity_expansion.sql, 20261024195835_add_pongi_subsea_drilling_platform.sql, 20261024201323_unlimited_harbor_vessel_ownership.sql, 20261024202420_halloween_name_comma_separator.sql, 20261024214355_personal_bait_workshop.sql, 20261024220540_buff_personal_bait_fuel.sql, 20261024222543_add_halloween_oct25_collectibles.sql, 20261025013752_add_pongi_mobile_expeditions.sql, 20261025020132_expedition_catch_showcases.sql, 20261025025948_aquarium_apology_moonlight_shrimp.sql, 20261025042209_first_fishing_tutorial.sql, 20261025043922_starter_worms_direct_inventory.sql, 20261025044615_tutorial_guaranteed_pongdang_pufferfish.sql, 20261025065502_per_tank_capacity_expansion.sql, 20261025082045_relic_production_setup.sql, 20261025084556_relic_sales.sql
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
| app_private.bait_cycles | true | user_id: uuid, next_rarity: game_rarity |
| app_private.bait_production_operations | true | user_id: uuid, operation_id: uuid, signature: jsonb, receipt: jsonb |
| app_private.bait_production_sites | true | id: uuid, user_id: uuid, facility_id: text, purchased_at: timestamp with time zone, started_at: timestamp with time zone?, completes_at: timestamp with time zone?, expires_at: timestamp with time zone?, run_output: integer?, run_bait_id: text?, notified_started_at: timestamp with time zone? |
| app_private.collectible_event_windows | true | id: text, species_prefix: text, starts_at: timestamp with time zone, ends_at: timestamp with time zone |
| app_private.exchange_bundle_gifts | true | listing_id: uuid, gift_id: uuid |
| app_private.expedition_boosts | true | id: uuid, expedition_id: uuid, helper_id: uuid, nickname: text, avatar_path: text?, minutes: integer, created_at: timestamp with time zone |
| app_private.expedition_operations | true | user_id: uuid, operation_id: uuid, signature: jsonb, receipt: jsonb |
| app_private.expedition_settings | true | id: boolean, instant_return_enabled: boolean |
| app_private.experience_events | true | source: text, source_id: uuid, user_id: uuid, xp: integer, legacy: boolean, created_at: timestamp with time zone |
| app_private.feedback_bug_votes | true | post_id: uuid, user_id: uuid, value: smallint |
| app_private.feedback_suggestion_votes | true | post_id: uuid, user_id: uuid, value: smallint |
| app_private.first_fishing_settings | true | id: boolean, eligible_from: timestamp with time zone |
| app_private.first_fishing_tutorials | true | user_id: uuid, step: text, collectible_id: uuid?, started_at: timestamp with time zone?, ready_at: timestamp with time zone?, caught_at: timestamp with time zone?, completed_at: timestamp with time zone? |
| app_private.fishing_bait_balance_profiles | true | id: text, name: text, price: integer?, success_chance_bp: integer, common_bp: integer, rare_bp: integer, epic_bp: integer, mythic_bp: integer, wait_min_seconds: integer, wait_max_seconds: integer, target_kinds: jsonb, effect_kind: text, native_multiplier: numeric, night_common_bp: integer?, night_rare_bp: integer?, night_wait_min_seconds: integer?, night_wait_max_seconds: integer? |
| app_private.fishing_maintenance | true | id: boolean, starts_at: timestamp with time zone, released_at: timestamp with time zone? |
| app_private.gold_settings | true | id: boolean, test_charge_enabled: boolean |
| app_private.hall_comments | true | id: uuid, target_id: uuid, author_id: uuid, body: text, created_at: timestamp with time zone |
| app_private.hall_reactions | true | target_id: uuid, user_id: uuid, value: smallint |
| app_private.hall_section_comment_reactions | true | comment_id: uuid, user_id: uuid, value: smallint |
| app_private.hall_section_comments | true | id: uuid, section_id: text, author_id: uuid, body: text, created_at: timestamp with time zone |
| app_private.hall_sections | true | id: text |
| app_private.harbor_operations | true | user_id: uuid, operation_id: uuid, signature: jsonb, receipt: jsonb, created_at: timestamp with time zone |
| app_private.ladder_runs | true | id: uuid, user_id: uuid, operation_id: uuid, mode: text, stake: integer, choice: integer, bridges: integer[], payouts: integer[], destination: integer, reward: integer, created_at: timestamp with time zone |
| app_private.memory_game_boards | true | run_id: uuid, deck: text[], matched: integer[], first_card: integer?, second_card: integer?, clear_at: timestamp with time zone? |
| app_private.merchant_days | true | day: date, created_at: timestamp with time zone, rules_version: integer |
| app_private.merchant_deliveries | true | user_id: uuid, operation_id: uuid, order_id: uuid, day: date, gold: integer, collectible_ids: uuid[], created_at: timestamp with time zone, message: text |
| app_private.merchant_orders | true | id: uuid, day: date, slot: integer, tier: text, region_id: text?, items: jsonb, base_gold: integer, reward_gold: integer, completed_by: uuid?, completed_at: timestamp with time zone?, completed_name: text?, completed_avatar_path: text?, completed_message: text |
| app_private.notice_operators | true | user_id: uuid |
| app_private.personal_bait_jobs | true | id: uuid, user_id: uuid, bait_id: text, bait_name: text, image_path: text, quantity: integer, production_minutes: integer, unit_value: integer, fuel_cost: integer, started_at: timestamp with time zone, completes_at: timestamp with time zone, claimed_at: timestamp with time zone? |
| app_private.personal_bait_operations | true | user_id: uuid, operation_id: uuid, signature: jsonb, receipt: jsonb, created_at: timestamp with time zone |
| app_private.player_aquarium_capacity | true | user_id: uuid, capacity: integer |
| app_private.player_experience | true | user_id: uuid, total_xp: bigint, legacy_xp: bigint, updated_at: timestamp with time zone, curve_offset: bigint, rewarded_through: integer |
| app_private.player_fishing_map_pieces | true | user_id: uuid, region_id: text, piece_number: integer, acquired_at: timestamp with time zone |
| app_private.player_fishing_relic_discoveries | true | user_id: uuid, relic_id: text, discovered_at: timestamp with time zone |
| app_private.player_fishing_relics | true | user_id: uuid, relic_id: text, acquired_at: timestamp with time zone |
| app_private.player_harbor_capacity | true | user_id: uuid, dock_slots: integer |
| app_private.player_presence_sessions | true | user_id: uuid, session_id: uuid, state: text, revision: integer, last_seen_at: timestamp with time zone |
| app_private.player_relic_loadouts | true | user_id: uuid, relic_id: text |
| app_private.prepared_fishing_casts | true | user_id: uuid, operation_id: uuid, region_id: text, bait_id: text, eligible: boolean, species_id: text?, map_region_id: text?, rarity: game_rarity, snapshot: jsonb?, wait_seconds: numeric, failure_at: numeric, failure_reason: text, created_at: timestamp with time zone, expires_at: timestamp with time zone, finished_at: timestamp with time zone?, result: jsonb?, last_bait: boolean, bait_snapshot: jsonb?, confirm_bite: boolean, fight_started_at: timestamp with time zone?, map_piece_number: integer?, relic_id: text? |
| app_private.production_operations | true | user_id: uuid, operation_id: uuid, signature: jsonb, receipt: jsonb, created_at: timestamp with time zone |
| app_private.production_sites | true | user_id: uuid, facility_id: text, purchased_at: timestamp with time zone, started_at: timestamp with time zone?, completes_at: timestamp with time zone?, expires_at: timestamp with time zone?, run_output: integer?, id: uuid, ready_notified_at: timestamp with time zone? |
| app_private.push_deliveries | true | id: bigint, subscription_id: uuid, notification_id: uuid?, category: text, source_id: uuid?, source_started_at: timestamp with time zone?, payload: jsonb, status: text, attempts: integer, available_at: timestamp with time zone, expires_at: timestamp with time zone, lease_token: uuid?, locked_until: timestamp with time zone?, finished_at: timestamp with time zone?, last_status: integer? |
| app_private.push_subscriptions | true | id: uuid, user_id: uuid, endpoint: text, p256dh: text, auth: text, categories: text[], created_at: timestamp with time zone, updated_at: timestamp with time zone, last_test_at: timestamp with time zone? |
| app_private.quest_claims | true | user_id: uuid, period_kind: text, period_start: date, quest_id: text, gold: integer, claimed_at: timestamp with time zone, fuel: integer |
| app_private.region_settings | true | id: boolean, test_lock_controls: boolean |
| app_private.savings_operations | true | user_id: uuid, operation_id: uuid, account_id: uuid, signature: jsonb, receipt: jsonb, created_at: timestamp with time zone |
| app_private.shadow_game_rounds | true | id: uuid, run_id: uuid, number: integer, target_id: text, target_name: text, image_path: text, options: jsonb, deadline: timestamp with time zone, answered_at: timestamp with time zone?, correct: boolean?, timed_out: boolean? |
| app_private.starter_bait_receipts | true | user_id: uuid, quantity: smallint, created_at: timestamp with time zone |
| app_private.title_acquisition_evidence | true | collectible_id: uuid, user_id: uuid, species_id: text, first_discovery: boolean, last_mythic_discovery: boolean, native_collection_complete: boolean |
| app_private.title_dirty | true | user_id: uuid |
| app_private.title_fishing_log | true | id: bigint, user_id: uuid, event_key: text, occurred_at: timestamp with time zone, source: text, kind: text?, rarity: text?, species_id: text?, collectible_id: uuid?, region_id: text?, bait_id: text?, vessel_id: text?, batch_id: text?, last_bait: boolean |
| public.aquarium_backgrounds | true | id: text, name: text, price: integer, image_path: text, tier: text |
| public.aquarium_cleanings | true | id: uuid, visitor_id: uuid, owner_id: uuid, tank_id: uuid?, operation_id: uuid, strokes: integer, created_at: timestamp with time zone, completed_at: timestamp with time zone? |
| public.aquarium_feedings | true | id: uuid, visitor_id: uuid, owner_id: uuid, tank_id: uuid?, operation_id: uuid, clicks: integer, created_at: timestamp with time zone, completed_at: timestamp with time zone? |
| public.aquarium_tanks | true | id: uuid, user_id: uuid, name: text, background_id: text, is_default: boolean, created_at: timestamp with time zone, display_order: integer, capacity_bonus: integer |
| public.attendance_claims | true | user_id: uuid, claim_date: date, operation_id: uuid, streak: integer, sheet_day: integer, gold: integer, bait_id: text?, fuel: integer |
| public.auction_bids | true | id: uuid, auction_id: uuid, bidder_id: uuid?, operation_id: uuid, amount: integer, created_at: timestamp with time zone |
| public.auction_listings | true | id: uuid, owner_id: uuid?, owner_name: text, operation_id: uuid, title: text, description: text, offer: jsonb, escrow_gift_id: uuid, minimum_price: integer, duration_days: integer, highest_amount: integer, highest_bidder: uuid?, highest_gift_id: uuid?, status: text, created_at: timestamp with time zone, ends_at: timestamp with time zone, closed_at: timestamp with time zone? |
| public.bait_production_facilities | true | id: text, name: text, description: text, bait_id: text, price: integer, fuel_cost: integer, output_count: integer, production_minutes: integer, storage_minutes: integer, enabled: boolean |
| public.board_comments | true | id: uuid, post_id: uuid, author_id: uuid, parent_id: uuid?, body: text, deleted: boolean, created_at: timestamp with time zone, updated_at: timestamp with time zone |
| public.board_posts | true | id: uuid, author_id: uuid, title: text, body: text, images: text[], created_at: timestamp with time zone, updated_at: timestamp with time zone |
| public.board_reactions | true | user_id: uuid, post_id: uuid, comment_id: uuid?, value: smallint, created_at: timestamp with time zone |
| public.brick_game_runs | true | id: uuid, user_id: uuid, operation_id: uuid, payout_operation_id: uuid, seed: bigint, engine_version: integer, started_at: timestamp with time zone, finished_at: timestamp with time zone?, score: integer, reward: integer, paid_reward: integer, ticks: integer, replay: jsonb |
| public.bug_reports | true | id: uuid, author_id: uuid, author_name: text, title: text, body: text, created_at: timestamp with time zone, confirmed_at: timestamp with time zone?, confirmed_by: uuid?, reward: jsonb, updated_at: timestamp with time zone |
| public.collectible_gifts | true | id: uuid, sender_id: uuid?, recipient_id: uuid?, sender_name: text, recipient_name: text, operation_id: uuid, collectible_ids: uuid[], species: jsonb, quantity: integer, message: text, status: text, reaction: text?, created_at: timestamp with time zone, claimed_at: timestamp with time zone?, reacted_at: timestamp with time zone?, source: text, exchange_hold: boolean, reward_kind: text, reward_id: text? |
| public.collectible_habitats | true | species_id: text, region_id: text |
| public.collectible_species | true | id: text, kind: collectible_kind, name: text, description: text, swim_y_min: numeric?, swim_y_max: numeric?, speed: numeric, size: integer, rarity: game_rarity, thumbnail_path: text, sell_price: integer, sprite_sheet_path: text?, native_region_id: text?, is_native: boolean?, movement_type: text, flip_with_direction: boolean, travel_direction: text |
| public.exchange_listing_comments | true | id: uuid, listing_id: uuid, user_id: uuid, operation_id: uuid, body: text, created_at: timestamp with time zone |
| public.exchange_listing_likes | true | listing_id: uuid, user_id: uuid, created_at: timestamp with time zone |
| public.exchange_listings | true | id: uuid, owner_id: uuid, owner_name: text, side: text, operation_id: uuid, offer: jsonb, wanted: jsonb, escrow_gift_id: uuid, status: text, taker_id: uuid?, created_at: timestamp with time zone, closed_at: timestamp with time zone?, title: text? |
| public.feedback_comments | true | id: uuid, suggestion_id: uuid?, bug_id: uuid?, author_id: uuid, body: text, created_at: timestamp with time zone, updated_at: timestamp with time zone |
| public.fishing_attempts | true | user_id: uuid, operation_id: uuid, region_id: text, bait_id: text, rarity: game_rarity?, created_at: timestamp with time zone, collectible_id: uuid? |
| public.fishing_baits | true | id: text, name: text, description: text, price: integer?, image_path: text, sort_order: integer, common_bp: integer, rare_bp: integer, epic_bp: integer, mythic_bp: integer, failure_bp: integer, effect_kind: text, effect_description: text, success_chance_bp: integer?, fish_only: boolean, alternating: boolean |
| public.fishing_expeditions | true | id: uuid, user_id: uuid, vessel_id: text, region_id: text, cargo: jsonb, vessel_snapshot: jsonb, departed_at: timestamp with time zone, returns_at: timestamp with time zone, claimed_at: timestamp with time zone?, result: jsonb?, notified_at: timestamp with time zone? |
| public.fishing_map_blueprints | true | region_id: text, piece_count: integer, thumbnail_path: text, enabled: boolean, rarity: game_rarity |
| public.fishing_relics | true | id: text, name: text, description: text, rarity: game_rarity, thumbnail_path: text, enabled: boolean, effect_kind: text, effect_value: numeric, sell_price: integer |
| public.fishing_rods | true | id: text, name: text, price: integer, region_id: text?, failure_reduction_bp: integer, native_bonus_bp: integer, wait_reduction_seconds: integer |
| public.fishing_showcase_posts | true | id: uuid, author_id: uuid, operation_id: uuid, caption: text, species: jsonb, rarity: game_rarity, region_name: text, caught_at: timestamp with time zone, created_at: timestamp with time zone, first_discovery: boolean, render_version: smallint |
| public.fishing_showcase_reactions | true | post_id: uuid, user_id: uuid, reaction: text |
| public.fishing_vessels | true | id: text, name: text, price: integer, duration_minutes: integer, min_baits: integer, max_baits: integer, bonus_kind: text, bonus_count: integer, bonus_description: text, sort_order: integer, bonus_basic_count: integer, failure_reduction_bp: integer |
| public.friend_requests | true | id: uuid, sender_id: uuid, recipient_id: uuid, status: text, created_at: timestamp with time zone, updated_at: timestamp with time zone |
| public.gold_transactions | true | user_id: uuid, operation_id: uuid, action: text, item_id: text?, delta: integer, created_at: timestamp with time zone |
| public.harbor_boats | true | id: uuid, user_id: uuid, vessel_id: text, instance_no: integer, dock_slot: integer?, purchased_at: timestamp with time zone, sold_at: timestamp with time zone?, paid_price: integer? |
| public.harbor_vessels | true | id: text, name: text, price: integer, duration_minutes: integer, fuel_cost: integer, fishing_count: integer, sprite_path: text, sort_order: integer, fishing_count_max: integer?, catch_bait_id: text, native_bonus: boolean, catch_rule: jsonb |
| public.harbor_voyages | true | id: uuid, user_id: uuid, vessel_id: text, vessel_snapshot: jsonb, departed_at: timestamp with time zone, returns_at: timestamp with time zone, arrival_seen_at: timestamp with time zone?, claimed_at: timestamp with time zone?, result: jsonb?, boat_id: uuid, region_id: text, notified_at: timestamp with time zone? |
| public.memory_game_runs | true | id: uuid, user_id: uuid, operation_id: uuid, created_at: timestamp with time zone, timer_started_at: timestamp with time zone?, finished_at: timestamp with time zone?, abandoned_at: timestamp with time zone?, elapsed_ms: bigint?, moves: integer |
| public.music_defaults | true | video_id: text, title: text, sort_order: integer |
| public.music_libraries | true | user_id: uuid, created_at: timestamp with time zone |
| public.music_tracks | true | user_id: uuid, video_id: text, title: text, custom_name: text, created_at: timestamp with time zone |
| public.notices | true | id: uuid, category: text, title: text, body: text, images: text[], status: text, pinned: boolean, starts_at: timestamp with time zone?, ends_at: timestamp with time zone?, author_id: uuid?, created_at: timestamp with time zone, updated_at: timestamp with time zone, published_at: timestamp with time zone?, revision: integer, notified_at: timestamp with time zone? |
| public.notifications | true | id: uuid, recipient_id: uuid, actor_id: uuid?, category: text, kind: text, title: text, body: text, request_id: uuid?, read_at: timestamp with time zone?, created_at: timestamp with time zone, gift_id: uuid?, notice_id: uuid?, expedition_id: uuid?, achievement_id: text?, expedition_boost_id: uuid?, board_post_id: uuid?, harbor_voyage_id: uuid?, production_site_id: uuid?, production_started_at: timestamp with time zone?, bait_production_site_id: uuid?, bait_production_started_at: timestamp with time zone? |
| public.odd_even_runs | true | id: uuid, user_id: uuid, operation_id: uuid, payout_operation_id: uuid, stake: integer, wins: integer, round: integer, stage: text, pearls: integer?, choice: text?, started_at: timestamp with time zone, finished_at: timestamp with time zone? |
| public.owned_aquarium_backgrounds | true | user_id: uuid, background_id: text, purchased_at: timestamp with time zone |
| public.player_aquariums | true | user_id: uuid, background_id: text |
| public.player_attendance | true | user_id: uuid, last_claim_date: date?, streak: integer, completed_sheets: integer, sheet_streak_offset: integer |
| public.player_collectibles | true | id: uuid, user_id: uuid, species_id: text, tank_id: uuid?, map_region_id: text?, animation_seed: integer, position_x: numeric?, position_y: numeric?, acquired_at: timestamp with time zone, sold_at: timestamp with time zone?, escrow_gift_id: uuid?, rotation: numeric, scale: numeric, flipped: boolean, position_locked: boolean, consumed_at: timestamp with time zone?, display_layer: smallint? |
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
| public.production_facilities | true | id: text, name: text, description: text, kind: text, price: integer, input_count: integer, output_count: integer, production_minutes: integer, storage_minutes: integer, image_path: text, enabled: boolean |
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
| app_private.arrange_collectible_with_lock | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric, p_flipped boolean, p_position_locked boolean | true |
| app_private.arrange_decoration | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric | true |
| app_private.attendance_state |  | true |
| app_private.auction_bid | p_id uuid, p_amount integer, p_operation_id uuid | true |
| app_private.auction_cancel | p_id uuid | true |
| app_private.auction_post | p_kind text, p_item_id text, p_quantity integer, p_title text, p_description text, p_minimum_price integer, p_days integer, p_operation_id uuid | true |
| app_private.auction_settle | p_id uuid | false |
| app_private.auction_settle_due |  | true |
| app_private.auction_state | p_tab text, p_query text, p_offset integer | true |
| app_private.automatic_experience_event |  | true |
| app_private.award_experience | p_user uuid, p_source text, p_source_id uuid, p_xp integer | true |
| app_private.award_title | p_user uuid, p_title text | true |
| app_private.bait_production_action | p_action text, p_operation_id uuid, p_facility text, p_quantity integer | true |
| app_private.bait_production_active_count |  | true |
| app_private.bait_production_state |  | true |
| app_private.base_quest_period | p_kind text, p_now timestamp with time zone | true |
| app_private.board_action | p_action text, p_payload jsonb | true |
| app_private.board_detail | p_id uuid, p_offset integer | true |
| app_private.board_feed | p_sort text, p_mine boolean, p_offset integer | true |
| app_private.board_post_json | p board_posts | true |
| app_private.boost_friend_expedition | p_expedition_id uuid | true |
| app_private.brick_game_settle | p_user_id uuid, p_run_id uuid, p_score integer, p_reward integer, p_replay jsonb, p_final boolean | true |
| app_private.brick_game_start | p_operation_id uuid | true |
| app_private.brick_game_start | p_operation_id uuid, p_engine_version integer | true |
| app_private.brick_leaderboard | p_offset integer | true |
| app_private.buy_aquarium_tank | p_operation_id uuid | true |
| app_private.buy_fishing_bait | p_bait_id text, p_operation_id uuid | true |
| app_private.buy_region_map | p_region_id text, p_operation_id uuid | true |
| app_private.capture_title_acquisition |  | true |
| app_private.cast_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | true |
| app_private.catch_experience | p_kind text, p_rarity text, p_automatic boolean | false |
| app_private.challenge_title_metrics | p_user uuid | true |
| app_private.check_native_collectible_habitats |  | false |
| app_private.claim_attendance | p_day date | true |
| app_private.claim_collectible_gift | p_gift_id uuid | true |
| app_private.claim_quest | p_kind text, p_start date, p_quest_id text | true |
| app_private.claim_web_push | p_limit integer | true |
| app_private.clean_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | true |
| app_private.collectible_available_at | p_species_id text, p_at timestamp with time zone | false |
| app_private.collectible_habitat_weight | p_primary_region text, p_region text | false |
| app_private.collectible_storage | p_offset integer, p_query text, p_kind text | true |
| app_private.collectible_storage_filtered | p_offset integer, p_query text, p_kind text, p_rarity text, p_concept text | true |
| app_private.collection_state |  | true |
| app_private.complete_first_fishing_placement |  | true |
| app_private.configure_web_push_worker | p_url text, p_secret text, p_keys jsonb | true |
| app_private.confirm_bug_report | p_id uuid | true |
| app_private.consume_bait_cycle |  | false |
| app_private.default_collectible_movement |  | false |
| app_private.delete_exchange_listing_comment | p_comment_id uuid | true |
| app_private.delete_fishing_showcase | p_post_id uuid | true |
| app_private.deliver_merchant_order | p_order_id uuid, p_operation_id uuid | true |
| app_private.deliver_merchant_order | p_order_id uuid, p_operation_id uuid, p_message text | true |
| app_private.deliver_notice_publication |  | true |
| app_private.dispatch_web_push |  | true |
| app_private.edit_exchange_listing_title | p_listing_id uuid, p_title text | true |
| app_private.enforce_fishing_maintenance |  | true |
| app_private.enqueue_expiring_production_push |  | true |
| app_private.enqueue_web_push |  | true |
| app_private.enroll_first_fishing_tutorial |  | true |
| app_private.ensure_merchant_orders |  | true |
| app_private.equip_fishing_rod | p_rod_id text | true |
| app_private.equip_relic | p_relic_id text, p_operation_id uuid, p_expected_fee integer | true |
| app_private.equip_title | p_title text | true |
| app_private.everyday_title_metrics | p_user uuid | true |
| app_private.exchange_action | p_listing_id uuid, p_action text | true |
| app_private.exchange_asset | p_kind text, p_id text, p_quantity integer | false |
| app_private.exchange_deliver | p_gift uuid, p_recipient uuid, p_message text | false |
| app_private.exchange_inventory |  | true |
| app_private.exchange_listing_detail | p_listing_id uuid, p_offset integer | true |
| app_private.exchange_post | p_side text, p_offer_kind text, p_offer_id text, p_offer_quantity integer, p_wanted_kind text, p_wanted_id text, p_wanted_quantity integer, p_operation_id uuid, p_title text | true |
| app_private.exchange_post_bundle | p_items jsonb, p_price integer, p_operation_id uuid, p_title text | true |
| app_private.exchange_reserve | p_owner uuid, p_asset jsonb | false |
| app_private.exchange_state | p_tab text, p_query text, p_offset integer | true |
| app_private.expand_aquarium_capacity | p_target_capacity integer, p_operation_id uuid | true |
| app_private.expand_aquarium_tank | p_tank_id uuid, p_target_capacity integer, p_operation_id uuid | true |
| app_private.expedition_action | p_action text, p_operation_id uuid, p_vessel_id text, p_region_id text, p_cargo jsonb, p_expedition_id uuid | true |
| app_private.expedition_boosts_payload | p_expedition uuid | false |
| app_private.expedition_pick | p_region text, p_bait text, p_native boolean, p_local_discovery boolean | false |
| app_private.expedition_return_notice |  | true |
| app_private.expedition_state |  | true |
| app_private.expedition_success_chance_bp | p_bait_id text, p_reduction integer | false |
| app_private.experience_level | p_xp numeric | false |
| app_private.experience_state |  | true |
| app_private.feed_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | true |
| app_private.feedback_authors | p_kind text, p_ids uuid[] | true |
| app_private.feedback_can_read | p_kind text, p_id uuid | true |
| app_private.feedback_comment_action | p_kind text, p_id uuid, p_action text, p_comment_id uuid, p_body text | true |
| app_private.feedback_comments | p_kind text, p_id uuid, p_offset integer | true |
| app_private.find_player_by_code | p_code text | true |
| app_private.finish_fishing | p_operation_id uuid, p_won boolean | true |
| app_private.finish_web_push | p_id bigint, p_lease_token uuid, p_status integer | true |
| app_private.first_fishing_tutorial | p_action text | true |
| app_private.fishing_bait_balance_at | p_bait_id text, p_at timestamp with time zone | false |
| app_private.fishing_discovery_candidates | p_rarity game_rarity | false |
| app_private.fishing_maintenance_active | p_at timestamp with time zone | true |
| app_private.fishing_map_piece_payload | p_region text, p_piece integer, p_user uuid | false |
| app_private.fishing_relic_payload | p_id text | false |
| app_private.fishing_reward_category | p_roll double precision | false |
| app_private.fishing_rod_state |  | true |
| app_private.fishing_state |  | true |
| app_private.fishing_success_chance_bp | p_bait_id text | false |
| app_private.friend_aquarium | p_owner uuid | true |
| app_private.friend_expedition | p_owner uuid | true |
| app_private.friend_expedition_status |  | true |
| app_private.friend_help_experience_event |  | true |
| app_private.friend_levels |  | true |
| app_private.friend_presence_state |  | true |
| app_private.get_gold_wallet |  | true |
| app_private.gift_detail | p_gift_id uuid | true |
| app_private.gift_mailbox | p_direction text, p_offset integer | true |
| app_private.giseong_catch_event |  | true |
| app_private.giseong_settled_capture_event |  | true |
| app_private.grant_giseong_capture_reward | p_user_id uuid, p_species_id text, p_captured_at timestamp with time zone, p_now timestamp with time zone | true |
| app_private.grant_giseong_catch_reward | p_user_id uuid, p_operation_id uuid, p_now timestamp with time zone | true |
| app_private.grant_special_bait_reward | p_recipient uuid, p_quantity integer | false |
| app_private.growth_quest_period |  | true |
| app_private.hall_action | p_target uuid, p_action text, p_value integer, p_body text, p_comment_id uuid | true |
| app_private.hall_of_fame |  | true |
| app_private.hall_section_action | p_section text, p_action text, p_body text, p_comment_id uuid, p_value integer | true |
| app_private.hall_section_counts |  | true |
| app_private.hall_section_wall | p_section text, p_offset integer | true |
| app_private.hall_wall | p_target uuid, p_offset integer | true |
| app_private.harbor_action | p_action text, p_operation_id uuid, p_vessel_id text, p_voyage_id uuid, p_quantity integer, p_boat_id uuid, p_slot integer, p_region_id text, p_secondary_region_id text | true |
| app_private.harbor_draw | p_region text, p_rule jsonb | false |
| app_private.harbor_state |  | true |
| app_private.initialize_player_welcome |  | true |
| app_private.ladder_game | p_action text, p_operation_id uuid, p_mode text, p_stake integer, p_choice integer | true |
| app_private.ladder_leaderboard | p_offset integer | true |
| app_private.lock_collectible_habitat_species |  | false |
| app_private.manage_aquarium_tank | p_tank_id uuid, p_action text, p_value text | true |
| app_private.manual_experience_event |  | true |
| app_private.manual_fishing_success_chance_bp | p_bait_id text | false |
| app_private.map_shop_state |  | true |
| app_private.mark_harbor_titles_dirty |  | true |
| app_private.memory_game | p_action text, p_operation_id uuid, p_run_id uuid, p_card integer | true |
| app_private.memory_leaderboard | p_offset integer | true |
| app_private.memory_response | p_id uuid | false |
| app_private.merchant_easy_items | p_items jsonb | false |
| app_private.merchant_order_bonus | p_items jsonb | false |
| app_private.merchant_order_grade | p_roll integer | false |
| app_private.merchant_order_shape | p_slot integer | false |
| app_private.merchant_recipe | p_size_roll integer, p_grade_roll integer | false |
| app_private.merchant_reward | p_count integer, p_rarity text | false |
| app_private.merchant_state |  | true |
| app_private.move_collectibles | p_collectible_ids uuid[], p_tank_id uuid | true |
| app_private.music_edit | p_action text, p_id text, p_title text, p_name text | true |
| app_private.music_library | p_import jsonb | true |
| app_private.notice_delete | p_id uuid, p_revision integer | true |
| app_private.notice_is_operator |  | true |
| app_private.notice_save | p_id uuid, p_category text, p_title text, p_body text, p_images text[], p_status text, p_pinned boolean, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_revision integer | true |
| app_private.notifications_opened |  | true |
| app_private.notify_due_bait_production_sites |  | true |
| app_private.notify_due_expeditions | p_expedition_id uuid | true |
| app_private.notify_due_harbor_voyages | p_voyage_id uuid | true |
| app_private.notify_due_production_sites | p_site_id uuid | true |
| app_private.odd_even_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round integer, p_choice text | true |
| app_private.odd_even_leaderboard | p_offset integer | true |
| app_private.odd_even_response | p_id uuid | false |
| app_private.owned_collectibles |  | true |
| app_private.personal_bait_workshop_action | p_action text, p_operation_id uuid, p_bait_id text, p_quantity integer, p_minutes integer, p_job_id uuid, p_expected_fuel integer | true |
| app_private.personal_bait_workshop_state |  | true |
| app_private.pick_bait_fish | p_region text, p_rarity game_rarity, p_native boolean, p_manual boolean | false |
| app_private.pick_balanced_bait_collectible | p_region text, p_rarity game_rarity, p_bait text, p_native boolean, p_manual boolean | false |
| app_private.pick_habitat_group | p_ids text[], p_region text, p_rod_region text, p_home_multiplier numeric, p_rarity_fallback boolean | false |
| app_private.pick_profile_collectible | p_region text, p_rarity game_rarity, p_profile jsonb, p_manual boolean, p_native boolean, p_local_discovery boolean | false |
| app_private.pick_regional_collectible | p_region_id text, p_rarity game_rarity, p_decoration boolean, p_map_roll integer | false |
| app_private.pick_special_bait_collectible | p_region_id text, p_rarity game_rarity, p_bait_id text | false |
| app_private.place_collectible | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric | true |
| app_private.player_directory | p_offset integer, p_limit integer | true |
| app_private.player_level | p_user uuid | true |
| app_private.player_level_progress | p_user uuid | true |
| app_private.player_levels | p_ids uuid[], p_friend_codes text[] | true |
| app_private.player_presence_ping | p_session_id uuid, p_state text, p_revision integer | true |
| app_private.prepare_discovery_cast | p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean, p_discovery boolean | true |
| app_private.prepare_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | true |
| app_private.prepare_fishing | p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean | true |
| app_private.prepared_fishing_payload | p app_private.prepared_fishing_casts | false |
| app_private.process_title_queue |  | true |
| app_private.production_action | p_action text, p_operation_id uuid, p_facility text, p_materials jsonb | true |
| app_private.production_active_count |  | true |
| app_private.production_apply | p_action text, p_operation_id uuid, p_facility text, p_materials jsonb, p_return_state boolean | true |
| app_private.production_bulk_action | p_action text, p_operation_id uuid, p_steps jsonb, p_allow_valuable boolean | true |
| app_private.production_materials | p_facility text | true |
| app_private.production_purchase | p_facility text, p_quantity integer, p_operation_id uuid | true |
| app_private.production_site | p_reference text | true |
| app_private.production_state |  | true |
| app_private.profile_fishing_rarity | p_profile jsonb | false |
| app_private.protect_first_fishing_catch |  | true |
| app_private.publish_expedition_showcase | p_source text, p_trip_id uuid, p_collectible_id uuid, p_caption text | true |
| app_private.publish_fishing_showcase | p_operation_id uuid, p_caption text | true |
| app_private.push_delivery_current | q app_private.push_deliveries, u uuid | false |
| app_private.quest_period | p_kind text, p_now timestamp with time zone | true |
| app_private.quest_state |  | true |
| app_private.queue_title_catalog_change |  | true |
| app_private.rare_title_metrics | p_user uuid | true |
| app_private.rare_title_tank_event |  | true |
| app_private.react_fishing_showcase | p_post_id uuid, p_reaction text | true |
| app_private.react_to_collectible_gift | p_gift_id uuid, p_reaction text | true |
| app_private.refresh_return_notifications |  | true |
| app_private.region_map |  | true |
| app_private.regional_bait_odds | p_bait_id text, p_region_id text | false |
| app_private.reject_new_board_reply |  | false |
| app_private.relic_bonus | p_effect text | true |
| app_private.relic_state |  | true |
| app_private.remove_friend | p_request_id uuid | true |
| app_private.reorder_aquarium_tanks | p_tank_ids uuid[], p_expected_ids uuid[] | true |
| app_private.require_aquarium_friend | p_owner uuid | false |
| app_private.reset_production_ready_notice |  | false |
| app_private.resize_aquarium_fish | p_collectible_id uuid, p_tank_id uuid, p_scale numeric | true |
| app_private.resolve_fishing | p_bait_id text, p_roll integer | false |
| app_private.resolve_regional_fishing | p_bait_id text, p_region_id text, p_roll integer | false |
| app_private.respond_friend_request | p_request_id uuid, p_action text | true |
| app_private.rod_habitat_weight | p_primary_region text, p_region text, p_rod_region text | false |
| app_private.savings_action | p_action text, p_operation_id uuid, p_account_id uuid, p_term_days integer, p_daily_amount integer | true |
| app_private.savings_payload | a shell_savings, p_now timestamp with time zone | false |
| app_private.savings_state |  | true |
| app_private.sell_collectibles | p_collectible_ids uuid[], p_operation_id uuid | true |
| app_private.sell_relic | p_relic_id text, p_operation_id uuid, p_expected_price integer | true |
| app_private.send_collectible_gift | p_recipient_id uuid, p_collectible_ids uuid[], p_message text, p_operation_id uuid | true |
| app_private.send_friend_request | p_code text | true |
| app_private.send_player_friend_request | p_player uuid | true |
| app_private.send_welcome_gift | p_user_id uuid | true |
| app_private.set_collectible_display_layer | p_collectible_id uuid, p_tank_id uuid, p_layer integer | true |
| app_private.set_exchange_listing_like | p_listing_id uuid, p_liked boolean | true |
| app_private.set_map_piece_test_count | p_region_id text, p_count integer | true |
| app_private.set_player_avatar | p_path text | true |
| app_private.set_region_test_lock | p_region_id text, p_locked boolean | true |
| app_private.settle_arcade_weeks | p_now timestamp with time zone | true |
| app_private.settle_legacy_expedition | p_action text, p_operation_id uuid, p_vessel_id text, p_region_id text, p_cargo jsonb, p_expedition_id uuid | true |
| app_private.settle_legacy_harbor | p_action text, p_operation_id uuid, p_vessel_id text, p_voyage_id uuid, p_quantity integer | true |
| app_private.shadow_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round_id uuid, p_choice_id text | true |
| app_private.shadow_leaderboard | p_offset integer | true |
| app_private.shadow_new_round | p_run uuid | false |
| app_private.shadow_run_response | p_run uuid | false |
| app_private.showcase_feed | p_mine boolean, p_offset integer | true |
| app_private.showcase_post_json | p fishing_showcase_posts | false |
| app_private.showcase_reaction_people | p_post_id uuid, p_reaction text, p_offset integer | true |
| app_private.snapshot_harbor_catch_rule |  | true |
| app_private.snapshot_trap_bait_rules |  | true |
| app_private.species_payload | p_species_id text, p_map_region_id text | false |
| app_private.stamp_bug_report_author |  | false |
| app_private.stamp_suggestion_author |  | false |
| app_private.start_fishing_fight | p_operation_id uuid | true |
| app_private.sync_player_profile |  | true |
| app_private.sync_player_titles | p_user uuid | true |
| app_private.sync_titles |  | true |
| app_private.title_activity_event |  | true |
| app_private.title_board_activity |  | true |
| app_private.title_catch_event |  | true |
| app_private.title_last_bait |  | true |
| app_private.title_metrics | p_user uuid | true |
| app_private.title_state |  | true |
| app_private.title_tank_event |  | true |
| app_private.trade_fishing_rod | p_rod_id text, p_action text, p_operation_id uuid | true |
| app_private.trade_gold | p_operation_id uuid, p_action text, p_item_id text | true |
| app_private.trap_minutes_per_bait |  | false |
| app_private.trap_pick | p_region text, p_bait text, p_native boolean, p_local_discovery boolean, p_snapshot jsonb | false |
| app_private.trap_success_chance_bp | p_bait text, p_reduction integer, p_snapshot jsonb | false |
| app_private.travel_region | p_region_id text | true |
| app_private.validate_fishing_map_blueprint |  | true |
| app_private.web_push_device | p_action text, p_subscription jsonb, p_categories text[] | true |
| app_private.web_push_worker_configuration |  | true |
| public.add_exchange_listing_comment | p_listing_id uuid, p_body text, p_operation_id uuid | false |
| public.adopt_suggestion | p_id uuid | false |
| public.aquarium_background | p_id text, p_action text, p_operation_id uuid | false |
| public.aquarium_state |  | false |
| public.arrange_collectible_with_lock | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric, p_flipped boolean, p_position_locked boolean | false |
| public.arrange_decoration | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric, p_rotation numeric, p_scale numeric | false |
| public.attendance_state |  | false |
| public.auction_bid | p_id uuid, p_amount integer, p_operation_id uuid | false |
| public.auction_cancel | p_id uuid | false |
| public.auction_post | p_kind text, p_item_id text, p_quantity integer, p_title text, p_description text, p_minimum_price integer, p_days integer, p_operation_id uuid | false |
| public.auction_state | p_tab text, p_query text, p_offset integer | false |
| public.bait_production_action | p_action text, p_operation_id uuid, p_facility text, p_quantity integer | false |
| public.bait_production_state |  | false |
| public.board_action | p_action text, p_payload jsonb | false |
| public.board_detail | p_id uuid, p_offset integer | false |
| public.board_feed | p_sort text, p_mine boolean, p_offset integer | false |
| public.boost_friend_expedition | p_expedition_id uuid | false |
| public.brick_game_settle | p_user_id uuid, p_run_id uuid, p_score integer, p_reward integer, p_replay jsonb, p_final boolean | false |
| public.brick_game_start | p_operation_id uuid | false |
| public.brick_game_start | p_operation_id uuid, p_engine_version integer | false |
| public.brick_leaderboard | p_offset integer | false |
| public.buy_aquarium_tank | p_operation_id uuid | false |
| public.buy_fishing_bait | p_bait_id text, p_operation_id uuid | false |
| public.buy_region_map | p_region_id text, p_operation_id uuid | false |
| public.cast_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | false |
| public.claim_attendance | p_day date | false |
| public.claim_collectible_gift | p_gift_id uuid | false |
| public.claim_quest | p_kind text, p_start date, p_quest_id text | false |
| public.claim_web_push | p_limit integer | false |
| public.clean_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | false |
| public.collectible_storage | p_offset integer, p_query text, p_kind text | false |
| public.collectible_storage_filtered | p_offset integer, p_query text, p_kind text, p_rarity text, p_concept text | false |
| public.collection_state |  | false |
| public.configure_web_push_worker | p_url text, p_secret text, p_keys jsonb | false |
| public.confirm_bug_report | p_id uuid | false |
| public.delete_exchange_listing_comment | p_comment_id uuid | false |
| public.delete_fishing_showcase | p_post_id uuid | false |
| public.deliver_merchant_order | p_order_id uuid, p_operation_id uuid | false |
| public.deliver_merchant_order | p_order_id uuid, p_operation_id uuid, p_message text | false |
| public.edit_exchange_listing_title | p_listing_id uuid, p_title text | false |
| public.equip_fishing_rod | p_rod_id text | false |
| public.equip_relic | p_relic_id text, p_operation_id uuid, p_expected_fee integer | false |
| public.equip_title | p_title text | false |
| public.exchange_action | p_listing_id uuid, p_action text | false |
| public.exchange_inventory |  | false |
| public.exchange_listing_detail | p_listing_id uuid, p_offset integer | false |
| public.exchange_post | p_side text, p_offer_kind text, p_offer_id text, p_offer_quantity integer, p_wanted_kind text, p_wanted_id text, p_wanted_quantity integer, p_operation_id uuid, p_title text | false |
| public.exchange_post_bundle | p_items jsonb, p_price integer, p_operation_id uuid, p_title text | false |
| public.exchange_state | p_tab text, p_query text, p_offset integer | false |
| public.expand_aquarium_capacity | p_target_capacity integer, p_operation_id uuid | false |
| public.expand_aquarium_tank | p_tank_id uuid, p_target_capacity integer, p_operation_id uuid | false |
| public.expedition_action | p_action text, p_operation_id uuid, p_vessel_id text, p_region_id text, p_cargo jsonb, p_expedition_id uuid | false |
| public.expedition_state |  | false |
| public.experience_state |  | false |
| public.feed_friend_aquarium | p_tank uuid, p_operation uuid, p_step integer | false |
| public.feedback_authors | p_kind text, p_ids uuid[] | false |
| public.feedback_comment_action | p_kind text, p_id uuid, p_action text, p_comment_id uuid, p_body text | false |
| public.feedback_comments | p_kind text, p_id uuid, p_offset integer | false |
| public.feedback_reactions | p_kind text, p_ids uuid[] | false |
| public.find_player_by_code | p_code text | false |
| public.finish_fishing | p_operation_id uuid, p_won boolean | false |
| public.finish_web_push | p_id bigint, p_lease_token uuid, p_status integer | false |
| public.first_fishing_tutorial | p_action text | false |
| public.fishing_rod_state |  | false |
| public.fishing_state |  | false |
| public.friend_aquarium | p_owner uuid | false |
| public.friend_expedition | p_owner uuid | false |
| public.friend_expedition_status |  | false |
| public.friend_levels |  | false |
| public.friend_presence_state |  | false |
| public.get_gold_wallet |  | false |
| public.gift_detail | p_gift_id uuid | false |
| public.gift_mailbox | p_direction text, p_offset integer | false |
| public.hall_action | p_target uuid, p_action text, p_value integer, p_body text, p_comment_id uuid | false |
| public.hall_of_fame |  | false |
| public.hall_section_action | p_section text, p_action text, p_body text, p_comment_id uuid, p_value integer | false |
| public.hall_section_counts |  | false |
| public.hall_section_wall | p_section text, p_offset integer | false |
| public.hall_wall | p_target uuid, p_offset integer | false |
| public.harbor_action | p_action text, p_operation_id uuid, p_vessel_id text, p_voyage_id uuid, p_quantity integer, p_boat_id uuid, p_slot integer, p_region_id text, p_secondary_region_id text | false |
| public.harbor_state |  | false |
| public.ladder_game | p_action text, p_operation_id uuid, p_mode text, p_stake integer, p_choice integer | false |
| public.ladder_leaderboard | p_offset integer | false |
| public.manage_aquarium_tank | p_tank_id uuid, p_action text, p_value text | false |
| public.map_shop_state |  | false |
| public.memory_game | p_action text, p_operation_id uuid, p_run_id uuid, p_card integer | false |
| public.memory_leaderboard | p_offset integer | false |
| public.merchant_state |  | false |
| public.move_collectibles | p_collectible_ids uuid[], p_tank_id uuid | false |
| public.music_edit | p_action text, p_id text, p_title text, p_name text | false |
| public.music_library | p_import jsonb | false |
| public.notice_delete | p_id uuid, p_revision integer | false |
| public.notice_is_operator |  | false |
| public.notice_save | p_id uuid, p_category text, p_title text, p_body text, p_images text[], p_status text, p_pinned boolean, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_revision integer | false |
| public.notifications_opened |  | false |
| public.odd_even_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round integer, p_choice text | false |
| public.odd_even_leaderboard | p_offset integer | false |
| public.personal_bait_workshop_action | p_action text, p_operation_id uuid, p_bait_id text, p_quantity integer, p_minutes integer, p_job_id uuid, p_expected_fuel integer | false |
| public.personal_bait_workshop_state |  | false |
| public.place_collectible | p_collectible_id uuid, p_tank_id uuid, p_x numeric, p_y numeric | false |
| public.player_directory | p_offset integer, p_limit integer | false |
| public.player_levels | p_ids uuid[], p_friend_codes text[] | false |
| public.player_presence_ping | p_session_id uuid, p_state text, p_revision integer | false |
| public.prepare_discovery_fishing | p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean | false |
| public.prepare_fishing | p_region_id text, p_bait_id text, p_operation_id uuid | false |
| public.prepare_fishing | p_region_id text, p_bait_id text, p_operation_id uuid, p_confirm_bite boolean | false |
| public.production_action | p_action text, p_operation_id uuid, p_facility text, p_materials jsonb | false |
| public.production_bulk_action | p_action text, p_operation_id uuid, p_steps jsonb, p_allow_valuable boolean | false |
| public.production_materials | p_facility text | false |
| public.production_purchase | p_facility text, p_quantity integer, p_operation_id uuid | false |
| public.production_state |  | false |
| public.publish_expedition_showcase | p_source text, p_trip_id uuid, p_collectible_id uuid, p_caption text | false |
| public.publish_fishing_showcase | p_operation_id uuid, p_caption text | false |
| public.quest_state |  | false |
| public.react_fishing_showcase | p_post_id uuid, p_reaction text | false |
| public.react_to_collectible_gift | p_gift_id uuid, p_reaction text | false |
| public.refresh_return_notifications |  | false |
| public.region_map |  | false |
| public.relic_state |  | false |
| public.remove_friend | p_request_id uuid | false |
| public.reorder_aquarium_tanks | p_tank_ids uuid[], p_expected_ids uuid[] | false |
| public.resize_aquarium_fish | p_collectible_id uuid, p_tank_id uuid, p_scale numeric | false |
| public.respond_friend_request | p_request_id uuid, p_action text | false |
| public.savings_action | p_action text, p_operation_id uuid, p_account_id uuid, p_term_days integer, p_daily_amount integer | false |
| public.savings_state |  | false |
| public.sell_collectibles | p_collectible_ids uuid[], p_operation_id uuid | false |
| public.sell_relic | p_relic_id text, p_operation_id uuid, p_expected_price integer | false |
| public.send_collectible_gift | p_recipient_id uuid, p_collectible_ids uuid[], p_message text, p_operation_id uuid | false |
| public.send_friend_request | p_code text | false |
| public.send_player_friend_request | p_player uuid | false |
| public.set_collectible_display_layer | p_collectible_id uuid, p_tank_id uuid, p_layer integer | false |
| public.set_exchange_listing_like | p_listing_id uuid, p_liked boolean | false |
| public.set_feedback_reaction | p_kind text, p_id uuid, p_value integer | false |
| public.set_map_piece_test_count | p_region_id text, p_count integer | false |
| public.set_player_avatar | p_path text | false |
| public.set_region_test_lock | p_region_id text, p_locked boolean | false |
| public.shadow_game | p_action text, p_operation_id uuid, p_run_id uuid, p_round_id uuid, p_choice_id text | false |
| public.shadow_leaderboard | p_offset integer | false |
| public.showcase_feed | p_mine boolean, p_offset integer | false |
| public.showcase_reaction_people | p_post_id uuid, p_reaction text, p_offset integer | false |
| public.start_fishing_fight | p_operation_id uuid | false |
| public.sync_player_profile |  | false |
| public.sync_titles |  | false |
| public.title_state |  | false |
| public.trade_fishing_rod | p_rod_id text, p_action text, p_operation_id uuid | false |
| public.trade_gold | p_operation_id uuid, p_action text, p_item_id text | false |
| public.travel_region | p_region_id text | false |
| public.web_push_device | p_action text, p_subscription jsonb, p_categories text[] | false |
| public.web_push_worker_configuration |  | false |
