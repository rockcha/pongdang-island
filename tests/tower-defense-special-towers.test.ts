// @vitest-environment node
import { expect, it } from 'vitest'
import {
  BUILDINGS,
  GRID,
  MONSTERS,
  PROJECTILE_LIMIT,
  SITES,
  beginDefense,
  build,
  cellAt,
  createDefense,
  spawnEnemy,
  sell,
  startWave,
  stepDefense,
  upgrade,
  type DefenseState,
  type EnemyKind,
  type TowerKind,
} from '../src/features/arcade/tower-defense-engine'

function arena(kind: TowerKind, level = 0) {
  const s = createDefense(42)
  beginDefense(s)
  s.gold = 10000
  expect(build(s, cellAt(6, 8), kind)).toBe(true)
  for (let i = 0; i < level; i++) expect(upgrade(s, cellAt(6, 8))).toBe(true)
  startWave(s)
  s.spawned = s.plan.length
  return s
}
function enemy(s: DefenseState, kind: EnemyKind, x = 6, y = 6) {
  expect(spawnEnemy(s, kind, cellAt(x, y))).toBe(true)
  const e = s.enemies.at(-1)!
  e.speed = 0
  return e
}
function ticks(s: DefenseState, count: number) {
  for (let i = 0; i < count; i++) stepDefense(s, 0.05)
}
it('sniper charges before firing and prioritizes a durable air elite over a nearer weak ground enemy', () => {
  const s = arena('sniper')
  const weak = enemy(s, 'crab', 6, 9),
    elite = enemy(s, 'cuttlefish', 6, 3)
  const hp = weak.hp
  ticks(s, 1)
  expect(s.buildings[0].chargeTarget).toBe(elite.id)
  expect(s.buildings[0].charge).toBe(1.1)
  ticks(s, 20)
  expect(s.projectiles).toHaveLength(0)
  expect(elite.hp).toBe(elite.maxHp)
  ticks(s, 2)
  expect(s.projectiles[0].source).toBe('sniper')
  expect(s.projectiles[0].damage).toBe(160)
  ticks(s, 3)
  expect(weak.hp).toBe(hp)
  expect(elite.hp).toBeLessThanOrEqual(0)
  expect(s.effects.some((e) => e.kind === 'beam' && e.source === 'sniper')).toBe(true)
})
it.each(['dead', 'out-of-range'] as const)(
  'sniper cancels a %s target and can acquire a replacement',
  (reason) => {
    const s = arena('sniper'),
      target = enemy(s, 'cuttlefish')
    const replacement = enemy(s, 'armored', 5, 6)
    target.hp = target.maxHp = 1000
    ticks(s, 1)
    expect(s.buildings[0].chargeTarget).toBe(target.id)
    if (reason === 'dead') target.hp = 0
    else {
      target.x = -1000
      target.y = -1000
    }
    ticks(s, 1)
    expect(s.buildings[0].charge).toBe(0)
    expect(s.projectiles).toHaveLength(0)
    ticks(s, 4)
    expect(s.buildings[0].chargeTarget).toBe(replacement.id)
  },
)
it.each(['armored', 'cuttlefish'] as const)(
  'harpoon fires immediately at %s and keeps its slower cadence',
  (kind) => {
    const s = arena('harpoon'),
      e = enemy(s, kind)
    e.hp = e.maxHp = 10000
    ticks(s, 1)
    expect(s.projectiles[0].source).toBe('harpoon')
    expect(s.projectiles[0].missile).toBe(false)
    ticks(s, 8)
    expect(e.maxHp - e.hp).toBe(72)
    ticks(s, 45)
    expect(s.stats.shots).toBe(1)
    ticks(s, 3)
    expect(s.stats.shots).toBe(2)
    expect(s.projectilePool.length + s.projectiles.length).toBe(PROJECTILE_LIMIT)
  },
)
it('frost caps targets at four ground enemies, leaves air untouched, and expires after leaving its range', () => {
  const s = arena('frost')
  const ground = Array.from({ length: 6 }, () => enemy(s, 'armored'))
  const air = enemy(s, 'flyingFish')
  ticks(s, 1)
  expect(ground.filter((e) => e.slowFactor < 1)).toHaveLength(4)
  expect(air.slowFactor).toBe(1)
  expect(air.hp).toBe(air.maxHp)
  const slowed = ground.find((e) => e.slowFactor < 1)!
  expect(slowed.slowFactor).toBe(0.65)
  Object.assign(slowed, SITES[cellAt(0, 0)], { cell: cellAt(0, 0), nav: cellAt(0, 0) })
  ticks(s, 25)
  expect(slowed.slowRemaining).toBe(0)
  expect(slowed.slowFactor).toBe(1)
})
it('frost reduces actual movement, halves its effect on bosses, and does not multiply stacked slows', () => {
  const s = arena('frost', 3)
  expect(build(s, cellAt(7, 7), 'frost')).toBe(true)
  const ground = enemy(s, 'armored'),
    boss = enemy(s, 'boss', 7, 6)
  ticks(s, 1)
  expect(ground.slowFactor).toBe(0.5)
  expect(boss.slowFactor).toBe(0.75)
  ground.speed = MONSTERS.armored.speed * GRID.cell
  const before = { x: ground.x, y: ground.y }
  ticks(s, 1)
  expect(Math.hypot(ground.x - before.x, ground.y - before.y)).toBeCloseTo(
    ground.speed * 0.05 * 0.5,
  )
  ticks(s, 20)
  expect(ground.slowFactor).toBe(0.5)
})
it('a weaker frost tower cannot prolong the stronger slow after its source is sold', () => {
  const s = arena('frost', 3)
  build(s, cellAt(7, 7), 'frost')
  const e = enemy(s, 'armored')
  ticks(s, 1)
  expect(e.slowFactor).toBe(0.5)
  sell(s, cellAt(6, 8))
  ticks(s, 26)
  expect(e.slowFactor).toBe(1)
  ticks(s, 16)
  expect(e.slowFactor).toBe(0.65)
})
it.each(['sniper', 'harpoon', 'frost'] as const)(
  '%s has three paid upgrades and clears charges on wave transitions',
  (kind) => {
    const s = arena(kind, 3),
      b = s.buildings[0]
    expect(upgrade(s, b.cell)).toBe(false)
    expect(b.spent).toBe(BUILDINGS[kind].cost + BUILDINGS[kind].upgrades.reduce((a, b) => a + b, 0))
    const target = enemy(s, 'crab')
    ticks(s, 1)
    target.hp = 0
    ticks(s, 12)
    expect(s.phase).toBe('build')
    startWave(s)
    expect(b.charge).toBe(0)
    expect(b.chargeTarget).toBe(0)
  },
)
