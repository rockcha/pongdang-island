import { useState } from 'react'
import { placeSections } from '@/lib/place-sections'

export const placeBanners:Record<string,{title:string;image:string;description:string;subtitle:string}>={
 '/':{title:'퐁당 섬',image:'island',description:'잔잔한 바다와 작은 집들이 반기는 퐁당 섬',subtitle:'섬에서의 하루가 시작되는 곳'},
 '/harbor':{title:'선착장',image:'harbor',description:'작은 배가 쉬어 가는 나무 선착장',subtitle:'새로운 바다로 떠나는 곳'},
 '/friends':{title:'등대',image:'lighthouse',description:'바다를 바라보는 언덕 위 작은 등대',subtitle:'친구를 만나고 인연을 이어가는 곳'},
 '/notifications':{title:'우편함',image:'mailbox',description:'편지와 섬의 소식이 도착하는 해변 우편함',subtitle:'친구와 섬에서 도착한 소식과 선물'},
 '/square':{title:'광장',image:'square',description:'게시판과 작은 집들이 둘러선 섬의 광장',subtitle:placeSections.square.description},
 '/merchant-street':{title:'상인거리',image:'merchant-street',description:'바닷가 상점과 노점들이 늘어선 상인거리',subtitle:placeSections.merchants.description},
}

export function PlaceBanner({pathname}:{pathname:string}){
 const section=Object.values(placeSections).find(place=>pathname===place.path||pathname.startsWith(`${place.path}/`))
 const banner=placeBanners[section?.path??pathname]
 const [failed,setFailed]=useState('')
 if(!banner)return null
 const src=`/banners/${banner.image}.png`
 return <div className="relative -mx-6 h-[120px] shrink-0 overflow-hidden bg-gradient-to-r from-primary to-blue-300" aria-labelledby="place-banner-title">
  {failed!==src&&<img key={src} src={src} alt={banner.description} width={1536} height={512} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" onError={()=>setFailed(src)}/>}
  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" aria-hidden="true"/>
  <div className="absolute inset-x-6 bottom-4 space-y-1 text-white"><h1 id="place-banner-title" className="text-xl font-bold tracking-tight">{banner.title}</h1><p className="text-xs leading-5 text-white/90">{banner.subtitle}</p></div>
 </div>
}
