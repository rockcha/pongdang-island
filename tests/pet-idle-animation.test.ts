import { expect, it } from 'vitest'
import { createPetBlinkSchedule, petIdleFrame, petBlinkStep } from '@/features/pets/pet-idle-animation'
it('breathes over six seconds without selecting an action or blink pose', () => {
  const schedule = {starts:[0],period:100000}
  expect(Array.from({ length: 7 }, (_, i) => petIdleFrame(i * 1000, false, schedule))).toEqual([
    0, 1, 2, 3, 2, 1, 0,
  ])
})
it('spaces irregular blinks three to five seconds apart, including wraparound', () => {
  const s = createPetBlinkSchedule(42),
    starts = [...s.starts, s.period]
  for (let i = 1; i < starts.length; i++) {
    expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(3000)
    expect(starts[i] - starts[i - 1]).toBeLessThanOrEqual(5000)
  }
  expect(new Set(starts.slice(1).map((n, i) => n - starts[i])).size).toBeGreaterThan(1)
  const at = s.starts[1]
  expect(petIdleFrame(at, false, s)).toBe(5)
  expect(petIdleFrame(at + 100, false, s)).toBe(6)
  expect(petIdleFrame(at + 200, false, s)).toBe(7)
  expect(petIdleFrame(at + 300, false, s)).toBeLessThan(4)
  expect(petIdleFrame(s.period + 100, false, s)).toBe(6)
})
it('holds a sleepy gaze and keeps reduced motion at frame zero', () => {
  const s = createPetBlinkSchedule(10)
  expect(petIdleFrame(4500, true, s)).toBe(5)
  for (const at of [0, 3000, s.starts[1] + 100, s.period + 100])
    expect(petIdleFrame(at, true, s, true)).toBe(0)
})
it('shares a 300ms eyelid cycle across idle moods and disables it for reduced motion', () => {
  const s=createPetBlinkSchedule(42),at=s.starts[1]
  expect(petBlinkStep(at-1,s)).toBeNull()
  expect([0,100,200,300].map(t=>petBlinkStep(at+t,s))).toEqual([0,1,2,null])
  expect(petBlinkStep(at+100,s,true)).toBeNull()
})
