import {useEffect,useState} from 'react'
import {useAccountResource,useServerDeadlines} from '@/lib/account-query'
import {readMenuStatus,type MenuStatus} from '@/lib/menu-status'
export type MenuActivity={total?:number;running:number;ready:number;expired?:number;remaining?:number;single?:'유인'|'제작';unit?:string;kind?:'merchant'|'flea'}
export function summarizeMenuActivity(summary:MenuStatus|undefined,now:number):Record<string,MenuActivity>{
 if(!summary)return {}
 const production=(data:MenuStatus['production']):MenuActivity=>({total:data.total,unit:'곳',running:data.sites.filter(s=>s.completesAt&&Date.parse(s.completesAt)>now).length,ready:data.sites.filter(s=>s.completesAt&&s.expiresAt&&Date.parse(s.completesAt)<=now&&Date.parse(s.expiresAt)>now).length,expired:data.sites.filter(s=>s.expiresAt&&Date.parse(s.expiresAt)<=now).length})
 const single=(date:string|null|undefined,label:'유인'|'제작'):MenuActivity=>({single:label,running:date&&Date.parse(date)>now?1:0,ready:date&&Date.parse(date)<=now?1:0,remaining:date?Math.max(0,Date.parse(date)-now):undefined})
 return {
 ...(summary.flea?{'/flea-market':{kind:'flea' as const,running:0,ready:summary.flea.sellable}}:{}),
 ...(summary.merchant?{'/merchant-orders':{kind:'merchant' as const,running:0,ready:Date.parse(summary.merchant.resetsAt)>now?summary.merchant.ready:0}}:{}),
 '/production':production(summary.production),'/bait-production':production(summary.baitProduction),
 '/port':{total:summary.harbor.total,unit:'척',running:summary.harbor.returnsAt.filter(t=>Date.parse(t)>now).length,ready:summary.harbor.returnsAt.filter(t=>Date.parse(t)<=now).length},
 '/expeditions':single(summary.expedition.returnsAt,'유인'),
 ...(summary.personalBait?{'/my-bait-production':single(summary.personalBait.completesAt,'제작')}:{})
 }
}
export function activityRemaining(ms:number){const minutes=Math.ceil(ms/60000);return ms<60000?'1분 미만':minutes>=60?`${Math.floor(minutes/60)}시간${minutes%60?` ${minutes%60}분`:''}`:`${minutes}분`}
export function useMenuActivity(){
 const {data,dataUpdatedAt}=useAccountResource('menu-status',readMenuStatus)
 const [,tick]=useState(0)
 const deadlines=[...(data?.production.sites??[]).flatMap(s=>[s.completesAt,s.expiresAt]),...(data?.baitProduction.sites??[]).flatMap(s=>[s.completesAt,s.expiresAt]),...(data?.harbor.returnsAt??[]),data?.expedition.returnsAt,data?.personalBait?.completesAt,data?.merchant?.resetsAt]
 const now=useServerDeadlines(data?.serverNow,dataUpdatedAt,deadlines)
 const running=deadlines.some(d=>d&&Date.parse(d)>now)
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>tick(n=>n+1),30000);return()=>clearInterval(timer)},[running])
 return summarizeMenuActivity(data,now)
}
export function MenuActivityLine({activity}:{activity:MenuActivity}){
 if(activity.kind==='flea')return <span className="mt-0.5 block text-[10px] font-normal leading-4 text-muted-foreground">{activity.ready>0?`${activity.ready}건 판매 가능`:'이웃의 거래 글 보기'}</span>
 if(activity.kind==='merchant')return <span className="mt-0.5 block text-[10px] font-normal leading-4 text-muted-foreground">{activity.ready>0?`${activity.ready}건 바로 납품 가능`:'진행 중인 의뢰 보기'}</span>
 const {total,running,ready,expired=0,single,unit}=activity
 const parts:string[]=[]
 if(total!==undefined)parts.push(`총 ${total}${unit??''}`)
 if(running)parts.push(single?`${single} 중 · ${activityRemaining(activity.remaining??0)} 남음`:`${unit==='척'?'진행':'가동'} ${running}`)
 if(expired)parts.push(`상함 ${expired}`)
 if(!running&&!ready&&!expired)parts.push('대기 중')
 return <span className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-normal leading-4 tabular-nums text-muted-foreground"><span>{parts.join(' · ')}</span>{ready>0&&<span className="inline-flex items-center gap-1 text-emerald-700"><span aria-hidden="true" className="size-1 rounded-full bg-emerald-600"/>{single?'수령 가능':`수령 ${ready}`}</span>}</span>
}
