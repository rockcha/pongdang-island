import { expect,it } from 'vitest'
import { fishingBiteSeconds,fishingFightDuration,fishingPatterns,fishingSchedule,gaugeFailureSeconds,preparedFailureSeconds,fishBehavior,fishForce,fishMood,newTensionGame,stepTensionGame } from '@/features/fishing/tension-game'
import type { TensionGame } from '@/features/fishing/tension-game'
import { fishingMessage } from '@/features/fishing/fishing-messages'

const tiers=['common','rare','epic','mythic'] as const
function play(mode:'always'|'never'|'responsive',fps=60,rarity:typeof tiers[number]='common',seed=50000){
 let s={...newTensionGame(()=>.5,{rarity}),seed}
 let pulling=false
 for(let i=0;i<fps*90&&!['won','lost'].includes(s.phase);i++){
  if(i%Math.max(1,Math.round(fps*.2))===0)pulling=mode==='always'||mode==='responsive'&&s.tension<65
  s=stepTensionGame(s,1/fps,pulling)
 }
 return s
}
it('waits three to five seconds before a two-to-four-second approach with an unchanged gauge',()=>{
 expect(newTensionGame(()=>0).wait).toBe(3);expect(newTensionGame(()=>1).wait).toBe(5)
 let s:TensionGame={...newTensionGame(()=>.5),phase:'playing'}
 for(let i=0;i<3;i++)s=stepTensionGame(s,.25,true)
 expect(s.tension).toBe(38);expect(fishMood(s.time,s.seed)).toBe('warning')
 expect(fishMood(fishingBiteSeconds(s.seed),s.seed)).toBe('surge')
})
it('uses longer and more numerous pulls at higher tiers with 1.5 to 3 second rests',()=>{
 for(const rarity of tiers)for(let seed=1;seed<=100;seed++){
  const stages=fishingSchedule(seed,rarity),pulls=stages.filter(s=>s.mood==='surge'),rests=stages.filter(s=>s.mood==='recover')
  const expected=fishingPatterns[rarity]
  expect(pulls.length).toBe(tiers.indexOf(rarity)+1)
  expect(rests.length).toBe(pulls.length-1)
  for(const stage of pulls){expect(stage.duration).toBeGreaterThanOrEqual(expected.min);expect(stage.duration).toBeLessThanOrEqual(expected.max)}
  for(const stage of rests){expect(stage.duration).toBeGreaterThanOrEqual(1.5);expect(stage.duration).toBeLessThanOrEqual(3)}
  expect(stages[0]).toMatchObject({mood:'warning',duration:fishingBiteSeconds(seed)})
  expect(stages[0].duration).toBeGreaterThanOrEqual(2)
  expect(stages[0].duration).toBeLessThanOrEqual(4)
 }
})
it('keeps durations deterministic across input and finishes at the end of the final pull',()=>{
 let previous=0
 for(const rarity of tiers){
  const duration=fishingFightDuration(50000,rarity)
  expect(duration).toBeGreaterThan(previous);previous=duration
  const result=play('responsive',60,rarity)
  expect(result.phase).toBe('won')
  expect(result.time).toBeCloseTo(duration,1)
  expect(stepTensionGame(result,.2,true)).toBe(result)
 }
})
it('supports controlled play at 30, 60 and 120 FPS',()=>{
 for(const rarity of tiers){
  const results=[30,60,120].map(fps=>play('responsive',fps,rarity))
  for(const result of results)expect(result.phase).toBe('won')
  expect(Math.abs(results[0].time-results[2].time)).toBeLessThan(.15)
 }
})
it('keeps every rarity winnable across 500 seeded patterns with deliberate input',()=>{
 for(const rarity of tiers)for(let seed=1;seed<=500;seed++)expect(play('responsive',60,rarity,seed).phase,rarity+' seed '+seed).toBe('won')
},15000)
it('loses from constant reeling or no reeling and keeps terminal results immutable',()=>{
 expect(play('always')).toMatchObject({phase:'lost',reason:'snap'})
 const lost=play('never');expect(lost).toMatchObject({phase:'lost',reason:'slack'})
 expect(stepTensionGame(lost,.2,true)).toBe(lost)
})
it('uses the same 0.8-second grace period at both gauge extremes',()=>{
 expect(gaugeFailureSeconds).toBe(.8)
 const low={...newTensionGame(()=>.5),phase:'playing' as const,time:4,tension:0,slack:.65}
 expect(stepTensionGame(low,.1,false).phase).toBe('playing')
 expect(stepTensionGame(low,.2,false)).toMatchObject({phase:'lost',reason:'slack'})
 const high={...newTensionGame(()=>.5),phase:'playing' as const,time:4,tension:100,danger:.65}
 expect(stepTensionGame(high,.1,true).phase).toBe('playing')
 expect(stepTensionGame(high,.2,true)).toMatchObject({phase:'lost',reason:'snap'})
})
it('resets slack when recovered before the 0.8-second limit',()=>{
 const rest=fishingSchedule(42,'rare').slice(0,2).reduce((sum,s)=>sum+s.duration,0)+.2
 const s={...newTensionGame(()=>.5,{rarity:'rare'}),seed:42,phase:'playing' as const,time:rest,tension:0,slack:.65}
 expect(stepTensionGame(s,.1,true)).toMatchObject({phase:'playing',slack:0})
})
it('ends chance failures after three seconds independently of gauge and input',()=>{
 for(const pulling of [false,true])for(const tension of [0,38,100]){
  let s:TensionGame={...newTensionGame(()=>.5,{failureAt:preparedFailureSeconds,failureReason:'bait'}),phase:'playing',tension}
  for(let i=0;i<170;i++){
   s=stepTensionGame(s,1/60,pulling)
   expect(s).toMatchObject({tension,danger:0,slack:0})
  }
  expect(s.phase).toBe('playing')
  for(let i=0;i<12;i++)s=stepTensionGame(s,1/60,pulling)
  expect(s).toMatchObject({phase:'lost',reason:'bait',tension,danger:0,slack:0});expect(s.time).toBeCloseTo(3,1)
 }
})
it('smoothly releases resistance at every pull boundary',()=>{
 for(const rarity of tiers){
  let end=0
  for(const stage of fishingSchedule(42,rarity)){
   end+=stage.duration
   if(stage.mood!=='surge')continue
   expect(Math.abs(fishForce(end-.001,42,rarity)-fishForce(end+.001,42,rarity))).toBeLessThan(.1)
  }
 }
})
it('varies casts while maintaining progressive resistance and stronger reeling than release',()=>{
 expect(fishingSchedule(1,'mythic')).not.toEqual(fishingSchedule(2,'mythic'))
 const forces=tiers.map(rarity=>fishForce(2,50000,rarity))
 for(let i=1;i<forces.length;i++)expect(forces[i]).toBeGreaterThan(forces[i-1])
 const s={...newTensionGame(()=>.5),phase:'playing' as const,time:4}
 expect(stepTensionGame(s,.1,true).tension).toBeGreaterThan(stepTensionGame(s,.1,false).tension)
})
it('shows stable varied approach and nibble messages before the first pull',()=>{
 const messages=new Set<string>()
 for(let seed=1;seed<=20;seed++){
  const s={...newTensionGame(()=>.5),seed,phase:'playing' as const,time:.2}
  messages.add(fishingMessage(s))
  expect(fishingMessage(s)).toBe(fishingMessage({...s,time:.3}))
  expect(fishingMessage({...s,phase:'waiting',time:.2})).not.toBe(fishingMessage(s))
 }
 expect(messages.size).toBeGreaterThan(3)
})

it('stays quiet for the full waiting phase before approach commentary',()=>{
 const s=newTensionGame(()=>.5)
 expect(fishingMessage({...s,time:.5})).toBe('')
 expect(fishingMessage({...s,time:2.34})).toBe('')
 expect(fishingMessage({...s,time:s.wait-.01})).toBe('')
 expect(fishingMessage({...s,phase:'playing',time:.01})).not.toBe('')
})
