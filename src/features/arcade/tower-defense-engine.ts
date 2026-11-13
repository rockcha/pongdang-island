// Account-independent practice simulation. Fixed-step logic has no Phaser or DOM dependency.
import { MONSTERS, WAVES, healthScale, healthBoost, type EnemyKind } from './tower-defense-waves.ts'
export {
  MONSTERS,
  MONSTER_KINDS,
  WAVES,
  healthScale,
  type EnemyKind,
} from './tower-defense-waves.ts'
import { BUILDINGS, type BuildKind } from './tower-defense-towers.ts'
export { BUILDINGS, TOWER_KINDS, type BuildKind, type TowerKind } from './tower-defense-towers.ts'
export const GRID = { columns: 12, rows: 15, cell: 36, x: 18, y: 28 }
export const FIELD = {
  width: GRID.columns * GRID.cell + GRID.x * 2,
  height: GRID.rows * GRID.cell + GRID.y * 2,
}
export const CELL_COUNT = GRID.columns * GRID.rows
export const cellAt = (col: number, row: number) => row * GRID.columns + col
export const HOME = cellAt(6, GRID.rows - 1)
export const ENTRANCES = [cellAt(0, 0), cellAt(GRID.columns - 1, 0)]
export const SITES = Array.from({ length: CELL_COUNT }, (_, i) => ({
  x: GRID.x + ((i % GRID.columns) + 0.5) * GRID.cell,
  y: GRID.y + (Math.floor(i / GRID.columns) + 0.5) * GRID.cell,
}))
const NEIGHBORS = Array.from({ length: CELL_COUNT }, (_, c) => {
  const x = c % GRID.columns,
    y = Math.floor(c / GRID.columns),
    result: number[] = []
  for (const dy of [-1, 0, 1])
    for (const dx of [-1, 0, 1])
      if ((dx || dy) && x + dx >= 0 && x + dx < GRID.columns && y + dy >= 0 && y + dy < GRID.rows)
        result.push(cellAt(x + dx, y + dy))
  return result
})
const diagonal = (a: number, b: number) =>
  a % GRID.columns !== b % GRID.columns &&
  Math.floor(a / GRID.columns) !== Math.floor(b / GRID.columns)
function cornerCells(a: number, b: number) {
  return [
    cellAt(a % GRID.columns, Math.floor(b / GRID.columns)),
    cellAt(b % GRID.columns, Math.floor(a / GRID.columns)),
  ]
}
export const PREPARATION = 20,
  MAX_WAVES = 30,
  ENEMY_LIMIT = 256,
  PROJECTILE_LIMIT = 128,
  EFFECT_LIMIT = 96
export const waveSize = (wave: number) =>
  Object.values(WAVES[wave - 1]?.counts ?? {}).reduce<number>((a, b) => a + (b ?? 0), 0)
