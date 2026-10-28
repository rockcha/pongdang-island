export const FIELD = { width: 420, height: 520 }
export const GRID = { columns: 9, rows: 11, cell: 40, x: 30, y: 40 }
export const WALL_LIMIT = 10
export const gridCell = (column: number, row: number) => row * GRID.columns + column
export const ENTRANCE = gridCell(0, 5)
export const ISLAND = gridCell(8, 5)
export const SITES = Array.from({ length: GRID.columns * GRID.rows }, (_, cell) => ({
  x: GRID.x + ((cell % GRID.columns) + 0.5) * GRID.cell,
  y: GRID.y + (Math.floor(cell / GRID.columns) + 0.5) * GRID.cell,
}))
export type RoutePoint = { x: number; y: number }
export type RoutePlan = { cells: number[]; points: RoutePoint[]; length: number }
const validCell = (cell: number) => Number.isInteger(cell) && cell >= 0 && cell < SITES.length
const isEndpoint = (cell: number) => cell === ENTRANCE || cell === ISLAND

// Four-neighbour BFS makes walls solid, including their corners. A stable neighbour
// order keeps the preview and the actual shortest route identical for equal paths.
export function findRoute(walls: readonly number[]): RoutePlan | null {
  const blocked = new Set(walls)
  if (blocked.has(ENTRANCE) || blocked.has(ISLAND)) return null
  const previous = new Int16Array(SITES.length).fill(-1)
  const queue = [ENTRANCE]
  previous[ENTRANCE] = ENTRANCE
  for (let head = 0; head < queue.length && previous[ISLAND] === -1; head++) {
    const current = queue[head],
      column = current % GRID.columns,
      row = Math.floor(current / GRID.columns)
    const neighbours = [
      column < GRID.columns - 1 ? current + 1 : -1,
      row > 0 ? current - GRID.columns : -1,
      row < GRID.rows - 1 ? current + GRID.columns : -1,
      column > 0 ? current - 1 : -1,
    ]
    for (const next of neighbours)
      if (next !== -1 && previous[next] === -1 && !blocked.has(next)) {
        previous[next] = current
        queue.push(next)
      }
  }
  if (previous[ISLAND] === -1) return null
  const cells = [ISLAND]
  while (cells.at(-1) !== ENTRANCE) cells.push(previous[cells.at(-1)!])
  cells.reverse()
  const points = [
    { x: -20, y: SITES[ENTRANCE].y },
    ...cells.map((cell) => SITES[cell]),
    { x: 440, y: SITES[ISLAND].y },
  ]
  return { cells, points, length: (cells.length - 1) * GRID.cell + 140 }
}

const initialRoute = findRoute([])!
export const ROUTE = initialRoute.points
export const ROUTE_LENGTH = initialRoute.length
const routeSegments = new WeakMap<readonly RoutePoint[], number[]>()
export function routePoint(distance: number, route: readonly RoutePoint[] = ROUTE) {
  let lengths = routeSegments.get(route)
  if (!lengths) {
    lengths = route.slice(1).map((p, i) => Math.hypot(p.x - route[i].x, p.y - route[i].y))
    routeSegments.set(route, lengths)
  }
  let remaining = Math.max(0, distance)
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const a = route[i],
        b = route[i + 1],
        ratio = Math.min(1, remaining / lengths[i])
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      }
    }
    remaining -= lengths[i]
  }
  return { ...route[0], angle: 0 }
}
export type TowerKind = 'puffer' | 'net' | 'jelly'
export const TOWERS: Record<
  TowerKind,
  {
    name: string
    cost: number
    range: number
    damage: number
    interval: number
    description: string
    color: number
  }
