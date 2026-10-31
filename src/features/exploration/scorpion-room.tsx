import {spellVisuals} from './spell-visuals'
import {WeaponAttackEffect} from './weapon-attack-effect'
import {SpellCastEffect} from './spell-cast-effect'
import {MonsterMoveDetails} from './monster-move-details'
import {practiceFinalBossId} from './campaign'
import {nextRoomLabel} from './run-state'
import {combatTime} from './combat-timing'
import {HealthMeter} from './health-meter'
import type {RoomLoot} from './room-loot'
import {CombatMagicDialog} from './combat-magic-dialog'
import {PotionChoiceDialog} from './potion-choice-dialog'
import {useEffect,useEffectEvent,useId,useState} from 'react'
import {formatBasicAttack} from './attack-roll'
import {ChoiceLog} from './choice-log'
import {EnemyAilments,AilmentGuide} from './ailments'
import {Coins,Shield} from 'lucide-react'
import {escapeChance,monsterDefeatText,type CombatAction,type TurnFeedback} from './combat-state'
import {StatIcon} from './equipment-stats'
import {getFloorMonster} from './monster-catalog'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {playerAttackStats,type PracticeState} from './practice-state'

export function ScorpionRoom({logEvent,state,busy,feedback,latestLog,speaker,onAction,onDescend,onReturnToMain,onReward,onLootReady}:{logEvent?:import('./combat-state').CombatEvent;state:PracticeState;busy:boolean;latestLog:string;speaker:string;feedback:TurnFeedback|null;onAction:(action:CombatAction)=>void;onDescend:()=>void;onReturnToMain:()=>void;onReward?:()=>void;onLootReady?:(loot:RoomLoot)=>void}){
 const [magic,setMagic]=useState(false),[potions,setPotions]=useState(false)
 const [moveDetail,setMoveDetail]=useState<string|null>(null)
 const combat=state.combat!
 const attackDescription=useId(),attackStats=playerAttackStats(state),attackDisplay=formatBasicAttack(attackStats.attack,attackStats.variance)
 const monster=getFloorMonster(combat.monsterId,state.market.floor,state.mode==='practice')
 const selectedMove=moveDetail==='basic'?monster.basic:monster.magic.find(move=>move.id===moveDetail)
 const active=combat.status==='active'
 const won=combat.status==='won'
 const playReward=useEffectEvent(()=>onReward?.())
 const revealLoot=useEffectEvent(()=>{if(combat.loot&&!combat.lootClaimed)onLootReady?.(combat.loot)})
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
 const skills=setTimeout(()=>{setVictoryStep(2);if(monster.gold>0)playReward()},combatTime(1200))
  const complete=setTimeout(()=>{setVictoryStep(3);if(combat.lootSource!=='chest')revealLoot()},combatTime(2800))
  return()=>{clearTimeout(creature);clearTimeout(skills);clearTimeout(complete)}
 },[won])
 if(combat.status==='lost')return <section className="exploration-combat is-defeat" aria-label={`${monster.name} 전투`}><div className="combat-defeat-space" aria-hidden="true"/><div className="exploration-combat-controls combat-defeat-controls"><ChoiceLog speaker="탐험" className="exploration-enemy-intent" text="사망하였습니다."/><button className="combat-return-main" onClick={onReturnToMain}>메인 화면으로</button></div></section>
 const player=feedback?.phase==='player'?feedback.events.find(event=>event.kind==='player'):undefined
 const selfSpell=!!player?.spellId&&spellVisuals[player.spellId]?.target==='self'
 const reply=feedback?.phase==='reply'?feedback.events.find(event=>event.kind==='monster'||event.kind==='defense'):undefined
 const healing=feedback?.phase==='player'?feedback.events.find(event=>event.phase!=='reply'&&event.healing!==undefined&&!event.source):undefined
 const revival=feedback?.phase==='reply'?feedback.events.find(event=>event.phase==='reply'&&event.kind==='system'&&event.healing):undefined
 const enemyHealing=feedback?.phase==='reply'?feedback.events.find(event=>event.effect==='enemy-heal'):undefined
 const chance=monster.magic.length===2?'33%':monster.magic.length===1?'50%':'100%'
 const cleansing=feedback?.phase==='player'&&feedback.events.some(event=>event.effect==='cleanse')
 const weaponStrike=feedback?.action==='attack'?feedback.events.find(event=>event.kind==='player'&&event.weaponId):undefined
 return <section className={`exploration-combat ${won?'is-victory':''} ${feedback?.phase==='prepare'?'is-preparing':''} ${feedback?.phase==='counter'?'is-countering':''}`} data-victory-step={won?victoryStep:undefined} data-action={feedback?.action} aria-label={`${monster.name} 전투`}>
  {!won&&reply?.kind==='monster'&&<div key={`impact-${feedback?.id}`} className="combat-impact-screen" aria-hidden="true"/>}
  <header className="exploration-enemy-status"><span>{state.mode==='practice'?'MONSTER · 실전연습':'MONSTER · 테스트 전투'}</span><h2>{monster.name}<AilmentGuide/></h2><div><HealthMeter key={monster.id} label={`${monster.name} 체력`} max={monster.maxHp} value={combat.enemyHp}/><strong>{combat.enemyHp} / {monster.maxHp}</strong></div><p><span className="exploration-monster-tier">{monster.tier==='boss'?(monster.id===practiceFinalBossId?'최종보스':'중간보스'):monster.tier==='intermediate'?'중급':'일반'}</span><span>{combat.turn+1}턴</span></p><dl className="exploration-monster-stats" aria-label="몬스터 능력치">{([{kind:'attack',label:'공격력',value:monster.attack},{kind:'critical',label:'치명타',value:`${monster.critical}%`},{kind:'defense',label:'방어력',value:monster.defense},{kind:'resistance',label:'마법 저항력',value:monster.magicResistance}] as const).map(stat=><div key={stat.kind} title={stat.label} aria-label={`${stat.label} ${stat.value}`}><dt><StatIcon kind={stat.kind}/><span className="sr-only">{stat.label}</span></dt><dd>{stat.value}</dd></div>)}</dl></header>
  {!won&&<EnemyAilments effects={combat.effects??[]}/>}
  <div className="exploration-monster-stage">
   {weaponStrike&&feedback&&(feedback.phase==='prepare'||feedback.phase==='player')&&<WeaponAttackEffect key={feedback.id} weaponId={weaponStrike.weaponId!} phase={feedback.phase} critical={weaponStrike.critical} missed={weaponStrike.effect==='miss'} proc={feedback.events.find(event=>event.weaponProc)?.weaponProc} lifesteal={feedback.events.some(event=>event.effect==='lifesteal'&&(event.healing??0)>0)} cleanse={feedback.events.some(event=>event.effect==='cleanse')}/>}

   {feedback?.action==='magic'&&(feedback.phase==='prepare'||feedback.phase==='player')&&feedback.events.find(event=>event.spellId)?.spellId&&<SpellCastEffect key={feedback.id} spellId={feedback.events.find(event=>event.spellId)!.spellId!}/>}
   {(!won||victoryStep<1)&&<button disabled={won} className="exploration-monster-move is-basic" aria-label={`기본 공격 · ${monster.basic.name} 설명`} onClick={()=>setMoveDetail('basic')} data-active={feedback?.phase==='counter'&&feedback.events.some(event=>event.moveId===monster.basic.id)}><small>기본 공격</small><img src={monster.basic.image} alt=""/><strong>{monster.basic.name}</strong><span>{chance}</span></button>}
  {(!won||victoryStep<1)&&<div className={`exploration-enemy-art ${won?'is-defeated':''}`}><img key={`${feedback?.id}-${feedback?.phase}`} className={player?.damage?'has-turn':''} src={monster.image} alt={monster.name} draggable={false}/>
   {player?.damage&&<div key={`attack-${feedback?.id}`} className={`combat-enemy-hit ${feedback?.action==='magic'?'is-magic':''}`} aria-hidden="true"><span className={player.critical?'is-critical':''}>{player.critical&&<small>치명타!</small>}−{player.rawDamage??player.damage}{!!player.defenseBlocked&&<small className="combat-defense-breakdown"><Shield size={13}/>{player.defenseBlocked}</small>}</span></div>}
   {enemyHealing&&<span key={`enemy-heal-${feedback?.id}`} className="combat-heal-number" aria-hidden="true">+{enemyHealing.healing} 회복</span>}
   {revival&&<span className="combat-heal-number is-revival" role="status">등불 부활 +{revival.healing}</span>}
   {healing?.healing!==undefined&&<span key={`heal-${feedback?.id}`} className={`combat-heal-number ${selfSpell?'is-player-spell':feedback?.action==='attack'?'is-player-weapon':''}`} aria-hidden="true">+{healing.healing} 회복</span>}
   {cleansing&&!healing&&<span className={`combat-heal-number ${selfSpell?'is-player-spell':feedback?.action==='attack'?'is-player-weapon':''}`} aria-hidden="true">정화!</span>}
   {player?.manaRestored!==undefined&&<span className="combat-heal-number is-mana">+{player.manaRestored} 마나</span>}
   {player&&!player.damage&&player.healing===undefined&&player.effect!=='potion'&&(!player.spellId||selfSpell)&&<span key={`ward-${feedback?.id}`} className={`combat-heal-number ${selfSpell?'is-player-spell':feedback?.action==='attack'?'is-player-weapon':''}`} aria-hidden="true"><Shield size={22}/>{player.effect==='miss'?'빗나감':'방어'}</span>}
  </div>}
   {(!won||victoryStep<1)&&<div className="exploration-monster-magic-list">{monster.magic.length?monster.magic.map(move=><button key={move.id} disabled={won} className="exploration-monster-move is-magic" aria-label={`마법 · ${move.name} 설명`} onClick={()=>setMoveDetail(move.id)} data-active={feedback?.phase==='counter'&&feedback.events.some(event=>event.moveId===move.id)}><small>마법</small><img src={move.image} alt=""/><strong>{move.name}</strong><span>{chance}</span></button>):<button disabled={won} className="exploration-monster-move is-magic" aria-label="마법 · 마법 없음 설명" onClick={()=>setMoveDetail('no-magic')}><small>마법</small><img src="/exploration/monster-skills/no-magic.svg" alt=""/><strong>마법 없음</strong><span>—</span></button>}</div>}
   {won&&victoryStep===2&&monster.gold>0&&<div className="combat-victory-gold" role="status"><Coins size={26}/><span>골드 +{monster.gold.toLocaleString()}</span></div>}
  </div>
  <Dialog open={!won&&moveDetail!==null} onOpenChange={open=>{if(!open)setMoveDetail(null)}}><DialogContent className="exploration-modal exploration-monster-move-detail"><DialogHeader><DialogTitle>{selectedMove?.name??'마법 없음'}</DialogTitle><DialogDescription>{monster.name} · {moveDetail==='basic'?'기본 공격':'마법'}</DialogDescription></DialogHeader><MonsterMoveDetails monster={monster} kind={moveDetail??'basic'}/></DialogContent></Dialog>
  {!won&&reply&&<div key={`reply-${feedback?.id}`} className={`combat-reply-number ${reply.kind==='defense'?'is-defense':''}`} aria-hidden="true">{reply.kind==='monster'?`${reply.critical?'치명타! ':''}피격 −${reply.rawDamage??reply.damage}`:reply.effect==='evade'?'회피!':reply.effect==='freeze'?'빙결!':reply.effect==='miss'?'빗나감!':reply.effect==='stun'?'반격 봉쇄':'방어 · 피해 0'}{!!reply.defenseBlocked&&<small className="combat-defense-breakdown"><Shield size={13}/>{reply.defenseBlocked}</small>}</div>}
  <div className="exploration-combat-controls">
   <ChoiceLog event={won?undefined:logEvent} speaker={won?'탐험':speaker} className="exploration-enemy-intent" text={won?monsterDefeatText(monster.name):latestLog}/>
   {active?<>
    <CombatMagicDialog state={state} open={magic&&active} onOpenChange={setMagic} busy={busy} onCast={id=>onAction({type:'magic',id})}/>
    <PotionChoiceDialog state={state} open={potions&&active} onOpenChange={setPotions} busy={busy} onUse={kind=>{if(busy)return false;onAction({type:'potion',kind});return true}}/>
    <div className="exploration-combat-actions" data-no-escape={monster.tier==='boss'}><button className="combat-action-attack" disabled={busy} aria-label="공격" aria-describedby={attackDescription} title={`공격력 ${attackStats.attack} · ${attackStats.variance?'피해 범위 '+attackDisplay:'고정 공격력'} · 치명타 ${attackStats.critical}% · 적 방어력 적용 전`} onClick={()=>onAction({type:'attack'})}><CombatIcon kind="attack"/><span>공격</span><span className="combat-attack-stats" id={attackDescription} data-weakened={attackStats.weaken>0}><span><StatIcon kind="attack"/><span className="sr-only">공격력 </span>{attackDisplay}</span><span className="combat-attack-critical"><StatIcon kind="critical"/><span className="sr-only">치명타율 </span>{attackStats.critical}%</span>{attackStats.weaken>0&&<span className="combat-attack-curse">약화 −{attackStats.weaken}</span>}</span></button><button className="combat-action-magic" disabled={busy} aria-expanded={magic} onClick={()=>setMagic(value=>!value)}><CombatIcon kind="magic"/><span>마법</span></button><button className="combat-action-potion" disabled={busy} onClick={()=>setPotions(true)}><CombatIcon kind="potion"/><span>포션 마시기</span></button>{monster.tier!=='boss'&&<button className="combat-action-flee" disabled={busy} title="기본 35% + 현재 주무기·주보호구의 도망 효과 + 임시 효과" onClick={()=>onAction({type:'flee'})}><CombatIcon kind="flee"/><span>도망 <small>{escapeChance(state)}%</small></span></button>}</div>
   </>:won?<div className="combat-victory-next">{victoryStep===3&&combat.lootSource==='chest'&&!combat.lootClaimed&&<button disabled={busy} onClick={()=>revealLoot()}>상자 열기</button>}{victoryStep===3&&<button disabled={busy||!!onLootReady&&!!combat.loot&&!combat.lootClaimed} onClick={onDescend}>{nextRoomLabel(state)}</button>}</div>:null}
  </div>
 </section>
}

