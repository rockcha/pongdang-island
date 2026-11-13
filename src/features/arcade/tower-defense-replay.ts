import {
  BUILDINGS,
  CELL_COUNT,
  ENEMY_LIMIT,
  PROJECTILE_LIMIT,
  EFFECT_LIMIT,
  MAX_WAVES,
  beginDefense,
  build,
  createDefense,
  moveTower,
  refreshFlow,
  sell,
  specialize,
  startWave,
  stepDefense,
  upgrade,
  upgradeCastle,
  type BuildKind,
  type DefenseState,
} from './tower-defense-engine'
import { type TowerSpecialization } from './tower-defense-towers'
import { DEFENSE_BASE_RATE } from './tower-defense-clock'
export const TOWER_ENGINE_VERSION = 1,
  TOWER_ENTRY_FEE = 30,
  TOWER_STAGE_REWARD = 10
export const MAX_TOWER_REPLAY_BYTES = 600_000,
  MAX_TOWER_ACTIONS = 5000,
  MAX_TOWER_TICKS = 432000,
  MAX_TOWER_CHECKPOINT_TICKS = 12000
export type TowerAction =
  | { type: 'build'; cell: number; kind: BuildKind }
  | { type: 'upgrade' | 'sell'; cell: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'specialize'; cell: number; kind: TowerSpecialization }
  | { type: 'castle' | 'wave' }
export type TowerCommand = TowerAction & { tick: number }
export type TowerReplay = { version: 1; ticks: number; commands: TowerCommand[] }
type Derived =
  | 'flow'
  | 'next'
  | 'scratchFlow'
  | 'scratchNext'
  | 'blocked'
  | 'scratchBlocked'
  | 'queue'
  | 'buckets'
  | 'targets'
  | 'byId'
