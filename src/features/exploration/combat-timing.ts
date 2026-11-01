export const combatSpeed=1.2
export const combatTime=(milliseconds:number)=>Math.round(milliseconds/combatSpeed)
export const combatTimings={player:combatTime(1100),bleed:combatTime(2300),statusPause:combatTime(600),counter:combatTime(3000),reply:combatTime(4300),done:combatTime(6200)}
