import {Hammer,Info,Plus,Sparkles} from 'lucide-react'
import {useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {rarities} from '@/lib/game/rarity'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {randomId} from '@/lib/random-id'
import {craftRelic,relicQuantity,type Relic,type RelicState} from './api'
import {RelicMaterialPicker} from './relic-material-picker'
import {RelicArtwork} from './relic-artwork'
import {RelicGold} from './relic-gold'
import {RelicEffectText,relicEffectDescription} from './relic-equipment-slot'
import {playRelicForgeSound,playRelicResultSound} from '@/features/gold/purchase-sound'

const cost=5000,chance=35

type Attempt={base:string;attached:string;operation:string}
type Outcome={success:boolean;materials:[Relic,Relic];relic?:Relic;consumedId:string|null;cost:number}
function restore(key:string):Attempt|null{
 try{const p=JSON.parse(localStorage.getItem(key)??'null');return p&&typeof p.base==='string'&&typeof p.attached==='string'&&typeof p.operation==='string'?p:null}catch{return null}
}
function RelicLossLabel({relic}:{relic:Relic}){
 return <span className="mx-0.5 inline-flex max-w-full items-center gap-1 align-middle rounded-lg bg-secondary/50 px-1.5 py-1"><RelicArtwork relic={relic} className="size-8"/><strong className="min-w-0 font-medium text-foreground">{relic.name}</strong></span>
}
export function RelicCraftingGuide({state,disabled=false,storageKey,onState,onBusyChange,onLockChange,onOpenInventory,onShare}:{state:RelicState;disabled?:boolean;storageKey:string;onState:(state:RelicState)=>void;onBusyChange?:(busy:boolean)=>void;onLockChange?:(locked:boolean)=>void;onOpenInventory?:()=>void;onShare?:(relic:Relic)=>void}){
 const [pending,setPending]=useState<Attempt|null>(()=>restore(storageKey))
 const [base,setBase]=useState(()=>restore(storageKey)?.base??''),[attached,setAttached]=useState(()=>restore(storageKey)?.attached??'')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[outcome,setOutcome]=useState<Outcome|null>(null)
 const [materials,setMaterials]=useState<[Relic,Relic]|null>(null),[choosing,setChoosing]=useState<0|1>(0)
 const [pickerOpen,setPickerOpen]=useState(false)
 const [infoOpen,setInfoOpen]=useState(false)
 const [confirmOpen,setConfirmOpen]=useState(false)
 const alive=useRef(false),lock=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),release=useRef<(()=>void)|null>(null)
 const resultHeading=useRef<HTMLHeadingElement>(null)
 const stopSound=useRef<(()=>void)|undefined>(undefined)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);release.current?.();stopSound.current?.()}},[])
 useEffect(()=>{onBusyChange?.(busy)},[busy,onBusyChange])
 useEffect(()=>{onLockChange?.(busy||!!pending)},[busy,pending,onLockChange])
 useEffect(()=>()=>{onBusyChange?.(false);onLockChange?.(false)},[onBusyChange,onLockChange])
 useEffect(()=>{if(outcome)resultHeading.current?.focus({preventScroll:true})},[outcome])
 const a=state.relics.find(r=>r.id===base),b=state.relics.find(r=>r.id===attached)
 const available=(r?:Relic)=>!!r&&!r.crafted&&relicQuantity(r)>(r.id===state.equippedId?1:0)
 const valid=available(a)&&available(b)&&a!.effect_kind!==b!.effect_kind
 const frozen=busy||!!pending||disabled||confirmOpen
 const failureRelic=a&&b&&a.rarity!==b.rarity?(rarities[a.rarity].rank<rarities[b.rarity].rank?a:b):undefined
 function remember(p:Attempt|null){setPending(p);try{if(p)localStorage.setItem(storageKey,JSON.stringify(p));else localStorage.removeItem(storageKey)}catch{/* Keep the same operation in memory. */}}
 function choose(relic:Relic){
  if(frozen||outcome||!available(relic))return
  setMessage('')
  if(choosing===0){setBase(relic.id);if(b?.effect_kind===relic.effect_kind||b?.id===relic.id)setAttached('');setChoosing(1)}
  else if(!a||a.effect_kind!==relic.effect_kind){setAttached(relic.id);if(!a)setChoosing(0)}
  setPickerOpen(false)
 }
 function reset(){setOutcome(null);setMaterials(null);setBase('');setAttached('');setChoosing(0);setMessage('')}
 async function submit(){
  if(lock.current||disabled||!state.canCraft||(!pending&&!valid))return
  const attempt=pending??{base,attached,operation:randomId()}
  const first=state.relics.find(r=>r.id===attempt.base),second=state.relics.find(r=>r.id===attempt.attached)
  if(!first||!second){setMessage('유물 정보를 다시 불러온 뒤 결과를 확인해 주세요.');return}
  const selected:[Relic,Relic]=[first,second]
 const start=performance.now(),duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:4000
  lock.current=true;setBusy(true);setOutcome(null);setMaterials(selected);setMessage('');remember(attempt)
  stopSound.current?.();stopSound.current=playRelicForgeSound(attempt.operation)
  try{
   const next=await craftRelic(attempt.base,attempt.attached,attempt.operation)
   if(!alive.current)return
   // Publish confirmed server state immediately; only the visual reveal waits.
   onState(next)
   if(!next.craft)throw Error('CRAFT_RESULT_MISSING')
   const remaining=duration-(performance.now()-start)
   if(remaining>0)await new Promise<void>(resolve=>{release.current=resolve;timer.current=setTimeout(resolve,remaining)})
   if(!alive.current)return
   remember(null)
   stopSound.current?.();stopSound.current=playRelicResultSound(attempt.operation,next.craft.success)
   setOutcome({success:next.craft.success,materials:selected,relic:next.relics.find(r=>r.id===next.craft?.craftedId),consumedId:next.craft.consumedId,cost:next.craft.cost})
  }catch(cause){
   stopSound.current?.()
   if(!alive.current)return
   const error=cause as {code?:string;message?:string}
   const confirmed=error.code==='P0001'||/^\d{2}[A-Z0-9]{3}$/.test(error.code??'')
   if(confirmed)remember(null)
   setMessage(error.message?.includes('RELIC_EQUIPPED')?'장착 중인 1개만 남아 있어 사용할 수 없어요.':error.message?.includes('INSUFFICIENT_GOLD')?'골드가 부족해요.':error.message?.includes('RELIC_SAME_EFFECT')?'같은 계열은 결합할 수 없어요.':confirmed?'재료와 운영자 권한을 다시 확인해 주세요.':'결과를 확인하지 못했어요. 재료를 바꾸지 말고 이전 결과를 다시 확인해 주세요.')
  }finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const stage=busy?'forging':outcome?.success?'success':outcome?'failure':'select'
 const displayed=busy&&materials?materials:[a,b]
 return <section aria-label="유물 세공 작업대" className="relic-craft" data-stage={stage} data-ready={!!valid}>
  <div className="relic-craft-body">
   <div className="relic-forge" aria-busy={busy}>
    <div aria-hidden="true" className="relic-forge-glow"/>
    {outcome?<div className="relic-craft-result" role="status">
     <h3 ref={resultHeading} tabIndex={-1}>{outcome.success?'세공 성공':'세공 실패'}</h3>
     {outcome.success?<>
      <div className="relic-result-medallion"><span aria-hidden="true" className="relic-result-wave"/>{outcome.relic&&<RelicArtwork relic={outcome.relic} className="relic-success-art"/>}<div aria-hidden="true" className="relic-result-sparks">{Array.from({length:6},(_,i)=><span key={i}/>)}</div></div>
      <p className="relic-result-name">{outcome.relic?.name??'두 힘이 결합된 유물'}</p>
     </>:<>
      <div className="relic-failure-materials">{outcome.materials.map(r=><div key={r.id} data-consumed={r.id===outcome.consumedId}><div className="relic-failure-art"><RelicArtwork relic={r} className="size-14"/>{r.id===outcome.consumedId&&<span aria-hidden="true" className="relic-fracture"/>}</div><strong title={r.name}>{r.name}</strong><span>{r.id===outcome.consumedId?'1개 소모':'유지'}</span></div>)}</div>
     </>}
    </div>:<>
     <div className="relic-forge-slots"><span aria-hidden="true" className="relic-forge-thread"/><span aria-hidden="true" className="relic-forge-core"/>{displayed.map((r,i)=><div key={i} className={`relic-forge-slot relic-forge-slot-${i}`}>
      <span className="relic-slot-caption">{i===0?'기본 유물':'결합할 유물'}</span>
      <button type="button" className="relic-material-slot" data-rarity={r?.rarity} data-selected={choosing===i} aria-label={`${i===0?'기본 유물':'결합할 유물'} 선택${r?`: ${r.name}`:''}`} disabled={frozen} onClick={()=>{setChoosing(i as 0|1);setPickerOpen(true)}}>
       {r?<RelicArtwork key={r.id} relic={r} className="relic-selected-art size-16"/>:<Plus size={23} strokeWidth={1} aria-hidden="true"/>}
       {r&&!busy&&<span className="relic-slot-change">변경</span>}
      </button>
      <strong title={r?.name}>{r?.name??'선택하기'}</strong>
     </div>)}<span aria-hidden="true" className="relic-forge-symbol">{busy?<Sparkles size={18}/>:<Plus size={16}/>}</span></div>
    </>}
   </div>
   {!outcome&&(a||b)&&<div className="relic-craft-effects" aria-label="결합될 효과">{[a,b].filter((r):r is Relic=>!!r).map(r=><p key={r.id} title={relicEffectDescription(r.description)}><RelicEffectText description={r.description}/></p>)}</div>}
  </div>
  <footer className="relic-craft-footer">
   {outcome?.success&&outcome.relic&&onShare&&<Button variant="ghost" className="mb-2 w-full text-xs text-primary" disabled={disabled} onClick={()=>onShare(outcome.relic!)}>완성한 유물 자랑하기</Button>}
   {message&&<p role="alert" className="relic-craft-error">{message}</p>}
   {outcome?<div className="flex gap-2">{onOpenInventory&&<Button variant="outline" className="min-h-12 flex-1 rounded-xl" onClick={onOpenInventory}>보유 유물</Button>}<Button className="min-h-12 flex-1 rounded-xl" onClick={reset}>다시 세공</Button></div>:<>
    <div className="relic-craft-price"><span>성공 <strong>{chance}%</strong></span><span><RelicGold amount={cost}/><button type="button" className="relic-craft-info" aria-label="세공 안내" disabled={busy} onClick={()=>setInfoOpen(true)}><Info size={15}/></button></span></div>
    <Button aria-live="polite" className="relic-forge-button min-h-12 w-full rounded-xl" disabled={busy||disabled||!state.canCraft||(!pending&&!valid)} onClick={()=>{if(pending)void submit();else setConfirmOpen(true)}}><Hammer size={15}/>{busy?'세공 중…':pending?'이전 세공 결과 다시 확인':'세공하기'}</Button>
    <p className="relic-craft-family-rule">{busy?'':pending?'같은 요청으로 확인하며 비용은 다시 차감되지 않아요.':'같은 계열 결합 불가'}</p>
   </>}
  </footer>
  <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} illustration="caution" title={<span className="inline-flex flex-wrap items-center justify-center gap-1"><RelicGold amount={cost}/>로 세공할까요?</span>} description={<span className="block space-y-2"><span className="block">성공 확률 {chance}%</span><span className="block">{failureRelic?<>실패하면 <RelicLossLabel relic={failureRelic}/> 1개를 잃어요.</>:<>실패하면 {a&&<RelicLossLabel relic={a}/>} 또는 {b&&<RelicLossLabel relic={b}/>} 중 무작위로 1개를 잃어요.</>}</span><span className="block">실패해도 골드는 소모돼요.</span></span>} confirmLabel="세공 시작" confirmDisabled={disabled||!state.canCraft||!valid||busy||!!pending} onConfirm={()=>{setConfirmOpen(false);void submit()}}/>
  <Dialog open={infoOpen} onOpenChange={setInfoOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-sm"><DialogHeader><DialogTitle>세공 안내</DialogTitle><DialogDescription>성공 {chance}% · 5,000골드</DialogDescription></DialogHeader><div className="space-y-3 text-xs leading-6 text-muted-foreground"><p>성공하면 재료 2개가 두 효과를 가진 유물 1개로 바뀌어요.</p><p>실패하면 낮은 등급 1개가 소모돼요. 같은 등급은 무작위로 1개가 소모돼요.</p><p>성공·실패 모두 비용이 발생해요. 장착한 1개는 보호하며 여분만 사용할 수 있어요.</p><p>합성 유물은 재세공·판매를 지원하지 않아요.</p>{[a,b].filter((r):r is Relic=>!!r).map(r=><p key={r.id}><strong className="block font-medium text-foreground">{r.name}</strong><RelicEffectText description={r.description}/></p>)}</div></DialogContent></Dialog>
  <RelicMaterialPicker open={pickerOpen&&!frozen&&!outcome} slot={choosing} relics={state.relics} equippedId={state.equippedId} selectedId={choosing===0?base:attached} other={choosing===0?b:a} onSelect={choose} onOpenChange={setPickerOpen}/>
 </section>
}
