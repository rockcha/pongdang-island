import {useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {RarityBadge} from '@/components/rarity-badge'
import {RelicIcon} from '@/components/collection-filter-icons'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {GoldIcon} from '@/features/gold/gold-provider'
import {useAuth} from '@/components/auth-provider'
import {randomId} from '@/lib/random-id'
import {equipRelic,sellRelic,loadRelics,relicError,type RelicState} from './api'

type Purchase={id:string|null;name:string;operation:string;fee:number;action?:'sell'}
function restore(key:string):Purchase|null{
 try{const p=JSON.parse(localStorage.getItem(key)??'null');return p&&(p.id===null||typeof p.id==='string')&&typeof p.name==='string'&&typeof p.operation==='string'&&(p.action==='sell'?typeof p.id==='string'&&Number.isSafeInteger(p.fee)&&p.fee>0:!p.action&&[500,1000].includes(p.fee))?p:null}catch{return null}
}
export function RelicPage(){return <RelicLoadout page/>}

export function RelicLoadout({page=false}:{page?:boolean}){
 const {session}=useAuth()
 return <Loadout page={page} key={session?.user.id??'guest'} storageKey={`pongdang:relic-loadout:${session?.user.id??'guest'}`}/>
}
function Loadout({storageKey,page}:{storageKey:string;page:boolean}){
 const [open,setOpen]=useState(page),[state,setState]=useState<RelicState|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const [purchase,setPurchase]=useState<Purchase|null>(null),[pending,setPending]=useState<Purchase|null>(()=>restore(storageKey)),[saving,setSaving]=useState(false)
 const lock=useRef(false)
 useEffect(()=>{if(!open)return;let alive=true;void loadRelics().then(s=>{if(alive){setState(s);setError('')}}).catch(()=>{if(alive)setError('유물을 불러오지 못했어요. 다시 시도해 주세요.')});return()=>{alive=false}},[open,attempt])
 function remember(p:Purchase|null){setPending(p);try{if(p)localStorage.setItem(storageKey,JSON.stringify(p));else localStorage.removeItem(storageKey)}catch{/* Retain the same operation in memory. */}}
 function select(id:string|null,name:string){if(!state||pending)return;setError('');setPurchase({id,name,operation:randomId(),fee:state.changeFee*(id&&state.equippedId?2:1)})}
 async function confirm(){
  if(!purchase||lock.current)return
  lock.current=true;setSaving(true);setError('');remember(purchase)
  try{setState(await (purchase.action==='sell'?sellRelic(purchase.id!,purchase.operation,purchase.fee):equipRelic(purchase.id,purchase.operation,purchase.fee)));remember(null);setPurchase(null)}
  catch(cause){setError(relicError(cause));if((cause as {code?:string}).code)remember(null)}
  finally{lock.current=false;setSaving(false)}
 }
 const content=<>
   {error&&!purchase&&<div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" onClick={()=>setAttempt(n=>n+1)}>다시 불러오기</Button></div>}
   {pending&&<Button disabled={saving} onClick={()=>{setError('');setPurchase(pending)}}>{pending.action==='sell'?'판매':'장착'} 결과 다시 확인</Button>}
   {!state&&!error&&<p role="status" className="py-6 text-center text-sm">유물을 불러오는 중…</p>}
   {state&&<div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain">
    {state.equippedId?<div className="flex items-center justify-between gap-3 rounded-xl border bg-secondary/40 p-3"><span className="text-sm">장착 중: {state.relics.find(r=>r.id===state.equippedId)?.name??'유물'}</span><Button variant="outline" size="sm" disabled={saving||!!pending} onClick={()=>select(null,'유물 해제')}>해제</Button></div>:<p className="py-2 text-xs text-muted-foreground">장착 중인 유물이 없어요.</p>}
    {state.relics.map(r=><article key={r.id} aria-label={r.name} className="flex items-center gap-3 rounded-xl border p-3">
     <CollectibleThumbnail path={r.thumbnail_path} name={r.name} className={`size-16 ${r.owned?'':'grayscale opacity-50'}`}/>
     <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="text-sm font-medium">{r.name}</h3><RarityBadge rarity={r.rarity}/></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{r.description}</p></div>
     <div className="flex shrink-0 flex-col gap-1.5"><Button size="sm" variant={state.equippedId===r.id?'secondary':'outline'} disabled={saving||!!pending||!r.owned||state.equippedId===r.id} onClick={()=>select(r.id,r.name)}>{state.equippedId===r.id?'장착 중':r.owned?'장착':r.discovered?'미보유':'미발견'}</Button>{r.owned&&r.sell_price>0&&<Button size="sm" variant="ghost" disabled={saving||!!pending||state.equippedId===r.id} title={state.equippedId===r.id?'해제 후 판매할 수 있어요':`${r.sell_price.toLocaleString('ko-KR')}골드에 판매`} onClick={()=>{setError('');setPurchase({id:r.id,name:r.name,operation:randomId(),fee:r.sell_price,action:'sell'})}}>판매 {r.sell_price.toLocaleString('ko-KR')}</Button>}</div>
    </article>)}
   </div>}
 </>
 return <>
  {page?<section aria-label="유물" className="flex min-h-0 flex-1 flex-col">
   <header className="shrink-0 space-y-2 border-b px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-medium"><RelicIcon className="size-6"/>유물 장착</h2><p className="text-xs leading-5 text-muted-foreground">한 번에 1개만 장착할 수 있어요. 장착·해제는 각각 500골드, 교체는 1,000골드예요. 진행 중인 작업은 유지돼요.</p><p className="text-xs leading-5 text-muted-foreground">장착한 유물은 해제 후 판매할 수 있어요. 판매한 유물은 낚시에서 다시 만날 수 있어요.</p></header>
   <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">{content}</div>
  </section>:<>
   <Button type="button" size="sm" variant="outline" onClick={()=>{setError('');setOpen(true)}}><RelicIcon className="size-5"/>유물 장착</Button>
   <Dialog open={open} onOpenChange={value=>{if(!saving)setOpen(value)}}><DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-lg">
    <DialogHeader><DialogTitle>유물 장착</DialogTitle><DialogDescription>한 번에 1개만 장착할 수 있어요. 장착·해제는 각각 500골드, 교체는 1,000골드예요. 진행 중인 작업은 유지돼요.</DialogDescription></DialogHeader>
    {content}
   </DialogContent></Dialog>
  </>}
  <ConfirmDialog open={!!purchase} onOpenChange={value=>{if(!value&&!saving)setPurchase(null)}} title={purchase?.action==='sell'?`${purchase.name} 판매할까요?`:purchase?.id?`${purchase.name} 장착할까요?`:'유물을 해제할까요?'} description={<span className="block space-y-2"><span className="flex items-center justify-center gap-1"><GoldIcon className="size-5"/>{purchase?.fee.toLocaleString('ko-KR')}골드{purchase?.action==='sell'?'를 받아요':''}</span><span className="block">{purchase?.action==='sell'?'도감 기록은 남으며, 판매한 유물은 낚시에서 다시 만날 수 있어요.':purchase?.fee===1000?'기존 유물 해제 500골드와 새 유물 장착 500골드를 함께 지불해요.':'장착 또는 해제 비용이에요.'}</span></span>} busy={saving} error={error} confirmLabel={pending?'결과 다시 확인':purchase?.action==='sell'?'판매하기':'확인'} onConfirm={()=>void confirm()}/>
 </>
}
