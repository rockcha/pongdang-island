// @vitest-environment node
import { expect, it } from 'vitest'
import {
  beginDefense,
  build,
  canPlace,
  cellAt,
  createDefense,
  ENTRANCES,
  HOME,
  GRID,
  CELL_COUNT,
  pauseDefense,
  refreshFlow,
  ROCKS,
  routeCells,
  sell,
  SITES,
  startWave,
  stepDefense,
  upgrade,
  waveSize,
  type DefenseState,
  type Enemy,
} from '../src/features/arcade/tower-defense-engine'

function prepared() {
  const s = createDefense(42)
  beginDefense(s)
  return s
}
const ENTRANCE = ENTRANCES[0]
function advance(s: DefenseState, seconds: number) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) stepDefense(s, 0.05)
}
function enemy(id: number, cell: number, hp = 100): Enemy {
  return {
    id,
    kind: 'crab',
    ...SITES[cell],
    nav: cell,
    hp,
    maxHp: hp,
    speed: 38,
    reward: 1,
    leak: 1,
    slowedUntil: 0,
  }
}
function combat(s: DefenseState) {
  startWave(s)
  s.spawned = waveSize(s.wave)
  s.spawnTimer = Infinity
}

it('offers 30 seconds before every wave, permits early start, and pauses both clocks', () => {
  const s = prepared()
  advance(s, 12)
  expect(s.prep).toBeCloseTo(18)
  pauseDefense(s, true)
  advance(s, 50)
  expect(s.prep).toBeCloseTo(18)
  pauseDefense(s, false)
  advance(s, 18.05)
  expect(s.phase).toBe('combat')
  expect(s.wave).toBe(1)
  const elapsed = s.elapsed,
    spawned = s.spawned
  pauseDefense(s, true)
  advance(s, 50)
  expect(s.elapsed).toBe(elapsed)
  expect(s.spawned).toBe(spawned)
  expect(build(s, cellAt(0, 1), 'wall')).toBe(false)
  pauseDefense(s, false)
  s.spawned = waveSize(1)
  s.enemies.length = 0
  stepDefense(s, 0.05)
  expect(s.phase).toBe('build')
  expect(s.prep).toBe(30)
  expect(startWave(s)).toBe(true)
  expect(s.wave).toBe(2)
  expect(startWave(s)).toBe(false)
})

it('charges only successful builds and rejects rocks, reserved rows, occupied cells and overspending', () => {
  const s = prepared(),
    site = cellAt(3, 7)
  for (const cell of [-1, 0.2, CELL_COUNT, HOME, ...ENTRANCES, ...ROCKS])
    expect(build(s, cell, 'shell')).toBe(false)
  expect(s.gold).toBe(120)
  expect(build(s, site, 'shell')).toBe(true)
  expect(build(s, site, 'wall')).toBe(false)
  expect(s.gold).toBe(80)
  expect(build(s, cellAt(5, 7), 'puffer')).toBe(true)
  expect(build(s, cellAt(6, 7), 'shell')).toBe(false)
  expect(s.gold).toBe(10)
})

it('caps walls and towers independently', () => {
  const s = prepared()
  s.gold = 10000
  for (let cell = GRID.columns; cell < CELL_COUNT - GRID.columns; cell++)
    if (!canPlace(s, cell, 'wall')) build(s, cell, 'wall')
  expect(s.buildings).toHaveLength(20)
  for (let cell = GRID.columns; cell < CELL_COUNT - GRID.columns; cell++)
    if (!canPlace(s, cell, 'shell')) build(s, cell, 'shell')
  expect(s.buildings.filter((b) => b.kind === 'shell')).toHaveLength(12)
})

it('upgrades towers to level three and refunds 70 percent only in preparation', () => {
  const s = prepared(),
    site = cellAt(3, 7)
  s.gold = 1000
  build(s, site, 'shell')
  const b = s.buildings[0]
  expect(upgrade(s, site)).toBe(true)
  expect(upgrade(s, site)).toBe(true)
  expect(upgrade(s, site)).toBe(false)
  expect(b.level).toBe(3)
  build(s, cellAt(0, 7), 'wall')
  expect(upgrade(s, cellAt(0, 7))).toBe(false)
  combat(s)
  expect(upgrade(s, site)).toBe(false)
  expect(sell(s, site)).toBe(false)
  s.phase = 'build'
  const before = s.gold
  expect(sell(s, site)).toBe(true)
  expect(s.gold - before).toBe(98)
  expect(sell(s, site)).toBe(false)
})

