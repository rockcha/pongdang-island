import {NotificationSummary} from './notification-summary'
import {NotificationSkeleton} from './notification-skeleton'
import { useEffect, useRef,useState } from 'react'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger } from '@/components/ui/dialog'
import { Bell, Gift, Megaphone, UsersRound, LayoutGrid } from 'lucide-react'
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

  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value){setOpeningCounts({notice:unread.notice??0,friend:unread.friend,general:unread.general,gift:unread.gift??0});setFilter('all');setNow(Date.now());void opened()} }}>
    <DialogTrigger aria-label={`알림, 읽지 않은 알림 ${count}개`} className="relative flex size-10 min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <Bell className="size-5" />
      {count > 0 && <span className="header-indicator" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </DialogTrigger>
    <DialogContent className="notification-sheet bg-popover text-popover-foreground inset-x-0 bottom-0 top-auto left-0 flex h-[92dvh] max-h-[92dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"/><DialogHeader className="shrink-0 px-4 py-4 pr-12"><DialogTitle className="flex items-center gap-2"><Bell className="size-5 text-primary"/>알림</DialogTitle><DialogDescription className={openingTotal>0?"text-xs":"sr-only"}>{openingTotal>0?`열기 전 미확인 ${openingTotal}개`:'알림 목록'}</DialogDescription></DialogHeader>
          <div role="group" aria-label="알림 종류" className="grid grid-cols-5 gap-1 border-b px-2 pb-2">{(['all','notice','friend','general','gift'] as const).map(key=>{const label=key==='all'?'전체':categories[key].label;const total=key==='all'?openingTotal:openingCounts[key];const Icon=key==='all'?LayoutGrid:categories[key].icon;return <button type="button" key={key} onClick={()=>setFilter(key)} title={label} aria-label={`${label}, 미확인 ${total}개`} aria-pressed={filter===key} className={`flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs outline-none data-highlighted:ring-2 data-highlighted:ring-ring ${filter===key?'bg-secondary font-semibold text-primary':'text-muted-foreground'}`}><Icon className="size-5" aria-hidden="true"/><span className={`rounded-full px-1.5 text-[10px] tabular-nums ${total?'bg-primary text-primary-foreground':'bg-muted'}`}>{total>99?'99+':total}</span></button>})}</div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
            {loading && !notifications.length && <NotificationSkeleton/>}
            {!loading && error && <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">{error}</p>}
            {!loading && !error && !filtered.length && <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground"><Bell className="size-6 opacity-40" /><p className="text-sm">{filter==='all'?'아직 도착한 알림이 없어요':`${categories[filter].label} 알림이 없어요`}</p></div>}
            {filtered.map(item => {
              const Icon=categories[item.category].icon
              return <Link key={item.id} onClick={()=>setOpen(false)} to={item.notice_id ? `/square/notices/${item.notice_id}` : item.gift_id ? `/notifications?gift=${encodeURIComponent(item.gift_id)}` : `/notifications?tab=${item.category}`} className="flex cursor-pointer items-start gap-3 border-b border-border/60 py-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                {filter==='all'&&<span role="img" aria-label={categories[item.category].label} className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon aria-hidden="true" className="size-4"/></span>}<NotificationSummary title={item.title} body={item.body} createdAt={item.created_at} unread={!item.read_at} now={now}/>
              </Link>
            })}
          </div>
    </DialogContent>
  </Dialog>
}
