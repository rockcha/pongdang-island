// @vitest-environment node
import { expect, it } from 'vitest'
import {
  BUILDINGS,
  GRID,
  SITES,
  cellAt,
  pointCell,
  createDefense,
  beginDefense,
  build,
  startWave,
  spawnEnemy,
  stepDefense,
  upgrade,
  PROJECTILE_LIMIT,
  EFFECT_LIMIT,
  type TowerKind,
  type DefenseState,
  type Enemy,
} from '../src/features/arcade/tower-defense-engine'
function arena(kind: TowerKind) {
  const s = createDefense(42)
  beginDefense(s)
  s.gold = 10000
  expect(build(s, cellAt(5, 8), kind)).toBe(true)
  startWave(s)
  s.spawned = s.plan.length
  return s
}
function enemy(s: DefenseState, x: number, y: number) {
  expect(spawnEnemy(s, 'armored', cellAt(1, 1))).toBe(true)
  const e = s.enemies.at(-1)!,
    p = { x: GRID.x + (x + 0.5) * GRID.cell, y: GRID.y + (y + 0.5) * GRID.cell }
  Object.assign(e, {
    ...p,
    px: p.x,
    py: p.y,
    cell: pointCell(p.x, p.y),
    nav: pointCell(p.x, p.y),
    hp: 10000,
    maxHp: 10000,
    speed: 0,
  })
  return e
}
function ticks(s: DefenseState, n: number) {
  for (let i = 0; i < n; i++) stepDefense(s, 0.05)
}
const loss = (e: Enemy) => e.maxHp - e.hp
it('blasts five nearby monsters with full centre damage and half surrounding damage', () => {
  const s = arena('mortar'),
    group = Array.from({ length: 7 }, () => enemy(s, 5, 6)),
    far = enemy(s, 8, 6)
  ticks(s, 1)
  expect(s.projectiles[0].blast).toBe(true)
  expect(group.every((e) => loss(e) === 0)).toBe(true)
  ticks(s, 10)
  expect(group.map(loss)).toEqual([40, 20, 20, 20, 20, 0, 0])
  expect(loss(far)).toBe(0)
  expect(s.effects.some((e) => e.kind === 'blast')).toBe(true)
})
it('applies capped flame ticks only inside its forward cone and stops hitting enemies that leave', () => {
  const s = arena('flame'),
    front = Array.from({ length: 6 }, (_, i) => enemy(s, 5 + i * 0.025, 9)),
    behind = enemy(s, 5, 7),
    side = enemy(s, 6, 8.2),
    far = enemy(s, 5, 10)
  ticks(s, 1)
  expect(front.filter((e) => loss(e) > 0)).toHaveLength(4)
  expect(front.reduce((n, e) => n + loss(e), 0)).toBeCloseTo(8)
  expect([behind, side, far].map(loss)).toEqual([0, 0, 0])
  expect(s.projectiles).toHaveLength(0)
  ticks(s, 4)
  expect(front.reduce((n, e) => n + loss(e), 0)).toBeCloseTo(16)
  const hp = front.map((e) => e.hp)
  for (const e of front) {
    e.x = 40
    e.y = 40
    e.nav = pointCell(40, 40)
  }
  ticks(s, 8)
  expect(front.map((e) => e.hp)).toEqual(hp)
})
it('charges a locked laser direction, pierces only five aligned targets and keeps the seven-second cadence', () => {
  const s = arena('laser'),
    line = Array.from({ length: 7 }, (_, i) => enemy(s, 5, 9 + i * 0.6)),
    side = enemy(s, 5.5, 10),
    behind = enemy(s, 5, 7)
  ticks(s, 1)
  expect(s.buildings[0].charge).toBe(0.6)
  const aim = s.buildings[0].aim
  const moving = line[6]
  moving.x += 3 * GRID.cell
  moving.nav = pointCell(moving.x, moving.y)
  ticks(s, 11)
  expect(line.every((e) => loss(e) === 0)).toBe(true)
  expect(s.buildings[0].aim).toBe(aim)
  ticks(s, 1)
  expect(line.map(loss)).toEqual([100, 75, 75, 75, 75, 0, 0])
  expect([side, behind].map(loss)).toEqual([0, 0])
  expect(s.effects.some((e) => e.kind === 'beam')).toBe(true)
  expect(s.stats.shots).toBe(1)
  ticks(s, 138)
  expect(s.stats.shots).toBe(1)
  ticks(s, 4)
  expect(s.stats.shots).toBe(2)
})
it('pulses around all directions with a five-target cap and a very short radius', () => {
  const s = arena('anemone'),
    group = [
      [4, 8],
      [6, 8],
      [5, 7],
      [5, 9],
      [5.8, 8.8],
      [5.9, 8.7],
    ].map(([x, y]) => enemy(s, x, y)),
    far = enemy(s, 5, 6)
  ticks(s, 1)
  expect(group.filter((e) => loss(e) > 0)).toHaveLength(5)
  expect(group.reduce((n, e) => n + loss(e), 0)).toBe(20)
  expect(loss(far)).toBe(0)
  expect(s.projectiles).toHaveLength(0)
  expect(s.effects.some((e) => e.kind === 'pulse')).toBe(true)
})
it('fires four plasma bolts in its first second while respecting the shared projectile pool', () => {
  const s = arena('plasma'),
    e = enemy(s, 5, 10)
  ticks(s, 20)
  expect(s.stats.shots).toBe(4)
  expect(loss(e)).toBe(36)
  expect(s.projectilePool.length + s.projectiles.length).toBe(PROJECTILE_LIMIT)
})
it.each(['mortar', 'flame', 'laser', 'plasma', 'anemone'] as const)(
  '%s supports three paid upgrades without reducing its attack interval',
  (kind) => {
    const s = arena(kind),
      b = s.buildings[0],
      interval = BUILDINGS[kind].interval[0]
    for (let i = 0; i < 3; i++) expect(upgrade(s, b.cell)).toBe(true)
    expect(upgrade(s, b.cell)).toBe(false)
    expect(BUILDINGS[kind].interval[b.level]).toBe(interval)
    expect(BUILDINGS[kind].damage[b.level]).toBeCloseTo(BUILDINGS[kind].damage[0] * 2.6)
    expect(s.effects.length + s.effectPool.length).toBe(EFFECT_LIMIT)
  },
)
it('cancels unfinished charges at a wave boundary and starts the next wave ready', () => {
  const s = arena('laser')
  const e = enemy(s, 5, 10)
  ticks(s, 1)
  expect(s.buildings[0].charge).toBeGreaterThan(0)
  e.hp = 0
  ticks(s, 1)
  expect(s.phase).toBe('build')
  expect(s.buildings[0].charge).toBe(0)
  startWave(s)
  expect(s.buildings[0].cooldown).toBe(0)
})

it('does not waste two lethal single shots on the same low-health enemy', () => {
  const s = createDefense(42)
  beginDefense(s)
  s.gold = 1000
  build(s, cellAt(4, 8), 'octopus')
  build(s, cellAt(6, 8), 'seahorse')
  startWave(s)
  s.spawned = s.plan.length
  const a = enemy(s, 5, 9),
    b = enemy(s, 5, 9)
  a.hp = 24
  b.hp = 24
  ticks(s, 1)
  expect(s.projectiles).toHaveLength(2)
  expect(new Set(s.projectiles.map((p) => p.target)).size).toBe(2)
})
