import {BannerInfo,fishingGuide} from '@/components/banner-info'
import { LandscapeImage } from '@/components/landscape-image'
import { fishingBannerPath } from './fishing-banner'
import {regionIcons} from '@/features/regions/region-icons'
import { FishingPanel } from '@/features/fishing/fishing-panel'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { loadRegionMap, regionImageUrl } from './api'
import type { RegionMap } from './api'
export function RegionPage(){
 const {regionId}=useParams()
 const {session}=useAuth()
 return <Destination key={`${session?.user.id}:${regionId}`} regionId={regionId??''}/>
}
function Destination({regionId}:{regionId:string}){
 const [map,setMap]=useState<RegionMap|null>(null)
 const [error,setError]=useState('')
 const [attempt,setAttempt]=useState(0)
 const [toolbar,setToolbar]=useState<HTMLDivElement|null>(null)
 useEffect(()=>{
  let active=true
  loadRegionMap().then(data=>{if(active){setMap(data);setError('')}}).catch(()=>{if(active)setError('지역을 불러오지 못했어요.')})
  return()=>{active=false}
 },[attempt])
 const region=map?.regions.find(item=>item.id===regionId)
 if(error)return <div role="alert" className="space-y-3 py-8"><p>{error}</p><Button onClick={()=>setAttempt(v=>v+1)}>다시 불러오기</Button></div>
 if(!map)return <section role="status" aria-label="Loading" className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950/5"><span className="sr-only">Loading</span><div aria-hidden="true" className="flex min-h-0 flex-1 flex-col motion-safe:animate-pulse"><div className="flex h-[120px] shrink-0 flex-col justify-end gap-3 bg-muted p-4"><div className="h-6 w-32 rounded bg-foreground/10"/><div className="h-3 w-56 max-w-full rounded bg-foreground/10"/></div><div className="flex h-12 shrink-0 items-center justify-around border-b bg-muted/70">{[0,1,2,3].map(i=><div key={i} className="size-6 rounded bg-foreground/10"/>)}</div><div className="relative min-h-64 flex-1 bg-gradient-to-b from-muted/50 to-muted"><div className="absolute bottom-8 left-4 h-12 w-44 rounded-lg bg-foreground/10"/><div className="absolute bottom-8 right-4 size-16 rounded-full bg-foreground/10"/></div><div className="h-28 shrink-0 border-t bg-muted/60"/></div></section>
 if(!region)return <section className="space-y-4 py-8"><h1>찾을 수 없는 지역이에요.</h1><Link to="/harbor">지도로</Link></section>
 if(!region.unlocked||map.currentRegion!==region.id)return <section className="space-y-4 py-8"><h1 className="text-xl font-bold">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="mr-2 inline-block size-7 align-middle"/>}{region.name}</h1><p className="text-sm text-muted-foreground">{!region.unlocked?'지도가 필요한 잠긴 지역이에요.':'아직 도착하지 않은 지역이에요.'}</p>{region.unlocked&&<Link to={`/sailing/${region.id}`} className={buttonVariants()}>이 지역으로 출항</Link>}<Link to="/harbor" className={buttonVariants({variant:'outline'})}>지도로</Link></section>
 return <section className="flex min-h-0 w-full flex-1 flex-col">
  <div className="relative z-30 h-[120px] shrink-0 bg-muted">
   <LandscapeImage src={fishingBannerPath(region.id)??regionImageUrl(region.image_path)} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover"/>
   <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(45,28,20,0.88)_0%,rgba(45,28,20,0.50)_45%,rgba(45,28,20,0.04)_100%)]"/>
   <div className="absolute inset-x-4 bottom-4 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"><div className="flex items-center gap-1"><h1 className="min-w-0 text-xl font-normal tracking-tight">{region.name}</h1><BannerInfo key={region.id} title={region.name} steps={fishingGuide}/></div>{region.description&&<p className="mt-1 line-clamp-2 max-w-sm text-xs leading-5 text-white">{region.description}</p>}</div>
  </div>
  <div className="relative flex min-h-0 flex-1 flex-col">
   <div ref={setToolbar} role="group" aria-label="낚시 게이지" className="absolute inset-x-0 top-0 z-30 flex flex-col overflow-hidden text-white"/>
   <FishingPanel regionId={region.id} toolbarTarget={toolbar}/>
  </div>
 </section>
}
