import {ArrowDown,Coins,Droplets,Flame,Heart,Skull,Sparkles,Swords} from 'lucide-react'
import {EffectFacts,type EffectFact} from './effect-facts'
import {playerMaxHp,playerManaMax,type PracticeState} from './practice-state'
import {sphinxTimeLimitSeconds} from './adventure-rooms'
export type ResourceDelta={hp:number;mp:number}
export function roomNarrative(id:string){
 return ({'soul-lantern':'등불 속 작은 불꽃이 당신의 숨결을 따라 흔들린다. 영혼의 일부를 맡기면 마지막 순간에 길을 비춰 줄 것이다.','deep-well':'차갑고 맑은 샘이 깊은 어둠 속에서 빛난다. 물은 상처를 씻어 주지만, 몸속의 마력까지 가져간다.','forbidden-trade':'“살아 있는 피에는 잊힌 주문을 깨우는 힘이 있지.” 어둠 속 목소리가 조용히 대답을 기다린다.','cursed-gem-eye':'석상의 눈에 박힌 보석이 금빛으로 빛난다. 손을 대자 벽 너머에서 무언가 고개를 드는 기척이 느껴진다.','broken-teleport':'금이 간 고리 사이로 아래층의 계단이 어른거린다. 마법진에 대가를 넣으면 짧은 길이 열릴 것 같다.'} as Record<string,string>)[id]
}
export function roomOutcomeNarrative(id:string){return ({'soul-lantern':'작은 불꽃이 당신의 영혼을 기억한다. 마지막 순간에 다시 길을 비춰 줄 것이다.','deep-well':'차가운 물이 상처를 아물게 한다. 샘 깊은 곳으로 마력이 조용히 흘러나갔다.','forbidden-trade':'피를 대가로 잊힌 주문이 기억 속에 새겨졌다.','cursed-gem-eye':'보석을 빼내자 석상의 눈이 어두워졌다. 왕릉의 무언가가 당신을 알아차렸다.','broken-teleport':'고리의 틈이 푸르게 빛난다. 아래로 이어지는 짧은 길이 열렸다.'} as Record<string,string>)[id]}
export function RoomEffectDetails({id,state,recovery,done=false}:{id:string;state:PracticeState;recovery?:ResourceDelta|null;done?:boolean}){
 let items:EffectFact[]=[]
 const hp=Math.max(0,playerMaxHp(state)-state.hp),mp=Math.max(0,playerManaMax(state)-state.mp)
 const gain=(amount:number)=>amount>0?`+${amount}`:'가득 참'
 if(id.startsWith('rest-'))items=[{label:'체력 회복',value:gain(recovery?.hp??hp),icon:<Heart/>,tone:'health',note:done?'회복 완료':'최대 체력까지'},{label:'마나 회복',value:gain(recovery?.mp??mp),icon:<Droplets/>,tone:'mana',note:done?'회복 완료':'최대 마나까지'}]
 if(id==='soul-lantern')items=[{label:'최대 마나',value:'−10',icon:<Droplets/>,tone:'danger',note:'최소 10 유지 · 재점화마다 지불'},{label:'사망 시 부활',value:'체력 20 · 1회',icon:<Flame/>,tone:'gold',note:'막보스 포함 · 소진 후 다시 계약 가능'}]
 if(id==='deep-well')items=[{label:'체력 회복',value:gain(recovery?.hp??hp),icon:<Heart/>,tone:'health',note:'최대 체력까지'},{label:done?'남은 마나':'마나 소모',value:done?'0':'전부',icon:<Droplets/>,tone:'danger',note:done?'회복의 대가':'마나가 0이 됩니다'}]
 if(id==='forbidden-trade')items=[{label:'체력 소모',value:'−50',icon:<Heart/>,tone:'danger',note:'체력 51 이상 필요'},{label:'마법 획득',value:'중급 1개',icon:<Sparkles/>,tone:'gold',note:'미획득 마법 중 무작위'}]
 if(id==='cursed-gem-eye')items=[{label:'골드 획득',value:'+500',icon:<Coins/>,tone:'gold'},{label:'적 기본 공격력',value:'+3 · 2전투',icon:<Swords/>,tone:'danger',note:'도망친 전투도 포함'}]
 if(id==='broken-teleport')items=[{label:'골드 소모',value:'−200',icon:<Coins/>,tone:'danger'},{label:'3층 아래로 이동',value:`지하 ${state.market.floor+3}층`,icon:<ArrowDown/>,tone:'mana',note:'고정 등장 방은 건너뛰지 않음'}]
 if(id==='sphinx'&&!done)items=[{label:'답변 제한',value:`${sphinxTimeLimitSeconds}초`,icon:<Sparkles/>,tone:'gold'},{label:'오답·시간 초과',value:'현재 체력 −50%',icon:<Skull/>,tone:'danger',note:'성공하면 길이 열립니다'}]
 return items.length?<EffectFacts items={items} label="방 효과"/>:null
}
