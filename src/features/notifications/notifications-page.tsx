import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Bell,Gift,Inbox,UsersRound } from 'lucide-react'
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip'
import { GiftMailbox,GiftDetailDialog } from '@/features/gifts/gift-mailbox'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { RequestActions } from '@/features/friends/request-actions'
import { useSocial } from '@/features/social/social-provider'
import { socialErrorMessage } from '@/features/social/types'
import type { NotificationCategory } from '@/features/social/types'
import { markRead } from './api'

type Tab = 'all' | NotificationCategory
export function NotificationsPage() {
  const { session } = useAuth()
  const [params]=useSearchParams()
  const { notifications, unread, loading, error, connection, refresh } = useSocial()
  const [tab, setTab] = useState<Tab>(params.get('gift')?'gift':'all')
  const [selectedGift,setSelectedGift]=useState<string|null>(params.get('gift'))
  const [busy, setBusy] = useState(false)
  const visible = notifications.filter(item => tab === 'all' || item.category === tab)
  const total = unread.friend + unread.general+(unread.gift??0)
  async function read(id?: string) {
    if (!session || busy) return
    setBusy(true)
    try { await markRead(session.user.id, id, tab === 'all' ? undefined : tab); await refresh() }
    catch (cause) { toast.error(socialErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <TooltipProvider><section className="space-y-5 py-6">
    <p role="status" className="sr-only">{connection === 'live' ? '실시간으로 소식을 받고 있어요' : connection === 'connecting' ? '실시간 연결 중…' : '연결을 다시 확인하고 있어요'}</p>
    <div className="flex gap-2" role="group" aria-label="알림 분류">
      {([{ key: 'all', name: '전체', count: total,icon:Inbox }, { key: 'friend', name: '친구', count: unread.friend,icon:UsersRound }, { key: 'general', name: '소식', count: unread.general,icon:Bell },{key:'gift',name:'선물',count:unread.gift??0,icon:Gift}] as const).map(item => <Tooltip key={item.key}><TooltipTrigger render={<Button variant={tab === item.key ? 'default' : 'outline'} aria-label={`${item.name}${item.count>0?` (${item.count})`:''}`} aria-pressed={tab === item.key} className="min-h-11 flex-1" onClick={() => setTab(item.key)}/> }><item.icon className="size-4" aria-hidden="true"/>{item.count>0&&<span className="text-xs tabular-nums">{item.count}</span>}</TooltipTrigger><TooltipContent>{item.name}</TooltipContent></Tooltip>)}
    </div>
    {tab==='gift'&&<GiftMailbox key={session?.user.id??'guest'} onOpen={setSelectedGift}/>}
    <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">최근 100개의 알림을 보여드려요.</p><Button variant="ghost" disabled={busy || (tab === 'all' ? total : (unread[tab]??0)) === 0} className="min-h-11" onClick={() => void read()}>모두 읽음</Button></div>
    {loading && <p role="status">알림을 불러오는 중…</p>}
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>다시 불러오기</Button></div>}
    <ul className="space-y-3">
      {visible.map(item => <li key={item.id} className={`space-y-3 rounded-2xl border p-4 ${item.read_at ? 'bg-card' : 'border-primary/30 bg-primary/5'}`}>
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-primary">{item.category === 'friend' ? '친구' :item.category==='gift'?'선물': '소식'}{item.read_at ? '' : ' · 새 알림'}</span><time className="text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div>
        <h2 className="break-words font-semibold">{item.title}</h2>
        {item.body && <p className="break-words text-sm leading-6 text-muted-foreground">{item.body}</p>}
        {item.kind === 'friend_request' && item.request && <RequestActions request={item.request} />}
        {item.gift_id&&<Button variant="outline" onClick={()=>{setSelectedGift(item.gift_id!);if(!item.read_at)void read(item.id)}}><Gift className="size-4"/>선물 보기</Button>}
        {!item.read_at && <Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => void read(item.id)}>읽음으로 표시</Button>}
      </li>)}
    </ul>
    {!loading && !error && !visible.length && <p className="py-12 text-center text-sm text-muted-foreground">아직 도착한 알림이 없어요.</p>}
    <GiftDetailDialog key={session?.user.id??'guest'} id={selectedGift} onClose={()=>setSelectedGift(null)}/>
  </section></TooltipProvider>
}
