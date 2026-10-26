import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {Toaster} from 'sonner'
import {SponsorshipScreen} from '/src/features/sponsorship/sponsorship-page'
import type {Sponsorship,SponsorshipDraft,SponsorshipTab} from '/src/features/sponsorship/api'
import {PlaceBanner} from '/src/components/place-banner'
import '/src/index.css'
const recipients=Array.from({length:4},(_,i)=>({id:'person'+i,nickname:['바다산책','고래를찾아','달빛퐁이','조개수집가'][i],avatarPath:null,slot:i+1,claimedAt:new Date().toISOString()}))
const base:Sponsorship={id:'first',owner:{id:'donor',nickname:'다정한퐁이',avatarPath:null},goldEach:500,slots:6,claimedCount:4,totalGold:3000,message:'신화 낚은 기념으로 작은 행운을 나눠요.\n모두 즐거운 낚시 하세요 🐟',status:'active',createdAt:new Date().toISOString(),closedAt:null,mine:false,received:false,recipients}
let items:Sponsorship[]=[base,{...base,id:'last',owner:{...base.owner,nickname:'햇살수달'},goldEach:1000,slots:1,claimedCount:0,totalGold:1000,message:'마지막 한 자리는 당신의 몫!',recipients:[]},{...base,id:'closed',status:'completed',slots:4,totalGold:2000}]
const service={
 async loadSponsorships(tab:SponsorshipTab){return {items:items.filter(p=>tab==='active'?p.status==='active':tab==='completed'?p.status!=='active':p.mine||p.received),hasMore:false}},
 async loadSponsorship(id:string){return items.find(p=>p.id===id)!},
 async createSponsorship(draft:SponsorshipDraft){const post={...base,id:draft.operationId,mine:true,owner:{id:'me',nickname:'내퐁이',avatarPath:null},goldEach:draft.goldEach,slots:draft.slots,totalGold:draft.goldEach*draft.slots,message:draft.message,claimedCount:0,recipients:[]};items=[post,...items];return post},
 async claimSponsorship(id:string){const p=items.find(p=>p.id===id)!;const value={...p,received:true,claimedCount:p.claimedCount+1,status:p.claimedCount+1===p.slots?'completed' as const:'active' as const,recipients:[...p.recipients,{id:'me',nickname:'내퐁이',avatarPath:null,slot:p.claimedCount+1,claimedAt:new Date().toISOString()}]};items=items.map(x=>x.id===id?value:x);return value},
 async cancelSponsorship(id:string){const p=items.find(p=>p.id===id)!;const value={...p,status:'cancelled' as const};items=items.map(x=>x.id===id?value:x);return value},
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><div className="app-shell mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-6 sm:max-w-[390px]"><header className="-mx-6 shrink-0 border-b bg-background px-4 py-3"><div className="flex items-center justify-between"><span className="text-sm text-primary">퐁당섬</span><span className="text-xs">⭐ 12,000</span></div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>내 섬</span><span>바다</span><span>생활</span><span>장터</span><span className="text-primary">광장⌄</span></div></header><PlaceBanner pathname="/square/sponsorship"/><main className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden"><SponsorshipScreen owner="me" gold={12000} service={service}/></main><Toaster/></div></MemoryRouter>)
