import sheets from './halloween-mythic-action-layouts.json'

export const halloweenSpiritUrl='/aquarium/effects/halloween-spirit_v1.png'
const ids=new Set(sheets.map(sheet=>sheet.id))
export const hasHalloweenSpirits=(id:string)=>ids.has(id)

/** Local coordinates in logical creature sizes. Time is independent of sheet frames. */
export function halloweenSpirits(id:string,time:number,seed:number,reduced=false){
 if(!hasHalloweenSpirits(id))return []
 const phase=(reduced?0:time)*Math.PI/4+(seed%997)/997*Math.PI*2
 return [0,1].map(index=>{
  const angle=phase+index*Math.PI
  const depth=Math.sin(angle)
  return {x:Math.cos(angle)*.43,y:depth*.18-.14,size:.22,angle:Math.sin(angle+.6)*9,front:depth>=0}
 })
}

// Neutral -> anticipation -> action -> return -> recovery -> neutral. All sheet
// switches pass through the neutral pose, including the six-second loop seam.
const cycle=[0,1,2,3,2,1,0,1,2,1,0,0,4,5,6,7,0,1,2,3,2,1,0,0]
export function halloweenMythicFrame(path:string,time:number,seed:number){
 if(!sheets.some(sheet=>path===`fish/mythic/${sheet.id}_swim8_sprite.png`))return null
 const phase=((time+seed/1000000)%6+6)%6
 return cycle[Math.min(cycle.length-1,Math.floor(phase*4))]
}
