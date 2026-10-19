import { createClient } from '@/lib/client'
import type { FriendRequest, Profile, RequestAction } from '@/features/social/types'

export async function syncProfile(): Promise<Profile> {
  const { data, error } = await createClient().rpc('sync_player_profile')
  if (error) throw error
  const profile = Array.isArray(data) ? data[0] : data
  if (!profile) throw new Error('PROFILE_NOT_FOUND')
  return profile as Profile
}
export async function findPlayer(code: string): Promise<Profile | null> {
  const { data, error } = await createClient().rpc('find_player_by_code', { p_code: code.trim().toUpperCase() })
  if (error) throw error
  return (data?.[0] ?? null) as Profile | null
}
export async function loadFriendRequests(): Promise<FriendRequest[]> {
  const { data, error } = await createClient().from('friend_requests')
    .select('*, sender:player_profiles!friend_requests_sender_id_fkey(id,nickname,friend_code,avatar_path,equipped_title), recipient:player_profiles!friend_requests_recipient_id_fkey(id,nickname,friend_code,avatar_path,equipped_title)')
    .in('status', ['pending', 'accepted']).order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return data as unknown as FriendRequest[]
}
export async function sendFriendRequest(code: string) {
  const { error } = await createClient().rpc('send_friend_request', { p_code: code.trim().toUpperCase() })
  if (error) throw error
}
export async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await createClient().from('player_profiles').select('*').eq('id',userId).single()
  if (error) throw error
  return data
}
export async function respondFriendRequest(id: string, action: RequestAction) {
  const { error } = await createClient().rpc('respond_friend_request', { p_request_id: id, p_action: action })
  if (error) throw error
}

export async function removeFriend(requestId: string) {
  const { error } = await createClient().rpc('remove_friend',{p_request_id:requestId})
  if (error) throw error
}
