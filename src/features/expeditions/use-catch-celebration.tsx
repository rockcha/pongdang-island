import {useRef,useState} from 'react'
import {useNavigate} from 'react-router'
import {useAuth} from '@/components/auth-provider'
import {CatchReveal} from '@/features/fishing/catch-reveal'
import {usePwaUpdateBlock} from '@/features/pwa/update-blockers'
import {startShowcaseDraft} from '@/features/showcase/draft'
import type {Species} from '@/features/collection/api'
import type {Catch} from './api'

export type CatchBatch={source:'trap'|'harbor';tripId:string;regionName:string;caughtAt:string;items:Catch[]}
export const celebratedCatches=(batches:CatchBatch[])=>batches.flatMap(batch=>batch.items.filter(item=>item.species.rarity==='epic'||item.species.rarity==='mythic').map(item=>({batch,item})))

export function useCatchCelebration(){
 const {session}=useAuth(),navigate=useNavigate()
 const [queue,setQueue]=useState<ReturnType<typeof celebratedCatches>>([])
 const seen=useRef(new Set<string>())
 const current=queue[0]
 usePwaUpdateBlock(!!current)
 function start(batches:CatchBatch[]){
  const next=celebratedCatches(batches).filter(({item})=>!seen.current.has(item.id))
  next.forEach(({item})=>seen.current.add(item.id))
  if(next.length)setQueue(previous=>[...previous,...next])
 }
 function open(batch:CatchBatch,item:Catch){setQueue(celebratedCatches([{...batch,items:[item]}]))}
 const reveal=current?<CatchReveal key={current.item.id} species={current.item.species as Species} firstDiscovery={current.item.firstDiscovery} onDismiss={()=>setQueue(previous=>previous.slice(1))} onShare={session?.user.id?()=>{
  const {batch,item}=current
  const id=startShowcaseDraft({owner:session.user.id,operationId:item.id,source:batch.source,tripId:batch.tripId,species:item.species as Species,regionName:batch.regionName,caughtAt:batch.caughtAt,firstDiscovery:!!item.firstDiscovery,renderVersion:1,preview:false})
  setQueue([]);navigate('/showcase/new',{state:{showcaseDraft:id}})
 }:undefined}/>:null
 return {start,open,reveal,active:!!current}
}
