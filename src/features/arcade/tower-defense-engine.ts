export const FIELD = { width: 792, height: 464 }
export const GRID = { columns: 18, rows: 10, cell: 40, x: 36, y: 32 }
export const CELL_COUNT = GRID.columns * GRID.rows
export const cellAt = (col: number, row: number) => row * GRID.columns + col
export const ENTRANCES = [cellAt(GRID.columns - 1, 1), cellAt(GRID.columns - 1, 5)] as const
export const HOME = cellAt(2, GRID.rows - 1),
  PREPARATION = 30,
  MAX_WAVES = 5,
  ENEMY_LIMIT = 150
export const ROCKS = new Set([
  cellAt(4, 2),
  cellAt(5, 2),
  cellAt(4, 3),
  cellAt(12, 4),
  cellAt(13, 4),
  cellAt(13, 5),
  cellAt(8, 7),
  cellAt(9, 7),
])
export const SITES = Array.from({ length: CELL_COUNT }, (_, i) => ({
  x: GRID.x + ((i % GRID.columns) + 0.5) * GRID.cell,
  y: GRID.y + (Math.floor(i / GRID.columns) + 0.5) * GRID.cell,
}))
export type BuildKind = 'shell' | 'jelly' | 'puffer' | 'wall'
export const BUILDINGS = {
  shell: {
    name: '물총 조개',
    cost: 40,
    damage: 12,
    interval: 0.6,
    range: 120,
    color: 0xe5b880,
    role: '빠른 단일 공격',
  },
  jelly: {
    name: '방울 해파리',
    cost: 50,
    damage: 4,
    interval: 1,
    range: 112,
    color: 0xb9a0dd,
    role: '방울로 감속',
  },
  puffer: {
    name: '복어 대포',
    cost: 70,
    damage: 25,
    interval: 1.8,
    range: 136,
    color: 0xe9be6f,
    role: '모인 적 범위 공격',
  },
  wall: {
    name: '산호 벽',
    cost: 10,
    damage: 0,
    interval: 0,
    range: 0,
    color: 0xd79a81,
    role: '이동 경로 유도',
  },
} as const
export type Building = {
  cell: number
  kind: BuildKind
  level: number
  cooldown: number
  aim: number
  flash: number
  spent: number
}
export type EnemyKind = 'crab' | 'swift' | 'armored' | 'boss'
export const ENEMY_COLORS = { crab: 0xedb49e, swift: 0xaad3bf, armored: 0xbdb5d8, boss: 0xe99d98 }
export type Enemy = {
  id: number
  kind: EnemyKind
  x: number
  y: number
  nav: number
  hp: number
  maxHp: number
  speed: number
  reward: number
  leak: number
  slowedUntil: number
}
export type Effect = {
  x: number
  y: number
  tx: number
  ty: number
  life: number
  duration: number
  kind: 'shot' | 'splash' | 'pop'
  color: number
  size: number
}
export type Phase = 'ready' | 'build' | 'combat' | 'paused' | 'won' | 'lost'
export type DefenseState = {
  phase: Phase
  resumePhase: 'build' | 'combat'
  wave: number
  gold: number
  lives: number
  score: number
  kills: number
  prep: number
  elapsed: number
  buildings: Building[]
  enemies: Enemy[]
  effects: Effect[]
  enemyPool: Enemy[]
  effectPool: Effect[]
  spawned: number
  spawnTimer: number
  serial: number
  version: number
  flowVersion: number
  flow: Float32Array
  next: Int16Array
  buckets: Enemy[][]
  rng: number
}
export function createDefense(seed = Math.floor(Math.random() * 0x100000000)): DefenseState {
  return {
    phase: 'ready',
    resumePhase: 'build',
    wave: 0,
    gold: 120,
    lives: 10,
    score: 0,
    kills: 0,
    prep: PREPARATION,
    elapsed: 0,
    buildings: [],
    enemies: [],
    effects: [],
    enemyPool: [],
    effectPool: [],
    spawned: 0,
    spawnTimer: 0,
    serial: 0,
    version: 0,
    flowVersion: -1,
    flow: new Float32Array(CELL_COUNT),
    next: new Int16Array(CELL_COUNT),
    buckets: Array.from({ length: CELL_COUNT }, () => []),
    rng: seed >>> 0 || 0x9e3779b9,
  }
}
export function beginDefense(s: DefenseState) {
  if (s.phase === 'ready') s.phase = 'build'
}
export function pauseDefense(s: DefenseState, paused: boolean) {
  if (paused && (s.phase === 'build' || s.phase === 'combat')) {
    s.resumePhase = s.phase
    s.phase = 'paused'
  } else if (!paused && s.phase === 'paused') s.phase = s.resumePhase
}
export function pointCell(x: number, y: number) {
  const col = Math.max(0, Math.min(GRID.columns - 1, Math.floor((x - GRID.x) / 40))),
    row = Math.max(0, Math.min(GRID.rows - 1, Math.floor((y - GRID.y) / 40)))
  return cellAt(col, row)
}
function neighbors(i: number) {
  const x = i % GRID.columns,
    y = Math.floor(i / GRID.columns)
  return [
    y > 0 ? i - GRID.columns : -1,
    x > 0 ? i - 1 : -1,
    x < GRID.columns - 1 ? i + 1 : -1,
    y < GRID.rows - 1 ? i + GRID.columns : -1,
  ]
}
// All enemies share a reverse breadth-first field. Buildings are impassable.
// A prospective build uses scratch arrays, so rejection never alters the live path.
function fillFlow(s: DefenseState, flow: Float32Array, next?: Int16Array, candidate = -1) {
  const blocked = new Uint8Array(CELL_COUNT),
    queue = new Int16Array(CELL_COUNT)
  for (const cell of ROCKS) blocked[cell] = 1
  for (const b of s.buildings) blocked[b.cell] = 1
  if (candidate >= 0) blocked[candidate] = 1
  flow.fill(Infinity)
  next?.fill(-1)
  flow[HOME] = 0
  queue[0] = HOME
  let head = 0,
    tail = 1
  while (head < tail) {
    const current = queue[head++]
    for (const n of neighbors(current))
      if (n >= 0 && !blocked[n] && !Number.isFinite(flow[n])) {
        flow[n] = flow[current] + 1
        if (next) next[n] = current
        queue[tail++] = n
      }
  }
  // Among equally short routes, favour the entrance-to-vault line rather than the map edge.
  if (next) {
    const ex = ENTRANCES.reduce((sum, cell) => sum + (cell % GRID.columns), 0) / ENTRANCES.length,
      ey =
        ENTRANCES.reduce((sum, cell) => sum + Math.floor(cell / GRID.columns), 0) /
        ENTRANCES.length,
      dx = (HOME % GRID.columns) - ex,
      dy = Math.floor(HOME / GRID.columns) - ey
    for (let cell = 0; cell < CELL_COUNT; cell++)
      if (Number.isFinite(flow[cell]) && cell !== HOME) {
        let closest = Infinity
        for (const n of neighbors(cell))
          if (n >= 0 && flow[n] === flow[cell] - 1) {
            const deviation = Math.abs(
              ((n % GRID.columns) - ex) * dy - (Math.floor(n / GRID.columns) - ey) * dx,
            )
            if (deviation < closest) {
              closest = deviation
              next[cell] = n
            }
          }
      }
  }
}
export function refreshFlow(s: DefenseState) {
  if (s.flowVersion === s.version) return
  fillFlow(s, s.flow, s.next)
  s.flowVersion = s.version
}
export function routeCells(s: DefenseState, entrance: number = ENTRANCES[0]) {
  refreshFlow(s)
  const route = [entrance]
  for (let i = 0; i < CELL_COUNT && route.at(-1) !== HOME; i++) {
    const n = s.next[route.at(-1)!]
    if (n < 0) break
    route.push(n)
  }
  return route
}
export function canPlace(s: DefenseState, cell: number, kind: BuildKind) {
  if (s.phase !== 'build') return '준비 시간에만 건설할 수 있어요.'
  if (
    !Number.isInteger(cell) ||
    cell < 0 ||
    cell >= CELL_COUNT ||
    Math.floor(cell / GRID.columns) === 0 ||
    Math.floor(cell / GRID.columns) === GRID.rows - 1 ||
    ENTRANCES.includes(cell) ||
    ROCKS.has(cell)
  )
    return '입구·금고·바위에는 지을 수 없어요.'
  if (s.buildings.some((b) => b.cell === cell)) return '이미 시설이 있는 칸이에요.'
  if (
    s.buildings.filter((b) => (b.kind === 'wall') === (kind === 'wall')).length >=
    (kind === 'wall' ? 20 : 12)
  )
    return kind === 'wall' ? '벽은 최대 20개까지 설치해요.' : '포탑은 최대 12개까지 설치해요.'
  if (s.gold < BUILDINGS[kind].cost) return '건설 골드가 부족해요.'
  const prospective = new Float32Array(CELL_COUNT)
  fillFlow(s, prospective, undefined, cell)
  if (ENTRANCES.some((entrance) => !Number.isFinite(prospective[entrance])))
    return '길을 완전히 막을 수 없어요. 한 칸은 열어 주세요.'
  return ''
}
export function build(s: DefenseState, cell: number, kind: BuildKind) {
  if (canPlace(s, cell, kind)) return false
  const c = BUILDINGS[kind]
  s.gold -= c.cost
  s.buildings.push({
    cell,
    kind,
    level: 1,
    cooldown: 0,
    aim: -Math.PI / 2,
    flash: 0,
    spent: c.cost,
  })
  s.version++
  return true
}
export const upgradeCost = (b: Building) =>
  Math.ceil(BUILDINGS[b.kind].cost * (b.level === 1 ? 1 : 1.5))
