import {useEffect,useRef,useState} from 'react'
import {useNavigate} from 'react-router'
import {X,ArrowRight} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {useAccountResource} from '@/lib/account-query'
import {membersOf,presentPush,type PushPayload} from '../../../supabase/functions/_shared/push-presentation'
import {foregroundNoticeEvent} from './foreground-notice'
import {readActivePush} from './push-notice-api'
type Entry={payload:PushPayload;receivedAt:number}
const safePaths=new Set(['/production','/bait-production','/expeditions','/port','/settings','/voyage-bets'])
export function ForegroundPush(){const {session,recovery}=useAuth();return session&&!recovery?<AccountPush key={session.user.id} owner={session.user.id}/>:null}
function AccountPush({owner}:{owner:string}){
 const navigate=useNavigate(),query=useAccountResource('push-active',readActivePush,{staleTime:0})
 const [entries,setEntries]=useState<Entry[]>([])
 const seen=useRef(new Set<string>())
 useEffect(()=>{
  let active=true
  let timer:ReturnType<typeof setTimeout>|undefined,hide:ReturnType<typeof setTimeout>|undefined
  const waiting=new Map<string,{payload:PushPayload;acks:((shown:boolean)=>void)[]}>()
  function receive(payload:PushPayload,ack?:(shown:boolean)=>void){
   if(payload?.userId!==owner||!safePaths.has(payload.url)||document.visibilityState==='hidden'||!document.hasFocus()){ack?.(false);return}
   const fresh=membersOf(payload).filter(m=>!seen.current.has(m.tag))
   if(!fresh.length){
    const enriched=new Map(membersOf(payload).map(m=>[m.tag,m]))
    setEntries(previous=>previous.map(entry=>membersOf(entry.payload).some(m=>enriched.has(m.tag))?{...entry,payload:presentPush(entry.payload,membersOf(entry.payload).map(m=>enriched.get(m.tag)??m))}:entry))
    ack?.(true);return
   }
   const key=payload.category??payload.tag,existing=waiting.get(key)
   if(existing){existing.payload=presentPush(existing.payload,[...membersOf(existing.payload),...fresh]);if(ack)existing.acks.push(ack)}
   else waiting.set(key,{payload:presentPush(payload,fresh),acks:ack?[ack]:[]})
   if(timer)return
   timer=setTimeout(()=>{
    timer=undefined
    const visible=active&&document.visibilityState!=='hidden'&&document.hasFocus()
    if(visible){
     const incoming=[...waiting.values()].map(v=>({payload:v.payload,receivedAt:Date.now()}))
     for(const entry of incoming)for(const m of membersOf(entry.payload))seen.current.add(m.tag)
     while(seen.current.size>500)seen.current.delete(seen.current.values().next().value!)
     setEntries(previous=>{
      const next=[...previous]
      for(const entry of incoming){const index=next.findIndex(e=>e.payload.category===entry.payload.category);if(index<0)next.push(entry);else next[index]={...entry,payload:presentPush(entry.payload,[...membersOf(next[index].payload),...membersOf(entry.payload)])}}
      return next.slice(-2)
     })
     clearTimeout(hide);hide=setTimeout(()=>setEntries([]),7000)
    }
    for(const item of waiting.values())for(const ack of item.acks)ack(visible)
    waiting.clear()
   },220)
  }
  const local=(event:Event)=>receive((event as CustomEvent<PushPayload>).detail)
  const pushed=(event:MessageEvent)=>{
   if(event.data?.type!=='PONGDANG_PUSH'||(event.origin&&event.origin!==location.origin))return
   const port=event.ports?.[0]
   receive(event.data.payload,shown=>{port?.postMessage({shown});port?.close()})
  }
  window.addEventListener(foregroundNoticeEvent,local)
  navigator.serviceWorker?.addEventListener('message',pushed)
  return()=>{active=false;clearTimeout(timer);clearTimeout(hide);for(const item of waiting.values())for(const ack of item.acks)ack(false);window.removeEventListener(foregroundNoticeEvent,local);navigator.serviceWorker?.removeEventListener('message',pushed)}
 },[owner])
 useEffect(()=>{
  if(!query.data)return
  let active=true
  const {active:payloads,observedBefore}=query.data,valid=new Map(payloads.map(p=>[p.tag,p]))
  setEntries(previous=>previous.flatMap(entry=>{
   if(entry.receivedAt>observedBefore||entry.payload.category==='test')return [entry]
   const remaining=membersOf(entry.payload).map(m=>valid.get(m.tag)).filter((p):p is PushPayload=>!!p)
   return remaining.length?[{...entry,payload:presentPush(entry.payload,remaining)}]:[]
  }))
  if('serviceWorker'in navigator)void navigator.serviceWorker.getRegistration().then(reg=>{if(active)reg?.active?.postMessage({type:'PUSHDATA_RECONCILE',userId:owner,active:payloads,observedBefore})}).catch(()=>{})
  return()=>{active=false}
 },[query.data,owner])
 if(!entries.length)return null
 return <div className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] mx-auto flex max-w-sm flex-col gap-2" aria-live="polite" aria-atomic="true">
  {entries.map(entry=><div key={entry.payload.category??entry.payload.tag} className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-background/95 p-3 pr-9 shadow-lg shadow-black/10 backdrop-blur-md motion-safe:animate-in motion-safe:slide-in-from-top-3 motion-safe:fade-in motion-safe:duration-300">
   <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary/70"><img src="/branding/pongi.png" alt="" className="size-11 object-contain"/></span>
   <div className="min-w-0 flex-1"><p className="mb-1 text-[9px] tracking-wider text-muted-foreground">퐁이가 가져온 소식</p><p className="text-xs font-semibold leading-5">{entry.payload.title}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{entry.payload.body}</p><button className="mt-1.5 inline-flex min-h-8 items-center gap-1 text-[11px] font-semibold text-primary" onClick={()=>{setEntries(old=>old.filter(e=>e!==entry));navigate(entry.payload.url)}}>{entry.payload.category?.endsWith('-expiring')?'지금 챙기러 가기':entry.payload.category==='test'?'알림 설정 보기':'받으러 가기'}<ArrowRight size={12}/></button></div>
   <button aria-label="퐁이 소식 닫기" className="absolute right-1 top-1 grid size-8 place-items-center text-muted-foreground" onClick={()=>setEntries(old=>old.filter(e=>e!==entry))}><X size={13}/></button>
  </div>)}
 </div>
}
