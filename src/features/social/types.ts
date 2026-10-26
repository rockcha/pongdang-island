export type Profile = { id: string; nickname: string; friend_code: string; created_at: string; avatar_path: string | null; equipped_title?:string|null }
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed'
export type RequestAction = 'accept' | 'decline' | 'cancel'
export type FriendRequest = {
  id: string; sender_id: string; recipient_id: string; status: RequestStatus
  created_at: string; updated_at: string; sender: Profile; recipient: Profile
}
export type NotificationCategory = 'notice' | 'friend' | 'general' | 'gift'
export type AppNotification = {
  id: string; recipient_id: string; actor_id: string | null; category: NotificationCategory
  kind: 'friend_request' | 'friend_accepted' | 'announcement' | 'reward' | 'system' | 'gift_received' | 'gift_claimed' | 'gift_reaction'
  gift_id?:string|null
  achievement_id?:string|null
  expedition_id?:string|null
  harbor_voyage_id?:string|null
  expedition_boost_id?:string|null
  production_site_id?:string|null
  production_started_at?:string|null
  bait_production_site_id?:string|null
  bait_production_started_at?:string|null
  production_auto_claim?:boolean
  notice_id?:string|null
  board_post_id?:string|null
  notice?:{category:'guide'|'update'|'maintenance'|'event'}|null
  title: string; body: string; request_id: string | null; read_at: string | null; created_at: string
  request: Pick<FriendRequest, 'id' | 'sender_id' | 'recipient_id' | 'status'> | null
}
export type UnreadCounts = { friend: number; general: number; gift?:number;notice?:number }
export function socialErrorMessage(cause: unknown): string {
  const text = String((cause as { message?: string } | null)?.message ?? '')
  const messages: Record<string, string> = {
    AUTH_REQUIRED: '로그인이 필요해요.', NICKNAME_REQUIRED: '닉네임을 먼저 설정해주세요.',
    INVALID_FRIEND_CODE: '친구 코드는 영문 A~F와 숫자 12자리예요.', PLAYER_NOT_FOUND: '친구 코드에 해당하는 사용자가 없어요.',
    CANNOT_FRIEND_SELF: '나에게는 친구 요청을 보낼 수 없어요.', RELATIONSHIP_EXISTS: '이미 친구이거나 주고받은 요청이 있어요.',
    FRIEND_RATE_LIMIT: '친구 요청이 많아요. 잠시 후 다시 시도해주세요.', REQUEST_NOT_FOUND: '친구 요청을 찾지 못했어요.',
    FRIENDSHIP_NOT_ACTIVE: '이미 친구 관계가 종료됐어요.',
    REQUEST_ALREADY_HANDLED: '이미 처리된 요청이에요.', NOT_ALLOWED: '이 요청을 처리할 권한이 없어요.',
  }
  for (const [code, message] of Object.entries(messages)) if (text.includes(code)) return message
  return '데이터를 불러오거나 처리하지 못했어요. 연결을 확인하고 다시 시도해주세요.'
}
