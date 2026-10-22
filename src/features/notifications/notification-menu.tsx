import {NoticeCategoryIcon} from '@/features/notices/notice-category-icon'
import {noticeCategories} from '@/features/notices/api'
import {EmptyState} from '@/components/empty-state'
import {appArt} from '@/components/app-art'
import {NotificationSummary} from './notification-summary'
import {NotificationSkeleton} from './notification-skeleton'
import { useEffect, useRef,useState } from 'react'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger } from '@/components/ui/dialog'

import { Link } from 'react-router'
import { useSocial } from '@/features/social/social-provider'
import {markRead} from './api'
import {toast} from 'sonner'

const {alerts:Bell,mailGift:Gift,mailNotice:Megaphone,mailFriend:UsersRound}=appArt

const categories = {
  notice: { label: '공지', icon: Megaphone },
  friend: { label: '소셜', icon: UsersRound },
  general: { label: '소식', icon: appArt.mailNews },
  gift: { label: '선물', icon: Gift },
}
type Category=keyof typeof categories
type Filter=Category|'all'

export function NotificationMenu({noticeOnly=false}:{noticeOnly?:boolean}) {
  const { owner,notifications, unread, loading, error,refresh } = useSocial()
  const viewed=useRef(new Set<string>())
  async function readItems(ids:string[]){try{if(!owner||!ids.length)return;await Promise.all(ids.map(id=>markRead(owner,id)));await refresh()}catch{toast.error('알림 확인 상태를 저장하지 못했어요. 다시 시도해주세요.')}}
  const [open, setOpen] = useState(false)
  const [filter,setFilter]=useState<Filter>('all')
  const [noticeFilter,setNoticeFilter]=useState<'all'|keyof typeof noticeCategories>('all')
  const [now, setNow] = useState(() => Date.now())
  const label=noticeOnly?'공지':'알림'
  const HeaderIcon=noticeOnly?Megaphone:Bell
  const count = noticeOnly?(unread.notice??0):unread.friend + unread.general + (unread.gift ?? 0)
  const filtered=notifications.filter(item=>(noticeOnly?item.category==='notice':item.category!=='notice')&&(filter==='all'||item.category===filter)&&(!noticeOnly||noticeFilter==='all'||(item.notice?.category??'guide')===noticeFilter))
  useEffect(()=>{if(open)for(const item of filtered)if(!item.read_at&&!(item.category==='gift'&&item.kind==='gift_received'))viewed.current.add(item.id)},[open,filtered])
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [open])

  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value){viewed.current.clear();setFilter('all');setNoticeFilter('all');setNow(Date.now())}else{void readItems([...viewed.current]);viewed.current.clear()} }}>
    <DialogTrigger aria-label={`${label}, 읽지 않은 ${label} ${count}개`} className="relative flex size-10 min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <HeaderIcon className="size-7" />
      {count > 0 && <span className={noticeOnly?'header-indicator':'header-indicator !size-2.5 !bg-red-500'} aria-hidden="true">{noticeOnly?(count > 99 ? '99+' : count):null}</span>}
    </DialogTrigger>
    <DialogContent className="notification-sheet bg-popover text-popover-foreground inset-x-0 bottom-0 top-auto left-0 flex h-[82dvh] max-h-[44rem] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"/><DialogHeader className="shrink-0 px-4 py-4 pr-12"><DialogTitle className="flex items-center gap-2"><HeaderIcon className="size-7 text-primary"/>{label}</DialogTitle><DialogDescription className="sr-only">{label} 목록</DialogDescription></DialogHeader>
          {noticeOnly&&<div role="group" aria-label="공지 유형" className="segmented-control grid shrink-0 grid-cols-5 border-y border-border/60">{(['all',...Object.keys(noticeCategories)] as ('all'|keyof typeof noticeCategories)[]).map(key=>{
            const label=key==='all'?'전체':noticeCategories[key]
            const total=notifications.filter(item=>item.category==='notice'&&!item.read_at&&(key==='all'||(item.notice?.category??'guide')===key)).length
            return <button key={key} type="button" style={{minHeight:88,height:'auto',paddingBlock:12}} aria-label={label} title={label} aria-description={`읽지 않은 공지 ${total}개`} aria-pressed={noticeFilter===key} onClick={()=>setNoticeFilter(key)} className={`flex min-w-0 flex-col items-center justify-center gap-2 px-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${noticeFilter===key?'bg-secondary text-primary':'text-muted-foreground hover:bg-secondary/40'}`}>
              <span className="relative flex size-9 items-center justify-center">{key==='all'?<appArt.all className="size-9"/>:<NoticeCategoryIcon category={key} className="size-9"/>}{total>0&&<span aria-hidden="true" className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] tabular-nums text-primary-foreground">{total>99?'99+':total}</span>}</span>
              <span>{label}</span>
            </button>
          })}</div>}
          {!noticeOnly&&<div role="group" aria-label="알림 종류" className="segmented-control grid grid-cols-4 gap-1 border-b px-2 pb-2">{(['all','friend','general','gift'] as const).map(key=>{const label=key==='all'?'전체':categories[key].label;const total=key==='all'?count:(unread[key]??0);const Icon=key==='all'?appArt.all:categories[key].icon;return <button type="button" key={key} onClick={()=>setFilter(key)} title={label} aria-label={`${label}, 미확인 ${total}개`} aria-pressed={filter===key} className={`flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs outline-none data-highlighted:ring-2 data-highlighted:ring-ring ${filter===key?'bg-secondary font-semibold text-primary':'text-muted-foreground'}`}><span className="flex items-center justify-center gap-1.5"><Icon className="size-7" aria-hidden="true"/><span aria-hidden="true" className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] tabular-nums ${total>0?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{total>99?'99+':total}</span></span></button>})}</div>}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {loading && !notifications.length && <NotificationSkeleton/>}
            {!loading && error && <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">{error}</p>}
            {!loading && !error && !filtered.length && <EmptyState>{noticeOnly?(noticeFilter==='all'?'아직 도착한 공지가 없어요':`${noticeCategories[noticeFilter]} 공지가 없어요`):filter==='all'?`아직 도착한 ${label}이 없어요`:`${categories[filter].label} 알림이 없어요`}</EmptyState>}
            {filtered.map(item => {
              return <Link key={item.id} onClick={()=>{setOpen(false);viewed.current.clear();if(!item.read_at&&!(item.category==='gift'&&item.kind==='gift_received'))void readItems([item.id])}} to={item.board_post_id ? `/board/${item.board_post_id}` : item.achievement_id ? '/titles' : (item.production_site_id||item.production_started_at) ? '/production' : item.harbor_voyage_id ? '/port' : (item.expedition_id||item.expedition_boost_id) ? '/expeditions' : item.notice_id ? `/square/notices/${item.notice_id}` : item.gift_id ? `/notifications?gift=${encodeURIComponent(item.gift_id)}` : `/notifications?tab=${item.category}`} className="flex cursor-pointer items-start gap-3 py-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                <NotificationSummary notification={item} title={item.title} body={item.body} createdAt={item.created_at} unread={!item.read_at} now={now}/>
              </Link>
            })}
          </div>
    </DialogContent>
  </Dialog>
}
