import {useEffect,useRef,useState} from 'react'
import {ArrowUp,Minus,Plus,Recycle} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {RarityBadge} from '@/components/rarity-badge'
import {rarities} from '@/lib/game/rarity'
import {randomId} from '@/lib/random-id'
import {loadRelics,relicError,relicQuantity,type Relic,type RelicState} from './api'
import {RelicArtwork} from './relic-artwork'
import {recycleRelics,type RelicMaterial,type RelicRecyclingRequest} from './recycling-api'
import {RelicFusionEffect} from './relic-fusion-effect'

function restore(key:string):RelicRecyclingRequest|null{
 try{
  const r=JSON.parse(localStorage.getItem(key)??'null') as RelicRecyclingRequest|null
  if(!r||!['recombine','dismantle'].includes(r.action)||typeof r.operation!=='string'||!r.operation||!Array.isArray(r.inputs)||r.inputs.length<1||r.inputs.length>6)return null
  if(r.inputs.some(i=>typeof i?.id!=='string'||!i.id||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>6))return null
  return r.inputs.reduce((n,i)=>n+i.quantity,0)===(r.action==='recombine'?6:1)?r:null
 }catch{return null}
}
function recyclingError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('RELIC_MATERIAL_UNAVAILABLE'))return '재료 수량이 바뀌었어요. 장착한 1개를 제외하고 다시 선택해주세요.'
 if(message.includes('RELIC_RECOMBINATION_GRADE'))return '세공하지 않은 희귀·특급 유물만 같은 등급끼리 재조합할 수 있어요.'
 if(message.includes('RELIC_CRAFTED_NOT_OWNED'))return '이미 분해했거나 보유하지 않은 세공 유물이에요.'
 if(message.includes('RELIC_RECOMBINATION_EMPTY'))return '현재 받을 수 있는 상위 등급 유물이 없어요. 재료는 소모되지 않았어요.'
 if(message.includes('OPERATION_CONFLICT'))return '이전 요청과 내용이 달라요. 보유 상태를 확인한 뒤 다시 선택해주세요.'
 if(message.includes('RELIC_FUEL_PRODUCTION_ACTIVE')||message.includes('RELIC_BAIT_PRODUCTION_ACTIVE'))return relicError(cause)
 return '결과를 확인하지 못했어요. 같은 요청으로 다시 확인해주세요.'
}
export function useRelicRecycling({storageKey,state,onState}:{storageKey:string;state:RelicState|null|undefined;onState:(state:RelicState)=>void}){
 const [pending,setPending]=useState<RelicRecyclingRequest|null>(()=>restore(storageKey))
 const [draft,setDraft]=useState<RelicRecyclingRequest|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [outcome,setOutcome]=useState<{action:string;items:Relic[];unequipped:boolean}|null>(null)
 const [fusion,setFusion]=useState<{materials:Relic[];rarity:Relic['rarity']}|null>(null)
 const [completedOperation,setCompletedOperation]=useState<string>()
 const animation=useRef<{timer:ReturnType<typeof setTimeout>;resolve:()=>void}|null>(null)
 const alive=useRef(false),lock=useRef(false)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(animation.current){clearTimeout(animation.current.timer);animation.current.resolve();animation.current=null}}},[])
 function remember(request:RelicRecyclingRequest|null){setPending(request);try{if(request)localStorage.setItem(storageKey,JSON.stringify(request));else localStorage.removeItem(storageKey)}catch{/* The same request stays available in memory. */}}
 function prepare(action:RelicRecyclingRequest['action'],inputs:RelicMaterial[]){if(lock.current||pending)return;setError('');setDraft({action,inputs,operation:randomId()})}
 async function submit(){
  const request=pending??draft
  if(!request||lock.current)return
  lock.current=true;setBusy(true);setError('');remember(request)
  const materials=request.inputs.flatMap(input=>Array.from({length:input.quantity},()=>state?.relics.find(r=>r.id===input.id))).filter((r):r is Relic=>!!r)
  try{
   const next=await recycleRelics(request)
   if(!alive.current)return
   onState(next);remember(null);setDraft(null)
   const result={action:request.action,items:next.recycling.receivedIds.map(id=>next.relics.find(r=>r.id===id)).filter((r):r is Relic=>!!r),unequipped:next.recycling.unequipped}
   setCompletedOperation(request.operation)
   if(request.action==='recombine'&&!next.replayed&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    setFusion({materials,rarity:result.items[0]?.rarity??'epic'})
    await new Promise<void>(resolve=>{animation.current={timer:setTimeout(()=>{animation.current=null;resolve()},1800),resolve}})
   }
   if(!alive.current)return
   setFusion(null);setOutcome(result)
  }catch(cause){
   if(!alive.current)return
   const code=(cause as {code?:string})?.code??''
   setError(recyclingError(cause))
   if(code==='P0001'||/^\d{2}[A-Z0-9]{3}$/.test(code)){
    remember(null);setDraft(null)
    try{const latest=await loadRelics(true);if(alive.current)onState(latest)}catch{/* Keep the definite rejection visible. */}
   }
  }finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const selected=(draft??pending)?.inputs.map(i=>({relic:state?.relics.find(r=>r.id===i.id),quantity:i.quantity}))??[]
 const dismantle=(draft??pending)?.action==='dismantle',composite=selected[0]?.relic
 const returns=dismantle?[composite?.baseId,composite?.attached?.id].map(id=>state?.relics.find(r=>r.id===id)).filter((r):r is Relic=>!!r):[]
 const dialogs=<>
  {pending&&!draft&&<Button disabled={busy} onClick={()=>{setDraft(pending);setError('')}}>이전 {pending.action==='recombine'?'재조합':'분해'} 결과 다시 확인</Button>}
  {error&&!draft&&<p role="alert" className="px-4 text-xs text-destructive">{error}</p>}
  <ConfirmDialog open={!!draft} onOpenChange={open=>{if(!open&&!busy)setDraft(null)}} title={dismantle?'세공 유물을 분해할까요?':'유물 6개를 재조합할까요?'} illustration="caution" busy={busy} error={error} confirmLabel={pending?'같은 요청 다시 확인':dismantle?'분해하기':'재조합하기'} onConfirm={()=>void submit()} description={<span className="block space-y-3">{selected.map(({relic,quantity},i)=><span className="block" key={i}>{relic?.name??'선택한 유물'} × {quantity}</span>)}<span className="block">{dismantle?'세공 유물은 사라지고, 세공에 사용한 원본 유물 2개를 모두 돌려받아요.':'선택한 6개는 사라지고, 상위 등급 유물 1개를 무작위로 받아요.'}</span>{returns.map(r=><span key={r.id} className="block">돌려받는 유물: {r.name} × 1</span>)}{dismantle&&composite?.id===state?.equippedId&&<span className="block">장착도 무료로 해제돼요. 생산 수가 기본 한도를 넘으면 생산이 끝난 뒤 분해할 수 있어요.</span>}</span>}/>
  {fusion&&<RelicFusionEffect materials={fusion.materials} rarity={fusion.rarity}/>}
  <Dialog open={!!outcome} onOpenChange={open=>{if(!open)setOutcome(null)}}><DialogContent className="relic-recycling-result rounded-2xl sm:max-w-sm" data-action={outcome?.action}><DialogHeader><DialogTitle>{outcome?.action==='dismantle'?'분해 완료':'재조합 완료'}</DialogTitle><DialogDescription>{outcome?.action==='dismantle'?'원본 유물 2개를 돌려받았어요.':'상위 등급 유물 1개를 받았어요.'}</DialogDescription></DialogHeader><div role="status" className="space-y-3">{outcome?.items.map((r,i)=><div key={r.id+':'+i} className="relic-recycling-reward" data-rarity={r.rarity}><RelicArtwork relic={r} className={outcome.action==='recombine'?'size-28':'size-14'}/><div><RarityBadge rarity={r.rarity}/><p className="mt-2 text-sm font-medium">{r.name}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">{r.description}</p><span className="mt-2 block text-[11px] text-primary">보유 {relicQuantity(r)}개 · 1개 획득</span></div></div>)}{outcome?.unequipped&&<p className="text-xs text-muted-foreground">장착을 무료로 해제했어요.</p>}</div><Button onClick={()=>setOutcome(null)}>확인</Button></DialogContent></Dialog>
 </>
 return {busy,locked:busy||!!pending,prepare,dialogs,completedOperation}
}

export function RelicRecombination({state,disabled,onRecombine,resetKey}:{state:RelicState;disabled:boolean;onRecombine:(inputs:RelicMaterial[])=>void;resetKey?:string}){
 const [grade,setGrade]=useState<'rare'|'epic'>('rare'),[counts,setCounts]=useState<Record<string,number>>({})
 const candidates=state.relics.filter(r=>!r.crafted&&r.rarity===grade&&relicQuantity(r)>0)
 const available=(r:Relic)=>Math.max(0,relicQuantity(r)-(r.id===state.equippedId?1:0))
 const selected=candidates.map(r=>({id:r.id,quantity:Math.min(counts[r.id]??0,available(r))})).filter(i=>i.quantity>0)
 const total=selected.reduce((n,i)=>n+i.quantity,0),target=grade==='rare'?'epic':'mythic'
 const pool=state.relics.filter(r=>!r.crafted&&r.rarity===target)
 const [poolOpen,setPoolOpen]=useState(false)
 useEffect(()=>{setCounts({})},[resetKey])
 const slots=selected.flatMap(input=>Array.from({length:input.quantity},()=>candidates.find(r=>r.id===input.id)!))
 function change(r:Relic,delta:number){const current=selected.find(i=>i.id===r.id)?.quantity??0;setCounts({...counts,[r.id]:Math.max(0,Math.min(available(r),current+delta,6-total+current))})}
 return <section aria-label="유물 재조합" className="relic-recombine-panel">
  <div className="relic-recombine-plan"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><Recycle className="size-4"/>유물 재조합</h3><p className="mt-2 text-[11px] leading-5 text-muted-foreground">같은 등급 6개 유물을 재조합해 상위 등급 유물 1개를 랜덤으로 얻을 수 있습니다.</p></div>
  <div className="flex items-center gap-3 rounded-xl border border-border p-3"><select aria-label="재조합 재료 등급" disabled={disabled} value={grade} onChange={e=>{setGrade(e.target.value as 'rare'|'epic');setCounts({})}} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm"><option value="rare">희귀 6개</option><option value="epic">특급 6개</option></select><ArrowUp className="size-4 text-primary"/><span className="text-xs font-medium">무작위 {rarities[target].label} 1개</span></div>
  <div className="relic-recombine-selection"><span role="status" aria-label="선택한 재조합 재료">선택 {total} / 6개</span><button disabled={disabled||!total} onClick={()=>setCounts({})}>초기화</button></div>
  <div className="relic-recombine-slots" aria-label="선택한 유물 6칸">{Array.from({length:6},(_,index)=>{const relic=slots[index];return relic?<button key={index} className="relic-recombine-slot" data-filled="true" style={{background:`color-mix(in srgb, ${rarities[relic.rarity].effectColor} 14%, var(--card))`,borderColor:`color-mix(in srgb, ${rarities[relic.rarity].effectColor} 30%, var(--border))`}} aria-label={`${relic.name} 1개 선택 해제`} title={`${relic.name} · 눌러서 1개 빼기`} disabled={disabled} onClick={()=>change(relic,-1)}><RelicArtwork relic={relic} className="size-8"/></button>:<span key={index} className="relic-recombine-slot" data-filled="false"><Plus size={13}/></span>})}</div>
  <button className="relic-pool-link" disabled={disabled} onClick={()=>setPoolOpen(true)}>결과 유물 보기</button></div>
  <div className="relic-recombine-scroll"><div className="space-y-2">{candidates.map(r=>{const amount=selected.find(i=>i.id===r.id)?.quantity??0,spare=available(r);return <article aria-label={r.name} key={r.id} data-selected={amount>0} className="relic-recombine-candidate"><RelicArtwork relic={r} className="size-10 shrink-0"/><div className="min-w-0 flex-1"><p className="text-xs font-medium">{r.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{r.id===state.equippedId?'장착 1개 보호 · ':''}사용 가능 {spare}개</p></div><div className="flex shrink-0 items-center gap-0.5"><Button variant="ghost" size="icon" aria-label={`${r.name} 1개 빼기`} disabled={disabled||amount===0} onClick={()=>change(r,-1)}><Minus className="size-4"/></Button><output className="w-4 text-center text-xs" aria-label={`${r.name} 선택 수량`}>{amount}</output><Button variant="ghost" size="icon" aria-label={`${r.name} 1개 넣기`} disabled={disabled||amount>=spare||total>=6} onClick={()=>change(r,1)}><Plus className="size-4"/></Button></div></article>})}{!candidates.length&&<p className="py-8 text-center text-xs text-muted-foreground">보유한 {rarities[grade].label} 유물이 없어요.</p>}</div></div>
  <div className="relic-recombine-footer"><Button className="min-h-11 w-full" disabled={disabled||total!==6||pool.length===0} onClick={()=>onRecombine(selected)}>무료로 재조합하기</Button><p>장착한 1개와 세공 유물은 재료에서 제외돼요.</p></div>
  <Dialog open={poolOpen} onOpenChange={setPoolOpen}><DialogContent className="flex max-h-[80dvh] flex-col rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>받을 수 있는 {rarities[target].label} 유물</DialogTitle><DialogDescription>{pool.length}종 중 1개가 같은 확률로 나와요. 이미 보유한 유물도 나올 수 있어요.</DialogDescription></DialogHeader><div className="min-h-0 space-y-2 overflow-y-auto">{pool.map(r=><div key={r.id} className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2"><RelicArtwork relic={r} className="size-11"/><span className="text-xs">{r.name}</span><span className="ml-auto shrink-0 text-[10px] text-muted-foreground">1 / {pool.length}</span></div>)}</div></DialogContent></Dialog>
 </section>
}
