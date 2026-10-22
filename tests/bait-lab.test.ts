// @vitest-environment node
import { expect, it } from 'vitest'
import {
  buyLab,
  finishLab,
  freshLab,
  labBaits,
  labBaitsAt,
  advanceLabWait,
  startLab,
} from '../src/features/fishing/bait-lab-model'

it('uses all staged profiles, removes forced failure and retains the agreed wait ranges', () => {
  expect(labBaits).toHaveLength(27)
  expect(labBaits.every((b) => b.successChanceBp === 10000)).toBe(true)
  expect(labBaits.find((b) => b.id === 'bait')).toMatchObject({
    price: 50,
    waitMin: 14,
    waitMax: 18,
  })
  expect(labBaits.find((b) => b.id === 'bait_lightning_stardust')).toMatchObject({
    price: 300,
    rare_bp: 9200,
    epic_bp: 800,
    common_bp: 0,
    mythic_bp: 0,
    waitMin: 20,
    waitMax: 26,
  })
})
it('spends local gold at the new price and never sells reward-only baits', () => {
  const before = freshLab(),
    after = buyLab(before, 'bait_lightning_stardust')
  expect(after.gold).toBe(49700)
  expect(after.inventory.bait_lightning_stardust).toBe(21)
  expect(before.gold).toBe(50000)
  expect(() => buyLab(before, 'bait_epic')).toThrow(/판매/)
})
it('samples lightning rarity at the 92 percent boundary, preserving a pending draw without another bait charge', () => {
  for (const [roll, rarity] of [
    [0.9199, 'rare'],
    [0.92, 'epic'],
  ] as const) {
    let calls = 0
    const state = startLab(freshLab(), 'bait_lightning_stardust', 'pongdang', () =>
      calls++ === 0 ? roll : 0.5,
    )
    expect(state.pending?.species.rarity).toBe(rarity)
    expect(state.pending?.wait).toBe(23)
    expect(state.inventory.bait_lightning_stardust).toBe(19)
    expect(startLab(state, 'bait', 'pongdang')).toBe(state)
    expect(JSON.parse(JSON.stringify(state)).pending).toEqual(state.pending)
    expect(() => buyLab(state, 'bait')).toThrow(/진행/)
  }
})
it('keeps fish/trash/decoration restrictions, bounded waits and once-only local settlement', () => {
  for (const [id, kind] of [
    ['bait_cloud_dough', 'fish'],
    ['bait_grubby_magnet', 'trash'],
    ['bait_magnet', 'decoration'],
  ]) {
    const state = startLab(freshLab(), id, 'pongdang', () => 0.5)
    expect(state.pending?.species.kind).toBe(kind)
    const bait = labBaits.find((b) => b.id === id)!
    expect(state.pending!.wait).toBeGreaterThanOrEqual(bait.waitMin)
    expect(state.pending!.wait).toBeLessThanOrEqual(bait.waitMax)
    const done = finishLab(state, true)
    expect(done.discoveries).toContain(state.pending!.species.id)
    expect(done.history).toHaveLength(1)
    expect(finishLab(done, true)).toBe(done)
  }
})
it('advances alternating bait even after cancellation, without granting a discovery', () => {
  const first = startLab(freshLab(), 'bait_zigzag_jelly', 'pongdang', () => 0.5)
  expect(first.pending?.species.rarity).toBe('common')
  const cancelled = finishLab(first, false)
  expect(cancelled.discoveries).toEqual([])
  const next = startLab(cancelled, 'bait_zigzag_jelly', 'pongdang', () => 0.5)
  expect(next.pending?.species.rarity).toBe('rare')
})

it('freezes Korea-time moonshade probabilities and waiting at cast start',()=>{
 const day=Date.parse('2026-10-22T17:59:59+09:00'),night=Date.parse('2026-10-22T18:00:00+09:00')
 expect(labBaitsAt(day).find(b=>b.id==='bait_moonshade_dumpling')).toMatchObject({period:'day',common_bp:5500,rare_bp:4500,waitMin:16,waitMax:20})
 expect(labBaitsAt(night).find(b=>b.id==='bait_moonshade_dumpling')).toMatchObject({period:'night',common_bp:4500,rare_bp:5500,waitMin:20,waitMax:24})
 const cast=startLab(freshLab(),'bait_moonshade_dumpling','pongdang',()=>.5,day)
 expect(cast.pending?.species.rarity).toBe('common')
 expect(cast.pending?.wait).toBe(18)
 expect(startLab(cast,'bait_moonshade_dumpling','pongdang',()=>.5,night)).toBe(cast)
 expect(cast.pending?.baitSnapshot?.period).toBe('day')
})

it('uses the approved deep-sleep price, exact grade boundaries and long wait',()=>{
 expect(labBaits.find(b=>b.id==='bait_deep_sleep_sachet')).toMatchObject({price:380,waitMin:68,waitMax:88,common_bp:0,rare_bp:8400,epic_bp:1500,mythic_bp:100,targetKinds:['fish','trash','decoration']})
 for(const [roll,rarity] of [[.8399,'rare'],[.84,'epic'],[.99,'mythic']] as const){
  let calls=0
  const state=startLab(freshLab(),'bait_deep_sleep_sachet','pongdang',()=>calls++===0?roll:.5)
  expect(state.pending?.species.rarity).toBe(rarity)
   expect(state.pending?.wait).toBe(78)
 }
})

it('lets aurora catch both fish and decorations while excluding trash',()=>{
 const kinds=new Set<string>()
 for(let i=0;i<100;i++){
  let calls=0
  const state=startLab(freshLab(),'bait_aurora_clockwork_bug','pongdang',()=>++calls===3?i/100:.5)
  kinds.add(state.pending!.species.kind)
 }
 expect([...kinds].sort()).toEqual(['decoration','fish'])
})

it.each(['bait','bait_epic','bait_forbidden_star','bait_safe','bait_sea_memory','bait_snowflake_salt','bait_special'])('allows all three kinds for universal bait %s',id=>{
 expect(labBaits.find(b=>b.id===id)?.targetKinds).toEqual(['fish','trash','decoration'])
 const kinds=new Set<string>()
 for(let i=0;i<100;i++){
  let calls=0
  const state=startLab(freshLab(),id,'pongdang',()=>++calls===3?i/100:.5)
  kinds.add(state.pending!.species.kind)
 }
 expect([...kinds].sort()).toEqual(['decoration','fish','trash'])
})

it('shortens only the pending wait without rerolling, spending bait or changing local gold',()=>{
 const original=startLab(freshLab(),'bait_deep_sleep_sachet','pongdang',()=>.5)
 let state=advanceLabWait(original)
 expect(state.pending?.waitReduction).toBe(10)
 for(let i=0;i<10;i++)state=advanceLabWait(state)
 expect(state.pending).toEqual({...original.pending,waitReduction:original.pending!.wait})
 expect(state.inventory).toEqual(original.inventory)
 expect(state.gold).toBe(original.gold)
 expect(advanceLabWait(freshLab()).pending).toBeNull()
})
