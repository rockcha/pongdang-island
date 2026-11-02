export type StolenPotions={health:number;mana:number}
export function stolenPotionLabel(potions:StolenPotions){
 return [potions.health?`체력 포션 ${potions.health}개`:null,potions.mana?`마나 포션 ${potions.mana}개`:null].filter(Boolean).join(' · ')||'포션 없음'
}
