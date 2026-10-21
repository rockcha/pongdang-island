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
      refresh_return_notifications:{Args:Record<string,never>;Returns:import('@/features/notifications/api').ReturnNotificationStatus}
      feedback_authors:{Args:{p_kind:import('@/features/board/feedback-reactions').FeedbackKind;p_ids:string[]};Returns:import('@/features/board/feedback-post-row').FeedbackAuthorAvatar[]}
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
      harbor_action:{Args:import('@/features/port/api').HarborAction;Returns:import('@/features/port/api').HarborState}
      music_library:{Args:{p_import:import('@/features/music/music-library').MusicTrack[]|null};Returns:import('@/features/music/music-library').MusicTrack[]}
      music_edit:{Args:{p_action:string;p_id:string;p_title:string;p_name:string};Returns:import('@/features/music/music-library').MusicTrack[]}
      friend_expedition:{Args:{p_owner:string};Returns:import('@/features/expeditions/api').FriendExpeditionVisit}
      friend_expedition_status:{Args:Record<string,never>;Returns:import('@/features/expeditions/api').FriendExpeditionState}
      boost_friend_expedition:{Args:{p_expedition_id:string};Returns:import('@/features/expeditions/api').FriendExpeditionState}
      title_state:{Args:Record<string,never>;Returns:import('@/features/titles/api').TitleState}
      equip_title:{Args:{p_title:string|null};Returns:import('@/features/titles/api').TitleState}
      sync_titles:{Args:Record<string,never>;Returns:number}
      quest_state:{Args:Record<string,never>;Returns:import('@/features/quests/api').QuestState}
      claim_quest:{Args:{p_kind:import('@/features/quests/api').QuestKind;p_start:string;p_quest_id:string};Returns:import('@/features/quests/api').QuestState}
      expedition_state:{Args:Record<string,never>;Returns:import('@/features/expeditions/api').ExpeditionState}
      expedition_action:{Args:import('@/features/expeditions/api').ExpeditionAction;Returns:import('@/features/expeditions/api').ExpeditionState}
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
      exchange_state:{Args:{p_tab?:string;p_query?:string;p_offset?:number};Returns:import('@/features/exchange/api').ExchangePage}
      edit_exchange_listing_title:{Args:{p_listing_id:string;p_title:string};Returns:undefined}
      exchange_listing_detail:{Args:{p_listing_id:string;p_offset?:number};Returns:import('@/features/exchange/api').ExchangeDetail}
      set_exchange_listing_like:{Args:{p_listing_id:string;p_liked:boolean};Returns:{liked:boolean;like_count:number}}
      add_exchange_listing_comment:{Args:{p_listing_id:string;p_body:string;p_operation_id:string};Returns:string}
      delete_exchange_listing_comment:{Args:{p_comment_id:string};Returns:undefined}
      exchange_inventory:{Args:Record<string,never>;Returns:import('@/features/exchange/api').ExchangeInventory}
      exchange_post:{Args:import('@/features/exchange/api').ExchangePost;Returns:import('@/features/exchange/api').ExchangeListing}
      exchange_action:{Args:{p_listing_id:string;p_action:string};Returns:import('@/features/exchange/api').ExchangeListing}
      odd_even_game:{Args:import('@/features/arcade/odd-even-api').OddEvenAction;Returns:import('@/features/arcade/odd-even-api').OddEvenState}
      odd_even_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/odd-even-api').OddEvenRanks}
      memory_game:{Args:import('@/features/arcade/memory-api').MemoryAction;Returns:import('@/features/arcade/memory-api').MemoryState}
      memory_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/memory-api').MemoryLeaderboard}
      shadow_game:{Args:import('@/features/arcade/shadow-api').ShadowAction;Returns:import('@/features/arcade/shadow-api').ShadowState}
      shadow_leaderboard:{Args:{p_offset?:number};Returns:import('@/features/arcade/shadow-api').ShadowLeaderboard}
      attendance_state:{Args:Record<string,never>;Returns:import('@/features/attendance/api').AttendanceState}
      claim_attendance:{Args:{p_day:string};Returns:import('@/features/attendance/api').AttendanceClaim}
      fishing_rod_state:{Args:Record<string,never>;Returns:import('@/features/fishing/rod-api').RodState}
      equip_fishing_rod:{Args:{p_rod_id:string};Returns:import('@/features/fishing/rod-api').RodState}
      trade_fishing_rod:{Args:{p_rod_id:string;p_action:string;p_operation_id:string};Returns:import('@/features/gold/api').GoldState & import('@/features/fishing/rod-api').RodState & {delta:number}}
      prepare_fishing:{Args:{p_region_id:string;p_bait_id:string;p_operation_id:string};Returns:import('@/features/fishing/api').PreparedFishing}
      finish_fishing:{Args:{p_operation_id:string;p_won:boolean};Returns:import('@/features/fishing/api').FishingResult}
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
      sell_collectibles: { Args: {p_collectible_ids:string[];p_operation_id:string}; Returns:import('@/features/gold/api').GoldState & {delta:number} }
      collection_state: { Args: Record<string, never>; Returns: import('@/features/collection/api').CollectionState }
      fishing_state: { Args: Record<string, never>; Returns: import('@/features/fishing/api').FishingState }
      buy_fishing_bait: { Args: { p_bait_id: string; p_operation_id: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      cast_fishing: { Args: { p_region_id: string; p_bait_id: string; p_operation_id: string }; Returns: import('@/features/fishing/api').FishingResult }
      set_region_test_lock: { Args: { p_region_id: string; p_locked: boolean }; Returns: import('@/features/regions/api').RegionMap }
      region_map: { Args: Record<string, never>; Returns: import('@/features/regions/api').RegionMap }
      travel_region: { Args: { p_region_id: string }; Returns: import('@/features/regions/api').RegionMap }
      buy_aquarium_tank: { Args: { p_operation_id: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      manage_aquarium_tank: { Args: { p_tank_id: string; p_action: string; p_value: string }; Returns: import('@/features/aquarium/api').AquariumState }
      aquarium_state: { Args: Record<string, never>; Returns: import('@/features/aquarium/api').AquariumState }
      aquarium_background: { Args: { p_id: string; p_action: string; p_operation_id?: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      get_gold_wallet: { Args: Record<string, never>; Returns: import('@/features/gold/api').GoldState }
      trade_gold: { Args: { p_operation_id: string; p_action: string; p_item_id?: string }; Returns: import('@/features/gold/api').GoldState & { delta: number } }
      remove_friend: { Args: { p_request_id: string }; Returns: undefined }
      set_player_avatar: { Args: { p_path: string | null }; Returns: Profile }
      sync_player_profile: { Args: Record<string, never>; Returns: Profile }
      find_player_by_code: { Args: { p_code: string }; Returns: Profile[] }
      send_friend_request: { Args: { p_code: string }; Returns: string }
      respond_friend_request: { Args: { p_request_id: string; p_action: string }; Returns: undefined }
    }
    Enums: { game_rarity: import('@/lib/game/rarity').Rarity; collectible_kind: import('@/features/collection/api').CollectibleKind }
    CompositeTypes: Record<string, never>
  }
}
