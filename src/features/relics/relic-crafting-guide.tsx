import {Check,ChevronDown,Hammer,LockKeyhole,Plus,Sparkles} from 'lucide-react'
import {useEffect,useRef,useState,type CSSProperties} from 'react'
import {Button} from '@/components/ui/button'
import {randomId} from '@/lib/random-id'
import {craftRelic,relicQuantity,type Relic,type RelicState} from './api'
import {rarities} from '@/lib/game/rarity'
import {RelicArtwork} from './relic-artwork'
import {RelicGold} from './relic-gold'
import {RelicEffectText} from './relic-equipment-slot'

const cost=5000,chance=35

type Attempt={base:string;attached:string;operation:string}
type Outcome={success:boolean;materials:[Relic,Relic];relic?:Relic;consumedId:string|null;cost:number}
function restore(key:string):Attempt|null{
 try{const p=JSON.parse(localStorage.getItem(key)??'null');return p&&typeof p.base==='string'&&typeof p.attached==='string'&&typeof p.operation==='string'?p:null}catch{return null}
}
export function RelicCraftingGuide({state,disabled=false,storageKey,onState,onBusyChange,onLockChange,onOpenInventory}:{state:RelicState;disabled?:boolean;storageKey:string;onState:(state:RelicState)=>void;onBusyChange?:(busy:boolean)=>void;onLockChange?:(locked:boolean)=>void;onOpenInventory?:()=>void}){
 const [pending,setPending]=useState<Attempt|null>(()=>restore(storageKey))
 const [base,setBase]=useState(()=>restore(storageKey)?.base??''),[attached,setAttached]=useState(()=>restore(storageKey)?.attached??'')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[outcome,setOutcome]=useState<Outcome|null>(null)
 const [materials,setMaterials]=useState<[Relic,Relic]|null>(null),[choosing,setChoosing]=useState<0|1>(0)
 const alive=useRef(false),lock=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),release=useRef<(()=>void)|null>(null)
 const scroller=useRef<HTMLDivElement>(null),resultHeading=useRef<HTMLHeadingElement>(null)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);release.current?.()}},[])
 useEffect(()=>{onBusyChange?.(busy)},[busy,onBusyChange])
 useEffect(()=>{onLockChange?.(busy||!!pending)},[busy,pending,onLockChange])
 useEffect(()=>()=>{onBusyChange?.(false);onLockChange?.(false)},[onBusyChange,onLockChange])
 useEffect(()=>{if(outcome)resultHeading.current?.focus({preventScroll:true})},[outcome])
 const originals=state.relics.filter(r=>relicQuantity(r)>0).toSorted((a,b)=>rarities[b.rarity].rank-rarities[a.rarity].rank||a.name.localeCompare(b.name,'ko'))
 const a=state.relics.find(r=>r.id===base),b=state.relics.find(r=>r.id===attached)
 const available=(r?:Relic)=>!!r&&!r.crafted&&relicQuantity(r)>0&&r.id!==state.equippedId
 const valid=available(a)&&available(b)&&a!.effect_kind!==b!.effect_kind
 const frozen=busy||!!pending||disabled
 function remember(p:Attempt|null){setPending(p);try{if(p)localStorage.setItem(storageKey,JSON.stringify(p));else localStorage.removeItem(storageKey)}catch{/* Keep the same operation in memory. */}}
 function choose(relic:Relic){
  if(frozen||outcome||!available(relic))return
  setMessage('')
  if(choosing===0){setBase(relic.id);if(b?.effect_kind===relic.effect_kind||b?.id===relic.id)setAttached('');setChoosing(1)}
  else if(!a||a.effect_kind!==relic.effect_kind){setAttached(relic.id);if(!a)setChoosing(0)}
 }
 function reset(){setOutcome(null);setMaterials(null);setBase('');setAttached('');setChoosing(0);setMessage('');if(scroller.current)scroller.current.scrollTop=0}
 async function submit(){
  if(lock.current||disabled||!state.canCraft||(!pending&&!valid))return
  const attempt=pending??{base,attached,operation:randomId()}
  const first=state.relics.find(r=>r.id===attempt.base),second=state.relics.find(r=>r.id===attempt.attached)
  if(!first||!second){setMessage('유물 정보를 다시 불러온 뒤 결과를 확인해 주세요.');return}
  const selected:[Relic,Relic]=[first,second]
  const start=performance.now(),duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:2000
  lock.current=true;setBusy(true);setOutcome(null);setMaterials(selected);setMessage('');remember(attempt)
  if(scroller.current)scroller.current.scrollTop=0
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
   setOutcome({success:next.craft.success,materials:selected,relic:next.relics.find(r=>r.id===next.craft?.craftedId),consumedId:next.craft.consumedId,cost:next.craft.cost})
  }catch(cause){
   if(!alive.current)return
   const error=cause as {code?:string;message?:string}
   const confirmed=/^\d{2}[A-Z0-9]{3}$/.test(error.code??'')
   if(confirmed)remember(null)
   setMessage(error.message?.includes('RELIC_EQUIPPED')?'장착 중인 유물은 먼저 해제해 주세요.':error.message?.includes('INSUFFICIENT_GOLD')?'골드가 부족해요.':error.message?.includes('RELIC_SAME_EFFECT')?'같은 계열은 결합할 수 없어요.':confirmed?'재료와 운영자 권한을 다시 확인해 주세요.':'결과를 확인하지 못했어요. 재료를 바꾸지 말고 이전 결과를 다시 확인해 주세요.')
  }finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const stage=busy?'forging':outcome?.success?'success':outcome?'failure':'select'
 const displayed=busy&&materials?materials:[a,b]
 return <section aria-label="유물 세공 작업대" className="relic-craft" data-stage={stage}>
  <div ref={scroller} className="relic-craft-scroll">
   <header className="relic-craft-heading"><span className="relic-craft-eyebrow"><Sparkles size={12}/> RELIC ATELIER</span><h3>서로 다른 힘이 만나는 곳</h3><p>두 유물의 이야기를 하나로 이어보세요.</p></header>
   <div className="relic-forge" aria-busy={busy}>
    <div aria-hidden="true" className="relic-forge-orbit"/><div aria-hidden="true" className="relic-forge-orbit relic-forge-orbit-inner"/>
    <div aria-hidden="true" className="relic-forge-glow"/>
    {outcome?<div className="relic-craft-result" role="status">
     <span className="relic-craft-eyebrow">{outcome.success?'A NEW RELIC IS BORN':'THE BOND DID NOT HOLD'}</span>
     <h3 ref={resultHeading} tabIndex={-1}>{outcome.success?'새로운 힘이 깨어났어요':'아쉽게도 결합하지 못했어요'}</h3>
     {outcome.success?<>
      <div className="relic-result-medallion"><span aria-hidden="true" className="relic-result-wave"/><span aria-hidden="true" className="relic-result-wave relic-result-wave-late"/>{outcome.relic&&<RelicArtwork relic={outcome.relic} className="size-24"/>}<Sparkles aria-hidden="true" className="relic-result-star" size={20}/></div>
      <p className="relic-result-name">{outcome.relic?.name??'두 힘이 결합된 유물'}</p>
      <span className="relic-result-note"><Check size={12}/> 보유 유물에 추가됐어요</span>
     </>:<>
      <div className="relic-failure-materials">{outcome.materials.map(r=><div key={r.id} data-consumed={r.id===outcome.consumedId}><div className="relic-failure-art"><RelicArtwork relic={r} className="size-14"/>{r.id===outcome.consumedId&&<span aria-hidden="true" className="relic-fracture"/>}</div><strong>{r.name}</strong><span>{r.id===outcome.consumedId?'1개 소모':'그대로 유지'}</span></div>)}</div>
      <p className="relic-result-note">남은 유물은 다음 세공에 사용할 수 있어요.</p>
     </>}
    </div>:<>
     <div className="relic-forge-slots">{displayed.map((r,i)=><div key={i} className={`relic-forge-slot relic-forge-slot-${i}`}>
      <span className="relic-slot-caption">{i===0?'기본 유물':'결합할 유물'}</span>
      <button type="button" className="relic-material-slot" data-selected={choosing===i} aria-label={`${i===0?'기본 유물':'결합할 유물'} 선택${r?`: ${r.name}`:''}`} disabled={frozen} onClick={()=>setChoosing(i as 0|1)}>
       {r?<RelicArtwork relic={r} className="size-16"/>:<Plus size={23} strokeWidth={1} aria-hidden="true"/>}
       {r&&!busy&&<span className="relic-slot-change">변경</span>}
      </button>
      <strong>{r?.name??'유물을 선택해 주세요'}</strong>
     </div>)}<span aria-hidden="true" className="relic-forge-symbol">{busy?<Hammer size={20}/>:<Plus size={16}/>}</span></div>
     {busy&&<p role="status" className="relic-forge-status"><Sparkles size={13}/> 두 유물의 힘을 잇고 있어요…</p>}
    </>}
   </div>
   {(a||b||outcome)&&<div className="relic-craft-effects" aria-label={outcome?'재료 유물 효과':'결합될 효과'}>{(outcome?.materials??[a,b]).filter((r):r is Relic=>!!r).map((r,i)=><p key={r.id}><span className="relic-effect-index">0{i+1}</span><span><RelicEffectText description={r.description}/></span></p>)}</div>}
   {!outcome&&<>
    <div className="relic-material-heading"><div><h4>나의 유물 <span>{originals.length}</span></h4><p aria-live="polite">{choosing===0?'첫 번째 유물을 골라주세요.':'다른 계열의 유물을 골라주세요.'}</p></div><span className="relic-choosing-label">{choosing===0?'01 기본':'02 결합'}</span></div>
    <div className="relic-material-grid" role="group" aria-label="세공 재료 선택">
     {originals.map(r=>{
      const equipped=r.id===state.equippedId,selected=r.id===base||r.id===attached,other=choosing===0?b:a,sameEffect=!r.crafted&&other?.effect_kind===r.effect_kind
      const unavailable=r.crafted||equipped||!!sameEffect||frozen
      return <button key={r.id} type="button" className="relic-material-card" style={{'--material-color':rarities[r.rarity].effectColor} as CSSProperties} aria-label={`${r.name} · ${rarities[r.rarity].label} · ${relicQuantity(r)}개${r.crafted?' · 합성 유물, 재세공 불가':equipped?' · 장착 중, 해제 필요':sameEffect?' · 같은 계열':''}`} aria-pressed={selected} disabled={unavailable} onClick={()=>choose(r)}>
       <span className="relic-material-art"><RelicArtwork relic={r} className="size-12"/>{selected&&<span className="relic-material-check"><Check size={10}/></span>}</span>
       <strong>{r.name}</strong><span className="relic-material-meta"><span>{rarities[r.rarity].label}</span><span>× {relicQuantity(r)}</span></span>
       {r.crafted?<span className="relic-material-lock">재세공 불가</span>:equipped?<span className="relic-material-lock"><LockKeyhole size={9}/> 해제 필요</span>:sameEffect?<span className="relic-material-lock">같은 계열</span>:selected?<span className="relic-material-lock">{r.id===base?'기본 유물':'결합 유물'}</span>:null}
      </button>
     })}
    </div>
    {originals.length===0&&<p className="relic-craft-empty">아직 세공할 원본 유물이 없어요.<br/>먼저 바다에서 유물을 발견해 보세요.</p>}
   </>}
   <details className="relic-craft-rules"><summary>세공 안내 <ChevronDown size={12}/></summary><div><p>성공하면 재료 2개가 두 효과를 가진 유물 1개로 바뀌어요.</p><p>실패하면 낮은 등급 1개가 소모돼요. 같은 등급은 무작위로 1개가 소모돼요.</p><p>성공·실패 모두 비용이 발생해요. 장착 중인 종류는 여분이 있어도 사용할 수 없어요.</p><p>합성 유물은 재세공·판매·자랑하기를 지원하지 않아요.</p><p>모든 등급 조합의 성공 확률은 {chance}%, 비용은 5,000골드예요.</p></div></details>
  </div>
  <footer className="relic-craft-footer">
   {message&&<p role="alert" className="relic-craft-error">{message}</p>}
   {outcome?<><p className="relic-craft-receipt">세공 비용 <RelicGold amount={outcome.cost}/></p><div className="flex gap-2">{onOpenInventory&&<Button variant="outline" className="min-h-11 flex-1 rounded-xl" onClick={onOpenInventory}>보유 유물 보기</Button>}<Button className="min-h-11 flex-1 rounded-xl" onClick={reset}>한 번 더 세공</Button></div></>:<>
    <div className="relic-craft-price"><span>성공 확률 <strong>{valid||busy||pending?`${chance}%`:'—'}</strong></span><span>세공 비용 <strong>{valid||busy||pending?<RelicGold amount={cost}/>: '—'}</strong></span></div>
    <Button className="relic-forge-button min-h-12 w-full rounded-xl" disabled={busy||disabled||!state.canCraft||(!pending&&!valid)} onClick={()=>void submit()}><Hammer size={15}/>{busy?'세공 중…':pending?'이전 세공 결과 다시 확인':'세공하기'}</Button>
    <p className="relic-craft-footer-note">{busy?'잠시만 기다려 주세요.':pending?'같은 요청으로 확인하며, 비용은 다시 차감되지 않아요.':'실패하면 재료 1개가 소모돼요.'}</p>
   </>}
  </footer>
 </section>
}
