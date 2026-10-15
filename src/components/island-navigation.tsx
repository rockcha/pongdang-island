import { useEffect, useState } from 'react'
import { Anchor, ChevronDown,ChevronRight, Fish, Mail, Menu, UserRound, TowerControl,Building2,ShoppingBag } from 'lucide-react'
import type { ComponentType } from 'react'
import { IslandIcon } from './island-icon'
import { placeSections } from '@/lib/place-sections'
import { NavLink, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { getNickname, useAuth } from '@/components/auth-provider'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { useSocial } from '@/features/social/social-provider'

type NavigationItem={to:string;label:string;description:string;icon:ComponentType<{className?:string}>;children?:{to:string;label:string;icon:ComponentType<{className?:string}>}[]}
export const islandNavigation:NavigationItem[] = [
  { to: '/', label: '퐁당 섬', description: '섬에서의 하루가 시작되는 곳', icon: IslandIcon },
  { to: '/aquarium', label: '아쿠아리움', description: '내가 만난 물고기들의 작은 바다', icon: Fish },
  { to: '/harbor', label: '선착장', description: '새로운 바다로 떠나는 곳', icon: Anchor },
  { to: '/friends', label: '등대', description: '친구를 만나고 인연을 이어가는 곳', icon: TowerControl },
  {to:placeSections.square.path,label:'광장',description:placeSections.square.description,icon:Building2,children:placeSections.square.items.map(item=>({to:item.path,label:item.title,icon:item.icon}))},
  {to:placeSections.merchants.path,label:'상인거리',description:placeSections.merchants.description,icon:ShoppingBag,children:placeSections.merchants.items.map(item=>({to:item.path,label:item.title,icon:item.icon}))},
  { to: '/notifications', label: '우편함', description: '친구와 섬에서 도착한 소식과 선물', icon: Mail },
  { to: '/profile', label: '마이페이지', description: '닉네임과 아바타 꾸미기', icon: UserRound },
]

export const NAVIGATION_EXPANSION_KEY='pongdang:island-navigation:expanded'
function readExpansion():Record<string,boolean>{
 try{
  const saved:unknown=JSON.parse(localStorage.getItem(NAVIGATION_EXPANSION_KEY)??'{}')
  if(!saved||typeof saved!=='object')return {}
  return Object.fromEntries(islandNavigation.filter(item=>item.children).flatMap(item=>{
   const value=(saved as Record<string,unknown>)[item.to]
   return typeof value==='boolean'?[[item.to,value]]:[]
  }))
 }catch{return {}}
}

export function IslandNavigation() {
  const [open,setOpen] = useState(false)
  const [expanded,setExpanded]=useState(readExpansion)
  function toggleSection(path:string){
   const next={...expanded,[path]:expanded[path]===false}
   setExpanded(next)
   try{localStorage.setItem(NAVIGATION_EXPANSION_KEY,JSON.stringify(next))}catch{/* Navigation remains usable when browser storage is unavailable. */}
  }
  const { pathname } = useLocation()
  const { session } = useAuth()
  const { profile,unread } = useSocial()
  const count = unread.friend + unread.general + (unread.gift ?? 0)
  useEffect(() => { setOpen(false) },[pathname,session?.user.id])
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="섬 메뉴 열기" />}><Menu className="size-5" /></SheetTrigger>
    <SheetContent side="left" className="overflow-y-auto" style={{width:'min(85vw,20rem)',paddingTop:'env(safe-area-inset-top, 0px)',paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
      <SheetHeader className="px-5 pt-7"><SheetTitle className="text-xl">퐁당섬 안내소</SheetTitle><SheetDescription>오늘은 어디로 가볼까요?</SheetDescription></SheetHeader>
      <div className="mx-5 flex items-center gap-3 rounded-2xl bg-primary/5 p-4"><PlayerAvatar nickname={getNickname(session)} path={profile?.avatar_path} className="size-11" /><div className="min-w-0"><p className="truncate font-semibold">{getNickname(session) || '새로운 여행자'}님</p><p className="mt-1 text-xs text-muted-foreground">퐁당섬에 오신 걸 환영해요</p></div></div>
      <nav aria-label="섬 페이지 이동" className="space-y-2 px-3">
        {islandNavigation.map(({to,label,description,icon:Icon,children}) => <div key={to}><div className="flex items-center gap-1"><NavLink to={to} end onClick={() => setOpen(false)} className={({isActive}) => `flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 transition-colors ${isActive ? 'bg-primary/10 text-primary' : children&&(pathname.startsWith(`${to}/`)||children.some(child=>child.to===pathname))?'text-primary':'hover:bg-muted'}`}>
          <Icon className="size-5 shrink-0" /><div className="flex-1"><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
          {to === '/notifications' && count > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{count > 99 ? '99+' : count}</span> : !children&&<ChevronRight className="size-4 opacity-40" />}
        </NavLink>{children&&<Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`${label} ${expanded[to]===false?'펼치기':'접기'}`} aria-expanded={expanded[to]!==false} aria-controls={`navigation-children-${to.slice(1)}`} onClick={()=>toggleSection(to)}><ChevronDown className={`size-4 transition-transform ${expanded[to]===false?'-rotate-90':''}`}/></Button>}</div>{children&&expanded[to]!==false&&<ul id={`navigation-children-${to.slice(1)}`} aria-label={`${label} 하위 메뉴`} className="mb-2 ml-[1.35rem] space-y-0.5 border-l border-border/70 pl-4">{children.map(({to:childPath,label:childLabel,icon:ChildIcon})=><li key={childPath}><NavLink to={childPath} end onClick={()=>setOpen(false)} className={({isActive})=>`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${isActive?'bg-primary/10 font-medium text-primary':'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><ChildIcon className="size-4 shrink-0"/>{childLabel}</NavLink></li>)}</ul>}</div>)}
      </nav>
    </SheetContent>
  </Sheet>
}
