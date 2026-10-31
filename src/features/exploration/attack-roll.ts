export const monsterAttackVariance=2
export function basicAttackRange(attack:number,variance=0){const spread=Math.max(0,Math.floor(variance));return {min:Math.max(1,attack-spread),max:Math.max(1,attack+spread)}}
export function formatBasicAttack(attack:number,variance=0){const {min,max}=basicAttackRange(attack,variance);return min===max?String(min):`${min}–${max}`}
/** Roll each landed basic hit independently, before critical damage and armor. */
export function rollBasicAttack(attack:number,random=Math.random,variance=0){
 const {min,max}=basicAttackRange(attack,variance)
 if(min===max)return min
 return min+Math.min(max-min,Math.floor(random()*(max-min+1)))
}
