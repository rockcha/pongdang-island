import {NotificationSummary} from './notification-summary'
import {NotificationSkeleton} from './notification-skeleton'
import { useEffect,useState } from 'react'
import { Link,useSearchParams } from 'react-router'
import { Bell,Gift,Megaphone,UsersRound } from 'lucide-react'
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip'
import { GiftMailbox,GiftDetailDialog } from '@/features/gifts/gift-mailbox'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { RequestActions } from '@/features/friends/request-actions'
import { useSocial } from '@/features/social/social-provider'
import type { NotificationCategory } from '@/features/social/types'

type Tab = NotificationCategory
export function NotificationsPage() {
  const { session } = useAuth()
  const [params]=useSearchParams()
  const { notifications, unread, loading, error, connection, refresh } = useSocial()
  const [tab, setTab] = useState<Tab>(params.get('gift')?'gift':params.get('tab')==='friend'?'friend':params.get('tab')==='general'?'general':'notice')
  const [selectedGift,setSelectedGift]=useState<string|null>(params.get('gift'))
  const [now,setNow]=useState(Date.now)
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer)},[])
  const visible = notifications.filter(item => item.category === tab)
  return <TooltipProvider><section className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
    <p role="status" className="sr-only">{connection === 'live' ? '실시간으로 소식을 받고 있어요' : connection === 'connecting' ? '실시간 연결 중…' : '연결을 다시 확인하고 있어요'}</p>
    <div className="grid shrink-0 grid-cols-4 border-b border-border" role="group" aria-label="알림 분류">
      {([{ key: 'notice', name: '공지', count: unread.notice??0,icon:Megaphone }, { key: 'friend', name: '친구', count: unread.friend,icon:UsersRound }, { key: 'general', name: '소식', count: unread.general,icon:Bell },{key:'gift',name:'선물',count:unread.gift??0,icon:Gift}] as const).map(item => <Tooltip key={item.key}><TooltipTrigger render={<Button variant={tab === item.key ? 'secondary' : 'ghost'} aria-label={`${item.name}${item.count>0?` (${item.count})`:''}`} aria-pressed={tab === item.key} className="min-h-12 min-w-0 rounded-none border-r border-border" onClick={() => setTab(item.key)}/> }><item.icon className="size-4" aria-hidden="true"/>{item.count>0&&<span className="text-xs tabular-nums">{item.count}</span>}</TooltipTrigger><TooltipContent>{item.name}</TooltipContent></Tooltip>)}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
    {tab==='gift'&&<GiftMailbox key={session?.user.id??'guest'} onOpen={setSelectedGift}/>}
    {tab!=='gift'&&<>
    {loading && !visible.length && <NotificationSkeleton/>}
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>다시 불러오기</Button></div>}
    <ul className="divide-y divide-border/70">
      {visible.map(item=><li key={item.id} className="min-w-0 py-4">
        {item.notice_id?<Link to={`/square/notices/${item.notice_id}`} className="block rounded outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"><NotificationSummary title={item.title} body={item.body} createdAt={item.created_at} unread={!item.read_at} now={now}/></Link>:item.gift_id?<button type="button" onClick={()=>setSelectedGift(item.gift_id!)} className="block w-full rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"><NotificationSummary title={item.title} body={item.body} createdAt={item.created_at} unread={!item.read_at} now={now}/></button>:<NotificationSummary title={item.title} body={item.body} createdAt={item.created_at} unread={!item.read_at} now={now}/>}
        {item.kind==='friend_request'&&item.request&&<div className="mt-3"><RequestActions request={item.request}/></div>}
      </li>)}
    </ul>
    {!loading && !error && !visible.length && <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><Bell aria-hidden="true" className="size-6 opacity-40"/><p className="text-sm">새로운 소식이 없어요.</p></div>}
    </>}
    </div>
    <GiftDetailDialog key={session?.user.id??'guest'} id={selectedGift} onClose={()=>setSelectedGift(null)}/>
  </section></TooltipProvider>
}