it('routes through the shortest open path and rejects the last wall or tower without charging', () => {
  const s = prepared()
  s.gold = 1000
  expect(routeCells(s)).toHaveLength(24)
  for (let col = 1; col < GRID.columns; col++) expect(build(s, cellAt(col, 8), 'wall')).toBe(true)
  const before = { gold: s.gold, version: s.version, route: routeCells(s) }
  for (const kind of ['wall', 'shell', 'jelly', 'puffer'] as const) {
    expect(canPlace(s, cellAt(0, 8), kind)).toContain('길을 완전히 막을 수 없어요')
    expect(build(s, cellAt(0, 8), kind)).toBe(false)
  }
  expect(s.gold).toBe(before.gold)
  expect(s.version).toBe(before.version)
  expect(routeCells(s)).toEqual(before.route)
  const route = routeCells(s)
  expect(route.at(-1)).toBe(HOME)
  expect(route).toHaveLength(28)
  expect(route).toContain(cellAt(0, 8))
  expect(route.some((cell) => s.buildings.some((b) => b.cell === cell))).toBe(false)
  expect(route.some((cell) => ROCKS.has(cell))).toBe(false)
  const version = s.flowVersion
  refreshFlow(s)
  expect(s.flowVersion).toBe(version)
  expect(sell(s, cellAt(4, 8))).toBe(true)
  expect(routeCells(s)).toHaveLength(24)
})

it('walks from the top entrance to the bottom vault and never attacks or crosses walls', () => {
  const s = prepared()
  s.gold = 1000
  expect(SITES[ENTRANCE].y).toBeLessThan(SITES[HOME].y)
  for (let col = 0; col < GRID.columns - 1; col++) build(s, cellAt(col, 8), 'wall')
  const structures = JSON.stringify(s.buildings)
  combat(s)
  const e = enemy(501, ENTRANCE, 10000)
  s.enemies.push(e)
  let maximumY = e.y
  for (let i = 0; i < 1500 && s.phase === 'combat'; i++) {
    stepDefense(s, 0.05)
    maximumY = Math.max(maximumY, e.y)
    if (s.enemies.length)
      expect(
        s.buildings.some(
          (b) => Math.abs(SITES[b.cell].x - e.x) < 0.01 && Math.abs(SITES[b.cell].y - e.y) < 0.01,
        ),
      ).toBe(false)
  }
  expect(maximumY).toBe(SITES[HOME].y)
  expect(s.phase).toBe('build')
  expect(s.lives).toBe(9)
  expect(JSON.stringify(s.buildings)).toBe(structures)
})

it('moves through cell centres without cutting through the fixed rocks', () => {
  const s = prepared()
  combat(s)
  const e = enemy(500, ENTRANCE, 10000)
  s.enemies.push(e)
  for (let i = 0; i < 600; i++) {
    stepDefense(s, 0.05)
    if (!s.enemies.length) break
    const atCentreX = SITES.some((p) => Math.abs(p.x - e.x) < 0.01)
    const atCentreY = SITES.some((p) => Math.abs(p.y - e.y) < 0.01)
    expect(atCentreX || atCentreY).toBe(true)
  }
  expect(s.enemies).toHaveLength(0)
  expect(s.lives).toBe(9)
})

it('rejects a build that traps only the upper gate while the lower gate still has a route', () => {
  const s = prepared()
  s.gold = 1000
  for (let col = 0; col < GRID.columns - 1; col++)
    if (!ROCKS.has(cellAt(col, 2))) expect(build(s, cellAt(col, 2), 'wall')).toBe(true)
  expect(routeCells(s, ENTRANCES[1]).at(-1)).toBe(HOME)
  const before = s.gold
  expect(build(s, cellAt(GRID.columns - 1, 2), 'wall')).toBe(false)
  expect(s.gold).toBe(before)
  for (const gate of ENTRANCES) expect(routeCells(s, gate).at(-1)).toBe(HOME)
})

it('rejects trapping the lower gate even when the upper route is open', () => {
  const s = prepared()
  s.gold = 1000
  expect(build(s, cellAt(16, 5), 'wall')).toBe(true)
  expect(build(s, cellAt(17, 4), 'wall')).toBe(true)
  const before = s.gold
  expect(canPlace(s, cellAt(17, 6), 'puffer')).toContain('길을 완전히 막을 수 없어요')
  expect(build(s, cellAt(17, 6), 'wall')).toBe(false)
  expect(s.gold).toBe(before)
  for (const gate of ENTRANCES) expect(routeCells(s, gate).at(-1)).toBe(HOME)
})

it('chooses either right-hand gate independently for each enemy, with reproducible seeded runs', () => {
  function entrances(seed: number) {
    const s = createDefense(seed)
    beginDefense(s)
    startWave(s)
    s.wave = 5
    const seen = new Set<number>(),
      gates: number[] = []
    for (let i = 0; i < 1000 && s.spawned < waveSize(5); i++) {
      stepDefense(s, 0.05)
      for (const e of s.enemies) {
        if (!seen.has(e.id)) {
          seen.add(e.id)
          expect(ENTRANCES).toContain(e.nav)
          expect(e.y).toBe(SITES[e.nav].y)
          expect(e.x).toBeGreaterThan(SITES[e.nav].x)
          gates.push(e.nav)
        }
        e.speed = 0
      }
    }
    return gates
  }
  const gates = entrances(42)
  expect(gates).toHaveLength(28)
  expect(new Set(gates).size).toBe(2)
  expect(gates.some((gate, i) => i > 0 && gate === gates[i - 1])).toBe(true)
  expect(entrances(42)).toEqual(gates)
  expect(entrances(43)).not.toEqual(gates)
})

