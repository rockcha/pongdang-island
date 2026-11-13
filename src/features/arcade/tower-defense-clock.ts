import { stepDefense, type DefenseState } from './tower-defense-engine'

// Speed changes the number of fixed simulation steps, never combat stat values.
// Bound catch-up after a stalled frame so speed mode cannot monopolize rendering.
// The original 2x pace is now the baseline displayed as 1x.
const BASE_RATE = 2
export function advanceDefenseClock(s: DefenseState, remainder: number, wallSeconds: number) {
  if (s.phase !== 'combat' && s.phase !== 'build') return 0
  let elapsed = remainder + Math.min(0.2, Math.max(0, wallSeconds)) * BASE_RATE * s.playbackRate
  for (let steps = 0; elapsed >= 0.05 && steps < 16; steps++) {
    stepDefense(s, 0.05)
    elapsed -= 0.05
  }
  return elapsed
}
