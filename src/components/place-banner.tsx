import { useState } from 'react'
import { Warehouse } from 'lucide-react'
import { placeSections } from '@/lib/place-sections'
import { arcadeGames } from '@/features/arcade/games'
import {merchantDestinations} from '@/lib/merchant-destinations'
import {squareDestinations} from '@/lib/square-destinations'
import {BannerBreadcrumb} from './banner-breadcrumb'

export const placeBanners:Record<string,{title:string;image:string;description:string;subtitle:string}>={
 '/arcade':{title:'오락실',image:'arcade',description:'바다가 보이는 창문과 작은 게임기들이 있는 따뜻한 섬 오락실',subtitle:'잠깐의 놀이, 작은 즐거움'},
 '/warehouse':{title:'창고',image:'warehouse',description:'낚싯대와 미끼가 가지런히 보관된 따뜻한 해변 창고 내부',subtitle:'다음 항해를 위한 작은 준비'},
 '/shop':{title:'상점',image:'merchant-shop',description:'낚싯대와 미끼가 진열된 따뜻한 상점 내부',subtitle:'미끼부터 나만의 낚싯대까지'},
 '/':{title:'퐁당 섬',image:'island',description:'잔잔한 바다와 작은 집들이 반기는 퐁당 섬',subtitle:'섬에서의 하루가 시작되는 곳'},
 '/harbor':{title:'지도',image:'harbor',description:'새로운 바다로 향하는 섬의 항로',subtitle:'새로운 바다로 떠나는 곳'},
 '/friends':{title:'등대',image:'lighthouse',description:'바다를 바라보는 언덕 위 작은 등대',subtitle:'친구를 만나고 인연을 이어가는 곳'},
 '/notifications':{title:'우편함',image:'mailbox',description:'편지와 섬의 소식이 도착하는 해변 우편함',subtitle:'친구와 섬에서 도착한 소식과 선물'},
 '/square':{title:'광장',image:'square',description:'게시판과 작은 집들이 둘러선 섬의 광장',subtitle:placeSections.square.description},
 '/merchant-street':{title:'상인거리',image:'merchant-street',description:'바닷가 상점과 노점들이 늘어선 상인거리',subtitle:placeSections.merchants.description},
}

export function PlaceBanner({pathname}:{pathname:string}){
 const section=Object.values(placeSections).find(place=>pathname===place.path||pathname.startsWith(`${place.path}/`))
 const merchant=merchantDestinations.find(item=>item.path===pathname)
 const square=squareDestinations.find(item=>pathname===item.path||pathname.startsWith(`${item.path}/`))
 const base=placeBanners[pathname.startsWith('/arcade/')?'/arcade':section?.path??pathname]
 const banner=merchant?{title:merchant.title,image:merchant.banner,description:merchant.description,subtitle:''}:square?{title:square.bannerTitle,image:square.banner,description:square.description,subtitle:''}:base
 const game=pathname.startsWith('/arcade/')?arcadeGames.find(item=>pathname===`/arcade/${item.id}`):undefined
 const [failed,setFailed]=useState('')
 const compact=!!merchant||!!square||pathname.startsWith('/arcade/')
 if(!banner)return null
 const src=`/banners/${banner.image}.png`
 return <div className={`relative -mx-6 ${compact?'h-[clamp(80px,16dvh,128px)]':'h-[120px]'} shrink-0 overflow-hidden bg-gradient-to-r from-primary to-blue-300`} aria-labelledby="place-banner-title">
  {failed!==src&&<img key={src} src={src} alt={banner.description} width={1536} height={512} fetchPriority="high" decoding="async" className={`absolute inset-0 h-full w-full object-center ${compact?'object-contain':'object-cover'}`} onError={()=>setFailed(src)}/>}
  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" aria-hidden="true"/>
  <div className="absolute inset-x-6 bottom-4 space-y-1 text-white"><h1 id="place-banner-title" className={pathname==='/warehouse'?'flex items-center gap-2 text-2xl font-normal tracking-tight':'text-xl font-normal tracking-tight'}>{pathname==='/warehouse'&&<Warehouse className="size-6" aria-hidden="true"/>}{merchant?<BannerBreadcrumb parent={placeSections.merchants.title} to={placeSections.merchants.path} title={merchant.title}/>:square?<BannerBreadcrumb parent="광장" to="/square" title={square.bannerTitle}/>:game?<BannerBreadcrumb parent={placeBanners['/arcade'].title} to="/arcade" title={game.title}/>:banner.title}</h1>{!compact&&<p className="text-xs leading-5 text-white/90">{banner.subtitle}</p>}</div>
 </div>
}
