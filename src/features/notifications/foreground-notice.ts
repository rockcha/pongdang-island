import type {AppNotification} from '@/features/social/types'
import {presentPush,type PushPayload} from '../../../supabase/functions/_shared/push-presentation'
export const foregroundNoticeEvent='pongdang:foreground-notice'
export function announceCompletion(notification:AppNotification){
 const category=notification.production_site_id?'production':notification.bait_production_site_id?'bait-production':notification.expedition_id?'expedition':notification.harbor_voyage_id?'harbor':null
 if(!category)return false
 // Reopening the app must not replay old completion cards.
 const created=Date.parse(notification.created_at)
 if(document.visibilityState==='hidden'||!Number.isFinite(created)||Date.now()-created>120000)return true
 const payload:PushPayload=presentPush({userId:notification.recipient_id,category,tag:'notice:'+notification.id,title:notification.title,body:notification.body,url:{production:'/production','bait-production':'/bait-production',expedition:'/expeditions',harbor:'/port'}[category]})
 window.dispatchEvent(new CustomEvent(foregroundNoticeEvent,{detail:payload}))
 return true
}
