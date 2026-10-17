import { useEffect, useRef,useState } from 'react'
import { Menu } from '@base-ui/react/menu'
import { ArrowRight, Bell, Gift, Megaphone, UsersRound } from 'lucide-react'
import { Link } from 'react-router'
import { useSocial } from '@/features/social/social-provider'
import {notificationsOpened} from './api'
import {toast} from 'sonner'

const categories = {
  notice: { label: '공지', icon: Megaphone },
  friend: { label: '친구', icon: UsersRound },
  general: { label: '소식', icon: Bell },
  gift: { label: '선물', icon: Gift },
}
type Category=keyof typeof categories
type Filter=Category|'all'
const emptyCounts={notice:0,friend:0,general:0,gift:0}

function relativeTime(value: string, now: number) {
  const minutes = Math.floor(Math.max(0, now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}일 전`
  return new Date(value).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export function NotificationMenu() {
  const { notifications, unread, loading, error,refresh } = useSocial()
  const reading=useRef(false)
  async function opened(){if(reading.current)return;reading.current=true;try{await notificationsOpened();await refresh()}catch{toast.error('알림 확인 상태를 저장하지 못했어요. 다시 열어주세요.')}finally{reading.current=false}}
  const [open, setOpen] = useState(false)
  const [filter,setFilter]=useState<Filter>('all')
  const [openingCounts,setOpeningCounts]=useState(emptyCounts)
  const [now, setNow] = useState(() => Date.now())
  const count = unread.friend + unread.general + (unread.gift ?? 0)+(unread.notice??0)
  const openingTotal=Object.values(openingCounts).reduce((sum,n)=>sum+n,0)
  const filtered=notifications.filter(item=>filter==='all'||item.category===filter)
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [open])

  return <Menu.Root open={open} onOpenChange={value => { setOpen(value); if (value){setOpeningCounts({notice:unread.notice??0,friend:unread.friend,general:unread.general,gift:unread.gift??0});setFilter('all');setNow(Date.now());void opened()} }}>
    <Menu.Trigger aria-label={`알림, 읽지 않은 알림 ${count}개`} className="relative flex size-10 min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <Bell className="size-5" />
      {count > 0 && <span className="header-indicator" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Positioner align="end" sideOffset={8} className="z-50">
        <Menu.Popup className="w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg outline-none">
          <div className="flex items-center justify-between px-4 py-3"><span className="text-sm font-semibold">알림</span><span className="text-xs text-muted-foreground">{openingTotal > 0 ? `열기 전 미확인 ${openingTotal}개` : '모두 확인했어요'}</span></div>
          <div role="group" aria-label="알림 종류" className="grid grid-cols-5 gap-1 border-b px-2 pb-2">{(['all','notice','friend','general','gift'] as const).map(key=>{const label=key==='all'?'전체':categories[key].label;const total=key==='all'?openingTotal:openingCounts[key];return <Menu.Item key={key} closeOnClick={false} onClick={()=>setFilter(key)} aria-label={`${label}, 미확인 ${total}개`} aria-current={filter===key?'true':undefined} className={`flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs outline-none data-highlighted:ring-2 data-highlighted:ring-ring ${filter===key?'bg-primary/10 font-semibold text-primary':'text-muted-foreground'}`}><span>{label}</span><span className={`rounded-full px-1.5 text-[10px] tabular-nums ${total?'bg-primary text-primary-foreground':'bg-muted'}`}>{total>99?'99+':total}</span></Menu.Item>})}</div>
          <div className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain p-1.5">
            {loading && !notifications.length && <p role="status" className="px-3 py-10 text-center text-sm text-muted-foreground">알림을 불러오는 중…</p>}
            {!loading && error && <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">{error}</p>}
            {!loading && !error && !filtered.length && <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground"><Bell className="size-6 opacity-40" /><p className="text-sm">{filter==='all'?'아직 도착한 알림이 없어요':`${categories[filter].label} 알림이 없어요`}</p></div>}
            {filtered.slice(0, 8).map(item => {
              const category = categories[item.category]
              return <Menu.LinkItem key={item.id} render={<Link to={item.gift_id ? `/notifications?gift=${encodeURIComponent(item.gift_id)}` : `/notifications?tab=${item.category}`} />} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 outline-none data-highlighted:bg-accent">
                <span className="mt-0.5 flex w-11 shrink-0 flex-col items-center gap-1 rounded-lg bg-muted py-2 text-muted-foreground"><category.icon className="size-4" aria-hidden="true" /><span className="text-[10px] font-medium">{category.label}</span></span>
                <span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className="flex-1 break-words text-sm font-medium leading-5">{item.title}</span>{!item.read_at && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-label="읽지 않음" />}</span>{item.body && <span className="mt-1 block line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{item.body}</span>}<time dateTime={item.created_at} className="mt-1.5 block text-[11px] text-muted-foreground">{relativeTime(item.created_at, now)}</time></span>
              </Menu.LinkItem>
            })}
          </div>
          <Menu.Separator className="h-px bg-border" />
          <Menu.LinkItem render={<Link to="/notifications" />} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 text-xs font-medium outline-none data-highlighted:bg-accent">우편함 가기<ArrowRight className="size-3.5" /></Menu.LinkItem>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>
}
