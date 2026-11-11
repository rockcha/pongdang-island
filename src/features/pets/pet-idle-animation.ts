// Six seconds per breath. Art changes only the lower chest, never the canvas
// scale or the head/feet position. Blinks interrupt this quiet base briefly.
const breath = [0, 1, 2, 3, 2, 1] as const
export function createPetBlinkSchedule(seed: number) {
  let random = seed >>> 0
  const intervals = Array.from({ length: 16 }, () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0
    return 7000 + (random % 5001)
  })
  const starts = [0]
  for (let i = 0; i < intervals.length - 1; i++) starts.push(starts[i] + intervals[i])
  return { starts, period: intervals.reduce((a, b) => a + b, 0) }
}
export function petIdleFrame(
  elapsed: number,
  sleepy: boolean,
  schedule: ReturnType<typeof createPetBlinkSchedule>,
  reduced = false,
) {
  if (reduced) return 0
  const at = Math.max(0, elapsed)
  const step = petBlinkStep(at, schedule)
  if (step !== null) {
    return step === 0 ? 5 : step === 1 ? 6 : 7
  }
  return sleepy ? 5 : breath[Math.floor(at / 1000) % breath.length]
}

export function petBlinkStep(elapsed: number, schedule: ReturnType<typeof createPetBlinkSchedule>, reduced = false) {
  if (reduced) return null
  const at = Math.max(0, elapsed), phase = at % schedule.period
  const blink = schedule.starts.find((start,i) => (i !== 0 || at >= schedule.period) && phase >= start && phase < start + 300)
  return blink === undefined ? null : Math.floor((phase - blink) / 100)
}