function CombatIcon({kind}:{kind:'attack'|'magic'|'potion'|'flee'}){
 return <svg className="combat-action-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==='attack'?<><path d="m15 32 21-24 4-1-1 5-21 23M12 27l10 9M17 33l-6 7-3-3 6-6"/><path d="m13 9 3 9m-9-3 8 3M29 36l6 3m-3-8 4 3" opacity=".5"/><path d="m22 26 13-15"/></>:kind==='magic'?<><path d="m24 5 4 13 13 6-13 5-4 14-5-14-12-5 12-6Z"/><path d="m24 14 2 8 7 2-7 3-2 8-3-8-6-3 6-2Z" fill="currentColor" fillOpacity=".15"/><path d="M37 6v8m-4-4h8M9 34v6m-3-3h6" opacity=".6"/></>:kind==='potion'?<><path d="M19 5h10v7l8 12v12c0 5-26 5-26 0V24l8-12ZM17 5h14M12 27h24M24 29v8m-4-4h8"/></>:<><path d="M27 39H15V9h18v30h-6M15 9l12 5v29l-12-4"/><path d="M30 24h13m-5-5 5 5-5 5M5 21h6M3 27h8M6 33h5"/><circle cx="23" cy="27" r="1" fill="currentColor" stroke="none"/></>}
 </svg>
}
