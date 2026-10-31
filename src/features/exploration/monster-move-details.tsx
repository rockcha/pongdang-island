import {Droplets,Heart,Percent,Sparkles} from 'lucide-react'
import {AilmentIcon} from './ailments'
import {StatIcon} from './equipment-stats'
import {EffectFacts,type EffectFact} from './effect-facts'
import {basicAttackRange,monsterAttackVariance} from './attack-roll'
import type {Monster} from './monster-catalog'
const narratives:Record<string,string>={
 'blinding-sand':'낡은 천 사이에서 거친 모래바람이 일어납니다.','soul-discharge':'푸른 혼불이 보호 문양 사이로 파고듭니다.','tomb-seal':'왕릉의 오래된 문양이 마력을 옭아맵니다.','soul-harvest':'적의 영혼에 손을 뻗어 생기를 거둡니다.','apprentice-curse':'작은 부적이 흔들리며 서툰 저주를 남깁니다.','crimson-chain':'붉게 빛나는 사슬이 날카롭게 휘감깁니다.','earth-rumble':'돌의 몸에 잠든 마력이 대지를 울립니다.','sealed-flash':'봉인 사이에서 눈부신 빛이 터져 나옵니다.','solar-judgment':'왕의 홀 위로 작열하는 태양빛이 모입니다.','golden-chains':'황금 사슬이 허공을 가르며 날아듭니다.','saw-pinch':'톱니 모양 집게로 적을 움켜쥡니다.',
}
export function MonsterMoveDetails({monster,kind}:{monster:Monster;kind:string}){
 const basic=kind==='basic',skill=basic?monster.basic:monster.magic.find(move=>move.id===kind)
 if(!skill)return <p>이 몬스터는 마법을 사용하지 않고 매 턴 기본 공격을 사용합니다.</p>
 const range=basicAttackRange(monster.attack,monsterAttackVariance),facts:EffectFact[]=[{label:basic?'물리 피해':'마법 피해',value:basic?`${range.min}–${range.max}`:`${skill.damage}`,icon:basic?<StatIcon kind="attack"/>:<Sparkles/>,tone:basic?'gold':'mana'},{label:'적용 방어',value:basic?'방어력':'마법 저항력',icon:<StatIcon kind={basic?'defense':'resistance'}/>}]
 if(skill.effect==='blind')facts.push({label:'실명',value:'명중률 −30%',icon:<AilmentIcon kind="blind"/>,tone:'danger',note:'다음 기본 공격 1회 · 중첩 없음'})
 if(skill.effect==='weaken')facts.push({label:'약화',value:'기본 공격력 −2',icon:<AilmentIcon kind="weaken"/>,tone:'danger',note:'다음 기본 공격 1회 · 중첩 없음'})
 if(skill.effect==='magic-break')facts.push({label:'마저 감소',value:'−10 · 1턴',icon:<AilmentIcon kind="magic-break"/>,tone:'danger',note:'마법 저항력을 10 감소 · 음수 가능 · 중첩 없음'})
 if(skill.effect==='mana-drain')facts.push({label:'마나 감소',value:'−4',icon:<Droplets/>,tone:'danger',note:'남은 마나만큼만 감소'})
 if(skill.effect==='lifesteal')facts.push({label:'생명력 흡수',value:'실제 피해의 50%',icon:<Heart/>,tone:'health',note:'회복량 내림 · 최대 체력 초과 없음'})
 if(skill.bleed)facts.push({label:'출혈',value:`피해 ${skill.bleed.amount}, ${skill.bleed.turns}턴`,icon:<AilmentIcon kind="bleed"/>,tone:'danger',note:`적중 시 ${skill.bleed.chance}% · 행동 종료마다 피해 · 중첩 없음`})
 const chance=monster.magic.length===2?'1/3 · 약 33%':monster.magic.length===1?'50%':'100%'
 facts.push({label:'사용 확률',value:chance,icon:<Percent/>},{label:basic?'치명타':'마나 소모',value:basic?`${monster.critical}%`:'없음',icon:basic?<StatIcon kind="critical"/>:<Droplets/>,tone:basic?'danger':'mana',note:basic?'발동 시 직접 피해 2배':'회피와 치명타 없음'})
 return <><div className="exploration-move-intro"><img src={skill.image} alt=""/><p>{narratives[skill.id]??skill.description}</p></div><EffectFacts items={facts} label="스킬 효과"/>{basic&&<p className="exploration-effect-footnote">방어력과 회피 적용 · 마나 소모 없음</p>}</>
}
