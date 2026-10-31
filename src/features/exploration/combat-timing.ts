export const combatSpeed=1.2
export const combatTime=(milliseconds:number)=>Math.round(milliseconds/combatSpeed)
export const combatTimings={player:combatTime(1100),counter:combatTime(3000),reply:combatTime(4300),done:combatTime(6200)}
