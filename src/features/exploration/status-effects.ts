import type {EnemyAilment} from './ailments'

/** A weaker source cannot overwrite or extend a stronger effect. */
export function applyEnemyAilment(effects:EnemyAilment[],incoming:EnemyAilment):EnemyAilment[]{
 const current=effects.find(effect=>effect.kind===incoming.kind)
 if(!current)return [...effects,{...incoming}]
 if(current.amount>incoming.amount)return effects
 return effects.map(effect=>effect.kind!==incoming.kind?effect:{...incoming,turns:current.amount===incoming.amount?Math.max(current.turns,incoming.turns):incoming.turns})
}
export function healingAfterReduction(amount:number,effects:EnemyAilment[]){
 const reduction=effects.find(effect=>effect.kind==='burn')?.amount??0
 return Math.floor(Math.max(0,amount)*(1-Math.min(100,Math.max(0,reduction))/100))
}
export const enemyHealingAmount=healingAfterReduction
