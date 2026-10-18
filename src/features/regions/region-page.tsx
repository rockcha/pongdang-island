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
 if(!map)return <p role="status" className="py-8">지역을 확인하는 중…</p>
 if(!region)return <section className="space-y-4 py-8"><h1>찾을 수 없는 지역이에요.</h1><Link to="/harbor">지도로</Link></section>
 if(!region.unlocked||map.currentRegion!==region.id)return <section className="space-y-4 py-8"><h1 className="text-xl font-bold">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="mr-2 inline-block size-7 align-middle"/>}{region.name}</h1><p className="text-sm text-muted-foreground">{!region.unlocked?'지도가 필요한 잠긴 지역이에요.':'아직 도착하지 않은 지역이에요.'}</p>{region.unlocked&&<Link to={`/sailing/${region.id}`} className={buttonVariants()}>이 지역으로 출항</Link>}<Link to="/harbor" className={buttonVariants({variant:'outline'})}>지도로</Link></section>
 return <section className="flex min-h-0 w-full flex-1 flex-col">
  <div className="relative z-30 h-[120px] shrink-0 bg-muted">
   <LandscapeImage src={fishingBannerPath(region.id)??regionImageUrl(region.image_path)} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover"/>
   <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10"/>
   <div className="absolute inset-x-4 bottom-4 text-white"><h1 className="flex items-center gap-2 text-2xl font-normal tracking-tight drop-shadow-sm">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" aria-hidden="true" className="size-7 shrink-0 object-contain"/>}{region.name}</h1>{region.description&&<p className="mt-1.5 line-clamp-2 max-w-sm text-xs leading-5 text-white/85">{region.description}</p>}</div>
  </div>
  <div className="relative flex min-h-0 flex-1 flex-col">
   <div ref={setToolbar} role="group" aria-label="낚시 도구" className="absolute inset-x-0 top-0 z-30 flex items-stretch gap-0 overflow-visible border-b border-white/20 bg-slate-950/45 text-white [&>div]:flex [&>div]:min-w-0 [&>div]:flex-1 [&>div]:justify-center [&>div>button]:h-12 [&>div>button]:w-full [&>div>a]:h-12 [&>div>a]:w-full [&>div>button]:rounded-none [&>div>button]:border-0 [&>div>button]:bg-transparent [&>div>button]:shadow-none [&>div>button]:backdrop-blur-none [&>div>button:hover]:bg-white/15 [&>div>a]:rounded-none [&>div>a]:border-0 [&>div>a]:bg-transparent [&>div>a]:backdrop-blur-none [&>div>a:hover]:bg-white/15 [&>div+div]:border-l [&>div+div]:border-white/15"/>
   <FishingPanel regionId={region.id} toolbarTarget={toolbar}/>
  </div>
 </section>
}