export const waveHint = (wave: number) => WAVES[Math.max(0, Math.min(MAX_WAVES - 1, wave - 1))].hint
export type Building = {
  cell: number
  kind: BuildKind
  level: number
  cooldown: number
  aim: number
  flash: number
  spent: number
  charge: number
  chargeTarget: number
}
export type Enemy = {
  slot: number
  id: number
  kind: EnemyKind
  x: number
  y: number
  px: number
  py: number
  cell: number
  nav: number
  hp: number
  incoming: number
  maxHp: number
  speed: number
  reward: number
  leak: number
  angle: number
  healTimer: number
  healedAt: number
  shield: number
  shieldMax: number
  phaseFlags: number
  rushing: boolean
  age: number
  slowFactor: number
  slowRemaining: number
}
export type Projectile = {
  source: BuildKind
  blast: boolean
  missile: boolean
  x: number
  y: number
  sx: number
  sy: number
  tx: number
  ty: number
  target: number
  life: number
  duration: number
  damage: number
  color: number
}
export type Effect = {
  source: BuildKind
  x: number
  y: number
  life: number
  duration: number
  id: number
  tx: number
  ty: number
  radius: number
  kind: 'pop' | 'impact' | 'heal' | 'breach' | 'build' | 'purchase' | 'blast' | 'beam' | 'pulse'
  color: number
}
export type Phase = 'ready' | 'build' | 'combat' | 'paused' | 'won' | 'lost'
type SpawnRequest = {
  kind: 'mini' | 'swarm' | 'rusher'
  x: number
  y: number
  cell: number
  nav: number
  reward: number
}
export type DefenseState = {
  startingWave: number
  playbackRate: 1 | 2
  phase: Phase
  resumePhase: 'build' | 'combat'
  wave: number
  gold: number
  lives: number
  maxLives: number
  castleLevel: number
  score: number
  kills: number
  prep: number
  elapsed: number
  tick: number
  buildings: Building[]
  enemies: Enemy[]
  targets: Enemy[]
  byId: Map<number, Enemy>
  projectiles: Projectile[]
  effects: Effect[]
  enemyPool: Enemy[]
  projectilePool: Projectile[]
  effectPool: Effect[]
  spawned: number
  spawnTimer: number
  serial: number
  version: number
  flowVersion: number
  flow: Float32Array
  next: Int16Array
  scratchFlow: Float32Array
  scratchNext: Int16Array
  blocked: Uint8Array
  queue: Int16Array
  buckets: Enemy[][]
  pending: SpawnRequest[]
  finalDefeated: boolean
  finalEscaped: boolean
  plan: EnemyKind[]
  rng: number
  stats: {
    flowBuilds: number
    candidateBuilds: number
    targetVisits: number
    shots: number
    peakEnemies: number
    peakProjectiles: number
    peakEffects: number
  }
}
export function createDefense(seed = 42): DefenseState {
  const enemies = Array.from({ length: ENEMY_LIMIT }, (_, slot) => ({
    slot,
    id: 0,
    kind: 'crab' as const,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    cell: 0,
    nav: 0,
    hp: 0,
    incoming: 0,
    maxHp: 0,
    speed: 0,
    reward: 0,
    leak: 0,
    angle: 0,
    healTimer: 0,
    healedAt: -1,
    shield: 0,
    shieldMax: 0,
    phaseFlags: 0,
    rushing: false,
    age: 0,
    slowFactor: 1,
    slowRemaining: 0,
  }))
  return {
    startingWave: 1,
    playbackRate: 1,
    phase: 'ready',
    resumePhase: 'build',
    wave: 0,
    gold: 180,
    lives: 15,
    maxLives: 15,
    castleLevel: 0,
    score: 0,
    kills: 0,
    prep: 20,
    elapsed: 0,
    tick: 0,
    buildings: [],
    enemies: [],
    targets: [],
    byId: new Map(),
    projectiles: [],
    effects: [],
    enemyPool: enemies,
    projectilePool: Array.from({ length: PROJECTILE_LIMIT }, () => ({
      source: 'octopus' as BuildKind,
      blast: false,
      missile: false,
      x: 0,
      y: 0,
      sx: 0,
      sy: 0,
      tx: 0,
      ty: 0,
      target: 0,
      life: 0,
      duration: 0,
      damage: 0,
      color: 0,
    })),
    effectPool: Array.from({ length: EFFECT_LIMIT }, () => ({
      source: 'wall' as BuildKind,
      x: 0,
      y: 0,
      life: 0,
      duration: 0,
      id: 0,
      tx: 0,
      ty: 0,
      radius: 0,
      kind: 'pop' as const,
      color: 0,
    })),
    spawned: 0,
    spawnTimer: 0,
    serial: 0,
    version: 0,
    flowVersion: -1,
    flow: new Float32Array(CELL_COUNT),
    next: new Int16Array(CELL_COUNT),
    scratchFlow: new Float32Array(CELL_COUNT),
    scratchNext: new Int16Array(CELL_COUNT),
    blocked: new Uint8Array(CELL_COUNT),
    queue: new Int16Array(CELL_COUNT),
    buckets: Array.from({ length: CELL_COUNT }, () => []),
    pending: [],
    finalDefeated: false,
    finalEscaped: false,
    plan: [],
    rng: seed >>> 0 || 42,
    stats: {
      flowBuilds: 0,
      candidateBuilds: 0,
      targetVisits: 0,
      shots: 0,
      peakEnemies: 0,
      peakProjectiles: 0,
      peakEffects: 0,
    },
  }
}
export function beginDefense(s: DefenseState) {
  if (s.phase === 'ready') s.phase = 'build'
}
export function configureStartingWave(s: DefenseState, wave: number) {
  if (
    s.phase !== 'build' ||
    s.wave !== 0 ||
    s.buildings.length ||
    !Number.isInteger(wave) ||
    wave < 1 ||
    wave > MAX_WAVES
  )
    return false
  s.startingWave = wave
  // Late-wave practice includes the earlier waves' potential income so players
  // can build an appropriate defense before sending the selected wave.
  s.gold =
    180 +
    WAVES.slice(0, wave - 1).reduce(
      (gold, w) =>
        gold +
        w.bonus +
        Object.entries(w.counts).reduce((sum, [kind, count]) => {
          const k = kind as EnemyKind
          return (
            sum +
            (count ?? 0) * (MONSTERS[k].reward + (k === 'splitter' ? 2 * MONSTERS.mini.reward : 0))
          )
        }, 0),
      0,
    )
  return true
}
export function pauseDefense(s: DefenseState, paused: boolean) {
  if (paused && (s.phase === 'combat' || s.phase === 'build')) {
    s.resumePhase = s.phase
    s.phase = 'paused'
  } else if (!paused && s.phase === 'paused') s.phase = s.resumePhase
}
export const pointCell = (x: number, y: number) =>
  cellAt(
    Math.max(0, Math.min(GRID.columns - 1, Math.floor((x - GRID.x) / GRID.cell))),
    Math.max(0, Math.min(GRID.rows - 1, Math.floor((y - GRID.y) / GRID.cell))),
  )
