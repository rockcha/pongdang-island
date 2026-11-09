import { expect, it } from 'vitest'
import {
  createBilliards,
  shoot,
  stepBilliards,
  BILLIARDS_STEP,
} from '@/features/arcade/billiards-model'
import { verifyBilliardsReplay, type BilliardsReplay } from '@/features/arcade/billiards-replay'
const replay: BilliardsReplay = { version: 1, shots: [{ dx: 0, dy: -60 }] }
it('derives the score from physics and restores exactly the confirmed shot positions', () => {
  const state = createBilliards()
  shoot(state, 0, -60)
  while (state.phase === 'striking' || state.phase === 'moving')
    stepBilliards(state, BILLIARDS_STEP)
  const result = verifyBilliardsReplay(replay, 100)
  expect(result.score).toBe(10)
  expect(result.reward).toBe(10)
  expect(result.abandoned).toBe(true)
  expect(result.state.balls).toEqual(state.balls)
  expect(result.state.lives).toBe(state.lives)
})
it('rejects impossible inputs, shots after game over and a replay faster than server elapsed time', () => {
  expect(() => verifyBilliardsReplay(replay, 0)).toThrow('REPLAY_TOO_FAST')
  for (const value of [
    { version: 2, shots: [] },
    { version: 1, shots: [{ dx: NaN, dy: 0 }] },
    { version: 1, shots: [{ dx: 0, dy: 0 }] },
  ])
    expect(() => verifyBilliardsReplay(value, 100)).toThrow('INVALID_REPLAY')
  const shots = Array.from({ length: 6 }, () => ({ dx: 11, dy: 0 }))
  expect(() => verifyBilliardsReplay({ version: 1, shots }, 1000)).toThrow('INVALID_REPLAY')
})
it('never turns a negative score into a negative payment', () => {
  expect(verifyBilliardsReplay({ version: 1, shots: [{ dx: 20, dy: -45 }] }, 100).reward).toBe(0)
})
