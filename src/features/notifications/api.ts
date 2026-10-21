import { createClient } from '@/lib/client'
import type { AppNotification, NotificationCategory, UnreadCounts } from '@/features/social/types'

export async function loadNotifications(userId: string): Promise<{ notifications: AppNotification[]; unread: UnreadCounts }> {
  const client = createClient()
  const [items, friends, general,gifts,notices,pendingGifts] = await Promise.all([
    client.from('notifications').select('*, request:friend_requests!notifications_request_id_fkey(id,sender_id,recipient_id,status),notice:notices!notifications_notice_id_fkey(category)')
      .eq('recipient_id', userId).order('created_at', { ascending: false }).limit(100),
    client.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).eq('category', 'friend').is('read_at', null),
    client.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).eq('category', 'general').is('read_at', null),
    client.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).eq('category', 'gift').neq('kind','gift_received').is('read_at', null),
    client.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).eq('category', 'notice').is('read_at', null),
    client.from('collectible_gifts').select('id', { count: 'exact', head: true }).eq('recipient_id',userId).eq('status','pending').eq('exchange_hold',false),
  ])
  if (items.error || friends.error || general.error||gifts.error||notices.error||pendingGifts.error) throw items.error ?? friends.error ?? general.error??gifts.error??notices.error??pendingGifts.error
  return { notifications: items.data as unknown as AppNotification[], unread: { friend: friends.count ?? 0, general: general.count ?? 0,gift:(gifts.count??0)+(pendingGifts.count??0),notice:notices.count??0 } }
}
export async function markRead(userId: string, id?: string, category?: NotificationCategory) {
  let query = createClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null)
  if (id) query = query.eq('id', id)
  if (category) query = query.eq('category', category)
  const { error } = await query
  if (error) throw error
}
export async function notificationsOpened(){const {error}=await createClient().rpc('notifications_opened');if(error)throw error}
export type ReturnNotificationStatus={created:number;nextAt:string|null;serverNow:string}
export async function refreshReturnNotifications(){
 const {data,error}=await createClient().rpc('refresh_return_notifications')
 if(error)throw error
 return data
}
export async function markRelatedRead(userId:string,column:'notice_id'|'gift_id'|'request_id',id:string){
 const {error}=await createClient().from('notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',userId).eq(column,id).is('read_at',null)
 if(error)throw error
}
