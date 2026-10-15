import type { Rarity } from '@/lib/game/rarity'
export const fishingFightSeconds:Record<Rarity,number>={common:10,rare:14,epic:18,mythic:22}
export const preparedFailureSeconds=6
export const fishPullDuration:Record<Rarity,number>={common:1,rare:1.4,epic:1.9,mythic:2.5}
export type FishMood='calm'|'warning'|'surge'|'recover'
export type TensionGame={wait:number;seed:number;time:number;tension:number;progress:number;danger:number;slack:number;phase:'waiting'|'playing'|'won'|'lost';rarity:Rarity;failureAt?:number;failureReason?:'bait'|'escape'|'wave';reason?:'snap'|'slack'|'timeout'|'bait'|'escape'|'wave'}
export const fishStrength:Record<Rarity,{pull:number;surge:number;release:number;pace:number;reel:number}>={common:{pull:22,surge:72,release:25,pace:1,reel:65},rare:{pull:28,surge:92,release:29,pace:1.1,reel:80},epic:{pull:35,surge:400,release:33,pace:1.22,reel:130},mythic:{pull:43,surge:450,release:38,pace:1.36,reel:160}}
export type TensionOptions={rarity?:Rarity;wait?:number;failureAt?:number;failureReason?:'bait'|'escape'|'wave'}
export function newTensionGame(random=Math.random,options:TensionOptions={}):TensionGame{
 return {rarity:options.rarity??'common',failureAt:options.failureAt,failureReason:options.failureReason,seed:Math.floor(random()*100000),wait:options.wait??3+Math.max(0,Math.min(1,random()))*2,time:0,tension:38,progress:.12,danger:0,slack:0,phase:'waiting'}
}
// Seeded per cast: no randomness in frame updates, so FPS cannot change behavior.
export function fishBehavior(time:number,seed=50000,rarity:Rarity='common'):{mood:FishMood;progress:number;index:number}{
 const roll=(n:number)=>{const x=Math.sin(seed*1.37+n*78.233)*43758.5453;return x-Math.floor(x)}
 let elapsed=Math.max(0,time)*fishStrength[rarity].pace
 // The bite itself is the first pull, followed by a short recovery window.
 const firstPull=.8*Math.sqrt(fishPullDuration[rarity])
 if(elapsed<firstPull)return {mood:'surge',progress:elapsed/firstPull,index:0}
 elapsed-=firstPull
 if(elapsed<.65)return {mood:'recover',progress:elapsed/.65,index:1}
 elapsed-=.65
 for(let cycle=0;cycle<20;cycle++){
  const stages:[FishMood,number][]=[['calm',1.1+roll(cycle*4)*1.15],['warning',.4+roll(cycle*4+1)*.2],['surge',(roll(cycle*4+2)<.35?.8+roll(cycle*4+8)*.6:2.2+roll(cycle*4+8)*2.8)*fishPullDuration[rarity]],['recover',.45+roll(cycle*4+3)*.55]]
  for(let i=0;i<stages.length;i++){const [mood,duration]=stages[i];if(elapsed<duration)return {mood,progress:elapsed/duration,index:cycle*4+i+2};elapsed-=duration}
 }
 return {mood:'recover',progress:1,index:79}
}
export function fishMood(time:number,seed=50000,rarity:Rarity='common'):FishMood{return fishBehavior(time,seed,rarity).mood}
export function fishForce(time:number,seed:number,rarity:Rarity):number{
 const strength=fishStrength[rarity],behavior=fishBehavior(time,seed,rarity)
 // Smooth effort waves continue unchanged whether the player holds or releases.
 const effort=behavior.index===0
  ?.9+.35*Math.pow(Math.sin(behavior.progress*Math.PI),2)+.025*Math.sin(time*7+seed)
  :.38+.82*Math.pow(Math.sin(time*2.8+seed),2)
 return behavior.mood==='surge'?strength.surge*.4*effort:behavior.mood==='warning'?strength.release*(.5+behavior.progress*.4):strength.release*(.28+.12*Math.sin(time*2+seed)**2)
}
export function stepTensionGame(state:TensionGame,seconds:number,pulling:boolean):TensionGame{
 if(state.phase==='won'||state.phase==='lost')return state
 // Fixed small steps make threshold dwell time independent of display frame rate.
 let s={...state},remaining=Math.max(0,Math.min(seconds,.25))
 while(remaining>0){const dt=Math.min(remaining,1/120);remaining-=dt
  s.time+=dt
  if(s.phase==='waiting'){if(s.time>=s.wait){s.phase='playing';s.time=0}continue}
  const strength=fishStrength[s.rarity]
  const drain=fishForce(s.time,s.seed,s.rarity)
  const rate=(pulling?strength.reel:0)-drain
  s.tension=Math.max(0,Math.min(100,s.tension+rate*dt))
  const duration=s.failureAt??fishingFightSeconds[s.rarity]
  s.progress=Math.min(1,.12+.88*s.time/duration)
  s.danger=s.tension>=95?s.danger+dt:Math.max(0,s.danger-dt*2)
  s.slack=s.tension<=0?s.slack+dt:0
  if(s.failureAt!==undefined&&(s.time>=s.failureAt)){s.phase='lost';s.reason=s.failureReason??'escape'}
  else if(s.danger>=1.5){s.phase='lost';s.reason='snap'}
  else if(s.slack>=1.5){s.phase='lost';s.reason='slack'}
  else if(s.progress>=1)s.phase='won'
  if(s.phase==='won'||s.phase==='lost')break
 }
 return s
}
