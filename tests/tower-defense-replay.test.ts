// @vitest-environment node
import { expect, it } from 'vitest'
import {
  beginDefense,
  cellAt,
  createDefense,
  stepDefense,
  type DefenseState,
} from '@/features/arcade/tower-defense-engine'
import {
  applyTowerAction,
  clearedTowerStages,
  emptyTowerReplay,
  towerCheckpoint,
  restoreTowerCheckpoint,
  verifyTowerReplay,
  type TowerAction,
} from '@/features/arcade/tower-defense-replay'
import { verifyTowerReplay as serverVerify } from '../supabase/functions/_shared/tower-defense-replay.js'
function recorder(seed = 42) {
  const state = createDefense(seed)
  beginDefense(state)
  const replay = emptyTowerReplay()
  return {
    state,
    replay,
    action(action: TowerAction) {
      expect(applyTowerAction(state, action)).toBe(true)
      replay.commands.push({ ...action, tick: state.tick })
    },
    steps(n: number) {
      for (let i = 0; i < n; i++) stepDefense(state, 0.05)
      replay.ticks = state.tick
    },
  }
}
const comparable = (s: DefenseState) => towerCheckpoint(s, 42).state
it('replays legal placement, upgrade, movement and sale at the original fixed ticks', () => {
  const a = recorder()
  a.action({ type: 'build', kind: 'octopus', cell: cellAt(4, 6) })
  a.steps(20)
  a.action({ type: 'move', from: cellAt(4, 6), to: cellAt(5, 6) })
  a.action({ type: 'sell', cell: cellAt(5, 6) })
  a.action({ type: 'build', kind: 'octopus', cell: cellAt(4, 8) })
  a.action({ type: 'wave' })
  a.steps(600)
  expect(comparable(verifyTowerReplay(a.replay, 42).state)).toEqual(comparable(a.state))
  expect(comparable(serverVerify(a.replay, 42).state)).toEqual(comparable(a.state))
})
it('restores live target references and pools and produces identical incremental and full outcomes', () => {
  const a = recorder()
  a.action({ type: 'build', kind: 'octopus', cell: cellAt(4, 6) })
  a.action({ type: 'wave' })
  let checkpoint
  for (let i = 0; i < 1800; i++) {
    a.steps(1)
    if (a.state.projectiles.length && a.state.enemies.length) {
      checkpoint = verifyTowerReplay(structuredClone(a.replay), 42)
      break
    }
  }
  expect(checkpoint).toBeTruthy()
  const stored = JSON.parse(JSON.stringify(checkpoint!.checkpoint))
  const restored = restoreTowerCheckpoint(stored, 42, checkpoint!.replay.ticks)
  expect(restored.byId.get(restored.enemies[0].id)).toBe(restored.enemies[0])
  a.steps(800)
  const incremental = verifyTowerReplay(a.replay, 42, {
    previous: { replay: checkpoint!.replay, checkpoint: stored },
  })
  const full = verifyTowerReplay(a.replay, 42)
  expect(comparable(incremental.state)).toEqual(comparable(full.state))
  expect(incremental.cleared).toBe(full.cleared)
})
it('accepts additional commands at the saved tick, but rejects rewriting or inserting commands in accepted history', () => {
  const a = recorder(),
    first = verifyTowerReplay(structuredClone(a.replay), 42)
  a.action({ type: 'build', kind: 'wall', cell: cellAt(3, 3) })
  const next = verifyTowerReplay(a.replay, 42, {
    previous: { replay: first.replay, checkpoint: first.checkpoint },
  })
  expect(next.state.gold).toBe(172)
  const accepted = structuredClone(a.replay),
    checkpoint = next.checkpoint
  a.steps(10)
  const updated = structuredClone(a.replay)
  updated.commands[0] = { type: 'castle', tick: 0 }
  expect(() =>
    verifyTowerReplay(updated, 42, { previous: { replay: accepted, checkpoint } }),
  ).toThrow('CHECKPOINT_MISMATCH')
  expect(() =>
    verifyTowerReplay({ version: 1, ticks: 100, commands: [] }, 42, {
      previous: {
        replay: { version: 1, ticks: 0, commands: [{ type: 'wave', tick: 0 }] },
        checkpoint: null,
      },
    }),
  ).toThrow()
})
it('accepts the same commands after jsonb changes property order, but still rejects changed values', () => {
  const a = recorder()
  a.action({ type: 'build', kind: 'wall', cell: cellAt(3, 3) })
  a.action({ type: 'wave' })
  a.steps(200)
  const accepted = verifyTowerReplay(structuredClone(a.replay), 42)
  const fromDatabase = {
    ...accepted.replay,
    commands: accepted.replay.commands.map((command) =>
      Object.fromEntries(Object.entries(command).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    ),
  }
  const options = {
    previous: { replay: fromDatabase as typeof a.replay, checkpoint: accepted.checkpoint },
  }
  expect(verifyTowerReplay(a.replay, 42, options).state.tick).toBe(a.state.tick)
  expect(serverVerify(a.replay, 42, options).state.tick).toBe(a.state.tick)
  const changed = structuredClone(a.replay)
  changed.commands[0] = { type: 'build', kind: 'wall', cell: cellAt(4, 3), tick: 0 }
  expect(() => verifyTowerReplay(changed, 42, options)).toThrow('CHECKPOINT_MISMATCH')
})
it('derives rewards from cleared stages, excluding the failed wave and honoring pause display', () => {
  const a = recorder()
  a.action({ type: 'wave' })
  for (let i = 0; i < 10000 && a.state.phase !== 'lost'; i++) a.steps(1)
  expect(a.state.phase).toBe('lost')
  const verified = verifyTowerReplay(a.replay, 42)
  expect(verified.terminal).toBe(true)
  expect(verified.abandoned).toBe(false)
  expect(verified.cleared).toBe(a.state.wave - 1)
  expect(verified.reward).toBe(verified.cleared * 10)
  expect(() => verifyTowerReplay({ ...a.replay, ticks: a.replay.ticks + 1 }, 42)).toThrow(
    'REPLAY_AFTER_END',
  )
  a.state.phase = 'paused'
  a.state.resumePhase = 'build'
  a.state.wave = 7
  expect(clearedTowerStages(a.state)).toBe(7)
})
it('rejects illegal actions, malformed values, excessive catch-up and faster than the actual 2x display clock', () => {
  for (const replay of [
    { version: 2, ticks: 0, commands: [] },
    { version: 1, ticks: NaN, commands: [] },
    { version: 1, ticks: 0, commands: [{ type: 'build', kind: 'cruise', cell: 10, tick: 0 }] },
    { version: 1, ticks: 0, commands: [{ type: 'castle', tick: 0, gold: 999 }] },
    { version: 1, ticks: 0, commands: [{ type: 'build', kind: '__proto__', cell: 10, tick: 0 }] },
  ])
    expect(() => verifyTowerReplay(replay, 42)).toThrow()
  expect(() =>
    verifyTowerReplay({ version: 1, ticks: 1000, commands: [] }, 42, { maxDeltaTicks: 100 }),
  ).toThrow('CHECKPOINT_TOO_LARGE')
  expect(() =>
    verifyTowerReplay({ version: 1, ticks: 1000, commands: [] }, 42, { availableSeconds: 1 }),
  ).toThrow('REPLAY_TOO_FAST')
  expect(
    verifyTowerReplay({ version: 1, ticks: 800, commands: [] }, 42, { availableSeconds: 10 }).state
      .tick,
  ).toBe(800)
})
