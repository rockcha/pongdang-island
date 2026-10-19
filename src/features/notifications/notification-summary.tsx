import { Clock } from 'lucide-react'
import {NotificationIcon} from './notification-icon'
import type {NotificationIconSource} from './notification-icon'
export function notificationTime(value:string,now:number) {
  const minutes=Math.floor(Math.max(0,now-new Date(value).getTime())/60000)
  if(minutes<1)return '방금 전'
  if(minutes<60)return `${minutes}분 전`
  const date=new Date(value),today=new Date(now)
  if(date.toDateString()===today.toDateString())return `${Math.floor(minutes/60)}시간 전`
  const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1)
  if(date.toDateString()===yesterday.toDateString())return '어제'
  return date.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})
}

export function NotificationSummary({title,body,createdAt,unread,now,notification}:{title:string;body?:string|null;createdAt:string;unread:boolean;now:number;notification?:NotificationIconSource}) {
  return <div data-unread={unread} className={`flex min-w-0 flex-1 items-start gap-3 rounded-lg p-3 ${unread?'bg-secondary/65':'bg-muted/30'}`}><NotificationIcon notification={notification??{title}} className={`size-11 ${unread?'':'grayscale opacity-55'}`}/><div className="min-w-0 flex-1 space-y-1.5 [overflow-wrap:anywhere]">
    <div className="flex items-start gap-2"><h2 className={'min-w-0 flex-1 text-sm leading-5 '+(unread?'font-semibold text-foreground':'font-normal text-muted-foreground')}>{title}</h2>{unread?<span aria-label="읽지 않음" className="mt-1 size-2 shrink-0 rounded-full bg-primary ring-2 ring-background"/>:<span className="shrink-0 text-[10px] text-muted-foreground">읽음</span>}</div>
    {body&&<p className="line-clamp-1 text-xs leading-5 text-muted-foreground">{body}</p>}
    <time dateTime={createdAt} className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground"><Clock aria-hidden="true" className="size-3 shrink-0"/>{notificationTime(createdAt,now)}</time>
  </div></div>
}
