import { MapPin } from 'lucide-react'
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
 const [failed,setFailed]=useState(false)
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
 if(!region.unlocked||map.currentRegion!==region.id)return <section className="space-y-4 py-8"><h1 className="text-xl font-bold">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="mr-2 inline-block size-7 align-middle"/>}{region.name}</h1><p className="text-sm text-muted-foreground">{!region.unlocked?'지도 조각이 필요한 잠긴 지역이에요.':'아직 도착하지 않은 지역이에요.'}</p>{region.unlocked&&<Link to={`/sailing/${region.id}`} className={buttonVariants()}>이 지역으로 출항</Link>}<Link to="/harbor" className={buttonVariants({variant:'outline'})}>지도로</Link></section>
 return <section className="flex min-h-0 w-full flex-1 flex-col">
  <div className="relative z-30 h-[120px] shrink-0 bg-muted">
   {!failed&&<img src={fishingBannerPath(region.id)??regionImageUrl(region.image_path)} alt="" className="absolute inset-0 h-full w-full object-cover" onError={()=>setFailed(true)}/>}
   <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/>
   <div className="absolute inset-x-4 bottom-4 text-white"><h1 className="flex items-center gap-2 text-2xl font-normal tracking-tight drop-shadow-sm"><MapPin className="size-5 shrink-0" aria-hidden="true"/>{region.name}</h1>{region.description&&<p className="mt-1.5 line-clamp-2 max-w-sm text-xs leading-5 text-white/85">{region.description}</p>}</div>
  </div>
  <div className="relative flex min-h-0 flex-1 flex-col">
   <div ref={setToolbar} style={region.id==='primal'?{display:'none'}:undefined} role="group" aria-label="낚시 도구" className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-0 overflow-visible rounded-xl border border-white/20 bg-slate-950/45 p-1 text-white backdrop-blur-md [&>div>button]:size-11 [&>div>button]:rounded-none [&>div>button]:border-0 [&>div>button]:bg-transparent [&>div>button]:shadow-none [&>div>button]:backdrop-blur-none [&>div>button:hover]:bg-white/15 [&>div>a]:rounded-none [&>div>a]:border-0 [&>div>a]:bg-transparent [&>div>a]:backdrop-blur-none [&>div>a:hover]:bg-white/15 [&>div+div]:border-l [&>div+div]:border-white/15"/>
   {region.id==='primal'?<div className="flex flex-1 items-center justify-center bg-muted/30 p-6 text-center text-sm text-muted-foreground">태고의 원시섬의 개체들을 준비하고 있어요.</div>:<FishingPanel regionId={region.id} toolbarTarget={toolbar}/>}
  </div>
 </section>
}
