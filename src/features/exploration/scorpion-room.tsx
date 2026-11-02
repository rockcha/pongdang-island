import {bossPreludeLines} from './boss-prelude'
import {spellVisuals} from './spell-visuals'
import {WeaponAttackEffect} from './weapon-attack-effect'
import {SpellCastEffect} from './spell-cast-effect'
import {MonsterMoveDetails} from './monster-move-details'
import {nextRoomLabel} from './run-state'
import {combatTime} from './combat-timing'
import {HealthMeter} from './health-meter'
import type {RoomLoot} from './room-loot'
import {CombatQuickPicker} from './combat-quick-picker'
import {useEffect,useEffectEvent,useId,useRef,useState,type CSSProperties} from 'react'
import {combatBackgrounds,combatBackgroundUrl,resolveCombatBackground,type CombatBackground} from './combat-backgrounds'
import {airborneMonsters,monsterGrounding} from './monster-grounding'
import {formatBasicAttack} from './attack-roll'
import {ChoiceLog} from './choice-log'
import {CombatResultLog} from './combat-result-log'
import {EnemyAilments} from './ailments'
import {Coins,Shield} from 'lucide-react'
import {escapeChance,monsterDefeatText,type CombatAction,type TurnFeedback} from './combat-state'
import {StatIcon} from './equipment-stats'
import {getCombatMonster,monsterPatternNotice} from './monster-patterns'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {playerAttackStats,type PracticeState} from './practice-state'
import {stolenPotionLabel} from './potion-theft'

export const monsterPreludeLines=[
 '뭔가 이상한 소리가 들리는데…?',
 '잠깐, 저 어둠 속에서 뭔가 움직였어…!',
 '발소리가 들려… 여기 나 말고 누가 있나 봐.',
 '공기가 달라졌어… 조심해야겠는데?',
 '저 앞에 누가 있는 것 같아… 준비하자!',
] as const