> = {
  puffer: {
    name: '복어 포탑',
    cost: 55,
    range: 112,
    damage: 12,
    interval: 0.65,
    description: '빠른 가시탄 · 선두 집중 공격',
    color: 0xf6cd79,
  },
  net: {
    name: '감속 통발',
    cost: 45,
    range: 95,
    damage: 2,
    interval: 1.1,
    description: '범위 안의 적을 함께 느리게',
    color: 0x9ed4ad,
  },
  jelly: {
    name: '번개 해파리',
    cost: 80,
    range: 108,
    damage: 10,
    interval: 1.35,
    description: '주변 적 3마리에게 연쇄 번개',
    color: 0xc2adeb,
  },
}
export type Tower = {
  site: number
  kind: TowerKind
  level: number
  cooldown: number
  spent: number
  kills: number
}
export type Enemy = {
  id: number
  kind: 'fish' | 'swift' | 'armored' | 'boss'
  distance: number
  hp: number
  maxHp: number
  speed: number
  reward: number
  leak: number
  slow: number
  slowTime: number
}
export type Effect = {
  kind: 'shot' | 'net' | 'lightning' | 'pop'
  from: { x: number; y: number }
  to: { x: number; y: number }
  life: number
  duration: number
  color: number
}
export type DefenseState = {
  phase: 'ready' | 'build' | 'playing' | 'paused' | 'won' | 'lost'
  wave: number
  shells: number
  lives: number
  score: number
  kills: number
  towers: Tower[]
  enemies: Enemy[]
  effects: Effect[]
  spawned: number
  spawnTimer: number
  serial: number
  elapsed: number
  speed: 1 | 2
  walls: number[]
  path: number[]
  route: RoutePoint[]
  routeLength: number
}
export type WallReason = 'locked' | 'invalid' | 'endpoint' | 'occupied' | 'limit' | 'blocked'
export type WallPreview = {
  cell: number
  valid: boolean
  reason?: WallReason
  plan: RoutePlan | null
}
export function previewWall(s: Pick<DefenseState, 'phase' | 'walls'>, cell: number): WallPreview {
  const invalid = (reason: WallReason): WallPreview => ({ cell, valid: false, reason, plan: null })
  if (s.phase !== 'build') return invalid('locked')
  if (!validCell(cell)) return invalid('invalid')
  if (isEndpoint(cell)) return invalid('endpoint')
  if (s.walls.includes(cell)) return invalid('occupied')
  if (s.walls.length >= WALL_LIMIT) return invalid('limit')
  const plan = findRoute([...s.walls, cell])
  return plan ? { cell, valid: true, plan } : invalid('blocked')
}
function setRoute(s: DefenseState, plan: RoutePlan) {
  s.path = plan.cells
  s.route = plan.points
  s.routeLength = plan.length
}
export function placeWall(s: DefenseState, cell: number) {
  const preview = previewWall(s, cell)
  if (!preview.valid || !preview.plan) return false
  s.walls = [...s.walls, cell]
  setRoute(s, preview.plan)
  return true
}
export function removeWall(s: DefenseState, cell: number) {
  if (s.phase !== 'build' || !s.walls.includes(cell) || s.towers.some((t) => t.site === cell))
    return false
  const walls = s.walls.filter((wall) => wall !== cell),
    plan = findRoute(walls)
  if (!plan) return false
  s.walls = walls
  setRoute(s, plan)
  return true
}
export const WAVE_NAMES = [
  '작은 해적 떼',
  '빠른 황새치',
  '단단한 소라게',
  '몰려오는 바다',
  '해적 꽃게 대장',
]
export function waveSize(wave: number) {
  return [0, 14, 22, 30, 42, 36][wave] ?? 0
}
export function createDefense(): DefenseState {
  const plan = findRoute([])!
  return {
    phase: 'ready',
    wave: 0,
    shells: 180,
    lives: 20,
    score: 0,
    kills: 0,
    towers: [],
    enemies: [],
    effects: [],
    spawned: 0,
    spawnTimer: 0,
    serial: 0,
    elapsed: 0,
    speed: 1,
    walls: [],
    path: plan.cells,
    route: plan.points,
    routeLength: plan.length,
  }
}
export function beginDefense(s: DefenseState) {
  if (s.phase === 'ready') s.phase = 'build'
}
const canBuild = (s: DefenseState) => s.phase === 'build' || s.phase === 'playing'
export function buildTower(s: DefenseState, site: number, kind: TowerKind) {
  if (
    !canBuild(s) ||
    !Number.isInteger(site) ||
    !SITES[site] ||
    !s.walls.includes(site) ||
    !TOWERS[kind] ||
    s.towers.some((t) => t.site === site) ||
    s.shells < TOWERS[kind].cost
  )
    return false
  s.shells -= TOWERS[kind].cost
  s.towers.push({ site, kind, level: 1, cooldown: 0.1, spent: TOWERS[kind].cost, kills: 0 })
  return true
}
export function upgradeCost(t: Tower) {
  return Math.round(TOWERS[t.kind].cost * 0.75 * t.level)
}
export function towerRange(t: Tower) {
  return TOWERS[t.kind].range + (t.level - 1) * 12
}
export function upgradeTower(s: DefenseState, site: number) {
  const t = s.towers.find((t) => t.site === site)
  if (!canBuild(s) || !t || t.level >= 3 || s.shells < upgradeCost(t)) return false
  const cost = upgradeCost(t)
  s.shells -= cost
  t.spent += cost
  t.level++
  return true
}
export function sellTower(s: DefenseState, site: number) {
  const t = s.towers.find((t) => t.site === site)
  if (!canBuild(s) || !t) return false
  s.shells += Math.floor(t.spent * 0.7)
  s.towers = s.towers.filter((t) => t.site !== site)
  return true
}
export function startWave(s: DefenseState) {
  if (s.phase !== 'build' || s.wave >= 5 || !s.towers.length) return false
  const plan = findRoute(s.walls)
  if (!plan) return false
  setRoute(s, plan)
  s.wave++
  s.spawned = 0
  s.spawnTimer = 0.4
  s.phase = 'playing'
  return true
}
function spawn(s: DefenseState) {
  const index = s.spawned,
    boss = s.wave === 5 && index === 0
  const kind: Enemy['kind'] = boss
    ? 'boss'
    : s.wave >= 3 && index % 4 === 0
      ? 'armored'
      : s.wave >= 2 && index % 3 === 0
        ? 'swift'
        : 'fish'
  const hp = boss
    ? 1600
    : (kind === 'armored' ? 95 : kind === 'swift' ? 30 : 40) * (1 + (s.wave - 1) * 0.32)
  s.enemies.push({
    id: ++s.serial,
    kind,
    distance: 0,
    hp,
    maxHp: hp,
    speed: boss ? 35 : kind === 'swift' ? 82 : kind === 'armored' ? 38 : 50,
    reward: boss ? 180 : kind === 'armored' ? 13 : 8,
    leak: boss ? 8 : kind === 'armored' ? 2 : 1,
    slow: 1,
    slowTime: 0,
  })
  s.spawned++
}
function effect(
  s: DefenseState,
  kind: Effect['kind'],
  from: Effect['from'],
  to: Effect['to'],
  color: number,
  duration = 0.2,
) {
  s.effects.push({ kind, from, to, color, life: duration, duration })
}
function hit(s: DefenseState, e: Enemy, damage: number, tower: Tower) {
  if (e.hp <= 0) return
  e.hp -= damage * (e.kind === 'armored' && tower.kind === 'puffer' ? 0.7 : 1)
  if (e.hp <= 0) {
    s.shells += e.reward
    s.score += e.reward * 10
    s.kills++
    tower.kills++
    const p = routePoint(e.distance, s.route)
    effect(s, 'pop', p, p, 0xf9df8e, 0.35)
  }
}
export function stepDefense(s: DefenseState, seconds: number) {
  if (s.phase !== 'playing') return
  const dt = Math.max(0, Math.min(seconds, 0.05)) * s.speed
  s.elapsed += dt
  for (const e of s.effects) e.life -= dt
  s.effects = s.effects.filter((e) => e.life > 0).slice(-220)
  s.spawnTimer -= dt
  if (s.spawned < waveSize(s.wave) && s.spawnTimer <= 0) {
    spawn(s)
    s.spawnTimer = Math.max(0.25, 0.75 - s.wave * 0.08)
  }
  for (const e of s.enemies) {
    e.slowTime = Math.max(0, e.slowTime - dt)
    if (!e.slowTime) e.slow = 1
    e.distance += e.speed * e.slow * dt
  }
  for (const t of s.towers) {
    t.cooldown -= dt
    if (t.cooldown > 0) continue
    const from = SITES[t.site],
      range = towerRange(t)
    const targets = s.enemies
      .filter((e) => {
        const p = routePoint(e.distance, s.route)
        return (
          e.hp > 0 && e.distance < s.routeLength && Math.hypot(p.x - from.x, p.y - from.y) <= range
        )
      })
      .sort((a, b) => b.distance - a.distance)
    if (!targets.length) continue
    const config = TOWERS[t.kind]
    t.cooldown = config.interval / (1 + (t.level - 1) * 0.15)
    if (t.kind === 'net') {
      effect(s, 'net', from, from, config.color, 0.4)
      for (const e of targets) {
        e.slow = Math.min(e.slow, 0.56 - t.level * 0.06)
        e.slowTime = 1.5
        hit(s, e, config.damage * t.level, t)
      }
    } else if (t.kind === 'jelly') {
      let last = from
      const chain = [targets[0]],
        others = s.enemies.filter((e) => e.hp > 0 && e !== targets[0] && e.distance < s.routeLength)
      while (chain.length < 3) {
        const point = routePoint(chain[chain.length - 1].distance, s.route)
        const next = others
          .filter((e) => !chain.includes(e))
          .sort((a, b) => {
            const pa = routePoint(a.distance, s.route),
              pb = routePoint(b.distance, s.route)
            return (
              Math.hypot(pa.x - point.x, pa.y - point.y) -
              Math.hypot(pb.x - point.x, pb.y - point.y)
            )
          })[0]
        if (!next) break
        const p = routePoint(next.distance, s.route)
        if (Math.hypot(p.x - point.x, p.y - point.y) > 90) break
        chain.push(next)
      }
      for (const e of chain) {
        const to = routePoint(e.distance, s.route)
        effect(s, 'lightning', last, to, config.color)
        hit(s, e, config.damage * (1 + (t.level - 1) * 0.8), t)
        last = to
      }
    } else {
      const to = routePoint(targets[0].distance, s.route)
      effect(s, 'shot', from, to, config.color, 0.16)
      hit(s, targets[0], config.damage * (1 + (t.level - 1) * 0.8), t)
    }
  }
  s.enemies = s.enemies.filter((e) => {
    if (e.hp <= 0) return false
    if (e.distance >= s.routeLength) {
      s.lives = Math.max(0, s.lives - e.leak)
      return false
    }
    return true
  })
  if (s.lives <= 0) {
    s.phase = 'lost'
    s.effects = []
  } else if (s.spawned >= waveSize(s.wave) && !s.enemies.length) {
    if (s.wave === 5) s.phase = 'won'
    else {
      s.phase = 'build'
      s.shells += 35 + s.wave * 10
    }
    s.effects = []
  }
}
