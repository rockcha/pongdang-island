import {useCallback,useEffect,useRef,useState} from 'react'
import {Navigate,useParams} from 'react-router'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {ActiveExpeditionCard} from './active-expedition-card'
import {FriendTailwindButton} from './friend-tailwind-button'
import {loadFriendExpedition} from './api'
import type {FriendExpeditionState,FriendExpeditionVisit} from './api'

export function FriendExpeditionPage(){
 const {ownerId}=useParams(),{session}=useAuth()
 if(ownerId===session?.user.id)return <Navigate to="/expeditions" replace/>
 return <Visit key={`${session?.user.id}:${ownerId}`} owner={ownerId??''}/>
}
function Visit({owner}:{owner:string}){
 const [data,setData]=useState<FriendExpeditionVisit|null>(null),[error,setError]=useState(''),[now,setNow]=useState(0)
 const offset=useRef(0),revision=useRef(0),alive=useRef(true)
 const reload=useCallback(async()=>{
  const request=++revision.current
  try{
   const value=await loadFriendExpedition(owner)
   if(!alive.current||request!==revision.current)return
   offset.current=Date.parse(value.serverNow)-Date.now();setNow(Date.now()+offset.current);setData(value);setError('')
  }catch(cause){if(alive.current&&request===revision.current){const message=String((cause as {message?:string})?.message??'');setError(message.includes('FRIENDSHIP_REQUIRED')?'현재 친구인 주민의 통발만 방문할 수 있어요.':'친구의 통발 결과를 불러오지 못했어요. 다시 시도해주세요.')}}
 },[owner])
 useEffect(()=>{
  alive.current=true;void reload()
  const tick=setInterval(()=>setNow(Date.now()+offset.current),1000)
  const refresh=()=>{if(document.visibilityState!=='hidden')void reload()}
  const poll=setInterval(refresh,30000)
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh)
  return()=>{alive.current=false;revision.current++;clearInterval(tick);clearInterval(poll);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}
 },[reload])
 function helped(result:FriendExpeditionState){
  revision.current++
  const latest=result.friends.find(f=>f.friend_id===owner)
  setData(previous=>previous?{...previous,boosted:true,active:latest?.expedition_id&&previous.active?.id===latest.expedition_id?{...previous.active,returns_at:latest.returns_at!}:null}:previous)
  void reload()
 }
 const remaining=data?.active?Math.max(0,Date.parse(data.active.returns_at)-now):0
 return <section aria-label="친구 통발 설치" className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden">
  <div className="flex min-h-14 shrink-0 items-center gap-2 border-b px-2">{data&&<><PlayerAvatar userId={data.owner.id} nickname={data.owner.nickname} path={data.owner.avatar_path} className="size-8 shrink-0"/><span className="inline-flex max-w-full min-w-0 items-center gap-1 align-middle"><h2 className="min-w-0 truncate text-sm">{data.owner.nickname}님의 통발</h2></span></>}</div>
  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pt-3 pb-4">
   {error?<div role="alert" className="space-y-3 p-4 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>void reload()}>다시 불러오기</Button></div>:!data?<p role="status" className="py-16 text-center text-sm text-muted-foreground">친구의 통발을 찾는 중…</p>:data.active&&remaining>0?<ActiveExpeditionCard expedition={data.active} baits={data.baits} regionName={data.regionName??data.active.region_id} remaining={remaining}>
    {null}
   </ActiveExpeditionCard>:<div className="space-y-3 rounded-2xl border bg-card px-5 py-12 text-center"><img src="/app-icons/fish-trap.png" alt="" className="mx-auto size-32 object-contain"/><h3 className="text-base">지금은 유인 중인 통발이 없어요</h3><p className="text-xs leading-5 text-muted-foreground">친구가 다시 통발을 설치하면 물고기를 유인해줄 수 있어요.</p></div>}
  </div>
  {!error&&data?.active&&remaining>0&&<div className="shrink-0 space-y-2 border-t border-border bg-background pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
   <FriendTailwindButton key={data.active.id} expanded nickname={data.owner.nickname} now={now} status={{friend_id:owner,expedition_id:data.active.id,returns_at:data.active.returns_at,boosted:data.boosted}} onBoost={helped}/>
   <p className="text-center text-[11px] leading-5 text-muted-foreground">한 번의 물고기 유인으로 10분 가속 · 통발마다 한 번</p>
  </div>}
 </section>
}