export function ScorpionRoom({background=combatBackgrounds[0],backdropUrl,nickname,avatarPath,logEvent,state,busy,feedback,latestLog,speaker,onAction,onDescend,onReturnToMain,onReward,onLootReady}:{background?:CombatBackground;backdropUrl?:string;nickname?:string;avatarPath?:string|null;logEvent?:import('./combat-state').CombatEvent;state:PracticeState;busy:boolean;latestLog:string;speaker:string;feedback:TurnFeedback|null;onAction:(action:CombatAction)=>void;onDescend:()=>void;onReturnToMain:()=>void;onReward?:()=>void;onLootReady?:(loot:RoomLoot)=>void}){
 const [magic,setMagic]=useState(false),[potions,setPotions]=useState(false)
 const [moveDetail,setMoveDetail]=useState<string|null>(null)
 const combat=state.combat!
 const attackDescription=useId(),attackStats=playerAttackStats(state),attackDisplay=formatBasicAttack(attackStats.attack,attackStats.variance)
 const monster=getCombatMonster(state),patternNotice=monster.pattern==='black-sun'&&combat.pattern?.shieldHp?undefined:monsterPatternNotice(state),rewardGold=monster.gold+(combat.pattern?.bonusGold??0)
 const arenaBackground=resolveCombatBackground(monster.id,background)
 const selectedMove=moveDetail==='basic'?monster.basic:monster.magic.find(move=>move.id===moveDetail)
 // The player-hit snapshot can reach zero HP before the final victory receipt is presented.
 const won=combat.status==='won'||combat.status==='active'&&combat.enemyHp<=0
 const active=combat.status==='active'&&!won
 const [entrance,setEntrance]=useState(()=>({key:`${state.market.floor}:${monster.id}`,revealed:combat.turn>0,line:(()=>{const pool=bossPreludeLines(monster)??monsterPreludeLines;return pool[Math.floor(Math.random()*pool.length)]})()}))
 const entering=active&&monster.id!=='potion-thief'&&combat.turn===0&&!feedback&&!entrance.revealed
 const entranceTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 function finishPrelude(){
  if(entranceTimer.current!==undefined)clearTimeout(entranceTimer.current)
  entranceTimer.current=setTimeout(()=>setEntrance(previous=>({...previous,revealed:true})),1000)
 }
 useEffect(()=>{
  const key=`${state.market.floor}:${monster.id}`
  setEntrance(previous=>previous.key===key?previous:{key,revealed:combat.turn>0,line:(()=>{const pool=bossPreludeLines(monster)??monsterPreludeLines;return pool[Math.floor(Math.random()*pool.length)]})()})
  return()=>{clearTimeout(entranceTimer.current);entranceTimer.current=undefined}
 },[monster.id,state.market.floor,active,combat.turn])
 function chooseAction(action:CombatAction){
  if(busy||entering)return
  onAction(action)
 }
 useEffect(()=>{setMagic(false);setPotions(false)},[monster.id,state.market.floor])
 useEffect(()=>{
  if(!active){setMagic(false);setPotions(false)}
 },[active])
 const playReward=useEffectEvent(()=>onReward?.())
 function offerLoot(){if(combat.loot&&!combat.lootClaimed)onLootReady?.(combat.loot)}
 const revealLoot=useEffectEvent(offerLoot)
 const autoDescend=useEffectEvent(onDescend)
 useEffect(()=>{
  if(combat.status!=='escaped')return
  const timer=setTimeout(()=>autoDescend(),2000)
  return()=>clearTimeout(timer)
 },[combat.status])
 const [victoryStep,setVictoryStep]=useState(0)
 useEffect(()=>{
  if(!won){setVictoryStep(0);return}
  const creature=setTimeout(()=>setVictoryStep(1),combatTime(900))
 const skills=setTimeout(()=>{setVictoryStep(2);if(rewardGold>0)playReward()},combatTime(1200))
  const complete=setTimeout(()=>{setVictoryStep(3);if(combat.lootSource!=='chest')revealLoot()},combatTime(2800))
  return()=>{clearTimeout(creature);clearTimeout(skills);clearTimeout(complete)}
 },[won])
 if(combat.status==='lost')return <section className="exploration-combat is-defeat" aria-label={`${monster.name} 전투`}><div className="combat-defeat-space" aria-hidden="true"/><div className="exploration-combat-controls combat-defeat-controls"><ChoiceLog speaker="탐험" className="exploration-enemy-intent" text="사망하였습니다."/><button className="combat-return-main" onClick={onReturnToMain}>메인 화면으로</button></div></section>
 if(combat.status==='escaped'&&combat.enemyFled)return <section className="exploration-combat is-enemy-flee" aria-label={monster.name+' 전투'}><div className="enemy-flee-art"><img src={monster.image} alt={monster.name}/></div><ChoiceLog speaker="탐험" text={monster.name+'가 달아났습니다. 보상 없이 아래층으로 향합니다.'}/></section>
 const player=feedback?.phase==='player'?feedback.events.find(event=>event.kind==='player'):undefined
 const manaRestored=feedback&&(feedback.phase==='player'||feedback.phase==='reply')?feedback.events.filter(event=>(event.phase??'player')===feedback.phase).reduce((total,event)=>total+(event.manaRestored??0),0):0
 const selfSpell=!!player?.spellId&&spellVisuals[player.spellId]?.target==='self'
 const reply=feedback?.phase==='reply'?feedback.events.find(event=>event.kind==='monster'||event.kind==='defense'):undefined
 const usedMoveEvent=feedback&&(feedback.phase==='counter'||feedback.phase==='reply')?feedback.events.find(event=>event.phase==='reply'&&event.moveId&&event.source===monster.name):undefined
 const usedMove=usedMoveEvent?[monster.basic,...monster.magic].find(move=>move.id===usedMoveEvent.moveId):undefined
 const resultMove=resultEventMove()
 function resultEventMove(){const id=logEvent?.moveId??reply?.moveId;return [monster.basic,...monster.magic].find(move=>move.id===id)}
 const healing=feedback?.phase==='player'?feedback.events.find(event=>event.phase!=='reply'&&event.healing!==undefined&&!event.source):undefined
 const revival=feedback?.phase==='reply'?feedback.events.find(event=>event.phase==='reply'&&event.kind==='system'&&event.healing):undefined
 const enemyHealing=feedback?.phase==='reply'?feedback.events.find(event=>event.effect==='enemy-heal'):undefined

 const cleansing=feedback?.phase==='player'&&feedback.events.some(event=>event.effect==='cleanse')
 const weaponStrike=feedback?.action==='attack'?feedback.events.find(event=>event.kind==='player'&&event.weaponId):undefined
 const resultEvent=logEvent?.kind==='status'&&feedback?.phase==='reply'?feedback.events.find(event=>event.kind==='monster')??logEvent:logEvent
 const resultText=resultEvent!==logEvent?`${resultEvent?.text} ${latestLog}`:latestLog
 return <section className={`exploration-combat ${entering?'is-encounter-prelude':''} ${won?'is-victory':''} ${!won&&feedback?.phase==='prepare'?'is-preparing':''} ${!won&&feedback?.phase==='counter'?'is-countering':''}`} style={{'--combat-backdrop':`url(${backdropUrl??combatBackgroundUrl(arenaBackground)})`} as CSSProperties} data-victory-step={won?victoryStep:undefined} data-action={feedback?.action} aria-label={`${monster.name} 전투`}>
  {!won&&reply?.kind==='monster'&&<div key={`impact-${feedback?.id}`} className="combat-impact-screen" aria-hidden="true"/>}
  <header className="exploration-enemy-status"><span>{state.mode==='practice'?'MONSTER · 실전':'MONSTER · 테스트 전투'}</span><h2>{monster.name}</h2><div><HealthMeter key={monster.id} label={`${monster.name} 체력`} max={monster.maxHp} value={combat.enemyHp}/><strong>{combat.enemyHp} / {monster.maxHp}</strong></div><dl className="exploration-monster-stats" aria-label="몬스터 능력치">{([{kind:'attack',label:'공격력',value:monster.attack},{kind:'critical',label:'치명타',value:`${monster.critical}%`},{kind:'defense',label:'방어력',value:monster.defense},{kind:'resistance',label:'마법 저항력',value:monster.magicResistance}] as const).map(stat=><div key={stat.kind} title={stat.label} aria-label={`${stat.label} ${stat.value}`}><dt><StatIcon kind={stat.kind}/><span className="sr-only">{stat.label}</span></dt><dd>{stat.value}</dd></div>)}</dl></header>
  {!won&&<EnemyAilments effects={combat.effects??[]} spellEffects={combat.spellEffects} shield={combat.pattern?.shieldHp?{remaining:combat.pattern.shieldHp,turns:combat.pattern.shieldTurns}:undefined}/>}
  {active&&patternNotice&&<div className="exploration-monster-pattern" role="status" aria-label="몬스터 패턴" data-urgent={!!(combat.pattern?.fleeReady||combat.pattern?.charging)}>{patternNotice}</div>}
  <div className="exploration-monster-stage has-combat-background" data-combat-background={arenaBackground}>
   {!won&&usedMove&&<div className="combat-used-move" role="status" aria-label={`${usedMove.id===monster.basic.id?'기본 공격':'스킬'} · ${usedMove.name}`} key={`${feedback?.id}-${usedMove.id}`}><img src={usedMove.image} alt=""/><strong>{usedMove.name}</strong></div>}
   {weaponStrike&&feedback&&(feedback.phase==='prepare'||feedback.phase==='player')&&<WeaponAttackEffect key={feedback.id} weaponId={weaponStrike.weaponId!} phase={feedback.phase} critical={weaponStrike.critical} missed={weaponStrike.effect==='miss'} proc={feedback.events.find(event=>event.weaponProc)?.weaponProc} lifesteal={feedback.events.some(event=>event.effect==='lifesteal'&&(event.healing??0)>0)} cleanse={feedback.events.some(event=>event.effect==='cleanse')}/>}

   {feedback?.action==='magic'&&(feedback.phase==='prepare'||feedback.phase==='player')&&feedback.events.find(event=>event.spellId)?.spellId&&<SpellCastEffect key={feedback.id} spellId={feedback.events.find(event=>event.spellId)!.spellId!}/>}
   {(!won||victoryStep<1)&&<button disabled={won} className="exploration-monster-move is-basic" aria-label={`기본 공격 · ${monster.basic.name} 설명`} onClick={()=>setMoveDetail('basic')} data-active={feedback?.phase==='counter'&&feedback.events.some(event=>event.moveId===monster.basic.id)}><small>기본 공격</small><img src={monster.basic.image} alt=""/><strong>{monster.basic.name}</strong></button>}
  {(!won||victoryStep<1)&&<div className="exploration-monster-entrance" key={monster.id}><div data-airborne={airborneMonsters.has(monster.id)} style={{'--sprite-aspect':monsterGrounding[monster.id].aspect,'--sprite-bottom-gap':`${monsterGrounding[monster.id].bottomGap*100}%`} as CSSProperties} className={`exploration-enemy-art ${won?'is-defeated':''}`}><img key={`${feedback?.id}-${feedback?.phase}`} className={player?.damage?'has-turn':''} src={monster.image} alt={monster.name} draggable={false}/>
   {!won&&(combat.pattern?.shieldHp??0)>0&&<div className="combat-enemy-shield" data-damage={combat.pattern!.shieldHp!<=10?'heavy':combat.pattern!.shieldHp!<=20?'light':'intact'} aria-hidden="true"><span/><span/><svg className="combat-shield-cracks" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none"><g className="shield-cracks-light"><path d="m25 8 7 18-9 9 13 12-6 14m2-35 12 4 5-8M82 35 68 43l5 12-13 10m8-22-10-7"/></g><g className="shield-cracks-heavy"><path d="m50 2-4 17 12 12-11 15 8 16-12 14 3 22M4 55l17-5 15 11 11-15m-26 4 4-15M96 73 78 67l-8 15-15-20m23 5 3-12M18 85l12-9 13 0"/></g></svg></div>}
   {player?.damage!==undefined&&player.effect!=='miss'&&<div key={`attack-${feedback?.id}`} className={`combat-enemy-hit ${feedback?.action==='magic'?'is-magic':''}`} aria-hidden="true"><span className={player.critical?'is-critical':''}>{player.critical&&<small>치명타!</small>}−{player.damage}</span></div>}
   {enemyHealing&&<span key={`enemy-heal-${feedback?.id}`} className="combat-heal-number" aria-hidden="true">+{enemyHealing.healing} 회복</span>}
   {revival&&<span className="combat-heal-number is-revival" role="status">{revival.spellId==='soul-knot'?'영혼의 매듭 · 체력 1로 생존':`등불 부활 +${revival.healing}`}</span>}
   {healing?.healing!==undefined&&<span key={`heal-${feedback?.id}`} className={`combat-heal-number ${selfSpell?'is-player-spell':feedback?.action==='attack'?'is-player-weapon':''}`} aria-hidden="true">+{healing.healing} 회복</span>}
   {cleansing&&!healing&&<span className={`combat-heal-number ${selfSpell?'is-player-spell':feedback?.action==='attack'?'is-player-weapon':''}`} aria-hidden="true">정화!</span>}
   {manaRestored>0&&<span className="combat-heal-number is-mana">+{manaRestored} 마나</span>}
   {player&&(!player.damage)&&(player.damage===undefined||player.effect==='miss')&&player.healing===undefined&&player.effect!=='potion'&&(!player.spellId||selfSpell)&&<span key={`ward-${feedback?.id}`} className={`combat-heal-number ${selfSpell?'is-player-spell':feedback?.action==='attack'?'is-player-weapon':''}`} aria-hidden="true">{player.effect==='miss'?'빗나감':<><Shield size={22}/>방어</>}</span>}
  </div></div>}
   {(!won||victoryStep<1)&&<div className="exploration-monster-magic-list">{monster.magic.length?monster.magic.map(move=><button key={move.id} disabled={won} className="exploration-monster-move is-magic" aria-label={`마법 · ${move.name} 설명`} onClick={()=>setMoveDetail(move.id)} data-active={feedback?.phase==='counter'&&feedback.events.some(event=>event.moveId===move.id)}><small>스킬</small><img src={move.image} alt=""/><strong>{move.name}</strong></button>):<button disabled={won} className="exploration-monster-move is-magic" aria-label="마법 · 마법 없음 설명" onClick={()=>setMoveDetail('no-magic')}><small>스킬</small><img src="/exploration/monster-skills/no-magic.svg" alt=""/><strong>마법 없음</strong><span>—</span></button>}</div>}
   {won&&victoryStep===2&&rewardGold>0&&<div className="combat-victory-gold" role="status"><Coins size={26}/><span>골드 +{rewardGold.toLocaleString()}</span></div>}
   {won&&victoryStep>=2&&combat.stolenPotions&&<div className="combat-victory-gold" role="status"><span>{stolenPotionLabel(combat.stolenPotions)} 되찾음</span></div>}
  </div>
  <Dialog open={!won&&moveDetail!==null} onOpenChange={open=>{if(!open)setMoveDetail(null)}}><DialogContent className="exploration-modal exploration-monster-move-detail"><DialogHeader><DialogTitle>{selectedMove?.name??'마법 없음'}</DialogTitle><DialogDescription>{monster.name} · {moveDetail==='basic'?'기본 공격':'마법'}</DialogDescription></DialogHeader><MonsterMoveDetails monster={monster} kind={moveDetail??'basic'}/></DialogContent></Dialog>
  {!won&&reply&&<div key={`reply-${feedback?.id}`} className={`combat-reply-number ${reply.kind==='defense'?'is-defense':''}`} aria-hidden="true">{reply.kind==='monster'?`${reply.critical?'치명타! ':''}−${reply.damage??0}`:reply.effect==='evade'?'회피!':reply.effect==='freeze'?'빙결!':reply.effect==='miss'?'빗나감!':reply.effect==='stun'?'반격 봉쇄':'−0'}</div>}
  <div className="exploration-combat-controls">
   {entering?<ChoiceLog nickname={nickname??speaker} avatarPath={avatarPath} text={entrance.line} onTextComplete={finishPrelude}/>:<CombatResultLog nickname={nickname} avatarPath={avatarPath} event={won?undefined:resultEvent} moveName={!won?resultMove?.name:undefined} speaker={won?'탐험':speaker} text={won?monsterDefeatText(monster.name):resultText}/>}
   {active?<>
    <div className="exploration-combat-actions" data-no-escape={monster.tier==='boss'}><button className="combat-action-attack" disabled={busy||entering} aria-label="공격" aria-describedby={attackDescription} title={`공격력 ${attackStats.attack} · ${attackStats.variance?'피해 범위 '+attackDisplay:'고정 공격력'} · 치명타 ${attackStats.critical}% · 적 방어력 적용 전`} onClick={()=>chooseAction({type:'attack'})}><CombatIcon kind="attack"/><span>공격</span><span className="combat-attack-stats" id={attackDescription} data-weakened={attackStats.weaken>0}><span><StatIcon kind="attack"/><span className="sr-only">공격력 </span>{attackDisplay}</span><span className="combat-attack-critical"><StatIcon kind="critical"/><span className="sr-only">치명타율 </span>{attackStats.critical}%</span>{attackStats.weaken>0&&<span className="combat-attack-curse">약화 −{attackStats.weaken}</span>}</span></button><CombatQuickPicker kind="magic" state={state} open={magic&&active&&!busy&&!entering} onOpenChange={open=>{setMagic(open);if(open)setPotions(false)}} busy={busy||entering} onAction={chooseAction} trigger={<button className="combat-action-magic" disabled={busy||entering}><CombatIcon kind="magic"/><span>마법</span></button>}/><CombatQuickPicker kind="potion" state={state} open={potions&&active&&!busy&&!entering} onOpenChange={open=>{setPotions(open);if(open)setMagic(false)}} busy={busy||entering} onAction={chooseAction} trigger={<button className="combat-action-potion" aria-label="포션 마시기" disabled={busy||entering}><CombatIcon kind="potion"/><span>포션 마시기</span></button>}/>{monster.tier!=='boss'&&<button className="combat-action-flee" disabled={busy||entering} title="기본 35% + 현재 주무기·주보호구의 도망 효과 + 임시 효과" onClick={()=>chooseAction({type:'flee'})}><CombatIcon kind="flee"/><span>도망 <small>{escapeChance(state)}%</small></span></button>}</div>
   </>:won?<div className="combat-victory-next">{victoryStep===3&&combat.lootSource==='chest'&&!combat.lootClaimed&&<button disabled={busy} onClick={offerLoot}>상자 열기</button>}{victoryStep===3&&<button disabled={busy||!!onLootReady&&!!combat.loot&&!combat.lootClaimed} onClick={onDescend}>{nextRoomLabel(state)}</button>}</div>:null}
  </div>
 </section>
}

function CombatIcon({kind}:{kind:'attack'|'magic'|'potion'|'flee'}){
 return <svg className="combat-action-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==='attack'?<><path d="m15 32 21-24 4-1-1 5-21 23M12 27l10 9M17 33l-6 7-3-3 6-6"/><path d="m13 9 3 9m-9-3 8 3M29 36l6 3m-3-8 4 3" opacity=".5"/><path d="m22 26 13-15"/></>:kind==='magic'?<><path d="m24 5 4 13 13 6-13 5-4 14-5-14-12-5 12-6Z"/><path d="m24 14 2 8 7 2-7 3-2 8-3-8-6-3 6-2Z" fill="currentColor" fillOpacity=".15"/><path d="M37 6v8m-4-4h8M9 34v6m-3-3h6" opacity=".6"/></>:kind==='potion'?<><path d="M19 5h10v7l8 12v12c0 5-26 5-26 0V24l8-12ZM17 5h14M12 27h24M24 29v8m-4-4h8"/></>:<><path d="M27 39H15V9h18v30h-6M15 9l12 5v29l-12-4"/><path d="M30 24h13m-5-5 5 5-5 5M5 21h6M3 27h8M6 33h5"/><circle cx="23" cy="27" r="1" fill="currentColor" stroke="none"/></>}
 </svg>
}
