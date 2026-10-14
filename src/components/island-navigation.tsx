import { useEffect, useState } from 'react'
import { BookOpen, Store, Anchor, ChevronRight, Fish, House, Mail, Menu, UserRound, TowerControl } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { getNickname, useAuth } from '@/components/auth-provider'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { useSocial } from '@/features/social/social-provider'

export const islandNavigation = [
  { to: '/', label: '퐁당마을', description: '섬에서의 하루가 시작되는 곳', icon: House },
  { to: '/aquarium', label: '아쿠아리움', description: '내가 만난 물고기들의 작은 바다', icon: Fish },
  { to: '/collection', label: '바다 도감', description: '만난 생명과 물건의 이야기', icon: BookOpen },
  { to: '/harbor', label: '선착장', description: '새로운 바다로 떠나는 곳', icon: Anchor },
  { to: '/shop', label: '섬 상점', description: '작은 물건을 사고파는 곳', icon: Store },
  { to: '/friends', label: '만남의 등대', description: '친구를 만나고 인연을 이어가는 곳', icon: TowerControl },
  { to: '/notifications', label: '우체통', description: '친구와 섬에서 도착한 소식', icon: Mail },
  { to: '/profile', label: '마이페이지', description: '닉네임과 아바타 꾸미기', icon: UserRound },
]

export function IslandNavigation() {
  const [open,setOpen] = useState(false)
  const { pathname } = useLocation()
  const { session } = useAuth()
  const { profile,unread } = useSocial()
  const count = unread.friend + unread.general
  useEffect(() => { setOpen(false) },[pathname,session?.user.id])
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="섬 메뉴 열기" />}><Menu className="size-5" /></SheetTrigger>
    <SheetContent side="left" className="overflow-y-auto" style={{width:'min(85vw,20rem)',paddingTop:'env(safe-area-inset-top, 0px)',paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
      <SheetHeader className="px-5 pt-7"><SheetTitle className="text-xl">퐁당섬 안내소</SheetTitle><SheetDescription>오늘은 어디로 가볼까요?</SheetDescription></SheetHeader>
      <div className="mx-5 flex items-center gap-3 rounded-2xl bg-primary/5 p-4"><PlayerAvatar nickname={getNickname(session)} path={profile?.avatar_path} className="size-11" /><div className="min-w-0"><p className="truncate font-semibold">{getNickname(session) || '새로운 여행자'}님</p><p className="mt-1 text-xs text-muted-foreground">퐁당섬에 오신 걸 환영해요</p></div></div>
      <nav aria-label="섬 페이지 이동" className="space-y-2 px-3">
        {islandNavigation.map(({to,label,description,icon:Icon}) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({isActive}) => `flex min-h-16 items-center gap-3 rounded-xl px-3 py-3 transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
          <Icon className="size-5 shrink-0" /><div className="flex-1"><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
          {to === '/notifications' && count > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{count > 99 ? '99+' : count}</span> : <ChevronRight className="size-4 opacity-40" />}
        </NavLink>)}
      </nav>
    </SheetContent>
  </Sheet>
}
