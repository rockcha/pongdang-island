import {useEffect,useRef,useState,type CSSProperties} from 'react'
import {Link} from 'react-router'
import {ArrowLeft,ArrowRight,Box,Check,Heart,RotateCcw,Shield,Sparkles,Swords,Target} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {collectibleUrl} from '@/features/collection/api'
import {companionDefinition,statsAtLevel,trainingChances,trainingRarityNames,TRAINING_MAX_LEVEL,TRAINING_XP,xpForLevel,statusNames,statusDescriptions,type CompanionDefinition,type Status} from './catalog'
import {newTrainingSave,restoreTrainingSave,trainCompanion,trainingStorageKey,isEligible,type LocalCompanion,type TrainingSave} from './local-state'
import {abilityBlock,newTrainingBattle,practiceAction,testIncomingHit,type Fighter} from './battle'
import {BondShard,TrainingDummy,TrainingGlyph} from './art'
import './training.css'

export function UnitArtwork({definition,className=''}:{definition:CompanionDefinition;className?:string}){
 return <img src={collectibleUrl(definition.image)} alt={definition.name} draggable={false} className={`training-unit-art ${className}`} onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src='/fallback-image.svg'}}/>
}
function Meter({value,max,label}:{value:number;max:number;label:string}){return <progress className="training-meter" aria-label={label} max={max} value={value}/>}
function StatusBadges({actor,focus=0}:{actor:Fighter;focus?:number}){
 return <div className="training-statuses">{actor.shield>0&&<span title="방어·마저로 줄인 피해를 보호막이 흡수해요."><Shield size={11}/>보호막 {actor.shield}</span>}{focus>0&&<span>치명타 +{focus*5}%p</span>}{actor.effects.map((effect:Status)=><span key={effect.kind} title={`${statusDescriptions[effect.kind]} · ${effect.amount}%`} data-debuff={['burn','corrosion','weaken','vulnerable','blind','silence','root'].includes(effect.kind)}>{statusNames[effect.kind]} {effect.turns}T</span>)}</div>
}
export function TrainingLab({accountId}:{accountId:string}){
 const key=trainingStorageKey(accountId)
 const [save,setSave]=useState<TrainingSave>(()=>{try{return restoreTrainingSave(localStorage.getItem(key))}catch{return newTrainingSave()}})
 const [tab,setTab]=useState<'companions'|'practice'>('companions'),[selectedId,setSelectedId]=useState(save.units[0].id),[storage,setStorage]=useState(false),[reset,setReset]=useState(false)
 const [busy,setBusy]=useState(false),[outcome,setOutcome]=useState<{success:boolean;message:string;id:number}|null>(null),[saveError,setSaveError]=useState(false)
 const lock=useRef(false),sequence=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(save));setSaveError(false)}catch{setSaveError(true)}},[key,save])
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 const eligible=save.units.filter(isEligible),unit=eligible.find(item=>item.id===selectedId)??eligible[0],definition=unit?companionDefinition(unit.speciesId):null
 const stats=unit&&definition?statsAtLevel(definition,unit.level):null
 function train(){
  if(lock.current||!unit)return
  const result=trainCompanion(save,unit.id)
  if(result.save===save){setOutcome({success:false,message:result.message,id:++sequence.current});return}
  lock.current=true;setBusy(true);setOutcome(null)
  timer.current=setTimeout(()=>{setSave(result.save);setOutcome({success:result.success,message:result.message,id:++sequence.current});setBusy(false);lock.current=false;timer.current=null},850)
 }
 function moveFixture(id:string){if(busy)return;setSave(previous=>({...previous,units:previous.units.map(item=>item.id===id?{...item,tankId:item.tankId===null?'trial-aquarium':null}:item)}));setOutcome(null)}
 function practice(){if(!unit?.trained){const first=eligible.find(item=>item.trained);if(first)setSelectedId(first.id)}setTab('practice');setOutcome(null)}
 return <section className="training-lab" aria-labelledby="training-title">
  <header className="training-header"><div><Link to="/farm" aria-label="내 섬으로"><ArrowLeft size={18}/></Link><div><span className="training-eyebrow">함께 자라는 작은 용기</span><h1 id="training-title">훈련장 <small>로컬 체험</small></h1></div></div><div className="training-wallet" aria-label={`유대의 조각 ${save.shards}개`}><BondShard/><span><small>유대의 조각</small><strong>{save.shards.toLocaleString()}</strong></span></div></header>
  <div className="training-trial-note"><span>테스트 보관함의 개체와 조각만 사용해요.</span><button onClick={()=>setStorage(true)} disabled={busy}><Box size={13}/>테스트 보관함</button><button aria-label="훈련장 테스트 초기화" onClick={()=>setReset(true)} disabled={busy}><RotateCcw size={14}/></button></div>
  {saveError&&<p role="alert">이 브라우저에서 로컬 저장을 사용할 수 없어 새로고침하면 진행이 초기화돼요.</p>}
  <nav className="training-tabs" aria-label="훈련장 메뉴"><button aria-pressed={tab==='companions'} onClick={()=>setTab('companions')}><Heart size={15}/>내 동료 <small>{eligible.length}</small></button><button aria-pressed={tab==='practice'} onClick={practice}><Target size={15}/>연습장</button></nav>
  {tab==='companions'?<>
   <div className="training-section-label"><span>보관함의 유대 개체</span><small>어항에 있는 개체는 제외돼요</small></div>
   <div className="training-roster">{eligible.map(item=>{const d=companionDefinition(item.speciesId);return <button key={item.id} disabled={busy} aria-label={`${d.name} 선택`} aria-pressed={unit?.id===item.id} onClick={()=>{setSelectedId(item.id);setOutcome(null)}} style={{'--unit-color':d.color} as CSSProperties}><span className="training-bond-tag"><Heart size={10}/>유대</span><UnitArtwork definition={d}/><strong>{d.name}</strong><small>{item.trained?`Lv. ${item.level}`:'훈련 전'} · {trainingRarityNames[d.rarity]}</small>{item.trained&&<span className="training-trained-mark" aria-label="훈련 완료"><Check size={12}/></span>}</button>})}</div>
   {unit&&definition&&stats?<article className={`training-detail ${busy?'is-training':''}`} style={{'--unit-color':definition.color} as CSSProperties}>
    <div className="training-detail-heading"><div className="training-portrait"><UnitArtwork definition={definition}/>{busy&&<span className="training-bond-ring"/>}</div><div><span>{definition.role}</span><h2>{definition.name}</h2><small>{unit.trained?`Lv. ${unit.level} / ${TRAINING_MAX_LEVEL}`:'아직 유대를 맺기 전이에요'}</small></div></div>
    {unit.trained&&<div className="training-xp"><div><span>{unit.level===TRAINING_MAX_LEVEL?'최고 레벨':'다음 레벨까지'}</span><small>{unit.level===TRAINING_MAX_LEVEL?'MAX':`${unit.xp} / ${xpForLevel(unit.level)} EXP`}</small></div><Meter label="동료 경험치" value={unit.level===TRAINING_MAX_LEVEL?1:unit.xp} max={unit.level===TRAINING_MAX_LEVEL?1:xpForLevel(unit.level)}/></div>}
    <dl className="training-stats">{([{key:'hp',name:'체력'},{key:'attack',name:'공격력'},{key:'critical',name:'치명타율'},{key:'magic',name:'마력'},{key:'defense',name:'방어력'},{key:'resistance',name:'마법저항력'},{key:'evasion',name:'회피율'}] as const).map(stat=><div key={stat.key}><dt>{stat.name}</dt><dd>{stats[stat.key]}{stat.key==='critical'||stat.key==='evasion'?'%':''}</dd></div>)}</dl>
    <div className="training-ability-list">{[{...definition.passive,id:'passive',label:'패시브'}, {...definition.basic,label:'기본 공격'},...definition.skills.map(skill=>({...skill,label:'투사체 스킬'}))].map(ability=><div key={ability.id}><TrainingGlyph glyph={ability.glyph} color={definition.color}/><div><small>{ability.label}{'cooldown' in ability&&ability.cooldown>0?` · 재사용 ${ability.cooldown}턴`:''}</small><h3>{ability.name}</h3><p>{ability.description}</p></div></div>)}</div>
    {outcome&&<p key={outcome.id} role="status" className="training-outcome" data-success={outcome.success}>{outcome.success?<Sparkles size={16}/>:<Heart size={16}/>}<span>{outcome.message}</span></p>}
    <button className="training-primary" disabled={busy||save.shards<1||unit.level>=TRAINING_MAX_LEVEL} onClick={train}>{busy?<><span className="training-button-spinner"/>마음을 나누고 있어요…</>:<><BondShard/>{unit.trained?`경험치 훈련 · +${TRAINING_XP} EXP`:'유대 훈련하기'}<span>1개</span></>}</button>
    <div className="training-action-caption">{unit.trained?'경험치는 확정 지급돼요. 남는 경험치는 다음 레벨로 이어져요.':`성공 확률 ${trainingChances[definition.rarity]}% · 실패해도 개체는 사라지지 않아요.`}</div>
    {unit.trained&&<button className="training-practice-link" onClick={practice}>함께 연습하기<ArrowRight size={14}/></button>}
   </article>:<div className="training-empty"><Heart size={34}/><h2>함께할 동료를 기다려요</h2><p>테스트 보관함에서 유대 개체를 보관함으로 옮겨주세요.</p><button onClick={()=>setStorage(true)}>테스트 보관함 보기</button></div>}
  </>:<>
   {unit?.trained&&definition?<><label className="training-picker">함께 연습할 동료<select aria-label="연습할 동료" value={unit.id} onChange={event=>setSelectedId(event.target.value)}>{eligible.filter(item=>item.trained).map(item=><option key={item.id} value={item.id}>{companionDefinition(item.speciesId).name} · Lv. {item.level}</option>)}</select></label><PracticeArena key={`${unit.id}:${unit.level}`} unit={unit} definition={definition}/></>:<div className="training-empty"><Target size={36}/><h2>첫 유대를 맺어볼까요?</h2><p>훈련에 성공한 동료와 허수아비를 상대로 연습할 수 있어요.</p><button onClick={()=>setTab('companions')}>동료 훈련하러 가기<ArrowRight size={14}/></button></div>}
  </>}
  <Dialog open={storage} onOpenChange={setStorage}><DialogContent className="training-dialog"><DialogHeader><DialogTitle>테스트 보관함</DialogTitle><DialogDescription>이 훈련장 안에서만 사용하는 개체예요. 실제 운영 보관함과 어항은 바뀌지 않아요.</DialogDescription></DialogHeader><div className="training-storage-list">{save.units.map(item=>{const d=companionDefinition(item.speciesId);return <div key={item.id}><UnitArtwork definition={d}/><div><strong>{d.name}</strong><small>{item.tankId===null?'보관함 · 유대':'테스트 어항'}{item.trained?` · Lv. ${item.level}`:''}</small></div><button disabled={busy} aria-label={`${d.name} ${item.tankId===null?'어항으로 이동':'보관함으로 이동'}`} onClick={()=>moveFixture(item.id)}>{item.tankId===null?'어항으로':'보관함으로'}</button></div>})}</div></DialogContent></Dialog>
  <Dialog open={reset} onOpenChange={setReset}><DialogContent className="training-dialog"><DialogHeader><DialogTitle>훈련장 체험을 초기화할까요?</DialogTitle><DialogDescription>로컬 훈련 기록을 지우고 조각 100개와 훈련 전 동료 네 마리로 다시 시작해요.</DialogDescription></DialogHeader><button className="training-primary" onClick={()=>{setSave(newTrainingSave());setSelectedId(newTrainingSave().units[0].id);setOutcome(null);setTab('companions');setReset(false)}}>체험 초기화</button></DialogContent></Dialog>
 </section>
}

