import {regionIcons} from '@/features/regions/region-icons'
import { FishingPanel } from '@/features/fishing/fishing-panel'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { RarityBadge } from '@/components/rarity-badge'
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
 useEffect(()=>{
  let active=true
  loadRegionMap().then(data=>{if(active){setMap(data);setError('')}}).catch(()=>{if(active)setError('지역을 불러오지 못했어요.')})
  return()=>{active=false}
 },[attempt])
 const region=map?.regions.find(item=>item.id===regionId)
 if(error)return <div role="alert" className="space-y-3 py-8"><p>{error}</p><Button onClick={()=>setAttempt(v=>v+1)}>다시 불러오기</Button></div>
 if(!map)return <p role="status" className="py-8">지역을 확인하는 중…</p>
 if(!region)return <section className="space-y-4 py-8"><h1>찾을 수 없는 지역이에요.</h1><Link to="/harbor">선착장으로</Link></section>
 if(!region.unlocked||map.currentRegion!==region.id)return <section className="space-y-4 py-8"><h1 className="text-xl font-bold">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="mr-2 inline-block size-7 align-middle"/>}{region.name}</h1><p className="text-sm text-muted-foreground">{!region.unlocked?'지도 조각이 필요한 잠긴 지역이에요.':'아직 도착하지 않은 지역이에요.'}</p>{region.unlocked&&<Link to={`/sailing/${region.id}`} className={buttonVariants()}>이 지역으로 출항</Link>}<Link to="/harbor" className={buttonVariants({variant:'outline'})}>선착장으로</Link></section>
 return <section className="flex min-h-0 w-full flex-1 flex-col">
  <div className="relative h-[100px] shrink-0 overflow-hidden bg-muted sm:h-[120px]">
   {!failed&&<img src={regionImageUrl(region.image_path)} alt="" className="absolute inset-0 h-full w-full object-cover" onError={()=>setFailed(true)}/>}
   <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/>
   <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-8 text-center text-white">
    <h1 className="flex items-center justify-center gap-2 text-lg font-semibold tracking-wide drop-shadow-[0_2px_8px_#0008] sm:text-xl">{regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" className="size-6"/>}{region.name}</h1>
    <span className="h-px w-12 bg-gradient-to-r from-transparent via-white/70 to-transparent" aria-hidden="true"/>
   </div><div className="absolute bottom-2 left-3"><RarityBadge rarity={region.rarity}/></div>
  </div>
  <FishingPanel regionId={region.id}/>
 </section>
}
