import type { Rarity } from '@/lib/game/rarity'
export const preparedFailureSeconds=3
export function fishingBiteSeconds(seed:number){
 const roll=Math.sin(seed*1.37+918.43)*43758.5453
 return 2+(roll-Math.floor(roll))*2
}
export const gaugeFailureSeconds=.8
export const fishingPatterns:Record<Rarity,{pulls:number;min:number;max:number}>={common:{pulls:1,min:5,max:6},rare:{pulls:2,min:6,max:7},epic:{pulls:3,min:7,max:9},mythic:{pulls:4,min:9,max:10}}
export type FishMood='calm'|'warning'|'surge'|'recover'
export type TensionGame={wait:number;seed:number;time:number;tension:number;progress:number;danger:number;slack:number;phase:'waiting'|'ready'|'playing'|'won'|'lost';rarity:Rarity;confirmBite?:boolean;failureAt?:number;failureReason?:'bait'|'escape'|'wave';reason?:'snap'|'slack'|'timeout'|'bait'|'escape'|'wave'|'expired'}
export const fishStrength:Record<Rarity,{pull:number;surge:number;release:number;pace:number;reel:number}>={common:{pull:22,surge:138,release:32,pace:1,reel:65},rare:{pull:28,surge:184,release:37,pace:1.05,reel:75},epic:{pull:35,surge:230,release:41,pace:1.1,reel:85},mythic:{pull:43,surge:276,release:46,pace:1.15,reel:95}}
export type TensionOptions={rarity?:Rarity;wait?:number;confirmBite?:boolean;failureAt?:number;failureReason?:'bait'|'escape'|'wave'}
export function newTensionGame(random=Math.random,options:TensionOptions={}):TensionGame{
 return {rarity:options.rarity??'common',confirmBite:options.confirmBite??false,failureAt:options.failureAt,failureReason:options.failureReason,seed:Math.floor(random()*100000),wait:options.wait??3+Math.max(0,Math.min(1,random()))*2,time:0,tension:38,progress:.12,danger:0,slack:0,phase:'waiting'}
}
export function startTensionFight(state:TensionGame):TensionGame{
 return state.phase==='ready'?{...state,phase:'playing'}:state
}
// Test controls may shorten only the waiting phase, never the fight or its input.
export function reduceTensionWait(state:TensionGame,seconds:number):TensionGame{
 if(state.phase!=='waiting'||!Number.isFinite(seconds)||seconds<=0)return state
 return {...state,wait:Math.max(0,state.wait-seconds)}
}
// All durations are real seconds; rarity increases both pull length and count.
export function fishingSchedule(seed:number,rarity:Rarity){
 const roll=(n:number)=>{const x=Math.sin(seed*1.37+n*78.233)*43758.5453;return x-Math.floor(x)}
 const pattern=fishingPatterns[rarity]
 const stages:{mood:FishMood;duration:number;index:number}[]=[{mood:'warning',duration:fishingBiteSeconds(seed),index:-1}]
 for(let pull=0;pull<pattern.pulls;pull++){
  stages.push({mood:'surge',duration:pattern.min+roll(pull*2)*(pattern.max-pattern.min),index:pull*2})
  if(pull<pattern.pulls-1)stages.push({mood:'recover',duration:1.5+roll(pull*2+1)*1.5,index:pull*2+1})
 }
 return stages
}
export function fishingFightDuration(seed:number,rarity:Rarity){return fishingSchedule(seed,rarity).reduce((seconds,stage)=>seconds+stage.duration,0)}
// Seeded per cast: no randomness in frame updates, so FPS cannot change behavior.
export function fishBehavior(time:number,seed=50000,rarity:Rarity='common'):{mood:FishMood;progress:number;index:number;duration?:number}{
 let elapsed=Math.max(0,time)
 for(const stage of fishingSchedule(seed,rarity)){
  if(elapsed<stage.duration)return {...stage,progress:elapsed/stage.duration}
  elapsed-=stage.duration
 }
 return {mood:'recover',progress:1,index:fishingPatterns[rarity].pulls*2}
}
export function fishMood(time:number,seed=50000,rarity:Rarity='common'):FishMood{return fishBehavior(time,seed,rarity).mood}
export function fishForce(time:number,seed:number,rarity:Rarity):number{
 const strength=fishStrength[rarity],behavior=fishBehavior(time,seed,rarity)
 // Smooth effort waves continue unchanged whether the player holds or releases.
 const effort=.22+.98*Math.pow(Math.sin(time*2.8+seed),2)
 const resting=strength.release*(.28+.12*Math.sin(time*2+seed)**2)
 if(behavior.mood==='surge'){
  // Ease into the same resting force before changing mood, without a sudden drop.
  const remaining=(1-behavior.progress)*(behavior.duration??0)
  const fade=Math.max(0,Math.min(1,remaining/.8))
  const weight=fade*fade*(3-2*fade)
  return resting+(strength.surge*.4*effort-resting)*weight
 }
 return behavior.mood==='warning'?strength.release*(.5+behavior.progress*.4):resting
}
export function stepTensionGame(state:TensionGame,seconds:number,pulling:boolean):TensionGame{
 if(state.phase==='ready'||state.phase==='won'||state.phase==='lost')return state
 if(!Number.isFinite(seconds)||seconds<=0)return state
 let s={...state},remaining=seconds
 // Waiting follows elapsed time even when rendering is slow. Skip it in one
 // step, then carry any excess time into the fight without restarting its clock.
 if(s.phase==='waiting'){
  const waiting=Math.max(0,s.wait-s.time)
  if(remaining<waiting)return {...s,time:s.time+remaining}
  remaining-=waiting;s.phase='playing';s.time=0
  if(s.confirmBite&&s.failureAt===undefined)return {...s,phase:'ready'}
 }
 // Fixed small steps make threshold dwell time independent of display frame rate.
 while(remaining>0){const dt=Math.min(remaining,1/120);remaining-=dt
  s.time+=dt
  const duration=s.failureAt??fishingFightDuration(s.seed,s.rarity)
  s.progress=Math.min(1,.12+.88*s.time/duration)
  // A server-planned escape is independent of input. Keep the gauge stationary
  // so it cannot suggest a player-caused line break or slack failure.
  if(s.failureAt!==undefined){
   s.danger=0;s.slack=0
   if(s.time>=s.failureAt){s.phase='lost';s.reason=s.failureReason??'escape';break}
   continue
  }
  // Approach/nibbles last 2–4 seconds; gauge play starts with the first pull.
  if(s.time<fishingBiteSeconds(s.seed))continue
  const strength=fishStrength[s.rarity]
  const drain=fishForce(s.time,s.seed,s.rarity)
  const recovering=fishBehavior(s.time,s.seed,s.rarity).mood==='recover'
  const rate=(pulling?strength.reel*(recovering?1.35:1):0)-drain
  s.tension=Math.max(0,Math.min(100,s.tension+rate*dt))
  s.danger=s.tension>=95?s.danger+dt:Math.max(0,s.danger-dt*2)
  s.slack=s.tension<=0?s.slack+dt:0
  if(s.danger>=gaugeFailureSeconds){s.phase='lost';s.reason='snap'}
  else if(s.slack>=gaugeFailureSeconds){s.phase='lost';s.reason='slack'}
  else if(s.progress>=1)s.phase='won'
  if(s.phase==='won'||s.phase==='lost')break
 }
 return s
}
