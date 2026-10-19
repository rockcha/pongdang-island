import {appArt} from '@/components/app-art'
import { useState } from 'react'
import { Link } from 'react-router'
import {Check,Pencil} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { LandscapeImage } from '@/components/landscape-image'

const {aquarium:AquariumIcon,plaza:PlazaIcon,savings:Shell,map:Map,warehouse:Warehouse,arcade:Gamepad2,lighthouse:TowerControl,mailbox:Mail,shop:Store,exchange:Handshake,notices:Megaphone,settings:Settings,profile:UserRound}=appArt


const places = [
 {path:'/aquarium',name:'아쿠아리움',banner:'aquarium',icon:AquariumIcon},
 {path:'/harbor',name:'지도',banner:'map-menu',icon:Map},
 {path:'/shop',name:'상점',banner:'merchant-shop',icon:Store},
 {path:'/savings',name:'조개 적금',banner:'shell-savings',icon:Shell},
 {path:'/warehouse',name:'창고',banner:'warehouse',icon:Warehouse},
 {path:'/arcade',name:'게임',banner:'arcade',icon:Gamepad2},
 {path:'/friends',name:'등대',banner:'lighthouse',icon:TowerControl},
 {path:'/notifications',name:'우편함',banner:'mailbox-menu',icon:Mail},
 {path:'/square',name:'광장',banner:'square',icon:PlazaIcon},
 {path:'/square/notices',name:'공지사항',banner:'square-notices',icon:Megaphone},
 {path:'/exchange',name:'거래소',banner:'merchant-exchange',icon:Handshake},
 {path:'/profile',name:'마이페이지',banner:'profile-menu',icon:UserRound},
 {path:'/profile/settings',name:'설정',banner:'settings-menu',icon:Settings},
]
const defaults=['/aquarium','/harbor','/shop','/friends']
const storageKey='pongdang:quick-menu'
function savedMenu():string[]{
 try{
  const saved:unknown=JSON.parse(localStorage.getItem(storageKey)??'null')
  const aliases:Record<string,string>={'/merchant-street':'/shop','/merchant-street/exchange':'/exchange','/merchant-street/auctions':'/exchange'}
  const value=Array.isArray(saved)?saved.map(path=>typeof path==='string'?(aliases[path]??path):path):saved
  if(Array.isArray(value)&&value.length===4&&new Set(value).size===4&&value.every(path=>places.some(place=>place.path===path)))return value
 }catch{}
 return defaults
}
export function HomePage(){
 const [menu,setMenu]=useState(savedMenu)
 const [editing,setEditing]=useState(false)
 const [slot,setSlot]=useState<number|null>(null)
 function choose(path:string){
  if(slot===null)return
  const next=[...menu],existing=next.indexOf(path)
  if(existing!==-1)next[existing]=next[slot]
  next[slot]=path;setMenu(next);setSlot(null)
  try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{toast.error('빠른 메뉴를 저장하지 못했어요. 이번 화면에서는 사용할 수 있어요.')}
 }
 return <section className="flex min-h-0 min-w-0 flex-1 flex-col">
  <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2"><h2 className="text-sm font-medium">자주 방문하는 곳을 정해두어요</h2><Button variant="ghost" size="sm" aria-pressed={editing} onClick={()=>setEditing(value=>!value)}><Pencil className="size-3.5"/>{editing?'완료':'편집'}</Button></div>
  <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-px border-t border-border bg-border">{menu.map((path,index)=>{
   const place=places.find(item=>item.path===path)!
   const content=<><div aria-hidden="true" className="pointer-events-none absolute inset-0"><LandscapeImage retryable={false} src={'/banners/'+place.banner+'.png'} alt="" className="absolute inset-0 size-full object-cover"/></div><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/5"/><div className="relative flex min-w-0 flex-col items-center gap-3 p-3 text-white drop-shadow-md"><place.icon className="size-8 text-white" strokeWidth={1.6}/><span className="text-sm font-medium">{place.name}</span></div>{editing&&<Pencil aria-hidden="true" className="absolute right-3 top-3 size-4 text-white drop-shadow-md"/>}</>
   const className='relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-card text-center outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring'
   return editing?<button key={index} className={className} aria-label={(index+1)+'번 빠른 메뉴 변경: '+place.name} onClick={()=>setSlot(index)}>{content}</button>:<Link key={index} className={className} to={place.path}>{content}</Link>
  })}</div>
  <Dialog open={slot!==null} onOpenChange={open=>{if(!open)setSlot(null)}}><DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[80dvh] max-h-[80dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"><DialogHeader className="shrink-0 pr-6"><DialogTitle className="flex items-center gap-2"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-6 shrink-0 object-contain"/>빠른 메뉴 선택</DialogTitle><DialogDescription>자주 가는 페이지를 골라주세요.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain">{places.map(place=><button key={place.path} className="flex min-h-14 w-full items-center gap-3 px-2 text-left text-sm outline-none hover:bg-secondary focus-visible:bg-secondary" aria-pressed={slot!==null&&menu[slot]===place.path} onClick={()=>choose(place.path)}><place.icon className="size-5 shrink-0 text-primary"/>{place.name}{slot!==null&&menu[slot]===place.path&&<Check className="ml-auto size-4 text-primary"/>}</button>)}</div></DialogContent></Dialog>
 </section>
}