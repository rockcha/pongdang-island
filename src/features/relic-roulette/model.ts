export type RouletteGrade = 'none' | 'rare' | 'epic' | 'mythic'
export const rouletteGrades = {
  none: {label: '꽝', color: '#a7917e', chance: 60},
  rare: {label: '희귀', color: '#517b99', chance: 34},
  epic: {label: '특급', color: '#8c6799', chance: 5},
  mythic: {label: '신화', color: '#a66a25', chance: 1},
} as const

// One continuous sector per outcome. Arc size is the actual server probability.
export const rouletteSegments = (Object.keys(rouletteGrades) as RouletteGrade[])
  .map((kind,index)=>({kind,index,weight:rouletteGrades[kind].chance}))
// Decoded duration of the supplied victorabdo-spin-232536.mp3, at 44.1 kHz.
export const rouletteSpinDuration = 3683.265306122449
export function segmentStart(index:number){return rouletteSegments.slice(0,index).reduce((sum,s)=>sum+s.weight,0)*3.6}
export function segmentCenter(index: number) {
  return (rouletteSegments.slice(0,index).reduce((sum,s)=>sum+s.weight,0)+rouletteSegments[index].weight/2)*3.6
}
export function landingSegment(grade: RouletteGrade, operation: string) {
  void operation
  return rouletteSegments.findIndex(segment=>segment.kind===grade)
}
export function rotationProgress(elapsed:number,duration=rouletteSpinDuration){
  const t=Math.max(0,Math.min(1,elapsed/duration))
  return 1-(1-t)**2
}
export function pointerStep(angle:number,velocity:number,delta:number){
  // Damped torsion spring, integrated in small steps for low frame rates.
  let remaining=Math.min(.1,Math.max(0,delta/1000))
  while(remaining>0){const dt=Math.min(remaining,1/120);velocity+=(-210*angle-18*velocity)*dt;angle+=velocity*dt;remaining-=dt}
  return {angle,velocity}
}
