import {expect,it} from 'vitest'
import {practiceWhack,scoreWhack,whackMotion,whackPoints,whackTiming} from '@/features/arcade/pongi-whack-model'
it('runs for thirty seconds with increasingly frequent fakes, safe holes and one golden chance',()=>{
 const groups=[{all:0,fake:0},{all:0,fake:0},{all:0,fake:0}],early=new Set<string>()
 for(let seed=1;seed<=20;seed++){
  let n=seed;const random=()=>((n=n*16807%2147483647)-1)/2147483646
  const board=practiceWhack(random)
  expect(board.filter(t=>t.kind==='golden')).toHaveLength(1)
  expect(board.some(t=>t.kind==='bomb')).toBe(false)
  expect(board.every(t=>t.hole>=0&&t.hole<12)).toBe(true)
  expect(board.filter(t=>t.at>=20000).length).toBeGreaterThan(board.filter(t=>t.at<10000).length)
  for(const t of board){const g=groups[Math.min(2,Math.floor(t.at/10000))];g.all++;if(['hay','impostor','sandcastle'].includes(t.kind)){g.fake++;if(t.at<10000)early.add(t.kind)}expect(t.until).toBeLessThanOrEqual(30000);expect(t.until-t.at).toBeGreaterThanOrEqual(600);expect(board.filter(other=>other.hole===t.hole&&other.id!==t.id&&other.at<t.until&&other.until>t.at)).toHaveLength(0)}
 }
 expect([...early].sort()).toEqual(['hay','impostor','sandcastle'])
 expect(groups[1].fake/groups[1].all).toBeGreaterThan(groups[0].fake/groups[0].all)
 expect(groups[2].fake/groups[2].all).toBeGreaterThan(groups[1].fake/groups[1].all)
})
it('scores +1/+10/-2, floors at zero and never counts a second hit or a hidden target',()=>{
 const targets=[{id:0,hole:0,at:0,until:1000,kind:'bomb' as const},{id:1,hole:1,at:1000,until:2000,kind:'golden' as const},{id:2,hole:2,at:2000,until:3000,kind:'impostor' as const},{id:3,hole:3,at:3000,until:4000,kind:'pongi' as const}]
 expect(scoreWhack(targets,[{id:0,ms:100},{id:1,ms:1100},{id:1,ms:1200},{id:2,ms:2100},{id:3,ms:3100},{id:3,ms:4000}])).toEqual({score:9,mistakes:2,hits:4})
})
it('raises and withdraws targets faster as the round progresses',()=>{expect(whackMotion(29000).riseMs).toBeLessThan(whackMotion(1000).riseMs);expect(whackMotion(29000).sinkMs).toBeLessThan(whackMotion(1000).sinkMs)})
it('uses exactly the equipped relic count throughout practice without exceeding thirty seconds',()=>{
 for(const count of [1,2,4,10])for(let seed=1;seed<=30;seed++){
  let n=seed;const board=practiceWhack(()=>((n=n*16807%2147483647)-1)/2147483646,count)
  expect(board.filter(t=>t.kind==='golden')).toHaveLength(count)
  expect(board.every(t=>t.until<=30000)).toBe(true)
 }
 expect(practiceWhack(()=>.5,100).filter(t=>t.kind==='golden')).toHaveLength(1)
})
it('previews thirty seconds with five targets every 700ms after ten seconds and protected golden counts',()=>{
 const stages=Array.from({length:4},()=>({fake:0,all:0}))
 for(const count of [1,2,4,10])for(let seed=1;seed<=30;seed++){
  let n=seed;const board=practiceWhack(()=>((n=n*16807%2147483647)-1)/2147483646,count)
  expect(board.filter(t=>t.kind==='golden')).toHaveLength(count)
  expect(board.some(t=>t.at>28000)).toBe(true)
  for(const t of board){
   expect(t.until).toBeLessThanOrEqual(30000)
   expect(t.until-t.at).toBeGreaterThanOrEqual(700)
   expect(t.hole).toBeGreaterThanOrEqual(0);expect(t.hole).toBeLessThan(12)
   expect(board.filter(other=>other.hole===t.hole&&other.id!==t.id&&other.at<t.until&&other.until>t.at)).toHaveLength(0)
   if(count===1&&t.kind!=='golden'){const stage=t.at<10000?0:t.at<20000?1:t.at<25000?2:3;stages[stage].all++;if(t.kind!=='pongi')stages[stage].fake++}
  }
  const waves=[...new Set(board.filter(t=>t.at>=10000).map(t=>t.at))]
  for(const [index,at] of waves.entries()){
   expect(board.filter(t=>t.at===at)).toHaveLength(5)
   if(index)expect(at-waves[index-1]).toBe(700)
  }
 }
 for(let i=1;i<4;i++)expect(stages[i].fake/stages[i].all).toBeGreaterThan(stages[i-1].fake/stages[i-1].all)
 expect(stages[3].fake/stages[3].all).toBeGreaterThan(.65)
})
it('smoothly speeds up after ten seconds and gives each target a small fixed variation',()=>{
 expect(whackTiming(9999)).toEqual(whackTiming(10000))
 for(const boundary of [10000,20000,25000]){
  expect(Math.abs(whackTiming(boundary+1).lifetimeMs-whackTiming(boundary-1).lifetimeMs)).toBeLessThanOrEqual(1)
  expect(Math.abs(whackTiming(boundary+1).sinkMs-whackTiming(boundary-1).sinkMs)).toBeLessThanOrEqual(1)
 }
 expect(whackTiming(29000).lifetimeMs).toBeLessThan(whackTiming(20000).lifetimeMs)
 expect(whackTiming(20000).lifetimeMs).toBeLessThan(whackTiming(11000).lifetimeMs)
 const fast=whackTiming(20000,0),slow=whackTiming(20000,1)
 expect(slow.lifetimeMs-fast.lifetimeMs).toBe(80)
 expect(slow.sinkMs-fast.sinkMs).toBe(16)
 let n=4;const board=practiceWhack(()=>((n=n*16807%2147483647)-1)/2147483646)
 const wave=board.filter(t=>t.at===board.find(t=>t.at>=10000)!.at)
 expect(new Set(wave.map(t=>t.sinkMs)).size).toBeGreaterThan(1)
 expect(new Set(wave.map(t=>t.until)).size).toBeGreaterThan(1)
})
it('averages about seventy-two points when only real and golden targets are caught',()=>{
 let sum=0
 for(let seed=1;seed<=10000;seed++){
  let n=seed;const board=practiceWhack(()=>((n=n*16807%2147483647)-1)/2147483646)
  sum+=board.reduce((points,t)=>points+Math.max(0,whackPoints(t.kind)),0)
 }
 expect(sum/10000).toBeGreaterThan(71.5)
 expect(sum/10000).toBeLessThan(72.5)
})
