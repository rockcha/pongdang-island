import {useState} from 'react'
import {Coins,Footprints,Shield,Sparkles,Swords} from 'lucide-react'
import scorpionArt from './assets/sand-scorpion.png'
import {combatMagic,escapeChance,sandScorpion,type CombatAction,type TurnFeedback} from './combat-state'
import type {PracticeState} from './practice-state'

export function ScorpionRoom({state,busy,feedback,onAction,onDescend,onRestart}:{state:PracticeState;busy:boolean;feedback:TurnFeedback|null;onAction:(action:CombatAction)=>void;onDescend:()=>void;onRestart:()=>void}){
 const [magic,setMagic]=useState(false)
 const combat=state.combat!
 const active=combat.status==='active'
 const spells=state.equippedSpells.flatMap(id=>state.spells.filter(spell=>spell.id===id))
 const player=feedback?.phase==='player'?feedback.events.find(event=>event.kind==='player'):undefined
 const reply=feedback?.phase==='reply'?feedback.events.find(event=>event.kind==='monster'||event.kind==='defense'):undefined
 const reward=feedback?.phase==='reply'?feedback.events.find(event=>event.kind==='reward'):undefined
 return <section className="exploration-combat" aria-label="모래 전갈 전투">
  {reply?.kind==='monster'&&<div key={`impact-${feedback?.id}`} className="combat-impact-screen" aria-hidden="true"/>}
  <header className="exploration-enemy-status"><span>MONSTER · 연습 전투</span><h2>모래 전갈</h2><div><progress aria-label="모래 전갈 체력" max={sandScorpion.maxHp} value={combat.enemyHp}/><strong>{combat.enemyHp} / {sandScorpion.maxHp}</strong></div><p><Swords size={12}/> 공격력 {sandScorpion.attack}<span>· {combat.turn+1}턴</span></p></header>
  <div className={`exploration-enemy-art ${combat.status==='won'?'is-defeated':''}`}><img key={`${feedback?.id}-${feedback?.phase}`} className={player?.damage?'has-turn':''} src={scorpionArt} alt="모래 전갈" draggable={false}/>
   {player?.damage&&<div key={`attack-${feedback?.id}`} className={`combat-enemy-hit ${feedback?.action==='magic'?'is-magic':''}`} aria-hidden="true"><i/><span className={player.critical?'is-critical':''}>{player.critical&&<small>치명타!</small>}−{player.damage}</span></div>}
   {player?.healing!==undefined&&<span key={`heal-${feedback?.id}`} className="combat-heal-number" aria-hidden="true">+{player.healing} 회복</span>}
   {player&&!player.damage&&player.healing===undefined&&<span key={`ward-${feedback?.id}`} className="combat-heal-number" aria-hidden="true"><Shield size={22}/> 방어</span>}
  </div>
  {reply&&<div key={`reply-${feedback?.id}`} className={`combat-reply-number ${reply.kind==='defense'?'is-defense':''}`} aria-hidden="true">{reply.kind==='monster'?`피격 −${reply.damage}`:reply.effect==='evade'?'회피!':reply.effect==='stun'?'반격 봉쇄':'방어 · 피해 0'}</div>}
  {reward&&<div key={`loot-${feedback?.id}`} className="combat-loot-number" aria-hidden="true"><Coins size={24}/><span>+{reward.gold}<small>탐험 골드 획득</small></span></div>}
  <div className="exploration-combat-controls">
   {active?<><p className="exploration-enemy-intent">전갈이 꼬리를 치켜들고 반격을 노립니다.</p>
    {magic&&<div className="exploration-combat-magic" aria-label="전투 마법">{spells.length?spells.map(spell=><button key={spell.id} disabled={busy||state.mp<spell.mana||!(spell.id in combatMagic)} onClick={()=>{onAction({type:'magic',id:spell.id});setMagic(false)}}><strong>{spell.name} · MP {spell.mana}</strong><small>{combatMagic[spell.id as keyof typeof combatMagic]??'준비 중'}{state.mp<spell.mana?' · 마나 부족':''}</small></button>):<p>장착한 마법이 없어요. 다음 전투 전에 보관함에서 장착해주세요.</p>}<button onClick={()=>setMagic(false)}>닫기 · 턴 소모 없음</button></div>}
    <div className="exploration-combat-actions"><button disabled={busy} onClick={()=>onAction({type:'attack'})}><Swords size={16}/>공격</button><button disabled={busy} aria-expanded={magic} onClick={()=>setMagic(value=>!value)}><Sparkles size={16}/>마법</button><button disabled={busy} title="기본 35% + 현재 주무기·주보호구의 도망 효과 + 임시 효과" onClick={()=>onAction({type:'flee'})}><Footprints size={16}/>도망 {escapeChance(state)}%</button></div>
    <small className="exploration-combat-help"><Shield size={11}/> 장비 교체는 전투 밖에서 · 행동 후 적이 살아 있으면 반격</small>
   </>:<div className="exploration-combat-result"><h3>{combat.status==='won'?'전투 승리':combat.status==='escaped'?'도망 성공':'탐험 종료'}</h3><p>{combat.status==='won'?`탐험 골드 +${sandScorpion.gold}`:combat.status==='escaped'?'보상 없이 아래층으로 이동합니다.':'체력이 모두 소진되었습니다.'}</p>{combat.status==='won'?<button disabled={busy} onClick={onDescend}>아래층으로 내려가기</button>:combat.status==='lost'?<button disabled={busy} onClick={onRestart}>연습 탐험 다시 시작</button>:null}</div>}
  </div>
 </section>
}
