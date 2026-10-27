export const FIELD = { width: 420, height: 520 }
export const ROUTE = [
  { x: -25, y: 62 },
  { x: 345, y: 62 },
  { x: 345, y: 198 },
  { x: 76, y: 198 },
  { x: 76, y: 350 },
  { x: 345, y: 350 },
  { x: 345, y: 474 },
  { x: 445, y: 474 },
]
export const SITES = [
  { x: 92, y: 125 },
  { x: 212, y: 125 },
  { x: 284, y: 133 },
  { x: 143, y: 272 },
  { x: 272, y: 272 },
  { x: 147, y: 414 },
  { x: 275, y: 414 },
  { x: 375, y: 280 },
]
const lengths = ROUTE.slice(1).map((p, i) => Math.hypot(p.x - ROUTE[i].x, p.y - ROUTE[i].y))
export const ROUTE_LENGTH = lengths.reduce((a, b) => a + b, 0)
export function routePoint(distance: number) {
  let remaining = Math.max(0, distance)
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const a = ROUTE[i],
        b = ROUTE[i + 1],
        ratio = Math.min(1, remaining / lengths[i])
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      }
    }
    remaining -= lengths[i]
  }
  return { ...ROUTE[0], angle: 0 }
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
    const p = routePoint(e.distance)
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
        const p = routePoint(e.distance)
        return (
          e.hp > 0 && e.distance < ROUTE_LENGTH && Math.hypot(p.x - from.x, p.y - from.y) <= range
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
        others = s.enemies.filter((e) => e.hp > 0 && e !== targets[0] && e.distance < ROUTE_LENGTH)
      while (chain.length < 3) {
        const point = routePoint(chain[chain.length - 1].distance)
        const next = others
          .filter((e) => !chain.includes(e))
          .sort((a, b) => {
            const pa = routePoint(a.distance),
              pb = routePoint(b.distance)
            return (
              Math.hypot(pa.x - point.x, pa.y - point.y) -
              Math.hypot(pb.x - point.x, pb.y - point.y)
            )
          })[0]
        if (!next) break
        const p = routePoint(next.distance)
        if (Math.hypot(p.x - point.x, p.y - point.y) > 90) break
        chain.push(next)
      }
      for (const e of chain) {
        const to = routePoint(e.distance)
        effect(s, 'lightning', last, to, config.color)
        hit(s, e, config.damage * (1 + (t.level - 1) * 0.8), t)
        last = to
      }
    } else {
      const to = routePoint(targets[0].distance)
      effect(s, 'shot', from, to, config.color, 0.16)
      hit(s, targets[0], config.damage * (1 + (t.level - 1) * 0.8), t)
    }
  }
  s.enemies = s.enemies.filter((e) => {
    if (e.hp <= 0) return false
    if (e.distance >= ROUTE_LENGTH) {
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
