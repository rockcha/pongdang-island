import {accountOptions,appQueryClient,invalidateAccountResource} from '@/lib/account-cache'
import { createClient } from '@/lib/client'
import type { AppNotification, NotificationCategory, UnreadCounts } from '@/features/social/types'

export type NotificationInbox = { notifications: AppNotification[]; unread: UnreadCounts }
export async function loadNotifications(userId: string): Promise<NotificationInbox> {
  return appQueryClient.fetchQuery(accountOptions(userId, 'inbox', async signal => {
    const {data,error} = await createClient().rpc('notification_inbox').abortSignal(signal)
    if(error) throw error
    return data
  }))
}
export async function markRead(userId: string, id?: string, category?: NotificationCategory) {
  let query = createClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null)
  if (id) query = query.eq('id', id)
  if (category) query = query.eq('category', category)
  const { error } = await query
  if (error) throw error
  invalidateAccountResource('inbox',userId)
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
 invalidateAccountResource('inbox',userId)
}
