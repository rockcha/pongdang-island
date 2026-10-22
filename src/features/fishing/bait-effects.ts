import {baitWaitFlavor} from './bait-wait-flavor'

export const baitEffects:Record<string,string>={
 bait_forbidden_star:'성공 확률 소폭 증가 · 특급·신화 개체를 만날 확률 증가',
 bait_grubby_magnet:'성공 확률 소폭 증가 · 낚시 성공 시 쓰레기 포획 100%',
 bait_sea_memory:'현재 해역의 고유종을 만날 확률 증가',
 bait_first_greeting:'성공 확률 소폭 증가 · 낚시 성공 시 미발견 개체 확정 · 모두 발견했다면 소모되지 않아요.',
 bait:'기본 낚시 미끼 · 일반 개체를 주로 만나며, 희귀한 개체도 만날 수 있어요.',
 bait_safe:'물고기만 포획 · 희귀·특급 물고기 기회 증가 · 게이지 조작은 직접 해야 해요.',
 bait_special:'성공 확률 소폭 증가 · 낚시 성공 시 희귀 개체를 주로 만나요.',
 bait_epic:'성공 확률 소폭 증가 · 낚시 성공 시 특급 개체를 주로 만나요.',
 bait_magnet:'등급을 먼저 추첨한 뒤 해당 등급의 장식물만 인양해요.',
}

export function fishingBaitEffect(id:string,fallback:string,success?:number,base?:number){
 const text=baitEffects[id]??fallback
 if(success!==undefined&&base!==undefined&&success>base)return `${text} · 낚싯대로 성공 확률 추가 증가`
 return text
}

export function fishingBaitSummary(bait:import('./api').FishingBait){
 if(bait.mechanicsVersion===2)return `${baitWaitFlavor(bait.id)}${bait.alternating?` · 다음: ${bait.nextRarity==='rare'?'희귀':'일반'} 전용`:''}`
 const chance=bait.successChanceBp??bait.success_chance_bp??bait.baseSuccessChanceBp
 const effect=fishingBaitEffect(bait.id,bait.effect_description,bait.successChanceBp,bait.baseSuccessChanceBp)
 const next=bait.alternating?` · 다음: ${bait.nextRarity==='rare'?'희귀':'일반'} 전용`:''
 return `${chance===undefined?'':`성공률 ${Number((chance/100).toFixed(2))}% · `}${effect}${next}`
}
