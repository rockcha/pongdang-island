import {useEffect,useRef,useState} from 'react'
import {ArrowRight,Minus,Plus,Recycle} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {IslandSelect} from '@/components/island-select'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {RarityBadge} from '@/components/rarity-badge'
import {rarities} from '@/lib/game/rarity'
import {randomId} from '@/lib/random-id'
import {loadRelics,relicError,relicQuantity,type Relic,type RelicState} from './api'
import {RelicArtwork} from './relic-artwork'
import {recycleRelics,type RelicMaterial,type RelicRecyclingRequest} from './recycling-api'
import {RelicFusionEffect} from './relic-fusion-effect'
import {RelicEffectText} from './relic-equipment-slot'

function restore(key:string):RelicRecyclingRequest|null{
 try{
  const r=JSON.parse(localStorage.getItem(key)??'null') as RelicRecyclingRequest|null
  if(!r||!['recombine','dismantle'].includes(r.action)||typeof r.operation!=='string'||!r.operation||!Array.isArray(r.inputs)||r.inputs.length<1||r.inputs.length>6)return null
  if(r.inputs.some(i=>typeof i?.id!=='string'||!i.id||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>6))return null
  const total=r.inputs.reduce((n,i)=>n+i.quantity,0)
  return (r.action==='recombine'?[3,6].includes(total):total===1)?r:null
 }catch{return null}
}
function recyclingError(cause:unknown){
 const message=String((cause as {message?:string})?.message??'')
 if(message.includes('RELIC_MATERIAL_UNAVAILABLE'))return '재료 수량이 바뀌었어요. 장착한 1개를 제외하고 다시 선택해주세요.'
 if(message.includes('RELIC_RECOMBINATION_GRADE'))return '세공하지 않은 희귀·특급·신화 유물만 같은 등급끼리 재조합할 수 있어요.'
 if(message.includes('RELIC_RECOMBINATION_COUNT'))return '희귀·특급은 6개, 신화는 3개를 선택해주세요.'
 if(message.includes('RELIC_CRAFTED_NOT_OWNED'))return '이미 분해했거나 보유하지 않은 세공 유물이에요.'
 if(message.includes('RELIC_RECOMBINATION_EMPTY'))return '현재 받을 수 있는 결과 유물이 없어요. 재료는 소모되지 않았어요.'
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
 const selectedCount=selected.reduce((sum,item)=>sum+item.quantity,0)
 const mythicRecombination=!dismantle&&selectedCount===3
 const dialogs=<>
  {pending&&!draft&&<Button disabled={busy} onClick={()=>{setDraft(pending);setError('')}}>이전 {pending.action==='recombine'?'재조합':'분해'} 결과 다시 확인</Button>}
  {error&&!draft&&<p role="alert" className="px-4 text-xs text-destructive">{error}</p>}
  <ConfirmDialog open={!!draft} onOpenChange={open=>{if(!open&&!busy)setDraft(null)}} title={dismantle?'세공 유물을 분해할까요?':`유물 ${selectedCount}개를 재조합할까요?`} illustration="caution" busy={busy} error={error} confirmLabel={pending?'같은 요청 다시 확인':dismantle?'분해하기':'재조합하기'} onConfirm={()=>void submit()} description={<span className="block space-y-3">{selected.map(({relic,quantity},i)=><span className="block" key={i}>{relic?.name??'선택한 유물'} × {quantity}</span>)}<span className="block">{dismantle?'세공 유물은 사라지고, 세공에 사용한 원본 유물 2개를 모두 돌려받아요.':`선택한 ${selectedCount}개는 사라지고, ${mythicRecombination?'신화':'상위 등급'} 유물 1개를 무작위로 받아요. 이미 보유한 유물도 나올 수 있어요.`}</span>{returns.map(r=><span key={r.id} className="block">돌려받는 유물: {r.name} × 1</span>)}{dismantle&&composite?.id===state?.equippedId&&<span className="block">장착도 무료로 해제돼요. 생산 수가 기본 한도를 넘으면 생산이 끝난 뒤 분해할 수 있어요.</span>}</span>}/>
  {fusion&&<RelicFusionEffect materials={fusion.materials} rarity={fusion.rarity}/>}
  <Dialog open={!!outcome} onOpenChange={open=>{if(!open)setOutcome(null)}}><DialogContent className="relic-recycling-result rounded-2xl sm:max-w-sm" data-action={outcome?.action}><DialogHeader><DialogTitle>{outcome?.action==='dismantle'?'분해 완료':'재조합 완료'}</DialogTitle><DialogDescription>{outcome?.action==='dismantle'?'원본 유물 2개를 돌려받았어요.':'무작위 유물 1개를 받았어요.'}</DialogDescription></DialogHeader><div role="status" className="space-y-3">{outcome?.items.map((r,i)=><div key={r.id+':'+i} className="relic-recycling-reward" data-rarity={r.rarity}><RelicArtwork relic={r} className={outcome.action==='recombine'?'size-28':'size-14'}/><div><RarityBadge rarity={r.rarity}/><p className="mt-2 text-sm font-medium">{r.name}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">{r.description}</p><span className="mt-2 block text-[11px] text-primary">보유 {relicQuantity(r)}개 · 1개 획득</span></div></div>)}{outcome?.unequipped&&<p className="text-xs text-muted-foreground">장착을 무료로 해제했어요.</p>}</div><Button onClick={()=>setOutcome(null)}>확인</Button></DialogContent></Dialog>
 </>
 return {busy,locked:busy||!!pending,prepare,dialogs,completedOperation}
}

export function RelicRecombination({state,disabled,onRecombine,resetKey}:{state:RelicState;disabled:boolean;onRecombine:(inputs:RelicMaterial[])=>void;resetKey?:string}){
 const [grade,setGrade]=useState<'rare'|'epic'|'mythic'>('rare'),[counts,setCounts]=useState<Record<string,number>>({})
 const [inspected,setInspected]=useState<Relic|null>(null)
 const required=grade==='mythic'?3:6
 const candidates=state.relics.filter(r=>!r.crafted&&r.rarity===grade&&relicQuantity(r)>0)
 const available=(r:Relic)=>Math.max(0,relicQuantity(r)-(r.id===state.equippedId?1:0))
 const autoCandidates=candidates.filter(r=>available(r)>0)
 function autoFill(){
  if(disabled||!autoCandidates.length)return
  let remaining=required
  const next:Record<string,number>={}
  for(const relic of autoCandidates){const quantity=Math.min(available(relic),remaining);if(quantity>0)next[relic.id]=quantity;remaining-=quantity;if(!remaining)break}
  setCounts(next)
 }
 const selected=candidates.map(r=>({id:r.id,quantity:Math.min(counts[r.id]??0,available(r))})).filter(i=>i.quantity>0)
 const total=selected.reduce((n,i)=>n+i.quantity,0),target=grade==='rare'?'epic':'mythic'
 const pool=state.relics.filter(r=>!r.crafted&&r.rarity===target)
 useEffect(()=>{setCounts({})},[resetKey])
 const slots=selected.flatMap(input=>Array.from({length:input.quantity},()=>candidates.find(r=>r.id===input.id)!))
 function change(r:Relic,delta:number){const current=selected.find(i=>i.id===r.id)?.quantity??0;setCounts({...counts,[r.id]:Math.max(0,Math.min(available(r),current+delta,required-total+current))})}
 return <section aria-label="유물 재조합" className="relic-recombine-panel">
  <div className="relic-recombine-plan"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><Recycle className="size-4"/>유물 재조합</h3><p className="mt-2 text-[11px] leading-5 text-muted-foreground">희귀·특급은 6개로 상위 등급 1개를, 신화는 3개로 무작위 신화 유물 1개를 얻어요.</p></div>
  <div className="flex items-center gap-3 rounded-xl border border-border p-3"><IslandSelect label="재조합 재료 등급" disabled={disabled} value={grade} onChange={value=>{setGrade(value);setCounts({})}} className="flex-1" options={[{value:'rare',label:'희귀 6개'},{value:'epic',label:'특급 6개'},{value:'mythic',label:'신화 3개'}]}/><ArrowRight className="size-4 text-primary"/><span className="text-xs font-medium">무작위 {rarities[target].label} 1개</span></div>
  <div className="relic-recombine-selection"><span role="status" aria-label="선택한 재조합 재료">선택 {total} / {required}개</span><div className="relic-recombine-actions"><button type="button" className="relic-recombine-auto" title={`${rarities[grade].label} 유물을 최대 ${required}개 채워요. 장착한 1개와 세공 유물은 제외돼요.`} disabled={disabled||!autoCandidates.length} onClick={autoFill}>자동 넣기</button><button type="button" disabled={disabled||!total} onClick={()=>setCounts({})}>초기화</button></div></div>
  <div className="relic-recombine-slots" data-count={required} aria-label={`선택한 유물 ${required}칸`}>{Array.from({length:required},(_,index)=>{const relic=slots[index];return relic?<button key={index} className="relic-recombine-slot" data-filled="true" style={{background:`color-mix(in srgb, ${rarities[relic.rarity].effectColor} 14%, var(--card))`,borderColor:`color-mix(in srgb, ${rarities[relic.rarity].effectColor} 30%, var(--border))`}} aria-label={`${relic.name} 1개 선택 해제`} title={`${relic.name} · 눌러서 1개 빼기`} disabled={disabled} onClick={()=>change(relic,-1)}><RelicArtwork relic={relic} className="size-8"/></button>:<span key={index} className="relic-recombine-slot" data-filled="false"><Plus size={13}/></span>})}</div>
  </div>
  <div className="relic-recombine-scroll"><div className="space-y-2">{candidates.map(r=>{const amount=selected.find(i=>i.id===r.id)?.quantity??0,spare=available(r);return <article aria-label={r.name} key={r.id} data-selected={amount>0} className="relic-recombine-candidate"><button type="button" aria-label={`${r.name} 정보와 효과`} disabled={disabled} onClick={()=>setInspected(r)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"><RelicArtwork relic={r} className="size-10 shrink-0"/><div className="min-w-0 flex-1"><p className="text-xs font-medium">{r.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{r.id===state.equippedId?'장착 1개 보호 · ':''}사용 가능 {spare}개</p></div></button><div className="flex shrink-0 items-center gap-0.5"><Button variant="ghost" size="icon" aria-label={`${r.name} 1개 빼기`} disabled={disabled||amount===0} onClick={()=>change(r,-1)}><Minus className="size-4"/></Button><output className="w-4 text-center text-xs" aria-label={`${r.name} 선택 수량`}>{amount}</output><Button variant="ghost" size="icon" aria-label={`${r.name} 1개 넣기`} disabled={disabled||amount>=spare||total>=required} onClick={()=>change(r,1)}><Plus className="size-4"/></Button></div></article>})}{!candidates.length&&<p className="py-8 text-center text-xs text-muted-foreground">보유한 {rarities[grade].label} 유물이 없어요.</p>}</div></div>
  <div className="relic-recombine-footer"><Button className="min-h-11 w-full" disabled={disabled||total!==required||pool.length===0} onClick={()=>onRecombine(selected)}>무료로 재조합하기</Button><p>장착한 1개와 세공 유물은 재료에서 제외돼요.</p></div>
  <Dialog open={!!inspected} onOpenChange={open=>{if(!open)setInspected(null)}}><DialogContent className="rounded-2xl sm:max-w-sm"><DialogHeader><DialogTitle>{inspected?.name}</DialogTitle><DialogDescription>유물 정보와 장착 효과</DialogDescription></DialogHeader>{inspected&&<div className="space-y-4"><RelicArtwork relic={inspected} className="mx-auto size-28"/><RarityBadge rarity={inspected.rarity}/><p className="text-sm leading-7"><RelicEffectText description={inspected.description}/></p><p className="text-xs text-muted-foreground">보유 {relicQuantity(inspected)}개 · 재조합 사용 가능 {available(inspected)}개</p></div>}<Button onClick={()=>setInspected(null)}>닫기</Button></DialogContent></Dialog>
 </section>
}
