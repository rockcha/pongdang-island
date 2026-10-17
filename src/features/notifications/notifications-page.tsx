import { useState } from 'react'
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
  const visible = notifications.filter(item => item.category === tab)
  return <TooltipProvider><section className="space-y-5 py-6">
    <p role="status" className="sr-only">{connection === 'live' ? '실시간으로 소식을 받고 있어요' : connection === 'connecting' ? '실시간 연결 중…' : '연결을 다시 확인하고 있어요'}</p>
    <div className="flex gap-2" role="group" aria-label="알림 분류">
      {([{ key: 'notice', name: '공지', count: unread.notice??0,icon:Megaphone }, { key: 'friend', name: '친구', count: unread.friend,icon:UsersRound }, { key: 'general', name: '소식', count: unread.general,icon:Bell },{key:'gift',name:'선물',count:unread.gift??0,icon:Gift}] as const).map(item => <Tooltip key={item.key}><TooltipTrigger render={<Button variant={tab === item.key ? 'default' : 'outline'} aria-label={`${item.name}${item.count>0?` (${item.count})`:''}`} aria-pressed={tab === item.key} className="min-h-11 flex-1" onClick={() => setTab(item.key)}/> }><item.icon className="size-4" aria-hidden="true"/>{item.count>0&&<span className="text-xs tabular-nums">{item.count}</span>}</TooltipTrigger><TooltipContent>{item.name}</TooltipContent></Tooltip>)}
    </div>
    {tab==='gift'&&<GiftMailbox key={session?.user.id??'guest'} onOpen={setSelectedGift}/>}
    {tab!=='gift'&&<><p className="text-xs text-muted-foreground">최근 100개의 알림을 보여드려요.</p>
    {loading && <p role="status">알림을 불러오는 중…</p>}
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>다시 불러오기</Button></div>}
    <ul className="space-y-3">
      {visible.map(item => <li key={item.id} className={`space-y-3 rounded-2xl border p-4 ${item.read_at ? 'bg-card' : 'border-primary/30 bg-primary/5'}`}>
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-primary">{item.category === 'notice'?'공지':item.category === 'friend' ? '친구' :item.category==='gift'?'선물': '소식'}{item.read_at ? '' : ' · 새 알림'}</span><time className="text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div>
        <h2 className="break-words font-semibold">{item.title}</h2>
        {item.body && <p className="break-words text-sm leading-6 text-muted-foreground">{item.body}</p>}
        {item.kind === 'friend_request' && item.request && <RequestActions request={item.request} />}
        {item.notice_id&&<Button variant="outline" render={<Link to={`/square/notices/${item.notice_id}`}/>}>공지 보기</Button>}
        {item.gift_id&&<Button variant="outline" onClick={()=>setSelectedGift(item.gift_id!)}><Gift className="size-4"/>선물 보기</Button>}
      </li>)}
    </ul>
    {!loading && !error && !visible.length && <p className="py-12 text-center text-sm text-muted-foreground">아직 도착한 알림이 없어요.</p>}
    </>}
    <GiftDetailDialog key={session?.user.id??'guest'} id={selectedGift} onClose={()=>setSelectedGift(null)}/>
  </section></TooltipProvider>
}