function fillFlow(s: DefenseState, flow: Float32Array, next: Int16Array, candidate = -1) {
  s.blocked.fill(0)
  for (const b of s.buildings) s.blocked[b.cell] = 1
  if (candidate >= 0) s.blocked[candidate] = 1
  flow.fill(Infinity)
  next.fill(-1)
  flow[HOME] = 0
  // One weighted flow field per topology, shared by every monster.
  // Diagonals cost sqrt(2), and both adjoining cells must remain open.
  s.queue.fill(0)
  for (let i = 0; i < CELL_COUNT; i++) {
    let current = -1,
      best = Infinity
    for (let c = 0; c < CELL_COUNT; c++)
      if (!s.queue[c] && flow[c] < best) {
        current = c
        best = flow[c]
      }
    if (current < 0) break
    s.queue[current] = 1
    for (const n of NEIGHBORS[current]) {
      if (s.blocked[n] || s.queue[n]) continue
      const diag = diagonal(current, n)
      if (diag && cornerCells(current, n).some((c) => s.blocked[c])) continue
      const cost = best + (diag ? Math.SQRT2 : 1)
      if (cost < flow[n] - 1e-5) {
        flow[n] = cost
        next[n] = current
      }
    }
  }
}
export function refreshFlow(s: DefenseState) {
  if (s.flowVersion === s.version) return
  fillFlow(s, s.flow, s.next)
  s.flowVersion = s.version
  s.stats.flowBuilds++
}
export function routeCells(s: DefenseState, entrance = ENTRANCES[0], candidate = -1) {
  if (candidate < 0) refreshFlow(s)
  else {
    fillFlow(s, s.scratchFlow, s.scratchNext, candidate)
    s.stats.candidateBuilds++
  }
  const next = candidate < 0 ? s.next : s.scratchNext,
    result = [entrance]
  for (let i = 0; i < CELL_COUNT && result.at(-1) !== HOME; i++) {
    const n = next[result.at(-1)!]
    if (n < 0) return []
    result.push(n)
  }
  return result
}
const editable = (s: DefenseState) => s.phase === 'build' || s.phase === 'combat'
export function canPlace(s: DefenseState, cell: number, kind: BuildKind) {
  if (!editable(s)) return '진행 중이거나 정비 시간에 설치할 수 있어요.'
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) return '전장 안에 놓아 주세요.'
  if (cell === HOME || ENTRANCES.includes(cell)) return '입구와 성은 비워 주세요.'
  if (s.buildings.some((b) => b.cell === cell)) return '이미 시설이 있는 칸이에요.'
  if (
    s.enemies.some(
      (e) =>
        e.hp > 0 &&
        MONSTERS[e.kind].layer === 'ground' &&
        (e.cell === cell ||
          e.nav === cell ||
          (diagonal(e.cell, e.nav) && cornerCells(e.cell, e.nav).includes(cell))),
    )
  )
    return '몬스터가 지나가는 칸이에요.'
  if (
    s.pending.some(
      (e) =>
        e.cell === cell ||
        e.nav === cell ||
        (diagonal(e.cell, e.nav) && cornerCells(e.cell, e.nav).includes(cell)),
    )
  )
    return '새 친구가 나오는 칸이에요.'
  if (s.gold < BUILDINGS[kind].cost) return '연습 코인이 부족해요.'
  fillFlow(s, s.scratchFlow, s.scratchNext, cell)
  s.stats.candidateBuilds++
  if (
    ENTRANCES.some((c) => !Number.isFinite(s.scratchFlow[c])) ||
    s.enemies.some(
      (e) =>
        e.hp > 0 && MONSTERS[e.kind].layer === 'ground' && !Number.isFinite(s.scratchFlow[e.nav]),
    ) ||
    s.pending.some((e) => !Number.isFinite(s.scratchFlow[e.nav]))
  )
    return '길을 완전히 막을 수 없어요. 한 칸은 열어 주세요.'
  return ''
}
export function build(s: DefenseState, cell: number, kind: BuildKind) {
  if (canPlace(s, cell, kind)) return false
  s.gold -= BUILDINGS[kind].cost
  s.buildings.push({
    cell,
    kind,
    level: 0,
    cooldown: 0,
    aim: 0,
    flash: 0,
    spent: BUILDINGS[kind].cost,
    charge: 0,
    chargeTarget: 0,
  })
  s.version++
  refreshFlow(s)
  const p = SITES[cell]
  emit(s, 'build', p.x, p.y, 0xd5bb97)
  emit(s, 'purchase', p.x, p.y, 0xe4bd65)
  return true
}
export const upgradeCost = (b: Building) => BUILDINGS[b.kind].upgrades[b.level] ?? Infinity
export const rangeOf = (b: Building) => BUILDINGS[b.kind].range[b.level] * GRID.cell
export function upgrade(s: DefenseState, cell: number) {
  const b = s.buildings.find((b) => b.cell === cell)
  if (!editable(s) || !b || b.level >= 3 || s.gold < upgradeCost(b)) return false
  const cost = upgradeCost(b)
  s.gold -= cost
  b.spent += cost
  b.level++
  emit(s, 'purchase', SITES[cell].x, SITES[cell].y, 0xe4bd65)
  return true
}
export const castleUpgradeCost = (s: DefenseState) => [60, 120, 220][s.castleLevel] ?? Infinity
export function upgradeCastle(s: DefenseState) {
  const cost = castleUpgradeCost(s)
  if (!editable(s) || s.gold < cost) return false
  s.gold -= cost
  s.castleLevel++
  s.maxLives += 5
  s.lives = Math.min(s.maxLives, s.lives + 5)
  emit(s, 'purchase', SITES[HOME].x, SITES[HOME].y, 0xe4bd65)
  return true
}
export const sellValue = (b: Building) => Math.floor(b.spent / 2)
export function sell(s: DefenseState, cell: number) {
  const i = s.buildings.findIndex((b) => b.cell === cell)
  if (!editable(s) || i < 0) return false
  s.gold += sellValue(s.buildings[i])
  s.buildings.splice(i, 1)
  s.version++
  refreshFlow(s)
  return true
}
function roll(s: DefenseState) {
  let n = s.rng
  n ^= n << 13
  n ^= n >>> 17
  n ^= n << 5
  s.rng = n >>> 0
  return s.rng / 4294967296
}
export function startWave(s: DefenseState) {
  if (s.phase !== 'build' || s.wave >= MAX_WAVES) return false
  s.wave = s.wave === 0 ? s.startingWave : s.wave + 1
  for (const b of s.buildings) {
    b.cooldown = 0
    b.charge = 0
    b.chargeTarget = 0
    b.flash = 0
  }
  s.plan = []
  const counts = WAVES[s.wave - 1].counts
  for (const kind of Object.keys(counts) as EnemyKind[])
    for (let i = 0; i < (counts[kind] ?? 0); i++)
      if (!MONSTERS[kind].boss && kind !== 'swarm' && kind !== 'airJelly') s.plan.push(kind)
  for (let i = s.plan.length - 1; i > 0; i--) {
    const j = Math.floor(roll(s) * (i + 1))
    ;[s.plan[i], s.plan[j]] = [s.plan[j], s.plan[i]]
  }
  for (let n = counts.swarm ?? 0; n > 0; n -= 3) {
    const index = Math.floor(roll(s) * (s.plan.length + 1))
    s.plan.splice(index, 0, ...Array<EnemyKind>(Math.min(3, n)).fill('swarm'))
  }
  for (let n = counts.airJelly ?? 0; n > 0; n -= 4) {
    const index = Math.floor(roll(s) * (s.plan.length + 1))
    s.plan.splice(index, 0, ...Array<EnemyKind>(Math.min(4, n)).fill('airJelly'))
  }
  for (const kind of Object.keys(counts) as EnemyKind[])
    if (MONSTERS[kind].boss && counts[kind]) s.plan.splice(Math.floor(s.plan.length / 2), 0, kind)
  s.spawned = 0
  s.spawnTimer = 0.6
  s.phase = 'combat'
  refreshFlow(s)
  return true
}
export function spawnEnemy(
  s: DefenseState,
  kind: EnemyKind,
  entrance = ENTRANCES[s.spawned % ENTRANCES.length],
) {
  refreshFlow(s)
  if (
    !Number.isInteger(entrance) ||
    entrance < 0 ||
    entrance >= CELL_COUNT ||
    (MONSTERS[kind].layer === 'ground' && !Number.isFinite(s.flow[entrance]))
  )
    return false
  const e = s.enemyPool.pop()
  if (!e) return false
  const c = MONSTERS[kind],
    p = SITES[entrance],
    hp = c.boss
      ? c.hp
      : Math.round(c.hp * healthScale(s.wave) * (c.applyHealthBoost ? healthBoost(s.wave) : 1))
  Object.assign(e, {
    id: ++s.serial,
    kind,
    x: p.x,
    y: p.y,
    px: p.x,
    py: p.y,
    cell: entrance,
    nav: c.layer === 'air' ? HOME : entrance,
    hp,
    incoming: 0,
    maxHp: hp,
    speed: c.speed * GRID.cell,
    reward: c.reward,
    leak: c.leak,
    angle: Math.PI,
    healTimer: 3,
    healedAt: -1,
    shield: kind === 'shield' ? Math.round(20 * healthScale(s.wave)) : 0,
    shieldMax: kind === 'shield' ? Math.round(20 * healthScale(s.wave)) : 0,
    phaseFlags: 0,
    rushing: false,
    age: 0,
    slowFactor: 1,
    slowRemaining: 0,
  })
  s.enemies.push(e)
  s.byId.set(e.id, e)
  s.stats.peakEnemies = Math.max(s.stats.peakEnemies, s.enemies.length)
  return true
}
function emit(
  s: DefenseState,
  kind: Effect['kind'],
  x: number,
  y: number,
  color: number,
  extra: { tx?: number; ty?: number; radius?: number; source?: BuildKind } = {},
) {
  if ((kind === 'pop' || kind === 'impact') && s.effectPool.length <= 16) return
  const e = s.effectPool.pop()
  if (!e) return
  const duration =
    kind === 'beam'
      ? 0.18
      : kind === 'pulse'
        ? 0.45
        : kind === 'build'
          ? 0.65
          : kind === 'purchase'
            ? 0.65
            : kind === 'breach'
              ? 0.55
              : 0.35
  Object.assign(e, {
    id: ++s.serial,
    kind,
    source: extra.source ?? 'wall',
    x,
    y,
    color,
    life: duration,
    duration,
    tx: extra.tx ?? x,
    ty: extra.ty ?? y,
    radius: extra.radius ?? 0,
  })
  s.effects.push(e)
  s.stats.peakEffects = Math.max(s.stats.peakEffects, s.effects.length)
}
function queueChildren(
  s: DefenseState,
  e: Enemy,
  kind: 'mini' | 'swarm',
  count: number,
  reward: number,
) {
  for (let i = 0; i < count; i++)
    s.pending.push({ kind, x: e.x, y: e.y, cell: e.cell, nav: e.nav, reward })
}
function hit(s: DefenseState, e: Enemy, damage: number) {
  if (e.hp <= 0) return
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, damage)
    e.shield -= absorbed
    damage -= absorbed
  }
  e.hp -= damage
  if (e.hp <= 0) {
    s.gold += e.reward
    s.score += MONSTERS[e.kind].boss ? 1000 : e.reward * 10
    s.kills++
    emit(s, 'pop', e.x, e.y, MONSTERS[e.kind].color)
    if (e.kind === 'splitter') queueChildren(s, e, 'mini', 2, 1)
    if (e.kind === 'boss' && s.lives > 0) {
      s.lives = Math.min(s.maxLives, s.lives + 5)
      emit(s, 'heal', SITES[HOME].x, SITES[HOME].y, 0x95ceae)
    }
    if (e.kind === 'abyss') s.finalDefeated = true
    return
  }
  if (e.kind === 'boss' && e.hp <= e.maxHp * 0.5 && !(e.phaseFlags & 1)) {
    e.phaseFlags |= 1
    e.shield = 250
    e.shieldMax = 250
    emit(s, 'pulse', e.x, e.y, 0xa1c9de, { radius: 32 })
  }
  if (e.kind === 'overlord')
    for (const [flag, threshold] of [
      [1, 0.7],
      [2, 0.35],
    ] as const)
      if (e.hp <= e.maxHp * threshold && !(e.phaseFlags & flag)) {
        e.phaseFlags |= flag
        queueChildren(s, e, 'swarm', 4, 0)
        emit(s, 'pulse', e.x, e.y, 0xb4a3d8, { radius: 40 })
      }
  if (e.kind === 'abyss') {
    if (e.hp <= e.maxHp * 0.7 && !(e.phaseFlags & 1)) {
      e.phaseFlags |= 1
      e.shield = e.shieldMax = 1000
      emit(s, 'pulse', e.x, e.y, 0x8fc8cb, { radius: 45 })
    }
    if (e.hp <= e.maxHp * 0.4 && !(e.phaseFlags & 2)) {
      e.phaseFlags |= 2
      const cell = ENTRANCES[1],
        p = SITES[cell]
      for (let i = 0; i < 6; i++)
        s.pending.push({ kind: 'rusher', ...p, cell, nav: cell, reward: 0 })
      emit(s, 'pulse', p.x, p.y, 0xe1c38d, { radius: 32 })
    }
    if (e.hp <= e.maxHp * 0.2) e.phaseFlags |= 4
  }
}
function nearby(s: DefenseState, x: number, y: number, r: number, visit: (e: Enemy) => void) {
  const x0 = Math.max(0, Math.floor((x - r - GRID.x) / GRID.cell)),
    x1 = Math.min(GRID.columns - 1, Math.floor((x + r - GRID.x) / GRID.cell)),
    y0 = Math.max(0, Math.floor((y - r - GRID.y) / GRID.cell)),
    y1 = Math.min(GRID.rows - 1, Math.floor((y + r - GRID.y) / GRID.cell)),
    r2 = r * r
  for (let yb = y0; yb <= y1; yb++)
    for (let xb = x0; xb <= x1; xb++)
      for (const e of s.buckets[cellAt(xb, yb)]) {
        s.stats.targetVisits++
        if (e.hp > 0 && (e.x - x) ** 2 + (e.y - y) ** 2 <= r2) visit(e)
      }
}
// Reuse a bounded target buffer. No per-hit arrays or per-monster path searches.
function collect(
  s: DefenseState,
  x: number,
  y: number,
  r: number,
  cap: number,
  score: (e: Enemy) => number,
) {
  const result = s.targets
  result.length = 0
  nearby(s, x, y, r, (e) => {
    const value = score(e)
    if (!Number.isFinite(value)) return
    let index = 0
    while (
      index < result.length &&
      (score(result[index]) < value || (score(result[index]) === value && result[index].id < e.id))
    )
      index++
    if (index < cap) {
      result.splice(index, 0, e)
      if (result.length > cap) result.pop()
    }
  })
  return result
}
function canTarget(kind: BuildKind, enemy: Enemy) {
  const layer = BUILDINGS[kind].targetLayer
  return layer === 'both' || layer === MONSTERS[enemy.kind].layer
}
function distanceToCastle(s: DefenseState, enemy: Enemy) {
  return MONSTERS[enemy.kind].layer === 'air'
    ? Math.hypot(enemy.x - SITES[HOME].x, enemy.y - SITES[HOME].y)
    : s.flow[enemy.nav] * GRID.cell +
        Math.hypot(enemy.x - SITES[enemy.nav].x, enemy.y - SITES[enemy.nav].y)
}
function fireBeam(s: DefenseState, b: Building) {
  const c = BUILDINGS[b.kind],
    origin = SITES[b.cell],
    r = rangeOf(b),
    dx = Math.cos(b.aim),
    dy = Math.sin(b.aim),
    width = (c.area * GRID.cell) / 2
  const targets = collect(s, origin.x, origin.y, r, c.cap, (e) => {
    if (!canTarget(b.kind, e)) return Infinity
    const x = e.x - origin.x,
      y = e.y - origin.y,
      along = x * dx + y * dy
    return along >= 0 && along <= r && Math.abs(x * dy - y * dx) <= width ? along : Infinity
  })
  for (let i = 0; i < targets.length; i++)
    hit(s, targets[i], c.damage[b.level] * (i === 0 ? 1 : 0.75))
  emit(s, 'beam', origin.x, origin.y, c.color, {
    tx: origin.x + dx * r,
    ty: origin.y + dy * r,
    radius: width * 2,
    source: b.kind,
  })
  b.flash = 0.4
  s.stats.shots++
}
function beamAim(s: DefenseState, b: Building) {
  const c = BUILDINGS[b.kind],
    p = SITES[b.cell],
    r = rangeOf(b),
    width = (c.area * GRID.cell) / 2
  // Consider at most eight forward targets; avoid an all-pairs enemy scan.
  const candidates = collect(s, p.x, p.y, r, 8, (e) =>
    canTarget(b.kind, e) ? s.flow[e.nav] : Infinity,
  )
  let aim = b.aim,
    best = 0,
    progress = Infinity
  for (const candidate of candidates) {
    const angle = Math.atan2(candidate.y - p.y, candidate.x - p.x),
      dx = Math.cos(angle),
      dy = Math.sin(angle)
    let count = 0
    nearby(s, p.x, p.y, r, (e) => {
      if (!canTarget(b.kind, e)) return
      const x = e.x - p.x,
        y = e.y - p.y,
        along = x * dx + y * dy
      if (along >= 0 && along <= r && Math.abs(x * dy - y * dx) <= width)
        count = Math.min(c.cap, count + 1)
    })
    if (count > best || (count === best && s.flow[candidate.nav] < progress)) {
      aim = angle
      best = count
      progress = s.flow[candidate.nav]
    }
  }
  return aim
}
function nextGroundCell(s: DefenseState, cell: number) {
  const shortest = s.next[cell]
  // Try a local alternative on 25% of steps, allowing at most 0.65 extra tiles.
  if (roll(s) >= 0.25) return shortest
  let chosen = shortest,
    candidates = 0
  for (const neighbor of NEIGHBORS[cell]) {
    // Strictly descending potential prevents loops, including in player-built mazes.
    if (s.blocked[neighbor] || s.flow[neighbor] >= s.flow[cell] - 1e-5) continue
    const diag = diagonal(cell, neighbor)
    if (diag && cornerCells(cell, neighbor).some((c) => s.blocked[c])) continue
    const cost = (diag ? Math.SQRT2 : 1) + s.flow[neighbor]
    if (cost > s.flow[cell] + 0.65) continue
    if (roll(s) < 1 / ++candidates) chosen = neighbor
  }
  return chosen
}
function launchProjectile(s: DefenseState, b: Building, target: Enemy) {
  const p = s.projectilePool.pop()
  if (!p) return
  const c = BUILDINGS[b.kind],
    origin = SITES[b.cell]
  const missile = c.targetLayer === 'air'
  const duration =
    b.kind === 'sniper'
      ? 0.12
      : b.kind === 'harpoon'
        ? 0.35
        : missile || c.attack === 'blast'
          ? 0.45
          : 0.24
  Object.assign(p, {
    source: b.kind,
    x: origin.x,
    y: origin.y,
    sx: origin.x,
    sy: origin.y,
    tx: target.x,
    ty: target.y,
    target: target.id,
    life: duration,
    duration,
    damage: c.damage[b.level],
    color: c.color,
    blast: c.attack === 'blast',
    missile,
  })
  s.projectiles.push(p)
  if (!p.blast) target.incoming += p.damage
  s.stats.shots++
  s.stats.peakProjectiles = Math.max(s.stats.peakProjectiles, s.projectiles.length)
}
export function stepDefense(s: DefenseState, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0 || !editable(s)) return
  dt = Math.min(0.05, dt)
  s.elapsed += dt
  s.tick++
  for (const b of s.buildings) b.flash = Math.max(0, b.flash - dt)
  for (let i = s.effects.length - 1; i >= 0; i--) {
    const e = s.effects[i]
    e.life -= dt
    if (e.life <= 0) {
      s.effects[i] = s.effects.at(-1)!
      s.effects.pop()
      s.effectPool.push(e)
    }
  }
  if (s.phase === 'build') {
    if (s.wave > 0) {
      s.prep = Math.max(0, s.prep - dt)
      if (s.prep === 0) startWave(s)
    }
    return
  }
  refreshFlow(s)
  s.spawnTimer -= dt
  if (s.spawned < s.plan.length && s.spawnTimer <= 0 && s.enemyPool.length) {
    const kind = s.plan[s.spawned]
    const gate = WAVES[s.wave - 1].gate
    const side =
      kind === 'boss'
        ? 0
        : kind === 'overlord'
          ? 1
          : kind === 'abyss'
            ? 0
            : gate === 2
              ? ['armored', 'shield', 'healer'].includes(kind)
                ? 0
                : ['swift', 'rusher', 'swarm'].includes(kind)
                  ? 1
                  : s.spawned % 2
              : gate < 0
                ? s.spawned % ENTRANCES.length
                : s.spawned % 10 < 7
                  ? gate
                  : 1 - gate
    spawnEnemy(s, kind, ENTRANCES[side])
    s.spawned++
    s.spawnTimer =
      (kind === 'swarm' || kind === 'airJelly') && s.plan[s.spawned] === kind
        ? 0.12
        : WAVES[s.wave - 1].interval
  }
  for (const bucket of s.buckets) bucket.length = 0
  for (const e of s.enemies) {
    if (e.hp <= 0) continue
    e.incoming = 0
    e.age += dt
    e.slowRemaining = Math.max(0, e.slowRemaining - dt)
    if (e.slowRemaining === 0) e.slowFactor = 1
    if (e.nav < 0 || e.nav >= CELL_COUNT) continue
    e.px = e.x
    e.py = e.y
    if (Math.abs(e.x - SITES[e.nav].x) + Math.abs(e.y - SITES[e.nav].y) < 0.001) {
      e.cell = e.nav
      if (e.cell === HOME) {
        e.hp = 0
        if (e.kind === 'abyss') s.finalEscaped = true
        s.lives = Math.max(0, s.lives - e.leak)
        emit(s, 'breach', e.x, e.y, 0xe6a48c)
        continue
      }
      e.nav = MONSTERS[e.kind].layer === 'air' ? HOME : nextGroundCell(s, e.cell)
    }
    if (e.nav < 0) continue
    const p = SITES[e.nav],
      dx = p.x - e.x,
      dy = p.y - e.y,
      d = Math.hypot(dx, dy)
    if (d > 0) {
      // Mako repeats a one-second windup, three-second rush, two-second recovery.
      const rushCycle = e.age % 6
      e.rushing =
        (e.kind === 'rusher' && s.flow[e.nav] <= 3) ||
        (e.kind === 'mako' && rushCycle >= 1 && rushCycle < 4)
      const boost = e.rushing
        ? e.kind === 'mako'
          ? 1.4 / 0.85
          : 1.8
        : e.kind === 'mako' && rushCycle < 1
          ? 0.25
          : e.kind === 'abyss' && e.phaseFlags & 4
            ? 1.4
            : e.kind === 'overlord' && e.hp <= e.maxHp * 0.35
              ? 1.15
              : 1
      const move = Math.min(d, e.speed * dt * boost * e.slowFactor)
      e.x += (dx / d) * move
      e.y += (dy / d) * move
      e.angle = Math.atan2(dy, dx)
    }
    if (MONSTERS[e.kind].layer === 'air') e.cell = pointCell(e.x, e.y)
    s.buckets[pointCell(e.x, e.y)].push(e)
  }
  for (const e of s.enemies)
    if (e.hp > 0 && e.kind === 'healer') {
      e.healTimer -= dt
      if (e.healTimer <= 0) {
        e.healTimer = 3
        const healing = collect(s, e.x, e.y, GRID.cell * 1.8, 3, (t) =>
          t !== e &&
          MONSTERS[t.kind].layer === 'ground' &&
          !MONSTERS[t.kind].boss &&
          t.healedAt !== s.tick &&
          t.hp < t.maxHp
            ? t.hp / t.maxHp
            : Infinity,
        )
        for (const t of healing) {
          t.hp = Math.min(t.maxHp, t.hp + Math.max(1, Math.round(t.maxHp * 0.04)))
          t.healedAt = s.tick
        }
        emit(s, 'heal', e.x, e.y, 0x95ceae)
      }
    }
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const p = s.projectiles[i]
    p.life -= dt
    // IDs survive object recycling; a pooled replacement must never receive an old shot.
    const found = s.byId.get(p.target),
      target = found && found.hp > 0 ? found : undefined
    if (target && !p.blast) {
      p.tx = target.x
      p.ty = target.y
    }
    const a = 1 - Math.max(0, p.life) / p.duration
    p.x = p.sx + (p.tx - p.sx) * a
    p.y = p.sy + (p.ty - p.sy) * a
    if (p.blast) p.y -= Math.sin(a * Math.PI) * 28
    if (p.missile) {
      const length = Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1
      const arc = Math.sin(a * Math.PI) * 18
      p.x -= ((p.ty - p.sy) / length) * arc
      p.y += ((p.tx - p.sx) / length) * arc
    }
    if (p.life <= 0) {
      if (p.blast) {
        const targets = collect(
          s,
          p.tx,
          p.ty,
          BUILDINGS.mortar.area * GRID.cell,
          BUILDINGS.mortar.cap,
          (e) =>
            MONSTERS[e.kind].layer === 'ground' ? (e.x - p.tx) ** 2 + (e.y - p.ty) ** 2 : Infinity,
        )
        for (let j = 0; j < targets.length; j++) hit(s, targets[j], p.damage * (j === 0 ? 1 : 0.5))
        emit(s, 'blast', p.tx, p.ty, p.color, {
          radius: BUILDINGS.mortar.area * GRID.cell,
          source: p.source,
        })
      } else if (target) {
        hit(s, target, p.damage)
        emit(s, 'impact', target.x, target.y, p.color, { source: p.source })
      }
      s.projectiles[i] = s.projectiles.at(-1)!
      s.projectiles.pop()
      s.projectilePool.push(p)
    }
  }
  // Single-target turrets avoid spending a second lethal shot on an enemy
  // already covered by a homing projectile. Blast/beam attacks remain spatial.
  for (const p of s.projectiles)
    if (!p.blast) {
      const e = s.byId.get(p.target)
      if (e && e.hp > 0) e.incoming += p.damage
    }
  for (const b of s.buildings) {
    if (b.kind === 'wall') continue
    const c = BUILDINGS[b.kind],
      origin = SITES[b.cell],
      r = rangeOf(b)
    b.cooldown -= dt
    if (b.charge > 0) {
      if (c.attack === 'snipe') {
        const target = s.byId.get(b.chargeTarget)
        if (
          !target ||
          target.hp <= 0 ||
          !canTarget(b.kind, target) ||
          Math.hypot(target.x - origin.x, target.y - origin.y) > r
        ) {
          b.charge = 0
          b.chargeTarget = 0
          b.cooldown = 0.15
          continue
        }
        b.aim = Math.atan2(target.y - origin.y, target.x - origin.x)
      }
      b.charge = Math.max(0, b.charge - dt)
      if (b.charge < 1e-6) {
        b.charge = 0
        if (c.attack === 'snipe') {
          const target = s.byId.get(b.chargeTarget)!
          launchProjectile(s, b, target)
          emit(s, 'beam', origin.x, origin.y, c.color, {
            tx: target.x,
            ty: target.y,
            radius: 1.5,
            source: b.kind,
          })
          b.flash = 0.4
          b.chargeTarget = 0
        } else fireBeam(s, b)
      }
      continue
    }
    if (b.cooldown > 1e-6) continue
    if (c.attack === 'aura' || c.attack === 'frost') {
      const targets = collect(s, origin.x, origin.y, r, c.cap, (e) =>
        canTarget(b.kind, e) ? s.flow[e.nav] : Infinity,
      )
      if (!targets.length) continue
      for (const e of targets) {
        if (c.attack === 'frost') {
          const factor = 1 - (1 - c.slow[b.level]) * (MONSTERS[e.kind].boss ? 0.5 : 1)
          if (factor <= e.slowFactor) {
            e.slowFactor = factor
            e.slowRemaining = 1.2
          }
        }
        hit(s, e, c.damage[b.level])
        if (c.attack === 'aura')
          emit(s, 'impact', e.x, e.y, c.color, { tx: origin.x, ty: origin.y, source: b.kind })
      }
      b.cooldown = c.interval[b.level]
      b.flash = 0.4
      s.stats.shots++
      emit(s, 'pulse', origin.x, origin.y, c.color, { radius: r, source: b.kind })
      continue
    }
    if (c.attack === 'salvo') {
      const targets = collect(
        s,
        origin.x,
        origin.y,
        r,
        Math.min(c.cap, s.projectilePool.length),
        (e) =>
          MONSTERS[e.kind].layer === 'air' && e.incoming < e.hp + e.shield
            ? Math.hypot(e.x - SITES[HOME].x, e.y - SITES[HOME].y)
            : Infinity,
      )
      if (!targets.length) continue
      for (const e of targets) launchProjectile(s, b, e)
      b.aim = Math.atan2(targets[0].y - origin.y, targets[0].x - origin.x)
      b.cooldown = c.interval[b.level]
      b.flash = 0.4
      continue
    }
    let target: Enemy | undefined,
      best = Infinity
    nearby(s, origin.x, origin.y, r, (e) => {
      if (!canTarget(b.kind, e)) return
      if ((c.attack === 'single' || c.attack === 'snipe') && e.incoming >= e.hp + e.shield) return
      const distance = c.attack === 'snipe' ? -e.maxHp : distanceToCastle(s, e)
      if (distance < best || (distance === best && target && e.id < target.id)) {
        best = distance
        target = e
      }
    })
    if (!target) continue
    const t = target as Enemy
    b.aim = Math.atan2(t.y - origin.y, t.x - origin.x)
    if (c.attack === 'beam' || c.attack === 'snipe') {
      if (c.attack === 'beam') b.aim = beamAim(s, b)
      b.chargeTarget = t.id
      b.charge = c.chargeTime
      b.cooldown = c.interval[b.level]
      continue
    }
    if (c.attack === 'flame') {
      const dx = Math.cos(b.aim),
        dy = Math.sin(b.aim),
        cos = Math.cos(c.area)
      const targets = collect(s, origin.x, origin.y, r, c.cap, (e) => {
        if (!canTarget(b.kind, e)) return Infinity
        const x = e.x - origin.x,
          y = e.y - origin.y,
          d = Math.hypot(x, y)
        return d < 0.001 || (x * dx + y * dy) / d >= cos ? s.flow[e.nav] : Infinity
      })
      for (const e of targets) hit(s, e, c.damage[b.level] * c.interval[b.level])
      b.cooldown = c.interval[b.level]
      b.flash = 0.4
      s.stats.shots++
      continue
    }
    if (!s.projectilePool.length) continue
    launchProjectile(s, b, t)
    b.cooldown = c.interval[b.level]
    b.flash = 0.4
  }
  for (let i = s.enemies.length - 1; i >= 0; i--)
    if (s.enemies[i].hp <= 0) {
      const e = s.enemies[i]
      s.byId.delete(e.id)
      s.enemies[i] = s.enemies.at(-1)!
      s.enemies.pop()
      s.enemyPool.push(e)
    }
  while (s.pending.length && s.enemyPool.length) {
    const child = s.pending.pop()!
    if (!spawnEnemy(s, child.kind, child.nav)) throw Error('A queued child lost its path')
    const e = s.enemies[s.enemies.length - 1]
    Object.assign(e, {
      x: child.x,
      y: child.y,
      px: child.x,
      py: child.y,
      cell: child.cell,
      nav: child.nav,
      reward: child.reward,
    })
  }
  if (s.lives <= 0 || s.finalEscaped) s.phase = 'lost'
  else if (
    s.spawned === s.plan.length &&
    !s.enemies.length &&
    !s.projectiles.length &&
    !s.pending.length
  ) {
    for (const b of s.buildings) b.charge = 0
    s.gold += WAVES[s.wave - 1].bonus
    s.score += s.lives * 20 + s.wave * 100
    if (s.wave === MAX_WAVES) s.phase = s.finalDefeated ? 'won' : 'lost'
    else {
      s.phase = 'build'
      s.prep = 20
    }
  }
}
