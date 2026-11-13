// @vitest-environment node
import { expect, it } from 'vitest'
import {
  beginDefense,
  build,
  canMove,
  canPlace,
  cellAt,
  createDefense,
  ENTRANCES,
  GRID,
  HOME,
  moveTower,
  pauseDefense,
  routeCells,
  sellValue,
  spawnEnemy,
  startWave,
  upgrade,
} from '../src/features/arcade/tower-defense-engine'

function arena() {
  const s = createDefense(42)
  beginDefense(s)
  s.gold = 10000
  return s
}
it('moves the same upgraded and specialized tower for free, preserving its cooldown and sale value', () => {
  const s = arena(),
    from = cellAt(3, 8),
    to = cellAt(6, 8)
  build(s, from, 'sniper')
  upgrade(s, from)
  const b = s.buildings[0]
  b.specialization = 'power'
  b.cooldown = 3
  b.charge = 1
  b.chargeTarget = 42
  const spent = b.spent,
    value = sellValue(b),
    version = s.version
  s.gold = 0
  expect(canMove(s, from, to)).toBe('')
  expect(moveTower(s, from, to)).toBe(true)
  expect(s.buildings[0]).toBe(b)
  expect(b).toMatchObject({
    cell: to,
    level: 1,
    specialization: 'power',
    cooldown: 3,
    charge: 0,
    chargeTarget: 0,
    spent,
  })
  expect(sellValue(b)).toBe(value)
  expect(s.gold).toBe(0)
  expect(s.version).toBe(version + 1)
  expect(s.blocked[from]).toBe(0)
  expect(s.blocked[to]).toBe(1)
})
it('validates the destination with the source removed so relocating a corridor entrance stays possible', () => {
  const s = arena(),
    from = cellAt(0, 7),
    to = cellAt(GRID.columns - 1, 7)
  build(s, from, 'octopus')
  for (let x = 1; x < GRID.columns - 1; x++) expect(build(s, cellAt(x, 7), 'wall')).toBe(true)
  expect(canPlace(s, to, 'octopus')).toMatch(/길/)
  expect(canMove(s, from, to)).toBe('')
  expect(moveTower(s, from, to)).toBe(true)
  for (const gate of ENTRANCES) expect(routeCells(s, gate).at(-1)).toBe(HOME)
})
it('rejects a move that closes a path without changing live topology, funds, or effects', () => {
  const s = arena(),
    from = cellAt(5, 10),
    to = cellAt(GRID.columns - 1, 7)
  build(s, from, 'octopus')
  for (let x = 0; x < GRID.columns - 1; x++) build(s, cellAt(x, 7), 'wall')
  const snapshot = {
    buildings: structuredClone(s.buildings),
    gold: s.gold,
    version: s.version,
    blocked: [...s.blocked],
    flow: [...s.flow],
    next: [...s.next],
    effects: structuredClone(s.effects),
  }
  expect(canMove(s, from, to)).toMatch(/길/)
  expect(moveTower(s, from, to)).toBe(false)
  expect({
    buildings: s.buildings,
    gold: s.gold,
    version: s.version,
    blocked: [...s.blocked],
    flow: [...s.flow],
    next: [...s.next],
    effects: s.effects,
  }).toEqual(snapshot)
})
it('rejects invalid, occupied and reserved cells, walls, missing towers, and paused moves', () => {
  const s = arena(),
    from = cellAt(4, 8),
    occupied = cellAt(5, 8)
  build(s, from, 'octopus')
  build(s, occupied, 'wall')
  for (const to of [-1, GRID.columns * GRID.rows, 1.5, HOME, ...ENTRANCES, occupied, from])
    expect(moveTower(s, from, to)).toBe(false)
  expect(moveTower(s, occupied, cellAt(8, 8))).toBe(false)
  expect(moveTower(s, cellAt(2, 2), cellAt(3, 3))).toBe(false)
  pauseDefense(s, true)
  expect(moveTower(s, from, cellAt(8, 8))).toBe(false)
})
it('protects ground monsters and diagonal corners while allowing relocation under flying monsters', () => {
  const s = arena(),
    from = cellAt(4, 8),
    to = cellAt(6, 6)
  build(s, from, 'octopus')
  startWave(s)
  s.spawned = s.plan.length
  spawnEnemy(s, 'crab', to)
  const e = s.enemies[0]
  e.nav = cellAt(7, 7)
  for (const dest of [to, e.nav, cellAt(6, 7), cellAt(7, 6)])
    expect(moveTower(s, from, dest)).toBe(false)
  e.hp = 0
  spawnEnemy(s, 'airJelly', to)
  s.pending.push({ kind: 'crystalCuttlefish', ...{ x: e.x, y: e.y }, cell: to, nav: to, reward: 0 })
  expect(moveTower(s, from, to)).toBe(true)
})