export type TowerCheckpoint = { version: 1; seed: number; state: Omit<DefenseState, Derived> }
export const emptyTowerReplay = (): TowerReplay => ({
  version: TOWER_ENGINE_VERSION,
  ticks: 0,
  commands: [],
})
export function clearedTowerStages(s: DefenseState) {
  const phase = s.phase === 'paused' ? s.resumePhase : s.phase
  return phase === 'won' ? MAX_WAVES : phase === 'build' ? s.wave : Math.max(0, s.wave - 1)
}
export function applyTowerAction(s: DefenseState, action: TowerAction): boolean {
  switch (action.type) {
    case 'build':
      return build(s, action.cell, action.kind)
    case 'upgrade':
      return upgrade(s, action.cell)
    case 'sell':
      return sell(s, action.cell)
    case 'move':
      return moveTower(s, action.from, action.to)
    case 'specialize':
      return specialize(s, action.cell, action.kind)
    case 'castle':
      return upgradeCastle(s)
    case 'wave':
      return startWave(s)
  }
}
function validReplay(value: unknown): asserts value is TowerReplay {
  if (!value || typeof value !== 'object' || JSON.stringify(value).length > MAX_TOWER_REPLAY_BYTES)
    throw Error('INVALID_REPLAY')
  const r = value as TowerReplay
  if (
    r.version !== TOWER_ENGINE_VERSION ||
    !Number.isInteger(r.ticks) ||
    r.ticks < 0 ||
    r.ticks > MAX_TOWER_TICKS ||
    !Array.isArray(r.commands) ||
    r.commands.length > MAX_TOWER_ACTIONS
  )
    throw Error('INVALID_REPLAY')
  let previous = 0
  const cell = (n: unknown) =>
    typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < CELL_COUNT
  for (const c of r.commands) {
    if (
      !c ||
      typeof c !== 'object' ||
      !Number.isInteger(c.tick) ||
      c.tick < previous ||
      c.tick > r.ticks
    )
      throw Error('INVALID_COMMAND')
    previous = c.tick
    const keys = ['tick', 'type']
    switch (c.type) {
      case 'build':
        keys.push('cell', 'kind')
        if (!cell(c.cell) || !Object.hasOwn(BUILDINGS, c.kind)) throw Error('INVALID_COMMAND')
        break
      case 'upgrade':
      case 'sell':
        keys.push('cell')
        if (!cell(c.cell)) throw Error('INVALID_COMMAND')
        break
      case 'move':
        keys.push('from', 'to')
        if (!cell(c.from) || !cell(c.to)) throw Error('INVALID_COMMAND')
        break
      case 'specialize':
        keys.push('cell', 'kind')
        if (!cell(c.cell) || !['power', 'rapid', 'hybrid', 'tracking', 'bombard'].includes(c.kind))
          throw Error('INVALID_COMMAND')
        break
      case 'castle':
      case 'wave':
        break
      default:
        throw Error('INVALID_COMMAND')
    }
    if (Object.keys(c).some((key) => !keys.includes(key))) throw Error('INVALID_COMMAND')
  }
}
export function towerCheckpoint(s: DefenseState, seed: number): TowerCheckpoint {
  const {
    flow: _flow,
    next: _next,
    scratchFlow: _sf,
    scratchNext: _sn,
    blocked: _b,
    scratchBlocked: _sb,
    queue: _q,
    buckets: _buckets,
    targets: _targets,
    byId: _ids,
    ...stored
  } = s
  return { version: 1, seed, state: JSON.parse(JSON.stringify(stored)) }
}
export function restoreTowerCheckpoint(checkpoint: TowerCheckpoint, seed: number, ticks: number) {
  if (
    !checkpoint ||
    checkpoint.version !== 1 ||
    checkpoint.seed !== seed ||
    checkpoint.state?.tick !== ticks
  )
    throw Error('INVALID_CHECKPOINT')
  const s = createDefense(seed)
  Object.assign(s, JSON.parse(JSON.stringify(checkpoint.state)))
  if (
    s.enemies.length + s.enemyPool.length !== ENEMY_LIMIT ||
    s.projectiles.length + s.projectilePool.length !== PROJECTILE_LIMIT ||
    s.effects.length + s.effectPool.length !== EFFECT_LIMIT ||
    new Set([...s.enemies, ...s.enemyPool].map((e) => e.slot)).size !== ENEMY_LIMIT
  )
    throw Error('INVALID_CHECKPOINT')
  s.byId = new Map(s.enemies.map((e) => [e.id, e]))
  s.flowVersion = -1
  const builds = s.stats.flowBuilds
  refreshFlow(s)
  s.stats.flowBuilds = builds
  return s
}
/** Only server-produced checkpoints are accepted by the Edge handler. Clients never submit one. */
export function verifyTowerReplay(
  value: unknown,
  seed: number,
  options: {
    previous?: { replay: TowerReplay; checkpoint: TowerCheckpoint | null }
    availableSeconds?: number
    maxDeltaTicks?: number
  } = {},
) {
  validReplay(value)
  const replay = value,
    previous = options.previous?.replay ?? emptyTowerReplay()
  validReplay(previous)
  if (
    !Number.isInteger(seed) ||
    seed <= 0 ||
    seed > 2147483647 ||
    replay.ticks < previous.ticks ||
    replay.commands.length < previous.commands.length
  )
    throw Error('CHECKPOINT_MISMATCH')
  // jsonb reorders object keys. Compare validated primitive fields, never serialized key order.
  if (
    previous.commands.some((command, index) => {
      const incoming = replay.commands[index] as unknown as Record<string, unknown>
      return (
        Object.keys(command).length !== Object.keys(incoming).length ||
        Object.entries(command).some(([key, value]) => incoming[key] !== value)
      )
    })
  )
    throw Error('CHECKPOINT_MISMATCH')
  if (replay.commands.slice(previous.commands.length).some((c) => c.tick < previous.ticks))
    throw Error('CHECKPOINT_MISMATCH')
  if (replay.ticks - previous.ticks > (options.maxDeltaTicks ?? MAX_TOWER_TICKS))
    throw Error('CHECKPOINT_TOO_LARGE')
  if (
    options.availableSeconds !== undefined &&
    replay.ticks * 0.05 > Math.max(0, options.availableSeconds) * DEFENSE_BASE_RATE * 2 + 2
  )
    throw Error('REPLAY_TOO_FAST')
  const saved = options.previous?.checkpoint
  if ((previous.ticks > 0 || previous.commands.length > 0) && !saved)
    throw Error('INVALID_CHECKPOINT')
  const s = saved ? restoreTowerCheckpoint(saved, seed, previous.ticks) : createDefense(seed)
  if (!saved) beginDefense(s)
  let index = previous.commands.length
  while (true) {
    while (index < replay.commands.length && replay.commands[index].tick === s.tick) {
      if (!applyTowerAction(s, replay.commands[index++])) throw Error('ILLEGAL_ACTION')
    }
    if (s.tick === replay.ticks) break
    if (s.phase !== 'build' && s.phase !== 'combat') throw Error('REPLAY_AFTER_END')
    stepDefense(s, 0.05)
  }
  if (index !== replay.commands.length) throw Error('INVALID_COMMAND')
  const terminal = s.phase === 'won' || s.phase === 'lost',
    cleared = clearedTowerStages(s)
  return {
    state: s,
    replay,
    cleared,
    terminal,
    abandoned: !terminal,
    reward: cleared * TOWER_STAGE_REWARD,
    checkpoint: towerCheckpoint(s, seed),
  }
}
