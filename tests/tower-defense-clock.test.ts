// @vitest-environment node
import { expect, it } from 'vitest'
import { advanceDefenseClock } from '../src/features/arcade/tower-defense-clock'
import {
  createDefense,
  beginDefense,
  startWave,
  pauseDefense,
  spawnEnemy,
  cellAt,
  BUILDINGS,
} from '../src/features/arcade/tower-defense-engine'

function combat(rate: 1 | 2) {
  const s = createDefense(42)
  beginDefense(s)
  startWave(s)
  s.playbackRate = rate
  s.spawned = s.plan.length
  spawnEnemy(s, 'armored', cellAt(6, 4))
  return s
}
it('advances the same fixed simulation twice as fast without changing combat stats', () => {
  const normal = combat(1),
    fast = combat(2)
  let a = 0,
    b = 0
  for (let i = 0; i < 20; i++) {
    a = advanceDefenseClock(normal, a, 0.05)
    b = advanceDefenseClock(fast, b, 0.05)
  }
  expect(normal.tick).toBe(40)
  expect(fast.tick).toBe(normal.tick * 2)
  // Compare equal simulated time, including exact cell arrivals and corner turns.
  for (let i = 0; i < 20; i++) a = advanceDefenseClock(normal, a, 0.05)
  expect(fast.enemies[0].x).toBeCloseTo(normal.enemies[0].x)
  expect(fast.enemies[0].y).toBeCloseTo(normal.enemies[0].y)
  expect(fast.enemies[0].hp).toBe(normal.enemies[0].hp)
  expect(BUILDINGS.octopus.interval[0]).toBe(2)
})
it('speeds preparation consistently and does not catch up time spent paused', () => {
  const s = combat(2)
  s.phase = 'build'
  s.prep = 20
  let remainder = advanceDefenseClock(s, 0, 0.1)
  expect(s.prep).toBeCloseTo(19.6)
  pauseDefense(s, true)
  remainder = advanceDefenseClock(s, remainder, 100)
  expect(remainder).toBe(0)
  expect(s.prep).toBeCloseTo(19.6)
  pauseDefense(s, false)
  advanceDefenseClock(s, remainder, 0.05)
  expect(s.prep).toBeCloseTo(19.4)
})
it('bounds stalled-frame catch-up and retains sub-step time at either rate', () => {
  for (const rate of [1, 2] as const) {
    const s = combat(rate)
    const remainder = advanceDefenseClock(s, 0, 10)
    expect(s.tick).toBeLessThanOrEqual(16)
    expect(remainder).toBeLessThan(0.05)
    const before = s.tick
    const fractional = advanceDefenseClock(s, 0, 0.01)
    expect(s.tick).toBe(before)
    expect(fractional).toBeCloseTo(0.02 * rate)
  }
})
