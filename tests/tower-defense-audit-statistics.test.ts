// @vitest-environment node
import { expect, it } from 'vitest'
import { proportion, quantile, summarize } from '../scripts/tower-defense-audit-statistics.mjs'
import {campaignStrategy} from '../scripts/tower-defense-mixed-strategy'
it('does not report 0% when a stage has no arrivals', () => {
  expect(proportion(0, 0)).toMatchObject({ rate: null, low: null, high: null })
  expect(proportion(0, 64).high).toBeGreaterThan(0.05)
  expect(proportion(64, 64).low).toBeLessThan(0.95)
})
it('distinguishes cumulative completion, conditional success and censored runs', () => {
  const checkpoint = (wave: number, cleared: boolean) => ({
    wave,
    cleared,
    entryHp: 15,
    exitHp: 10,
    exitGold: 20,
    seconds: 40,
    routeTiles: [17, 17],
    leaks: {},
    towerCount: 3,
    wallCount: 0,
  })
  const base = { income: 200, spent: 250, gold: 130, seconds: 100 }
  const report = summarize(
    [
      { ...base, reached: 1, cleared: 0, phase: 'lost', checkpoints: [checkpoint(1, false)] },
      {
        ...base,
        reached: 2,
        cleared: 1,
        phase: 'lost',
        checkpoints: [checkpoint(1, true), checkpoint(2, false)],
      },
      {
        ...base,
        reached: 2,
        cleared: 2,
        phase: 'won',
        checkpoints: [checkpoint(1, true), checkpoint(2, true)],
      },
      {
        ...base,
        timedOut: true,
        reached: 1,
        cleared: 0,
        phase: 'combat',
        checkpoints: [checkpoint(1, false)],
      },
    ],
    3,
  )
  expect(report.n).toBe(3)
  expect(report.timeouts).toBe(1)
  expect(report.waves[1].cumulative.rate).toBe(1 / 3)
  expect(report.waves[1].conditional.rate).toBe(0.5)
  expect(report.waves[2].conditional.rate).toBeNull()
  expect(report.medianReached).toBe(2)
  expect(report.medianCleared).toBe(1)
  expect(quantile([1, 4], 0.5)).toBe(2.5)
})
it('records reference campaigns without changing purchases or combat outcomes',()=>{
 const plain=campaignStrategy(42),counts={prepared:0,'before-step':0,'after-step':0}
 const traced=campaignStrategy(42,51,false,false,(_state,stage)=>{counts[stage]++})
 expect(traced.checkpoints).toEqual(plain.checkpoints)
 for(const key of ['phase','wave','lives','gold','score','kills','finalDefeated'] as const)expect(traced.state[key]).toBe(plain.state[key])
 expect(counts.prepared).toBe(traced.state.wave)
 expect(counts['before-step']).toBe(counts['after-step'])
})