function PracticeArena({unit,definition}:{unit:LocalCompanion;definition:CompanionDefinition}){
 const [battle,setBattle]=useState(()=>newTrainingBattle(unit)),[busy,setBusy]=useState(false),[lastAbility,setLastAbility]=useState(definition.basic)
 const [basicStrike,setBasicStrike]=useState(false),[strikeDistance,setStrikeDistance]=useState(0),[cueLive,setCueLive]=useState(false),[casting,setCasting]=useState(false)
 const arena=useRef<HTMLDivElement>(null),lock=useRef(false),timers=useRef<ReturnType<typeof setTimeout>[]>([])
 useEffect(()=>()=>{timers.current.forEach(clearTimeout)},[])
 function act(id:string){
  if(lock.current)return
  const ability=[definition.basic,...definition.skills].find(item=>item.id===id)!,next=practiceAction(battle,unit,id)
  if(next===battle)return
  const basic=id===definition.basic.id
  setLastAbility(ability);lock.current=true;setBusy(true);setCueLive(false);setBasicStrike(basic);setCasting(!basic)
  if(basic){
   const fighter=arena.current?.querySelector('.training-fighter')?.getBoundingClientRect(),target=arena.current?.querySelector('.training-target')?.getBoundingClientRect()
   setStrikeDistance(fighter&&target?Math.max(0,target.left+target.width*.5-fighter.left-fighter.width*.75):0)
  }
  const impact=()=>{setBattle(next);setCueLive(true)}
  timers.current.push(setTimeout(()=>{setCasting(false);impact()},basic?400:420))
  timers.current.push(setTimeout(()=>{setBusy(false);setBasicStrike(false);setCueLive(false);lock.current=false;timers.current=[]},900))
 }
 function incoming(kind:'physical'|'magic'){
  if(lock.current)return
  const next=testIncomingHit(battle,unit,kind)
  if(next===battle)return
  lock.current=true;setBusy(true);setBasicStrike(false);setCasting(false);setCueLive(true);setBattle(next)
  timers.current.push(setTimeout(()=>{setBusy(false);setCueLive(false);lock.current=false;timers.current=[]},700))
 }
 const finished=battle.dummy.hp<=0||battle.player.hp<=0,cue=battle.cue
 return <div className="training-practice" style={{'--unit-color':definition.color} as CSSProperties}>
  <div className="training-arena-header"><div><Target size={15}/><span>허수아비 연습</span><small>{battle.turn}턴</small></div><button aria-label="연습 초기화" disabled={busy} onClick={()=>setBattle(newTrainingBattle(unit))}><RotateCcw size={14}/>다시 연습</button></div>
  <div className="training-target-health"><div><strong>연습용 허수아비</strong><span>{battle.dummy.hp.toLocaleString()} / 2,000</span></div><Meter label="허수아비 체력" value={battle.dummy.hp} max={2000}/><small>방어력 0 · 마법저항력 0 · 회피율 0% · 반격 없음</small><StatusBadges actor={battle.dummy}/></div>
  <div ref={arena} className="training-arena" data-cue={cue?.kind} data-target={cue?.target} data-basic-strike={basicStrike}>
   <div className="training-arena-floor"/>
   <div className="training-fighter" data-basic-strike={basicStrike} style={{'--basic-strike-x':`${strikeDistance}px`} as CSSProperties} data-shield={battle.player.shield>0} data-hit={cue?.kind==='hit'&&busy&&cueLive}><UnitArtwork definition={definition}/><span>Lv. {unit.level}</span></div>
   <div className="training-target" data-hit={cue?.target==='dummy'&&busy&&cueLive} data-defeated={battle.dummy.hp<=0}><TrainingDummy/></div>
   {casting&&<span className="training-projectile" aria-hidden="true"><TrainingGlyph glyph={lastAbility.glyph}/></span>}
   {cue&&cueLive&&<div key={cue.id} className="training-battle-fx" data-basic-strike={basicStrike} data-kind={cue.kind} data-target={cue.target} aria-hidden="true"><span className="training-fx-ring"/><strong className="training-floating-number" data-critical={cue.critical}>{cue.kind==='miss'?'빗나감':cue.kind==='shield'?`보호막 +${cue.amount}`:cue.kind==='heal'?`+${cue.amount}`:`${cue.critical?'치명타! ':''}−${cue.amount}`}</strong>{cue.passive&&<span className="training-passive-cue"><Sparkles size={13}/>{cue.passive}</span>}</div>}
  </div>
  <div className="training-player-health"><div><strong>{definition.name}</strong><span><Heart size={12}/>{battle.player.hp} / {battle.player.maxHp}</span></div><Meter label="동료 체력" value={battle.player.hp} max={battle.player.maxHp}/><StatusBadges actor={battle.player} focus={battle.focusTurns?battle.focus:0}/></div>
  <p className="training-combat-line" role="status" aria-live="polite">{battle.logs[0]}</p>
  {finished?<div className="training-finished"><strong>{battle.dummy.hp<=0?'멋지게 연습을 마쳤어요!':'잠시 쉬고 다시 연습해요.'}</strong><button className="training-primary" disabled={busy} onClick={()=>setBattle(newTrainingBattle(unit))}>다시 연습하기</button></div>:<div className="training-combat-actions">{[definition.basic,...definition.skills].map((ability,index)=>{const blocked=abilityBlock(battle,unit,ability);return <button key={ability.id} title={blocked??ability.description} aria-label={`${ability.name} 사용`} disabled={busy||!!blocked} onClick={()=>act(ability.id)}><TrainingGlyph glyph={ability.glyph} color={definition.color}/><small>{index===0?'기본 공격':'투사체 스킬'}</small><strong>{ability.name}</strong><span>{(battle.cooldowns[ability.id]??0)>0?`${battle.cooldowns[ability.id]}턴 대기`:index===0?'매 턴 사용':`재사용 ${ability.cooldown}턴`}</span></button>})}</div>}
  <details className="training-practice-options"><summary><Swords size={13}/>피격 테스트 · 전투 규칙</summary><p>턴을 소모하지 않는 시험 공격이에요. 방어·보호막·회피와 패시브를 확인해요.</p><div><button disabled={busy||finished} onClick={()=>incoming('physical')}>물리 30 받기</button><button disabled={busy||finished} onClick={()=>incoming('magic')}>마법 30 받기</button></div><p>공격의 치명타는 1.5배 · 스킬 사용 턴에는 새 재사용 대기시간이 줄지 않아요. 연습은 조각과 경험치를 소모하거나 지급하지 않아요.</p><details><summary>모든 키워드 보기</summary><dl>{Object.entries(statusNames).map(([kind,name])=><div key={kind}><dt>{name}</dt><dd>{statusDescriptions[kind as keyof typeof statusNames]}</dd></div>)}<div><dt>관통 · 보호막 파괴</dt><dd>지정 비율의 방어·마저 무시 · 보호막 파괴 후 피해 계산</dd></div><div><dt>흡혈 · 처형</dt><dd>입힌 체력 피해의 일부 회복 · 공격 후 지정 체력 비율 이하면 처치</dd></div></dl></details></details>
  <details className="training-history"><summary>연습 기록</summary><ol>{battle.logs.map((line,index)=><li key={`${battle.turn}-${index}`}>{line}</li>)}</ol></details>
 </div>
}