it('uses smaller waves and leaves more time between arrivals', () => {
  expect([1, 2, 3, 4, 5].map(waveSize)).toEqual([10, 14, 18, 22, 28])
  const s = prepared()
  startWave(s)
  advance(s, 5)
  expect(s.spawned).toBeLessThanOrEqual(4)
  expect(s.spawned).toBeGreaterThanOrEqual(3)
})

it('awards each splash kill only once and recycles enemies and effects', () => {
  const s = prepared()
  s.gold = 1000
  build(s, cellAt(3, 7), 'puffer')
  build(s, cellAt(5, 7), 'puffer')
  combat(s)
  const before = s.gold
  s.enemies.push(enemy(10, cellAt(4, 7), 10), enemy(11, cellAt(4, 7), 10))
  stepDefense(s, 0.05)
  expect(s.kills).toBe(2)
  expect(s.enemyPool).toHaveLength(2)
  expect(s.gold).toBe(before + 2 + 30)
  expect(s.effects.filter((e) => e.kind === 'pop')).toHaveLength(2)
  advance(s, 0.45)
  expect(s.effects).toHaveLength(0)
  expect(s.buildings.every((b) => b.flash === 0)).toBe(true)
  expect(s.effectPool.length).toBeGreaterThanOrEqual(2)
  startWave(s)
  s.spawnTimer = 0
  stepDefense(s, 0.05)
  expect(s.enemyPool).toHaveLength(1)
  expect(s.enemies[0].maxHp).toBeCloseTo(28.75)
  expect(s.enemies[0].id).not.toBe(10)
  expect(s.enemies[0].slowedUntil).toBe(0)
})

it('slows enemies with jelly and lets armored enemies resist shell damage', () => {
  const s = prepared()
  s.gold = 1000
  build(s, cellAt(3, 7), 'jelly')
  combat(s)
  const e = enemy(10, cellAt(4, 7))
  s.enemies.push(e)
  stepDefense(s, 0.05)
  expect(e.slowedUntil).toBeGreaterThan(s.elapsed)
  const y = e.y
  stepDefense(s, 0.05)
  expect(Math.abs(e.y - y)).toBeCloseTo(38 * 0.55 * 0.05)
  const t = prepared()
  build(t, cellAt(3, 7), 'shell')
  combat(t)
  const armored = enemy(50, cellAt(4, 7))
  armored.kind = 'armored'
  t.enemies.push(armored)
  stepDefense(t, 0.05)
  expect(armored.hp).toBe(91)
})

it('does not pay for leaks, stops on defeat and ignores invalid or unbounded time steps', () => {
  const s = prepared()
  combat(s)
  s.lives = 1
  s.enemies.push(enemy(9, HOME))
  const gold = s.gold
  for (const dt of [NaN, Infinity, -1, 0]) stepDefense(s, dt)
  expect(s.elapsed).toBe(0)
  stepDefense(s, 100)
  expect(s.elapsed).toBe(0.1)
  expect(s.phase).toBe('lost')
  expect(s.gold).toBe(gold)
  expect(s.kills).toBe(0)
  advance(s, 10)
  expect(s.elapsed).toBe(0.1)
})

it('can finish all five practice waves using only the earned construction budget', () => {
  const s = prepared()
  build(s, cellAt(15, 4), 'shell')
  build(s, cellAt(14, 6), 'puffer')
  const reports: unknown[] = []
  for (let wave = 1; wave <= 5; wave++) {
    if (wave > 1) {
      for (const [col, row, kind] of [
        [12, 7, 'shell'],
        [10, 6, 'puffer'],
        [9, 6, 'jelly'],
        [6, 8, 'puffer'],
      ] as const)
        if (!s.buildings.some((b) => b.cell === cellAt(col, row))) build(s, cellAt(col, row), kind)
      for (const b of s.buildings) if (b.kind === 'puffer') upgrade(s, b.cell)
    }
    expect(startWave(s)).toBe(true)
    for (let i = 0; i < 6000 && s.phase === 'combat'; i++) stepDefense(s, 0.05)
    reports.push({ wave: s.wave, phase: s.phase, lives: s.lives, gold: s.gold, kills: s.kills })
    expect(s.phase, JSON.stringify(reports)).toBe(wave === 5 ? 'won' : 'build')
    expect(s.gold).toBeGreaterThanOrEqual(0)
  }
  expect(s.wave).toBe(5)
  expect(s.kills).toBeGreaterThan(80)
  const score = s.score
  advance(s, 10)
  expect(s.score).toBe(score)
})