export const rangeOf = (b: Building) => BUILDINGS[b.kind].range + (b.level - 1) * 12
export function upgrade(s: DefenseState, cell: number) {
  const b = s.buildings.find((b) => b.cell === cell)
  if (s.phase !== 'build' || !b || b.kind === 'wall' || b.level >= 3 || s.gold < upgradeCost(b))
    return false
  const cost = upgradeCost(b)
  s.gold -= cost
  b.spent += cost
  b.level++
  s.version++
  return true
}
export function sell(s: DefenseState, cell: number) {
  const b = s.buildings.find((b) => b.cell === cell)
  if (s.phase !== 'build' || !b) return false
  s.gold += Math.floor(b.spent * 0.7)
  s.buildings.splice(s.buildings.indexOf(b), 1)
  s.version++
  return true
}
export function waveSize(wave: number) {
  return [0, 10, 14, 18, 22, 28][wave] ?? 0
}
export const waveHint = (wave: number) =>
  [
    '',
    '꼬마 도둑게',
    '빠른 새우 등장',
    '단단한 소라게 등장',
    '두 입구에서 찾아와요',
    '왕도둑게 등장',
  ][Math.min(5, wave)]
export function startWave(s: DefenseState) {
  if (s.phase !== 'build' || s.wave >= MAX_WAVES) return false
  s.wave++
  s.spawned = 0
  s.spawnTimer = 0.6
  s.phase = 'combat'
  refreshFlow(s)
  return true
}
function spawn(s: DefenseState) {
  const i = s.spawned,
    kind: EnemyKind =
      s.wave === 5 && i === waveSize(5) - 1
        ? 'boss'
        : s.wave >= 3 && i % 5 === 0
          ? 'armored'
          : s.wave >= 2 && i % 3 === 0
            ? 'swift'
            : 'crab'
  const hp =
    (kind === 'boss' ? 650 : kind === 'armored' ? 85 : kind === 'swift' ? 25 : 34) *
    (1 + (s.wave - 1) * 0.15)
  // Seeded per run: each enemy independently chooses one of the two gates.
  let roll = s.rng
  roll ^= roll << 13
  roll ^= roll >>> 17
  roll ^= roll << 5
  s.rng = roll >>> 0
  const entrance = ENTRANCES[Math.floor((s.rng / 0x100000000) * ENTRANCES.length)]
  const e = s.enemyPool.pop() ?? ({} as Enemy),
    p = SITES[entrance]
  Object.assign(e, {
    id: ++s.serial,
    kind,
    x: p.x + 12,
    y: p.y,
    nav: entrance,
    hp,
    maxHp: hp,
    speed: kind === 'swift' ? 65 : kind === 'boss' ? 22 : kind === 'armored' ? 29 : 38,
    reward: kind === 'boss' ? 20 : kind === 'armored' ? 3 : 1,
    leak: kind === 'boss' ? 3 : 1,
    slowedUntil: 0,
  })
  s.enemies.push(e)
  s.spawned++
}
function emit(
  s: DefenseState,
  kind: Effect['kind'],
  x: number,
  y: number,
  tx: number,
  ty: number,
  color: number,
  size = 16,
) {
  if (s.effects.length >= 100) return
  const e = s.effectPool.pop() ?? ({} as Effect),
    duration = kind === 'pop' ? 0.38 : 0.22
  Object.assign(e, { kind, x, y, tx, ty, color, size, life: duration, duration })
  s.effects.push(e)
}
function hit(s: DefenseState, e: Enemy, damage: number) {
  if (e.hp <= 0) return
  e.hp -= damage
  if (e.hp <= 0) {
    s.gold += e.reward
    s.score += e.kind === 'boss' ? 1000 : e.kind === 'armored' ? 90 : e.kind === 'swift' ? 45 : 30
    s.kills++
    emit(s, 'pop', e.x, e.y, e.x, e.y, ENEMY_COLORS[e.kind], e.kind === 'boss' ? 24 : 15)
  }
}
function nearby(s: DefenseState, x: number, y: number, radius: number, visit: (e: Enemy) => void) {
  const minX = Math.max(0, Math.floor((x - radius - GRID.x) / 40)),
    maxX = Math.min(GRID.columns - 1, Math.floor((x + radius - GRID.x) / 40)),
    minY = Math.max(0, Math.floor((y - radius - GRID.y) / 40)),
    maxY = Math.min(GRID.rows - 1, Math.floor((y + radius - GRID.y) / 40)),
    r2 = radius * radius
  for (let row = minY; row <= maxY; row++)
    for (let col = minX; col <= maxX; col++)
      for (const e of s.buckets[cellAt(col, row)])
        if (e.hp > 0 && (e.x - x) ** 2 + (e.y - y) ** 2 <= r2) visit(e)
}
// Fixed 50 ms steps in the scene; no React updates, physics bodies, or per-unit paths.
export function stepDefense(s: DefenseState, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return
  dt = Math.min(0.1, dt)
  if (s.phase === 'paused' || s.phase === 'ready') return
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
    s.prep = Math.max(0, s.prep - dt)
    if (s.prep === 0) startWave(s)
    return
  }
  if (s.phase !== 'combat') return
  s.elapsed += dt
  refreshFlow(s)
  s.spawnTimer -= dt
  if (s.spawned < waveSize(s.wave) && s.spawnTimer <= 0 && s.enemies.length < ENEMY_LIMIT) {
    spawn(s)
    s.spawnTimer = Math.max(0.65, 1.25 - s.wave * 0.1)
  }
  for (const bucket of s.buckets) bucket.length = 0
  for (const e of s.enemies) {
    if (e.hp <= 0) continue
    if (Math.hypot(e.x - SITES[e.nav].x, e.y - SITES[e.nav].y) < 0.001) {
      if (e.nav === HOME) {
        e.hp = 0
        s.lives = Math.max(0, s.lives - e.leak)
        continue
      }
      const target = s.next[e.nav]
      if (target >= 0) e.nav = target
    }
    const next = e.nav
    if (next < 0) continue
    const p = SITES[next],
      distance = Math.hypot(p.x - e.x, p.y - e.y)
    if (distance > 0) {
      const speed = e.speed * (e.slowedUntil > s.elapsed ? 0.55 : 1),
        move = Math.min(distance, speed * dt)
      e.x += ((p.x - e.x) / distance) * move
      e.y += ((p.y - e.y) / distance) * move
    }
    s.buckets[pointCell(e.x, e.y)].push(e)
  }
  for (const b of s.buildings) {
    if (b.kind === 'wall') continue
    b.cooldown -= dt
    if (b.cooldown > 0) continue
    const p = SITES[b.cell],
      c = BUILDINGS[b.kind]
    let target: Enemy | undefined
    nearby(s, p.x, p.y, rangeOf(b), (e) => {
      if (
        !target ||
        s.flow[pointCell(e.x, e.y)] < s.flow[pointCell(target.x, target.y)] ||
        (s.flow[pointCell(e.x, e.y)] === s.flow[pointCell(target.x, target.y)] && e.id < target.id)
      )
        target = e
    })
    if (!target) continue
    const t = target as Enemy
    b.aim = Math.atan2(t.y - p.y, t.x - p.x)
    b.flash = 0.15
    b.cooldown = c.interval / (1 + (b.level - 1) * 0.15)
    emit(s, b.kind === 'puffer' ? 'splash' : 'shot', p.x, p.y, t.x, t.y, c.color)
    const damage = c.damage * (1 + (b.level - 1) * 0.75)
    if (b.kind === 'puffer') nearby(s, t.x, t.y, 48, (e) => hit(s, e, damage))
    else {
      if (b.kind === 'jelly') t.slowedUntil = s.elapsed + 1.5
      hit(s, t, damage * (t.kind === 'armored' && b.kind === 'shell' ? 0.75 : 1))
    }
  }
  for (let i = s.enemies.length - 1; i >= 0; i--)
    if (s.enemies[i].hp <= 0) {
      const e = s.enemies[i]
      s.enemies[i] = s.enemies.at(-1)!
      s.enemies.pop()
      s.enemyPool.push(e)
    }
  if (s.lives === 0) {
    s.phase = 'lost'
  } else if (s.spawned === waveSize(s.wave) && s.enemies.length === 0) {
    s.score += s.lives * 20 + s.wave * 100
    if (s.wave === MAX_WAVES) s.phase = 'won'
    else {
      s.gold += 30
      s.prep = PREPARATION
      s.phase = 'build'
    }
  }
}
