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
 return <section className="space-y-5 py-6"><div className="flex items-center justify-between gap-2"><div><p className="mb-1 text-xs text-muted-foreground">현재 머무는 바다</p><h1 className="text-2xl font-bold">{region.name}</h1></div><RarityBadge rarity={region.rarity}/></div><div className="aspect-square overflow-hidden rounded-2xl bg-muted">{failed?<p className="flex h-full items-center justify-center text-sm text-muted-foreground">지역 이미지를 준비 중이에요</p>:<img src={regionImageUrl(region.image_path)} alt={region.name} className="h-full w-full object-cover" onError={()=>setFailed(true)}/>}</div><p className="text-sm leading-6 text-muted-foreground">{region.description}</p><FishingPanel regionId={region.id}/><Link to="/harbor" className={buttonVariants({variant:'outline',className:'min-h-11 w-full'})}>선착장 · 지도 보기</Link></section>
}
