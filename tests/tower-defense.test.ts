// @vitest-environment node
import { expect, it } from 'vitest'
import { campaignStrategy } from '../scripts/tower-defense-campaign-strategy'
import {
  BUILDINGS,
  CELL_COUNT,
  EFFECT_LIMIT,
  ENEMY_LIMIT,
  ENTRANCES,
  HOME,
  GRID,
  MONSTERS,
  PROJECTILE_LIMIT,
  SITES,
  WAVES,
  beginDefense,
  build,
  canPlace,
  castleUpgradeCost,
  cellAt,
  createDefense,
  configureStartingWave,
  pauseDefense,
  refreshFlow,
  routeCells,
  sell,
  spawnEnemy,
  startWave,
  stepDefense,
  upgrade,
  upgradeCastle,
  upgradeCost,
  type DefenseState,
} from '../src/features/arcade/tower-defense-engine'
const prepared = () => {
  const s = createDefense(42)
  beginDefense(s)
  return s
}
const advance = (s: DefenseState, seconds: number) => {
  for (let i = 0; i < seconds * 20; i++) stepDefense(s, 0.05)
}
it('configures a bounded practice start before building, with reproducible earlier-wave income', () => {
  const s = prepared()
  for (const invalid of [0, 31, 1.5, NaN, Infinity])
    expect(configureStartingWave(s, invalid)).toBe(false)
  expect(s.gold).toBe(180)
  expect(configureStartingWave(s, 2)).toBe(true)
  expect(s.gold).toBe(251)
  expect(configureStartingWave(s, 2)).toBe(true)
  expect(s.gold).toBe(251)
  expect(configureStartingWave(s, 1)).toBe(true)
  expect(s.gold).toBe(180)
  expect(configureStartingWave(s, 30)).toBe(true)
  const gold = s.gold
  build(s, cellAt(4, 10), 'octopus')
  expect(configureStartingWave(s, 1)).toBe(false)
  expect(s.gold).toBe(gold - 90)
  startWave(s)
  expect(s.wave).toBe(30)
  expect(s.plan.filter((k) => k === 'abyss')).toHaveLength(1)
  expect(configureStartingWave(s, 1)).toBe(false)
})
function combat(s: DefenseState) {
  startWave(s)
  s.spawned = s.plan.length
  s.spawnTimer = Infinity
}
it('starts with 15 health and unlimited first preparation, then gives exactly 20 seconds between waves', () => {
  const s = prepared()
  expect(s.lives).toBe(15)
  expect(s.gold).toBe(180)
  advance(s, 100)
  expect(s.wave).toBe(0)
  combat(s)
  stepDefense(s, 0.05)
  expect(s.phase).toBe('build')
  expect(s.prep).toBe(20)
  advance(s, 7)
  expect(s.prep).toBeCloseTo(13)
  pauseDefense(s, true)
  advance(s, 30)
  expect(s.prep).toBeCloseTo(13)
  pauseDefense(s, false)
  advance(s, 13.1)
  expect(s.wave).toBe(2)
  expect(s.phase).toBe('combat')
})
it('uses two top entrances and a shared shortest eight-direction route to the bottom castle', () => {
  const s = prepared()
  for (const entrance of ENTRANCES) {
    const route = routeCells(s, entrance)
    expect(route[0]).toBe(entrance)
    expect(route.at(-1)).toBe(HOME)
    expect(route.length).toBe(GRID.rows)
    const dx = Math.abs((entrance % GRID.columns) - (HOME % GRID.columns))
    const dy = Math.abs(Math.floor(entrance / GRID.columns) - Math.floor(HOME / GRID.columns))
    expect(s.flow[entrance]).toBeCloseTo(dy + (Math.SQRT2 - 1) * dx, 4)
    for (let i = 1; i < route.length; i++)
      expect([1, GRID.columns, GRID.columns - 1, GRID.columns + 1]).toContain(
        Math.abs(route[i] - route[i - 1]),
      )
  }
  const builds = s.stats.flowBuilds
  for (let i = 0; i < 100; i++) refreshFlow(s)
  expect(s.stats.flowBuilds).toBe(builds)
})
it('rejects a sealed route for every entrance without changing coins or the live path', () => {
  const s = prepared()
  s.gold = 10000
  for (let x = 0; x < GRID.columns - 1; x++) expect(build(s, cellAt(x, 7), 'wall')).toBe(true)
  const before = { gold: s.gold, version: s.version, route: routeCells(s) }
  expect(canPlace(s, cellAt(GRID.columns - 1, 7), 'octopus')).toContain(
    '길을 완전히 막을 수 없어요',
  )
  expect(build(s, cellAt(GRID.columns - 1, 7), 'octopus')).toBe(false)
  expect(s.gold).toBe(before.gold)
  expect(s.version).toBe(before.version)
  expect(routeCells(s)).toEqual(before.route)
})
it('does not trap an existing enemy even when both entrances still have another route', () => {
  const s = prepared()
  s.gold = 10000
  combat(s)
  spawnEnemy(s, 'crab', cellAt(4, 5))
  s.enemies[0].speed = 0
  for (const c of [cellAt(3, 5), cellAt(5, 5), cellAt(4, 4)]) expect(build(s, c, 'wall')).toBe(true)
  expect(canPlace(s, cellAt(4, 6), 'wall')).toContain('길을 완전히 막')
  expect(canPlace(s, cellAt(4, 5), 'wall')).toContain('몬스터')
})
it('allows more than six walls near entrances and the castle while preserving all routes', () => {
  const s = prepared()
  s.gold = 10000
  for (let x = 0; x < GRID.columns; x++) {
    const cell = cellAt(x, 0)
    if (!ENTRANCES.includes(cell)) expect(build(s, cell, 'wall')).toBe(true)
  }
  for (const cell of [
    cellAt(0, GRID.rows - 1),
    cellAt(10, GRID.rows - 1),
    cellAt(4, GRID.rows - 2),
  ])
    expect(build(s, cell, 'wall')).toBe(true)
  expect(s.buildings).toHaveLength(GRID.columns + 1)
  for (const entry of ENTRANCES) expect(routeCells(s, entry).at(-1)).toBe(HOME)
  for (const cell of [...ENTRANCES, HOME, -1, CELL_COUNT])
    expect(build(s, cell, 'wall')).toBe(false)
})
it('allows a nearly sealed wall row and rejects only the last closing wall', () => {
  const s = prepared()
  s.gold = 10000
  for (let x = 0; x < GRID.columns - 1; x++) expect(build(s, cellAt(x, 7), 'wall')).toBe(true)
  const gold = s.gold,
    version = s.version
  expect(build(s, cellAt(GRID.columns - 1, 7), 'wall')).toBe(false)
  expect(s.gold).toBe(gold)
  expect(s.version).toBe(version)
})
it('supports combat placement, reserves actual entrances/castle and charges only valid builds', () => {
  const s = prepared()
  for (const c of [-1, 0.3, ...ENTRANCES, HOME, CELL_COUNT])
    expect(build(s, c, 'octopus')).toBe(false)
  expect(build(s, cellAt(2, 11), 'octopus')).toBe(true)
  expect(s.gold).toBe(90)
  combat(s)
  expect(build(s, cellAt(6, 11), 'seahorse')).toBe(true)
  expect(s.gold).toBe(30)
  expect(build(s, cellAt(5, 11), 'octopus')).toBe(false)
  expect(s.gold).toBe(30)
})
it('allows exactly three upgrades after purchase and never rebuilds navigation for stat-only upgrades', () => {
  const s = prepared()
  s.gold = 10000
  build(s, cellAt(2, 11), 'octopus')
  const b = s.buildings[0],
    version = s.stats.flowBuilds
  expect(b.level).toBe(0)
  for (const cost of [35, 55, 70]) {
    expect(upgradeCost(b)).toBe(cost)
    expect(upgrade(s, b.cell)).toBe(true)
  }
  expect(b.level).toBe(3)
  expect(upgrade(s, b.cell)).toBe(false)
  expect(s.stats.flowBuilds).toBe(version)
  expect(BUILDINGS.octopus.interval).toEqual([2, 2, 2, 2])
  expect(Math.min(...BUILDINGS.seahorse.interval)).toBeGreaterThanOrEqual(1)
  const gold = s.gold
  expect(sell(s, b.cell)).toBe(true)
  expect(s.gold - gold).toBe(Math.floor(b.spent / 2))
})
it('allows more than twelve towers while keeping both entrances connected', () => {
  const s = prepared()
  s.gold = 100000
  const cells = [
    ...Array.from({ length: GRID.columns }, (_, x) => cellAt(x, GRID.rows - 1)).filter(
      (c) => c !== HOME,
    ),
    ...Array.from({ length: 5 }, (_, x) => cellAt(x, GRID.rows - 2)),
  ]
  for (const c of cells) expect(build(s, c, 'seahorse')).toBe(true)
  expect(s.buildings.length).toBeGreaterThan(12)
  for (const entry of ENTRANCES) expect(routeCells(s, entry).at(-1)).toBe(HOME)
})
it('upgrades castle health by five without erasing existing damage, and caps at three upgrades', () => {
  const s = prepared()
  s.gold = 1000
  s.lives = 8
  for (const cost of [60, 120, 220]) {
    expect(castleUpgradeCost(s)).toBe(cost)
    expect(upgradeCastle(s)).toBe(true)
  }
  expect([s.lives, s.maxLives, s.castleLevel]).toEqual([23, 30, 3])
  expect(upgradeCastle(s)).toBe(false)
})
it('applies each monster’s own breach damage once and never awards coins for leaks', () => {
  const s = prepared()
  combat(s)
  spawnEnemy(s, 'boss', HOME)
  spawnEnemy(s, 'crab')
  s.enemies[1].speed = 0
  const gold = s.gold
  stepDefense(s, 0.05)
  expect(s.lives).toBe(10)
  expect(s.gold).toBe(gold)
  expect(s.kills).toBe(0)
  expect(s.enemies).toHaveLength(1)
  s.lives = 2
  spawnEnemy(s, 'armored', HOME)
  stepDefense(s, 0.05)
  expect(s.lives).toBe(0)
  expect(s.phase).toBe('lost')
})
it('deals damage on projectile arrival and recycles all projectile objects', () => {
  const s = prepared()
  build(s, cellAt(2, 11), 'seahorse')
  combat(s)
  spawnEnemy(s, 'armored', cellAt(1, 11))
  const e = s.enemies[0]
  e.speed = 0
  stepDefense(s, 0.05)
  expect(s.projectiles).toHaveLength(1)
  expect(e.hp).toBe(e.maxHp)
  advance(s, 0.25)
  expect(e.hp).toBe(e.maxHp - 12)
  expect(s.projectilePool.length + s.projectiles.length).toBe(PROJECTILE_LIMIT)
})
it.each(['octopus', 'seahorse'] as const)(
  '%s damages only the locked target even when monsters overlap',
  (kind) => {
    const s = prepared()
    build(s, cellAt(2, 11), kind)
    combat(s)
    spawnEnemy(s, 'armored', cellAt(1, 11))
    spawnEnemy(s, 'armored', cellAt(1, 11))
    const [target, neighbour] = s.enemies
    target.speed = 0
    neighbour.speed = 0
    stepDefense(s, 0.05)
    expect(s.projectiles[0].target).toBe(target.id)
    expect(target.hp).toBe(target.maxHp)
    advance(s, 0.25)
    expect(target.hp).toBe(target.maxHp - BUILDINGS[kind].damage[0])
    expect(neighbour.hp).toBe(neighbour.maxHp)
  },
)
it('heals nearby other monsters by four percent with no same-tick stacking', () => {
  const s = prepared()
  combat(s)
  spawnEnemy(s, 'crab', cellAt(4, 6))
  spawnEnemy(s, 'healer', cellAt(3, 6))
  spawnEnemy(s, 'healer', cellAt(5, 6))
  for (const e of s.enemies) {
    e.speed = 0
    e.healTimer = 0
  }
  const e = s.enemies[0]
  e.hp = 10
  stepDefense(s, 0.05)
  expect(e.hp).toBe(11)
})
it.each(['octopus', 'seahorse'] as const)(
  '%s does not transfer an in-flight shot to a recycled enemy object',
  (kind) => {
    const s = prepared()
    build(s, cellAt(2, 11), kind)
    combat(s)
    spawnEnemy(s, 'crab', cellAt(1, 11))
    const old = s.enemies[0]
    old.speed = 0
    stepDefense(s, 0.05)
    const oldId = old.id
    expect(s.projectiles[0].target).toBe(oldId)
    old.hp = 0
    stepDefense(s, 0.05)
    spawnEnemy(s, 'armored', cellAt(1, 11))
    const replacement = s.enemies[0]
    replacement.speed = 0
    expect(replacement).toBe(old)
    expect(replacement.id).not.toBe(oldId)
    advance(s, 0.3)
    expect(replacement.hp).toBe(replacement.maxHp)
  },
)
it('keeps dense populations, lookup maps, effects and object pools bounded', () => {
  const s = prepared()
  s.gold = 10000
  build(s, cellAt(2, 11), 'octopus')
  combat(s)
  for (let i = 0; i < ENEMY_LIMIT; i++) {
    expect(
      spawnEnemy(s, 'armored', cellAt(i % GRID.columns, 4 + (Math.floor(i / GRID.columns) % 3))),
    ).toBe(true)
    const e = s.enemies.at(-1)!
    e.speed = 0
    e.hp = 10000
  }
  expect(spawnEnemy(s, 'crab')).toBe(false)
  const flowBuilds = s.stats.flowBuilds
  advance(s, 10)
  expect(s.stats.flowBuilds).toBe(flowBuilds)
  expect(s.enemies.length + s.enemyPool.length).toBe(ENEMY_LIMIT)
  expect(s.byId.size).toBe(s.enemies.length)
  expect(s.projectiles.length + s.projectilePool.length).toBe(PROJECTILE_LIMIT)
  expect(s.effects.length + s.effectPool.length).toBe(EFFECT_LIMIT)
  expect(s.stats.peakEnemies).toBe(256)
  expect(s.stats.targetVisits).toBeLessThan(256 * 20 * 10)
})
it('contains thirty finite waves, with bosses only at ten, twenty and thirty', () => {
  expect(WAVES).toHaveLength(30)
  expect(ENTRANCES).toHaveLength(2)
  expect(WAVES.slice(0, 20).map((w) => Object.values(w.counts).reduce((a, b) => a + b, 0))).toEqual(
    [8, 18, 22, 26, 30, 34, 38, 44, 48, 23, 50, 56, 60, 64, 73, 78, 83, 88, 93, 48],
  )
  for (let i = 0; i < 30; i++) {
    const s = prepared()
    s.wave = i
    startWave(s)
    expect(s.plan.filter((k) => MONSTERS[k].boss)).toEqual(
      i === 9 ? ['boss'] : i === 19 ? ['overlord'] : i === 29 ? ['abyss'] : [],
    )
  }
})
it('can clear all thirty waves with a paid maze and anti-air strategy across a small seed sample', () => {
  let wins = 0
  for (const seed of [1, 7, 42, 91, 731, 2026]) {
    const { state: s, checkpoints } = campaignStrategy(seed)
    expect(['won', 'lost']).toContain(s.phase)
    expect(s.gold).toBeGreaterThanOrEqual(0)
    if (s.phase === 'won') {
      wins++
      expect(s.wave).toBe(30)
      expect(s.finalDefeated).toBe(true)
      expect(checkpoints).toHaveLength(29)
      expect(s.lives).toBeGreaterThan(0)
    } else expect(s.lives === 0 || s.finalEscaped).toBe(true)
  }
  expect(wins).toBeGreaterThan(0)
})

