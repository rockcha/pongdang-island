import {expect,it} from 'vitest'
import {practiceWhack,scoreWhack,whackMotion} from '@/features/arcade/pongi-whack-model'
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
