import {NoticeCategoryIcon} from '@/features/notices/notice-category-icon'
export type NotificationIconSource={achievement_id?:string|null;kind?:string;category?:string;title?:string;expedition_id?:string|null;expedition_boost_id?:string|null;notice_id?:string|null;notice?:{category:'guide'|'update'|'maintenance'|'event'}|null}

export function notificationIconName(item:NotificationIconSource){
 if(item.achievement_id)return 'title'
 if(item.expedition_boost_id)return 'expedition-boost'
 if(item.expedition_id)return 'expedition'
 if(item.notice_id||item.category==='notice'||item.kind==='announcement')return 'announcement'
 switch(item.kind){
  case 'friend_request':return 'friend-request'
  case 'friend_accepted':return 'friend-accepted'
  case 'gift_received':return item.title?.includes('거래소')?'exchange':'gift-received'
  case 'gift_claimed':return 'gift-claimed'
  case 'gift_reaction':return 'gift-reaction'
  case 'reward':return item.title?.includes('버그')?'bug':/아이디어|건의/.test(item.title??'')?'suggestion':'reward'
 }
 const title=item.title??''
 if(/귀항/.test(title))return 'expedition'
 if(/닦|청소/.test(title))return 'clean'
 if(/먹이/.test(title))return 'feed'
 if(item.category==='gift')return 'gift-received'
 if(item.category==='friend')return 'friend-request'
 return 'system'
}

/** Decorative artwork: the adjacent notification text supplies the accessible name. */
export function NotificationIcon({notification,className='size-11'}:{notification:NotificationIconSource;className?:string}){
 if(notification.category==='notice'||notification.notice_id)return <NoticeCategoryIcon category={notification.notice?.category??'guide'} className={className}/>
 return <img src={`/notification-icons/${notificationIconName(notification)}.png`} alt="" aria-hidden="true" width={128} height={128} decoding="async" className={`${className} shrink-0 object-contain`} onError={event=>{const fallback='/notification-icons/system.png';if(!event.currentTarget.src.endsWith(fallback))event.currentTarget.src=fallback}}/>
}