it('uses the shortest weighted detour without cutting blocked corners and refreshes after a sale', () => {
  const s = prepared()
  s.gold = 10000
  const start = cellAt(6, 10),
    wall = cellAt(6, 11)
  refreshFlow(s)
  expect(s.flow[start]).toBeCloseTo(4)
  expect(build(s, wall, 'wall')).toBe(true)
  expect(s.flow[start]).toBeCloseTo(4 + Math.SQRT2, 4)
  expect([cellAt(5, 10), cellAt(7, 10)]).toContain(s.next[start])
  const effectCount = s.effects.length
  expect(build(s, wall, 'wall')).toBe(false)
  expect(s.effects).toHaveLength(effectCount)
  expect(sell(s, wall)).toBe(true)
  expect(s.flow[start]).toBeCloseTo(4)
})
it('emits bounded placement dust, purchase feedback and castle damage events', () => {
  const s = prepared()
  build(s, cellAt(3, 11), 'octopus')
  expect(s.effects.map((e) => e.kind)).toEqual(['build', 'purchase'])
  expect(new Set(s.effects.map((e) => e.id)).size).toBe(2)
  upgrade(s, cellAt(3, 11))
  expect(s.effects.at(-1)?.kind).toBe('purchase')
  s.gold = 100
  upgradeCastle(s)
  expect(s.effects.at(-1)?.kind).toBe('purchase')
  combat(s)
  spawnEnemy(s, 'armored', HOME)
  stepDefense(s, 0.05)
  expect(s.lives).toBe(17)
  expect(s.effects.some((e) => e.kind === 'breach')).toBe(true)
})
