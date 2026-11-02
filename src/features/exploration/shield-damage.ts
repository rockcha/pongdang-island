/** Shields absorb unmitigated direct damage. Only overflow reaches armor/resistance. */
export function shieldDamage(raw:number,capacity:number,defend:(overflow:number)=>number){
 const absorbed=Math.min(Math.max(0,capacity),Math.max(0,raw))
 const overflow=Math.max(0,raw-absorbed)
 const damage=overflow>0?defend(overflow):0
 return {absorbed,damage,defenseBlocked:Math.max(0,overflow-damage)}
}
