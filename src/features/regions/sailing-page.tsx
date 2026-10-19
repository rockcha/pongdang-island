import {prepareFishingScene} from '@/features/fishing/scene-images'
import { regionIcons } from './region-icons'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { loadRegionMap, travelRegion } from './api'
import type { Region } from './api'
import { pickSailingScene } from './sailing-scenes'
import { JourneyProgress } from './journey-progress'
export const SAILING_DURATION = 1500
export function SailingPage() {
 const {regionId}=useParams()
 const {session}=useAuth()
 const [attempt,setAttempt]=useState(0)
 return <SailingJourney key={`${session?.user.id}:${regionId}:${attempt}`} regionId={regionId??''} retry={()=>setAttempt(v=>v+1)}/>
}
function SailingJourney({regionId,retry}:{regionId:string;retry:()=>void}) {
 const navigate=useNavigate()
 const [region,setRegion]=useState<Region|null>(null)
 const [error,setError]=useState('')
 const [progress,setProgress]=useState(0)
 const [stage,setStage]=useState('항로를 확인하는 중…')
 const [scene]=useState(()=>pickSailingScene())
 useEffect(()=>{
  let active=true
  async function start(){
   try{
    const map=await loadRegionMap()
    if(!active)return
    const target=map.regions.find(item=>item.id===regionId)
    if(!target)throw new Error('지역을 찾을 수 없어요.')
    if(!target.unlocked)throw new Error('지도가 없어 이동할 수 없어요.')
    setRegion(target);setProgress(10);setStage('낚시터 풍경을 준비하는 중…')
    await prepareFishingScene(regionId,fraction=>{if(active)setProgress(10+fraction*75)})
    if(!active)return
    setProgress(90);setStage('도착을 확인하는 중…')
    if(map.currentRegion!==regionId)await travelRegion(regionId)
    if(active){setProgress(100);navigate(`/region/${regionId}`,{replace:true})}
   }catch(cause){if(active)setError(cause instanceof Error&&['SCENE_TIMEOUT','IMAGE_LOAD_FAILED'].includes(cause.message)?'낚시터 이미지를 준비하지 못했어요. 연결을 확인하고 다시 시도해주세요.':cause instanceof Error?cause.message:'항로를 확인하지 못했어요.')}
  }
  void start()
  return()=>{active=false}
 },[regionId,navigate])
 return <section className="fixed inset-0 z-50 flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-background via-blue-50 to-secondary px-6 text-center" aria-busy={!error}>
  {!error ? <><div className="relative my-8"><div className="pongi-raft" data-scene={scene.id} style={{backgroundImage: `url("${scene.image}")`}} role="img" aria-label={scene.label}/></div><div role="status" className="flex flex-col items-center gap-2"><h1 className="flex items-center justify-center gap-2 text-xl font-bold text-foreground">{region&&regionIcons[region.id]&&<img src={regionIcons[region.id].src} alt="" aria-hidden="true" className="size-8 shrink-0"/>}{region?region.name:'출항 준비 중…'}</h1>{region&&<p className="text-xs text-muted-foreground">{stage}</p>}</div><div className="absolute inset-x-6 bottom-[max(2rem,env(safe-area-inset-bottom))]">{region&&<JourneyProgress progress={progress} label={stage}/>}</div></> : <div role="alert" className="space-y-4"><h1 className="text-xl font-bold">항해를 잠시 멈췄어요</h1><p className="text-sm text-muted-foreground">{error}</p><Button onClick={retry}>다시 시도</Button></div>}
  {error&&<Link to="/harbor" className={buttonVariants({variant:'ghost',className:'mt-8 min-h-11 text-primary'})}>지도로 돌아가기</Link>}
 </section>
}
