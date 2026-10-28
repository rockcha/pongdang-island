// Hand-maintained APP CONTRACT: partial table coverage and domain-specific RPC returns.
// Full expected schema: docs/db/local-schema.json (local replay, not remote evidence).
// Compare separately generated remote types; do not blindly overwrite this contract.
import type { AppNotification, FriendRequest, Profile } from '@/features/social/types'
type RequestRow = Omit<FriendRequest, 'sender' | 'recipient'>
type NotificationRow = Omit<AppNotification, 'request'>
export type Database = {
  public: {
    Tables: {
      bug_reports: {Row:import('@/features/bugs/api').BugReport;Insert:import('@/features/bugs/api').BugReportDraft;Update:Partial<Omit<import('@/features/bugs/api').BugReportDraft,'id'>>;Relationships:[]}
      suggestion_posts: {Row:import('@/features/suggestions/api').Suggestion;Insert:import('@/features/suggestions/api').SuggestionDraft;Update:Partial<Omit<import('@/features/suggestions/api').SuggestionDraft,'id'>>;Relationships:[]}
      notices: {Row:import('@/features/notices/api').Notice;Insert:never;Update:never;Relationships:[]}
      player_profiles: {
        Row: Profile
        Insert: { id: string; nickname: string; friend_code?: string; created_at?: string }
        Update: { nickname?: string; avatar_path?: string | null }
        Relationships: []
      }
      friend_requests: {
        Row: RequestRow
        Insert: { sender_id: string; recipient_id: string; status?: FriendRequest['status'] }
        Update: { status?: FriendRequest['status']; updated_at?: string }
        Relationships: [
          { foreignKeyName: 'friend_requests_sender_id_fkey'; columns: ['sender_id']; isOneToOne: false; referencedRelation: 'player_profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'friend_requests_recipient_id_fkey'; columns: ['recipient_id']; isOneToOne: false; referencedRelation: 'player_profiles'; referencedColumns: ['id'] },
        ]
      }
      notifications: {
        Row: NotificationRow
        Insert: { recipient_id: string; category: AppNotification['category']; kind: AppNotification['kind']; title: string; body?: string; request_id?: string; actor_id?: string }
        Update: { read_at?: string | null }
        Relationships: [
          { foreignKeyName: 'notifications_request_id_fkey'; columns: ['request_id']; isOneToOne: false; referencedRelation: 'friend_requests'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      my_island_state:{Args:Record<string,never>;Returns:import('@/features/my-island/api').IslandSnapshot}
      save_my_island:{Args:{p_document:import('@/features/my-island/api').IslandDocument;p_revision:number;p_operation_id:string};Returns:import('@/features/my-island/api').IslandSaveResult}
      trade_island:{Args:{p_action:string;p_item_id:string;p_quantity:number;p_expected_price:number;p_operation_id:string};Returns:import('@/features/my-island/api').IslandTradeResult}
      development_fund_state:{Args:{p_offset?:number};Returns:import('@/features/development-fund/api').FundState}
      development_fund_cheers:{Args:{p_offset?:number};Returns:import('@/features/development-fund/api').FundCheers}
      development_fund_cheer:{Args:{p_id:string;p_body?:string|null;p_delete?:boolean};Returns:{ok:boolean}}
      development_fund_reports:{Args:{p_status?:string;p_offset?:number};Returns:import('@/features/development-fund/api').FundReports}
      development_fund_submit:{Args:{p_id:string;p_depositor_name:string;p_reported_won:number;p_remitted_at:string;p_message?:string;p_public_profile?:boolean};Returns:import('@/features/development-fund/api').FundReport}
      development_fund_review:{Args:{p_operation_id:string;p_id:string;p_action:string;p_revision:number;p_confirmed_won?:number|null;p_reason?:string;p_bank_reference?:string|null};Returns:import('@/features/development-fund/api').FundReport}
      menu_status:{Args:Record<string,never>;Returns:import('@/lib/menu-status').MenuStatus}
      notification_inbox:{Args:Record<string,never>;Returns:import('@/features/notifications/api').NotificationInbox}
      aquarium_like_state: { Args: {p_owner:string}; Returns: {count:number;liked:boolean;nextLikeAt:string;serverNow:string} }
      set_aquarium_like: { Args: {p_owner:string;p_liked:boolean}; Returns: {count:number;liked:boolean;nextLikeAt:string;serverNow:string} }
      web_push_device: {Args:{p_action:string;p_subscription:Record<string,unknown>;p_categories?:string[]};Returns:{registered:boolean;categories:import('@/features/notifications/push-device').PushCategory[]}}
      experience_state:{Args:Record<string,never>;Returns:import('@/features/experience/api').ExperienceState}
      friend_levels:{Args:Record<string,never>;Returns:import('@/features/experience/api').FriendLevel[]}
      player_levels:{Args:{p_ids:string[];p_friend_codes?:string[]};Returns:import('@/features/experience/api').PlayerLevelState[]}
      bait_production_state:{Args:Record<string,never>;Returns:import('@/features/production/bait-production-api').BaitProductionState}
      bait_production_action:{Args:import('@/features/production/bait-production-api').BaitProductionAction;Returns:import('@/features/production/bait-production-api').BaitProductionState}
      production_state:{Args:Record<string,never>;Returns:import('@/features/production/api').ProductionState}
      production_materials:{Args:{p_facility:string};Returns:import('@/features/production/api').ProductionMaterial[]}
      production_action:{Args:Omit<import('@/features/production/api').ProductionAction,'p_quantity'>;Returns:import('@/features/production/api').ProductionState}
      production_bulk_action:{Args:import('@/features/production/api').ProductionBulkAction;Returns:import('@/features/production/api').ProductionState}
      production_purchase:{Args:import('@/features/production/api').ProductionPurchase;Returns:import('@/features/production/api').ProductionState}
      showcase_feed:{Args:{p_mine?:boolean;p_offset?:number};Returns:import('@/features/showcase/api').ShowcaseFeed}
      showcase_reaction_people:{Args:{p_post_id:string;p_reaction?:import('@/features/showcase/api').ShowcaseReaction|null;p_offset?:number};Returns:import('@/features/showcase/api').ShowcaseReactionPeople}
      publish_fishing_showcase:{Args:{p_operation_id:string;p_caption:string};Returns:string}
      publish_expedition_showcase:{Args:{p_source:'trap'|'harbor';p_trip_id:string;p_collectible_id:string;p_caption:string};Returns:string}
      react_fishing_showcase:{Args:{p_post_id:string;p_reaction:import('@/features/showcase/api').ShowcaseReaction|null};Returns:import('@/features/showcase/api').ShowcasePost}
      delete_fishing_showcase:{Args:{p_post_id:string};Returns:string}
      refresh_return_notifications:{Args:Record<string,never>;Returns:import('@/features/notifications/api').ReturnNotificationStatus}
      feedback_authors:{Args:{p_kind:import('@/features/board/feedback-reactions').FeedbackKind;p_ids:string[]};Returns:import('@/features/board/feedback-post-row').FeedbackAuthorAvatar[]}
      feedback_comments:{Args:{p_kind:string;p_id:string;p_offset?:number};Returns:import('@/features/board/feedback-comments-api').FeedbackCommentPage}
      feedback_comment_action:{Args:{p_kind:string;p_id:string;p_action:string;p_comment_id:string;p_body?:string};Returns:string}
      feedback_reactions:{Args:{p_kind:import('@/features/board/feedback-reactions').FeedbackKind;p_ids:string[]};Returns:import('@/features/board/feedback-reactions').FeedbackReaction[]}
      set_feedback_reaction:{Args:{p_kind:import('@/features/board/feedback-reactions').FeedbackKind;p_id:string;p_value:number};Returns:import('@/features/board/feedback-reactions').FeedbackReaction}
      merchant_state:{Args:Record<string,never>;Returns:import('@/features/merchant/api').MerchantState}
      deliver_merchant_order:{Args:{p_order_id:string;p_operation_id:string;p_message:string};Returns:import('@/features/merchant/api').MerchantState}
      board_feed:{Args:{p_sort?:string;p_mine?:boolean;p_offset?:number};Returns:import('@/features/board/api').BoardFeed}
      board_detail:{Args:{p_id:string;p_offset?:number};Returns:import('@/features/board/api').BoardDetail|null}
      board_action:{Args:{p_action:import('@/features/board/api').BoardAction;p_payload:import('@/features/board/api').BoardPayload};Returns:string}
      ladder_game:{Args:{p_action:'state'|'play';p_operation_id?:string;p_mode?:import('@/features/arcade/ladder-model').LadderMode;p_stake?:number;p_choice?:number};Returns:{run:import('@/features/arcade/ladder-model').LadderRun|null}}
      ladder_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/ladder-api').LadderRanks}
      brick_game_start:{Args:{p_operation_id:string;p_engine_version?:number};Returns:import('@/features/arcade/brick-breaker-api').BrickRun}
      brick_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/brick-breaker-api').BrickRanks}
      harbor_state:{Args:Record<string,never>;Returns:import('@/features/port/api').HarborState}
      personal_bait_workshop_state:{Args:Record<string,never>;Returns:import('@/features/production/personal-bait-api').PersonalBaitState}
      personal_bait_workshop_action:{Args:import('@/features/production/personal-bait-api').PersonalBaitAction;Returns:import('@/features/production/personal-bait-api').PersonalBaitState}
      harbor_action:{Args:import('@/features/port/api').HarborAction;Returns:import('@/features/port/api').HarborState}
      cancel_harbor_voyage:{Args:{p_voyage_id:string;p_operation_id:string;p_refund_expected:boolean};Returns:import('@/features/port/api').HarborState}
      relic_showcase_catch:{Args:{p_relic_id:string};Returns:{operationId:string;species:import('@/features/collection/api').Species;regionName:string;caughtAt:string;firstDiscovery:boolean}}
      music_library:{Args:{p_import:import('@/features/music/music-library').MusicTrack[]|null};Returns:import('@/features/music/music-library').MusicTrack[]}
      music_edit:{Args:{p_action:string;p_id:string;p_title:string;p_name:string};Returns:import('@/features/music/music-library').MusicTrack[]}
      friend_expedition:{Args:{p_owner:string};Returns:import('@/features/expeditions/api').FriendExpeditionVisit}
      friend_expedition_status:{Args:Record<string,never>;Returns:import('@/features/expeditions/api').FriendExpeditionState}
      boost_friend_expedition:{Args:{p_expedition_id:string};Returns:import('@/features/expeditions/api').FriendExpeditionState}
      title_state:{Args:Record<string,never>;Returns:import('@/features/titles/api').TitleState}
      equip_title:{Args:{p_title:string|null};Returns:import('@/features/titles/api').TitleState}
      begging_state:{Args:{p_tab?:'active'|'mine';p_offset?:number};Returns:import('@/features/begging/api').BeggingFeed}
      begging_detail:{Args:{p_id:string;p_offset?:number};Returns:import('@/features/begging/api').BeggingDetail}
      begging_history:{Args:{p_offset?:number};Returns:import('@/features/begging/api').BeggingHistory}
      begging_create:{Args:{p_operation_id:string;p_story:string;p_goal_gold:number};Returns:import('@/features/begging/api').BeggingRequest}
      begging_give:{Args:{p_id:string;p_gold:number;p_operation_id:string};Returns:import('@/features/begging/api').BeggingResult}
      begging_close:{Args:{p_id:string};Returns:import('@/features/begging/api').BeggingRequest}
      sponsorship_state:{Args:{p_tab?:import('@/features/sponsorship/api').SponsorshipTab;p_offset?:number};Returns:import('@/features/sponsorship/api').SponsorshipFeed}
      sponsorship_detail:{Args:{p_id:string};Returns:import('@/features/sponsorship/api').Sponsorship}
      sponsorship_create:{Args:{p_operation_id:string;p_gold_each:number;p_slots:number;p_message?:string};Returns:import('@/features/sponsorship/api').Sponsorship}
      sponsorship_claim:{Args:{p_id:string};Returns:import('@/features/sponsorship/api').Sponsorship}
      sponsorship_cancel:{Args:{p_id:string};Returns:import('@/features/sponsorship/api').Sponsorship}
      new_content_state:{Args:Record<string,never>;Returns:import('./new-content').LatestContent}
      sync_titles:{Args:Record<string,never>;Returns:number}
      quest_state:{Args:Record<string,never>;Returns:import('@/features/quests/api').QuestState}
      claim_quest:{Args:{p_kind:import('@/features/quests/api').QuestKind;p_start:string;p_quest_id:string};Returns:import('@/features/quests/api').QuestState}
      expedition_state:{Args:Record<string,never>;Returns:import('@/features/expeditions/api').ExpeditionState}
      expedition_action:{Args:import('@/features/expeditions/api').ExpeditionAction;Returns:import('@/features/expeditions/api').ExpeditionState}
      voyage_bets_state:{Args:Record<string,never>;Returns:unknown}
      voyage_bets_place:{Args:{p_operation_id:string;p_plan_id:string;p_side:string;p_stake:number};Returns:unknown}
      today_fishing_records:{Args:Record<string,never>;Returns:import('@/features/fishing-records/api').TodayFishingRecords}
      voyage_race_state:{Args:Record<string,never>;Returns:import('@/features/voyage-bets/api').VoyageState}
      voyage_race_test_sample:{Args:Record<string,never>;Returns:import('@/features/voyage-bets/voyage-test-api').VoyageTestSample}
      voyage_race_place:{Args:import('@/features/voyage-bets/api').VoyageBetRequest;Returns:import('@/features/voyage-bets/api').VoyageState}
      savings_state:{Args:Record<string,never>;Returns:import('@/features/savings/api').SavingsState}
      savings_action:{Args:import('@/features/savings/api').SavingsAction;Returns:import('@/features/savings/api').SavingsResult}
      confirm_bug_report:{Args:{p_id:string};Returns:import('@/features/bugs/api').BugReport}
      adopt_suggestion:{Args:{p_id:string};Returns:import('@/features/suggestions/api').Suggestion}
      friend_aquarium:{Args:{p_owner:string};Returns:import('@/features/friends/aquarium-api').FriendAquarium}
      feed_friend_aquarium:{Args:{p_tank:string;p_operation:string;p_step:number};Returns:import('@/features/friends/aquarium-api').FeedingResult}
      clean_friend_aquarium:{Args:{p_tank:string;p_operation:string;p_step:number};Returns:import('@/features/friends/aquarium-api').CleaningResult}
      map_shop_state:{Args:Record<string,never>;Returns:import('@/features/regions/map-shop-api').MapShopState}
      buy_region_map:{Args:{p_region_id:string;p_operation_id:string};Returns:import('@/features/gold/api').GoldState & {delta:number}}
      notice_delete:{Args:{p_id:string;p_revision:number};Returns:undefined}
      notifications_opened:{Args:Record<string,never>;Returns:undefined}
      notice_is_operator:{Args:Record<string,never>;Returns:boolean}
      notice_save:{Args:import('@/features/notices/api').NoticeSave;Returns:import('@/features/notices/api').Notice}
      auction_state:{Args:{p_tab?:string;p_query?:string;p_offset?:number};Returns:import('@/features/auctions/api').AuctionFeed}
      auction_post:{Args:import('@/features/auctions/api').AuctionPost;Returns:import('@/features/auctions/api').Auction}
      auction_bid:{Args:{p_id:string;p_amount:number;p_operation_id:string};Returns:import('@/features/auctions/api').Auction}
      auction_cancel:{Args:{p_id:string};Returns:import('@/features/auctions/api').Auction}
      flea_state:{Args:{p_side?:string;p_query?:string;p_kind?:string;p_mine?:boolean;p_offset?:number};Returns:import('@/features/flea-market/api').FleaFeed}
      flea_post:{Args:import('@/features/flea-market/api').FleaDraft;Returns:import('@/features/flea-market/api').FleaPost}
      flea_trade:{Args:import('@/features/flea-market/api').FleaTrade;Returns:import('@/features/flea-market/api').FleaPost}
      flea_cancel:{Args:{p_post_id:string;p_operation_id:string};Returns:import('@/features/flea-market/api').FleaPost}
      exchange_state:{Args:{p_tab?:string;p_query?:string;p_offset?:number};Returns:import('@/features/exchange/api').ExchangePage}
      edit_exchange_listing_title:{Args:{p_listing_id:string;p_title:string};Returns:undefined}
      exchange_listing_detail:{Args:{p_listing_id:string;p_offset?:number};Returns:import('@/features/exchange/api').ExchangeDetail}
      set_exchange_listing_like:{Args:{p_listing_id:string;p_liked:boolean};Returns:{liked:boolean;like_count:number}}
      add_exchange_listing_comment:{Args:{p_listing_id:string;p_body:string;p_operation_id:string};Returns:string}
      delete_exchange_listing_comment:{Args:{p_comment_id:string};Returns:undefined}
      exchange_inventory:{Args:Record<string,never>;Returns:import('@/features/exchange/api').ExchangeInventory}
      exchange_post:{Args:import('@/features/exchange/api').ExchangePost;Returns:import('@/features/exchange/api').ExchangeListing}
      exchange_post_bundle:{Args:import('@/features/exchange/api').ExchangeBundlePost;Returns:import('@/features/exchange/api').ExchangeListing}
      exchange_action:{Args:{p_listing_id:string;p_action:string};Returns:import('@/features/exchange/api').ExchangeListing}
      hall_of_fame:{Args:Record<string,never>;Returns:import('@/features/hall-of-fame/api').HallFeed}
      hall_section_wall:{Args:{p_section:string;p_offset?:number};Returns:import('@/features/hall-of-fame/api').HallSectionWall}
      hall_section_action:{Args:import('@/features/hall-of-fame/api').HallSectionAction;Returns:import('@/features/hall-of-fame/api').HallSectionWall}
      hall_section_counts:{Args:Record<string,never>;Returns:Record<string,number>}
      hall_wall:{Args:{p_target:string;p_offset?:number};Returns:import('@/features/hall-of-fame/api').HallWall}
      hall_action:{Args:import('@/features/hall-of-fame/api').HallAction;Returns:import('@/features/hall-of-fame/api').HallWall}
      odd_even_game:{Args:import('@/features/arcade/odd-even-api').OddEvenAction;Returns:import('@/features/arcade/odd-even-api').OddEvenState}
      odd_even_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/odd-even-api').OddEvenRanks}
      pongi_whack_action:{Args:import('@/features/arcade/pongi-whack-api').WhackAction;Returns:import('@/features/arcade/pongi-whack-api').WhackState}
      pongi_whack_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/memory-api').MemoryLeaderboard}
      memory_game:{Args:import('@/features/arcade/memory-api').MemoryAction;Returns:import('@/features/arcade/memory-api').MemoryState}
      memory_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/memory-api').MemoryLeaderboard}
      shadow_game:{Args:import('@/features/arcade/shadow-api').ShadowAction;Returns:import('@/features/arcade/shadow-api').ShadowState}
      shadow_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/shadow-api').ShadowLeaderboard}
      attendance_state:{Args:Record<string,never>;Returns:import('@/features/attendance/api').AttendanceState}
      claim_attendance:{Args:{p_day:string};Returns:import('@/features/attendance/api').AttendanceClaim}
      fishing_rod_state:{Args:Record<string,never>;Returns:import('@/features/fishing/rod-api').RodState}
      equip_fishing_rod:{Args:{p_rod_id:string};Returns:import('@/features/fishing/rod-api').RodState}
      trade_fishing_rod:{Args:{p_rod_id:string;p_action:string;p_operation_id:string};Returns:import('@/features/gold/api').GoldState & import('@/features/fishing/rod-api').RodState & {delta:number}}
      prepare_fishing:{Args:{p_region_id:string;p_bait_id:string;p_operation_id:string;p_confirm_bite?:boolean};Returns:import('@/features/fishing/api').PreparedFishing}
      prepare_discovery_fishing:{Args:{p_region_id:string;p_bait_id:string;p_operation_id:string;p_confirm_bite?:boolean};Returns:import('@/features/fishing/api').PreparedFishing}
      start_fishing_fight:{Args:{p_operation_id:string};Returns:import('@/features/fishing/api').PreparedFishing}
      finish_fishing:{Args:{p_operation_id:string;p_won:boolean};Returns:import('@/features/fishing/api').FishingResult}
      resize_aquarium_fish:{Args:{p_collectible_id:string;p_tank_id:string;p_scale:number};Returns:{id:string;scale:number}}
      set_collectible_display_layer:{Args:{p_collectible_id:string;p_tank_id:string;p_layer:number|null};Returns:{id:string;display_layer:number|null}}
      arrange_collectible:{Args:{p_collectible_id:string;p_tank_id:string;p_x:number;p_y:number;p_rotation:number;p_scale:number;p_flipped:boolean};Returns:import('@/features/collection/api').DecorationPlacement & {id:string}}
      collectible_storage:{Args:{p_offset?:number;p_query?:string;p_kind?:string};Returns:import('@/features/aquarium/api').CollectibleStorage}
      collectible_storage_filtered:{Args:{p_offset?:number;p_query?:string;p_kind?:string;p_rarity?:string;p_concept?:string};Returns:import('@/features/aquarium/api').CollectibleStorage}
      move_collectibles:{Args:{p_collectible_ids:string[];p_tank_id:string|null};Returns:import('@/features/aquarium/api').AquariumState}
      send_collectible_gift:{Args:{p_recipient_id:string;p_collectible_ids:string[];p_message:string;p_operation_id:string};Returns:import('@/features/gifts/api').GiftRecord}
      claim_collectible_gift:{Args:{p_gift_id:string};Returns:import('@/features/gifts/api').GiftRecord}
      react_to_collectible_gift:{Args:{p_gift_id:string;p_reaction:string};Returns:import('@/features/gifts/api').GiftRecord}
      gift_mailbox:{Args:{p_direction?:string;p_offset?:number};Returns:import('@/features/gifts/api').GiftMailbox}
      gift_detail:{Args:{p_gift_id:string};Returns:import('@/features/gifts/api').GiftRecord}
      place_collectible: { Args: {p_collectible_id:string;p_tank_id:string;p_x:number;p_y:number}; Returns:{id:string;position_x:number;position_y:number} }
      arrange_decoration: { Args:{p_collectible_id:string;p_tank_id:string;p_x:number;p_y:number;p_rotation:number;p_scale:number}; Returns:import('@/features/collection/api').DecorationPlacement & {id:string} }
      arrange_collectible_with_lock:{Args:{p_collectible_id:string;p_tank_id:string;p_x:number;p_y:number;p_rotation:number;p_scale:number;p_flipped:boolean;p_position_locked:boolean};Returns:import('@/features/collection/api').DecorationPlacement & {id:string}}
      sell_collectibles: { Args: {p_collectible_ids:string[];p_operation_id:string}; Returns:import('@/features/gold/api').GoldState & {delta:number} }
      collection_state: { Args: Record<string, never>; Returns: import('@/features/collection/api').CollectionState }
      fishing_state: { Args: Record<string, never>; Returns: import('@/features/fishing/api').FishingState }
      buy_fishing_bait: { Args: { p_bait_id: string; p_operation_id: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      buy_fishing_bait_at_price:{Args:{p_bait_id:string;p_operation_id:string;p_expected_price:number};Returns:import('@/features/gold/api').GoldState&{delta:number}}
      cast_fishing: { Args: { p_region_id: string; p_bait_id: string; p_operation_id: string }; Returns: import('@/features/fishing/api').FishingResult }
      set_region_test_lock: { Args: { p_region_id: string; p_locked: boolean }; Returns: import('@/features/regions/api').RegionMap }
      region_map: { Args: Record<string, never>; Returns: import('@/features/regions/api').RegionMap }
      set_map_piece_test_count: { Args: {p_region_id:string;p_count:number}; Returns: import('@/features/regions/api').RegionMap }
      travel_region: { Args: { p_region_id: string }; Returns: import('@/features/regions/api').RegionMap }
      buy_aquarium_tank: { Args: { p_operation_id: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      manage_aquarium_tank: { Args: { p_tank_id: string; p_action: string; p_value: string }; Returns: import('@/features/aquarium/api').AquariumState }
      relic_state:{Args:Record<string,never>;Returns:import('@/features/relics/api').RelicState}
      buy_fishing_bait_bulk:{Args:{p_bait_id:string;p_quantity:number;p_operation_id:string;p_expected_price:number};Returns:import('@/features/gold/wallet').Wallet&{delta:number;replayed:boolean;quantity?:number;testClaimed:boolean;testEnabled:boolean}}
      equip_relic:{Args:{p_relic_id:string|null;p_operation_id:string;p_expected_fee?:number};Returns:import('@/features/relics/api').RelicState}
      sell_relic:{Args:{p_relic_id:string;p_operation_id:string;p_expected_price:number};Returns:import('@/features/relics/api').RelicState}
      aquarium_state: { Args: Record<string, never>; Returns: import('@/features/aquarium/api').AquariumState }
      expand_aquarium_tank:{Args:{p_tank_id:string;p_target_capacity:number;p_operation_id:string};Returns:import('@/features/aquarium/api').AquariumState}
      expand_aquarium_capacity:{Args:{p_target_capacity:number;p_operation_id:string};Returns:import('@/features/aquarium/api').AquariumState}
      reorder_aquarium_tanks: { Args: {p_tank_ids:string[];p_expected_ids:string[]}; Returns: import('@/features/aquarium/api').AquariumState }
      aquarium_background: { Args: { p_id: string; p_action: string; p_operation_id?: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      get_gold_wallet: { Args: Record<string, never>; Returns: import('@/features/gold/api').GoldState }
      trade_gold: { Args: { p_operation_id: string; p_action: string; p_item_id?: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      remove_friend: { Args: { p_request_id: string }; Returns: undefined }
      set_player_avatar: { Args: { p_path: string | null }; Returns: Profile }
      sync_player_profile: { Args: Record<string, never>; Returns: Profile }
      first_fishing_tutorial:{Args:{p_action?:import('@/features/onboarding/api').TutorialAction};Returns:import('@/features/onboarding/api').FirstFishingState}
      find_player_by_code: { Args: { p_code: string }; Returns: Profile[] }
      send_friend_request: { Args: { p_code: string }; Returns: string }
      player_directory: { Args: {p_offset?:number;p_limit?:number}; Returns: import('@/features/friends/api').PlayerDirectory }
      send_player_friend_request: { Args: {p_player:string}; Returns:string }
      player_presence_ping: { Args: {p_session_id:string;p_state:import('@/features/friends/presence-api').PresenceStatus;p_revision:number}; Returns:undefined }
      friend_presence_state: { Args:Record<string,never>; Returns:import('@/features/friends/presence-api').FriendPresenceState }
      respond_friend_request: { Args: { p_request_id: string; p_action: string }; Returns: undefined }
    }
    Enums: { game_rarity: import('@/lib/game/rarity').Rarity; collectible_kind: import('@/features/collection/api').CollectibleKind }
    CompositeTypes: Record<string, never>
  }
}
