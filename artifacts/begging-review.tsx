import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {Toaster} from 'sonner'
import {BeggingScreen} from '/src/features/begging/begging-page'
import type {BeggingRequest,BeggingRecord,BeggingDraft,BeggingPayment} from '/src/features/begging/api'
import {PlaceBanner} from '/src/components/place-banner'
import '/src/index.css'
const time=new Date().toISOString()
let items:BeggingRequest[]=[{id:'first',story:'새로운 바다를 향해 떠나고 싶어요.\n지도를 살 골드가 조금 부족해서 작은 도움을 기다려요. 마음 나눠주시면 잊지 않을게요 🐟',goalGold:3000,receivedGold:1200,status:'active',createdAt:time,closedAt:null,mine:false,owner:{id:'other',nickname:'바다를꿈꿔',avatarPath:null},transferCount:2,donors:[{id:'one',nickname:'다정한퐁이',avatarPath:null,gold:1000,createdAt:time},{id:'two',nickname:'조개수집가',avatarPath:null,gold:200,createdAt:time}]}]
let records:BeggingRecord[]=[]
const service={
 async loadBegging(tab:'active'|'mine'){return {items:items.filter(p=>tab==='mine'?p.mine:p.status==='active'),hasMore:false}},
 async loadBeggingDetail(id:string){const request=items.find(p=>p.id===id)!;return {request,items:request.donors,hasMore:false}},
 async loadBeggingHistory(){return {items:records,hasMore:false}},
 async createBegging(draft:BeggingDraft){const value={...items[0],id:draft.operationId,mine:true,story:draft.story,goalGold:draft.goalGold,receivedGold:0,owner:{id:'me',nickname:'내퐁이',avatarPath:null},transferCount:0,donors:[]};items=[value,...items];return value},
 async giveBegging(payment:BeggingPayment){const original=items.find(p=>p.id===payment.requestId)!;const value={...original,receivedGold:original.receivedGold+payment.gold,transferCount:original.transferCount+1,donors:[...original.donors,{id:payment.operationId,nickname:'내퐁이',avatarPath:null,gold:payment.gold,createdAt:time}]};if(value.receivedGold>=value.goalGold)value.status='completed';items=items.map(p=>p.id===value.id?value:p);records=[{id:payment.operationId,requestId:value.id,story:value.story,gold:payment.gold,xp:2,direction:'sent',createdAt:time,person:value.owner},...records];return {request:value,receipt:{id:payment.operationId,gold:payment.gold,xp:2,replayed:false}}},
 async closeBegging(id:string){const original=items.find(p=>p.id===id)!;const value={...original,status:'closed' as const};items=items.map(p=>p.id===id?value:p);return value}
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><div className="app-shell mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-6 sm:max-w-[390px]"><header className="-mx-6 shrink-0 border-b bg-background px-4 py-3"><div className="flex items-center justify-between"><span className="text-sm text-primary">퐁당섬</span><span className="text-xs">⭐ 5,000</span></div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>내 섬</span><span>바다</span><span>생활</span><span>장터</span><span className="text-primary">광장⌄</span></div></header><PlaceBanner pathname="/square/begging"/><main className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden"><BeggingScreen owner="me" gold={5000} service={service}/></main><Toaster/></div></MemoryRouter>)
