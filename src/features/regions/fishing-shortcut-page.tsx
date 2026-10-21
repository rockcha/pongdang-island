import {useEffect,useState} from 'react'
import {Link,useNavigate} from 'react-router'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {loadRegionMap} from './api'
import {rememberedRegionIndex} from './remembered-region'

export function FishingShortcutPage(){
 const {session}=useAuth(),navigate=useNavigate()
 const [error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{
  let active=true
  setError(false)
  void loadRegionMap().then(map=>{
   if(!active)return
   const remembered=map.regions[rememberedRegionIndex(map.regions,map.currentRegion,session?.user.id)]
   const region=remembered?.unlocked?remembered:map.regions.find(item=>item.id===map.currentRegion&&item.unlocked)??map.regions.find(item=>item.unlocked)
   if(!region){navigate('/harbor',{replace:true});return}
   navigate(`/${region.id===map.currentRegion?'region':'sailing'}/${region.id}`,{replace:true})
  }).catch(()=>{if(active)setError(true)})
  return()=>{active=false}
 },[navigate,session?.user.id,retry])
 return <section className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-sm">
  {error?<><p role="alert">최근 낚시터를 불러오지 못했어요.</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>다시 시도</Button><Link to="/harbor" className="text-primary underline">지도로 가기</Link></>:<p role="status">최근 낚시터로 이동하는 중…</p>}
 </section>
}
