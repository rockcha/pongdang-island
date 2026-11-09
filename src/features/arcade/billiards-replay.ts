import {
  BILLIARDS_STEP,
  createBilliards,
  shoot,
  stepBilliards,
  type BilliardsShot,
} from './billiards-model'
export const BILLIARDS_ENGINE_VERSION = 1
export const MAX_BILLIARDS_REPLAY_BYTES = 160_000
export type BilliardsReplay = { version: number; shots: BilliardsShot[] }

/** Scores and remaining lives are derived entirely from the shared physics. */
export function verifyBilliardsReplay(replay: BilliardsReplay, elapsedSeconds: number) {
  if (
    !replay ||
    replay.version !== BILLIARDS_ENGINE_VERSION ||
    !Array.isArray(replay.shots) ||
    replay.shots.length > 2000
  )
    throw new Error('INVALID_REPLAY')
  const state = createBilliards()
  let ticks = 0
  for (const shot of replay.shots) {
    if (
      !shot ||
      !Number.isFinite(shot.dx) ||
      !Number.isFinite(shot.dy) ||
      Math.abs(shot.dx) > 10000 ||
      Math.abs(shot.dy) > 10000 ||
      !shoot(state, shot.dx, shot.dy)
    )
      throw new Error('INVALID_REPLAY')
    while (state.phase === 'striking' || state.phase === 'moving') {
      if (++ticks > 1_000_000 || ticks * BILLIARDS_STEP > elapsedSeconds + 2)
        throw new Error('REPLAY_TOO_FAST')
      stepBilliards(state, BILLIARDS_STEP)
    }
  }
  return {
    score: state.score,
    reward: Math.max(0, state.score),
    abandoned: state.phase !== 'lost',
    state,
  }
}
