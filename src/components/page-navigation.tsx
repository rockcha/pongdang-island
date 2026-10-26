import {useLocation,useNavigate} from 'react-router'
import type {ComponentType} from 'react'
import {ChevronLeft,House,Handshake,Mail,Download,FishingRod,Gamepad2,Megaphone,PackageOpen,Info,Wrench,CalendarDays} from 'lucide-react'
import {appArt} from './app-art'
import {HeaderPlaceNavigation,headerPlaces,menuIcons} from './header-place-navigation'
import {arcadeGames} from '@/features/arcade/games'
import {placeSections} from '@/lib/place-sections'
import {regionIcons} from '@/features/regions/region-icons'

export function pageNavigation(pathname:string,noticeCategory?:string){
 const path=pathname.replace(/\/+$/,'')||'/'
 const place=[...headerPlaces].sort((a,b)=>b.to.length-a.to.length).find(item=>path===item.to||path.startsWith(item.to+'/'))
 const square=placeSections.square.items.find(item=>path===item.path||path.startsWith(item.path+'/'))
 let label=square?.title??place?.label??'퐁당섬'
 let Icon:ComponentType<{className?:string}>=square?.icon??place?.icon??appArt.island
 let action:{to:string;label:string}|undefined
 const parent=['/exchange','/board','/arcade','/square/notices','/square/suggestions','/square/bugs'].find(parent=>path.startsWith(parent+'/'))
 if(parent)action={to:parent,label:'목록으로'}
 const game=arcadeGames.find(game=>path===`/arcade/${game.id}`)
 if(game){label=game.title;Icon=game.icon}
 if(path==='/arcade')label='오락실'
 if(path.startsWith('/friends/')){label=path.endsWith('/expeditions')?'친구 통발':'친구 아쿠아리움';Icon=path.endsWith('/expeditions')?appArt.expeditions:appArt.aquarium}
 if(path==='/square'){label='광장';Icon=appArt.plaza}
 if(path.startsWith('/square/notices')){
  label=path.endsWith('/new')?'공지 작성':path.endsWith('/edit')?'공지 수정':noticeCategory??'공지'
  Icon=({'업데이트':appArt.noticeUpdate,'안내':appArt.noticeGuide,'버그 수정':appArt.noticeMaintenance,'이벤트':appArt.noticeEvent} as Record<string,typeof appArt.island>)[noticeCategory??'']??appArt.notices
 }
 if(path==='/profile'){label='내 정보';Icon=appArt.profile}
 if(path==='/notifications'){label='우편함';Icon=appArt.mailbox}
 if(path==='/download'){label='앱 설치';Icon=appArt.download}
 if(path==='/warehouse')action={to:'/shop',label:'낚시 상점'}
 if(path==='/shipyard')action={to:'/port',label:'항구로'}
 if(/^\/(region|sailing)\//.test(path)){label=regionIcons[path.split('/')[2]]?.name??'낚시';Icon=appArt.rod}
 Icon=(place?menuIcons[place.to]:undefined)??House
 if(game)Icon=Gamepad2
 if(path.startsWith('/friends/'))Icon=menuIcons[path.endsWith('/expeditions')?'/expeditions':'/aquarium']
 if(path==='/square')Icon=Handshake
 if(path.startsWith('/square/notices'))Icon=({'업데이트':PackageOpen,'안내':Info,'버그 수정':Wrench,'이벤트':CalendarDays} as Record<string,typeof House>)[noticeCategory??'']??Megaphone
 if(path==='/notifications')Icon=Mail
 if(path==='/download')Icon=Download
 if(/^\/(region|sailing)\//.test(path))Icon=FishingRod
 const fallback=action?.to??(path.startsWith('/friends/')?'/friends':/^\/(region|sailing)\//.test(path)?'/harbor':path.startsWith('/square/')?'/square':path==='/aquarium'?'/island-news':'/aquarium')
 return {label,Icon,action,fallback}
}

export function PageNavigation({noticeCategory}:{noticeCategory?:string}){
 const {pathname,search}=useLocation(),navigate=useNavigate()
 const page=pageNavigation(pathname,noticeCategory)
 function back(){
  if(/^\/friends\/[^/]+\/aquarium\/?$/.test(pathname)){const params=new URLSearchParams(search);if(params.has('tank')){params.delete('tank');navigate({pathname,search:params.toString()},{replace:true});return}}
  if(/^\/aquarium\/[^/]+\/?$/.test(pathname)){navigate('/aquarium');return}
  const index=window.history.state?.idx
  if(typeof index==='number'&&index>0)navigate(-1)
  else navigate(page.fallback)
 }
 return <div className="flex min-h-12 min-w-0 items-center gap-2 border-t border-border/60 py-1" data-page-navigation>
  <h1 className="min-w-0 flex-1 text-xs font-medium text-primary">
   <button type="button" onClick={back} aria-label="뒤로 가기" title={`${page.label} · 뒤로 가기`} className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <ChevronLeft aria-hidden="true" className="size-4 shrink-0"/>
    <span className="min-w-0 truncate">{page.label}</span>
   </button>
  </h1>
  <HeaderPlaceNavigation/>
 </div>
}
