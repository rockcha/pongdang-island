import {playPurchaseSound,playSaleSound,playRewardSound} from '@/features/gold/purchase-sound'
import {useCallback,useEffect,useEffectEvent,useRef,useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {useGold} from '@/features/gold/gold-provider'
import {randomId} from '@/lib/random-id'
import {harborAction,harborError,loadHarbor} from './api'
import type {HarborAction,HarborState} from './api'
import type {CatchBatch} from '@/features/expeditions/use-catch-celebration'
import {rememberDockRegion} from './dock-region'

function readPending(key:string):HarborAction|null{
 try{const value=JSON.parse(localStorage.getItem(key)??'null');return value&&['expand','buy','fuel','depart','claim','claim_all','dock','store','sell','cancel'].includes(value.p_action)&&typeof value.p_operation_id==='string'&&(value.p_action!=='cancel'||typeof value.p_refund_expected==='boolean'&&typeof value.p_voyage_id==='string')?value:null}catch{return null}
}
export function useHarbor(onClaim?:(batches:CatchBatch[])=>void){
 const {session}=useAuth(),{refresh}=useGold()
 const key=`pongdang:harbor-request:${session?.user.id??'guest'}`
 const [state,setState]=useState<HarborState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [pending,setPending]=useState<HarborAction|null>(()=>readPending(key))
 const [now,setNow]=useState(Date.now),[departure,setDeparture]=useState<string|null>(null)
 const lock=useRef(false),alive=useRef(true),revision=useRef(0),offset=useRef(0)
 function remember(args:HarborAction|null){setPending(args);try{if(args)localStorage.setItem(key,JSON.stringify(args));else localStorage.removeItem(key)}catch{/* Requests still remain in memory when storage is unavailable. */}}
 function apply(data:HarborState){offset.current=Date.parse(data.serverNow)-Date.now();setNow(Date.now()+offset.current);setState(previous=>({...data,
  // A late arrival acknowledgement or cached refresh must not erase the open catch results.
  receipt:data.receipt?.results?data.receipt:previous?.receipt?.results?previous.receipt:data.receipt??previous?.receipt,
 }))}
 async function reload(){if(lock.current)return;const version=++revision.current;try{const data=await loadHarbor();if(alive.current&&version===revision.current&&!lock.current){apply(data);setError('')}}catch(e){if(alive.current&&version===revision.current)setError(harborError(e))}}
 const onRefresh=useEffectEvent(()=>{void reload()})
 useEffect(()=>{
  alive.current=true;onRefresh()
  const tick=setInterval(()=>setNow(Date.now()+offset.current),1000),poll=setInterval(()=>onRefresh(),30000)
  const focus=()=>{if(!document.hidden)onRefresh()}
  window.addEventListener('harbor-changed',focus);window.addEventListener('relic-loadout-changed',focus);window.addEventListener('focus',focus);window.addEventListener('online',focus);document.addEventListener('visibilitychange',focus)
  return()=>{alive.current=false;revision.current++;clearInterval(tick);clearInterval(poll);window.removeEventListener('harbor-changed',focus);window.removeEventListener('relic-loadout-changed',focus);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);document.removeEventListener('visibilitychange',focus)}
 },[])
 async function run(args:HarborAction){
  if(lock.current||pending&&pending.p_operation_id!==args.p_operation_id)return false
  lock.current=true;revision.current++;setBusy(true);setError('');remember(args)
  try{
   const data=await harborAction(args)
   if(args.p_action==='depart'&&args.p_region_id){
    const boat=state?.boats.find(boat=>boat.id===args.p_boat_id)
    rememberDockRegion(session?.user.id??'guest',boat?.dock_slot??null,args.p_region_id)
   }
   // Persist the receipt outcome even if navigation unmounted this page meanwhile.
   try{localStorage.removeItem(key)}catch{}
   if(!alive.current)return true
   apply(data);setPending(null)
   if(args.p_action==='claim'||args.p_action==='claim_all')onClaim?.((data.receipt?.results??[]).map(result=>({source:'harbor',tripId:result.voyageId,regionName:result.regionName??'퐁당섬 앞바다',caughtAt:data.serverNow,items:result.items})))
   if(args.p_action==='expand'||args.p_action==='buy'||args.p_action==='fuel')playPurchaseSound(args.p_operation_id)
   if(args.p_action==='sell')playSaleSound(args.p_operation_id)
   if((args.p_action==='claim'||args.p_action==='claim_all')&&data.receipt?.results?.some(result=>result.items.length>0))playRewardSound(`harbor:${args.p_operation_id}`)
   if(args.p_action==='depart'&&data.receipt?.voyageId)setDeparture(data.receipt.voyageId)
   await Promise.allSettled([refresh()]);return true
  }catch(e){if(alive.current){setError(harborError(e));if((e as {code?:string}).code)remember(null)}return false}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const acknowledgeArrival=useCallback(async(id:string)=>{
  try{
   await harborAction({p_action:'arrive',p_operation_id:randomId(),p_voyage_id:id})
   if(alive.current)setState(old=>old?{...old,voyages:old.voyages.map(v=>v.id===id?{...v,arrival_seen_at:new Date().toISOString()}:v)}:old)
  }catch{/* Leave the server flag untouched so a later visit can show arrival again. */}
 },[])
 return {state,error,busy,pending,now,departure,reload,run,acknowledgeArrival}
}
