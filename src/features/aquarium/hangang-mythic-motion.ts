export const redCheerBeatTimes=[4.2,4.8,5.4] as const
export const hangangCycle=(time:number,seed=0)=>((time+seed/1000000)%6+6)%6
export function hangangMythicFrame(id:string,phase:number){
 if(id!=='hangang-red-cheer-incarnation'&&id!=='hangang-mago-creator')return null
 if(phase<4)return [0,1,2,3,2,1][Math.floor(phase*3)%6]
 if(id==='hangang-red-cheer-incarnation'){
  if(phase>=5.8)return 0
  if(phase>=5.6)return 7
  return [4,5,6][Math.min(2,Math.floor(((phase-4)%.6+.000001)/.2))]
 }
 return phase<4.4?4:phase<4.9?5:phase<5.4?6:phase<5.8?7:0
}
