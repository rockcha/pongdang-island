// Hand-maintained APP CONTRACT: partial table coverage and domain-specific RPC returns.
// Full expected schema: docs/db/local-schema.json (local replay, not remote evidence).
// Compare separately generated remote types; do not blindly overwrite this contract.
import type { AppNotification, FriendRequest, Profile } from '@/features/social/types'
type RequestRow = Omit<FriendRequest, 'sender' | 'recipient'>
type NotificationRow = Omit<AppNotification, 'request'>
export type Database = {
  public: {
    Tables: {
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
