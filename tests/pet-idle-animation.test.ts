import { expect, it } from 'vitest'
import { createPetBlinkSchedule, petIdleFrame } from '@/features/pets/pet-idle-animation'
it('breathes over six seconds without selecting an action or blink pose', () => {
  const schedule = createPetBlinkSchedule(42)
  expect(Array.from({ length: 7 }, (_, i) => petIdleFrame(i * 1000, false, schedule))).toEqual([
    0, 1, 2, 3, 2, 1, 0,
  ])
})
it('spaces irregular blinks seven to twelve seconds apart, including wraparound', () => {
  const s = createPetBlinkSchedule(42),
    starts = [...s.starts, s.period]
  for (let i = 1; i < starts.length; i++) {
    expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(7000)
    expect(starts[i] - starts[i - 1]).toBeLessThanOrEqual(12000)
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
