import { useEffect, useState } from 'react'
import { Menu } from '@base-ui/react/menu'
import { ArrowRight, Bell, Gift, UsersRound } from 'lucide-react'
import { Link } from 'react-router'
import { useSocial } from '@/features/social/social-provider'

const categories = {
  friend: { label: '소셜', icon: UsersRound },
  general: { label: '소식', icon: Bell },
  gift: { label: '선물', icon: Gift },
}

function relativeTime(value: string, now: number) {
  const minutes = Math.floor(Math.max(0, now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}일 전`
  return new Date(value).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export function NotificationMenu() {
  const { notifications, unread, loading, error } = useSocial()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const count = unread.friend + unread.general + (unread.gift ?? 0)
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [open])

  return <Menu.Root open={open} onOpenChange={value => { setOpen(value); if (value) setNow(Date.now()) }}>
    <Menu.Trigger aria-label={`알림, 읽지 않은 알림 ${count}개`} className="relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <Bell className="size-5" />
      {count > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] text-primary-foreground">{count > 99 ? '99+' : count}</span>}
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Positioner align="end" sideOffset={8} className="z-50">
        <Menu.Popup className="w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg outline-none">
          <div className="flex items-center justify-between border-b px-4 py-3"><span className="text-sm font-semibold">알림</span><span className="text-xs text-muted-foreground">{count > 0 ? `새 알림 ${count}개` : '모두 확인했어요'}</span></div>
          <div className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain p-1.5">
            {loading && !notifications.length && <p role="status" className="px-3 py-10 text-center text-sm text-muted-foreground">알림을 불러오는 중…</p>}
            {!loading && error && <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">{error}</p>}
            {!loading && !error && !notifications.length && <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground"><Bell className="size-6 opacity-40" /><p className="text-sm">아직 도착한 알림이 없어요</p></div>}
            {notifications.slice(0, 8).map(item => {
              const category = categories[item.category]
              return <Menu.LinkItem key={item.id} render={<Link to={item.gift_id ? `/notifications?gift=${encodeURIComponent(item.gift_id)}` : '/notifications'} />} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 outline-none data-highlighted:bg-accent">
                <span className="mt-0.5 flex w-11 shrink-0 flex-col items-center gap-1 rounded-lg bg-muted py-2 text-muted-foreground"><category.icon className="size-4" aria-hidden="true" /><span className="text-[10px] font-medium">{category.label}</span></span>
                <span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className="flex-1 break-words text-sm font-medium leading-5">{item.title}</span>{!item.read_at && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-label="읽지 않음" />}</span>{item.body && <span className="mt-1 block line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{item.body}</span>}<time dateTime={item.created_at} className="mt-1.5 block text-[11px] text-muted-foreground">{relativeTime(item.created_at, now)}</time></span>
              </Menu.LinkItem>
            })}
          </div>
          <Menu.Separator className="h-px bg-border" />
          <Menu.LinkItem render={<Link to="/notifications" />} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 text-xs font-medium outline-none data-highlighted:bg-accent">파도 우편함 가기<ArrowRight className="size-3.5" /></Menu.LinkItem>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>
}
