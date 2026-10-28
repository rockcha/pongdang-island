// @vitest-environment node
import { expect, it } from 'vitest'
import {
  beginDefense,
  buildTower,
  createDefense,
  ROUTE,
  ROUTE_LENGTH,
  routePoint,
  sellTower,
  SITES,
  startWave,
  stepDefense,
  towerRange,
  upgradeTower,
  waveSize,
  GRID,
  WALL_LIMIT,
  ENTRANCE,
  ISLAND,
  gridCell,
  findRoute,
  previewWall,
  placeWall,
  removeWall,
  type DefenseState,
  type TowerKind,
  type Enemy,
} from '../src/features/arcade/tide-defense-engine'

function prepared() {
  const s = createDefense()
  beginDefense(s)
  return s
}
const A = gridCell(2, 4),
  B = gridCell(4, 4)
function install(s: DefenseState, site: number, kind: TowerKind) {
  if (!s.walls.includes(site)) expect(placeWall(s, site)).toBe(true)
  return buildTower(s, site, kind)
}
function enemy(distance: number, hp = 100): Enemy {
  return {
    id: 999,
    kind: 'fish',
    distance,
    hp,
    maxHp: hp,
    speed: 50,
    reward: 8,
    leak: 1,
    slow: 1,
    slowTime: 0,
  }
}

it('follows each corner of the single route and ends at the island', () => {
  let distance = 0
  expect(routePoint(0)).toMatchObject(ROUTE[0])
  for (let i = 1; i < ROUTE.length; i++) {
    distance += Math.hypot(ROUTE[i].x - ROUTE[i - 1].x, ROUTE[i].y - ROUTE[i - 1].y)
    expect(routePoint(distance)).toMatchObject(ROUTE[i])
  }
  expect(routePoint(ROUTE_LENGTH + 100)).toMatchObject(ROUTE.at(-1)!)
})

it('charges placement and upgrades once, rejects occupied or invalid sites and refunds 70 percent', () => {
  const s = prepared()
  expect(buildTower(s, A, 'puffer')).toBe(false)
  expect(install(s, A, 'puffer')).toBe(true)
  expect(s.shells).toBe(125)
  expect(buildTower(s, A, 'jelly')).toBe(false)
  expect(buildTower(s, 0.2, 'net')).toBe(false)
  expect(upgradeTower(s, A)).toBe(true)
  expect(s.towers[0].level).toBe(2)
  expect(towerRange(s.towers[0])).toBeGreaterThan(112)
  s.shells = 0
  expect(upgradeTower(s, A)).toBe(false)
  const spent = s.towers[0].spent
  expect(sellTower(s, A)).toBe(true)
  expect(s.shells).toBe(Math.floor(spent * 0.7))
  expect(s.towers).toEqual([])
  expect(sellTower(s, A)).toBe(false)
  expect(s.walls).toContain(A)
})

it('requires a defense before starting and freezes combat, construction and clocks on pause', () => {
  const s = prepared()
  expect(startWave(s)).toBe(false)
  install(s, A, 'puffer')
  expect(startWave(s)).toBe(true)
  expect(startWave(s)).toBe(false)
  stepDefense(s, 0.05)
  const before = s.elapsed
  s.phase = 'paused'
  stepDefense(s, 100)
  expect(s.elapsed).toBe(before)
  expect(buildTower(s, 1, 'jelly')).toBe(false)
  expect(sellTower(s, A)).toBe(false)
})

it('slows enemies in a net and only rewards a defeated enemy once across multiple towers', () => {
  const s = prepared()
  s.shells = 500
  install(s, A, 'net')
  install(s, B, 'puffer')
  startWave(s)
  const nearFirst = enemy(120, 500)
  nearFirst.speed = 0
  s.enemies = [nearFirst]
  s.spawnTimer = 99
  stepDefense(s, 0.05)
  stepDefense(s, 0.05)
  expect(nearFirst.slow).toBeLessThan(1)
  s.enemies = [enemy(180, 1)]
  s.towers.forEach((t) => (t.cooldown = 0))
  const shells = s.shells
  stepDefense(s, 0.05)
  stepDefense(s, 0.05)
  expect(s.kills).toBe(1)
  expect(s.shells).toBe(shells + 8)
})

it('hits up to three nearby enemies with lightning and does not hit distant ones', () => {
  const s = prepared()
  install(s, A, 'jelly')
  startWave(s)
  s.spawnTimer = 99
  s.enemies = [enemy(105), enemy(135), enemy(165), enemy(400)]
  s.enemies.forEach((e, i) => {
    e.id = i
    e.speed = 0
  })
  stepDefense(s, 0.05)
  stepDefense(s, 0.05)
  expect(s.enemies.slice(0, 3).every((e) => e.hp < 100)).toBe(true)
  expect(s.enemies[3].hp).toBe(100)
})

it('leaks damage once, loses at zero lives and rebuilds cleanly on restart', () => {
  const s = prepared()
  install(s, A, 'net')
  startWave(s)
  s.lives = 1
  s.spawnTimer = 99
  s.enemies = [enemy(ROUTE_LENGTH)]
  stepDefense(s, 0.05)
  expect(s.phase).toBe('lost')
  expect(s.lives).toBe(0)
  const fresh = prepared()
  expect(fresh.lives).toBe(20)
  expect(fresh.shells).toBe(180)
  expect(fresh.towers).toEqual([])
})

it('requires a manual start between waves and reaches the fifth wave boss and victory', () => {
  const s = prepared()
  install(s, A, 'puffer')
  let bosses = 0
  for (let wave = 1; wave <= 5; wave++) {
    expect(startWave(s)).toBe(true)
    expect(s.wave).toBe(wave)
    let spawned = 0
    for (let i = 0; i < 3000 && s.phase === 'playing'; i++) {
      stepDefense(s, 0.05)
      for (const e of s.enemies) {
        if (e.kind === 'boss') bosses++
        e.hp = 0
        spawned++
      }
    }
    expect(spawned).toBe(waveSize(wave))
    expect(s.phase).toBe(wave === 5 ? 'won' : 'build')
  }
  expect(bosses).toBe(1)
})

it('handles a large enemy group without a React entity tree or unbounded effects', () => {
  const s = prepared()
  s.shells = 10000
  Array.from({ length: GRID.columns }, (_, column) => gridCell(column, 4))
    .concat(gridCell(4, 6))
    .forEach((site, index) => install(s, site, index % 2 ? 'net' : 'jelly'))
  startWave(s)
  s.spawnTimer = 99
  s.enemies = Array.from({ length: 300 }, (_, i) => ({ ...enemy(90 + (i % 20) * 9, 500), id: i }))
  for (let frame = 0; frame < 100; frame++) stepDefense(s, 0.016)
  expect(s.enemies.length).toBeGreaterThan(200)
  expect(s.effects.length).toBeLessThanOrEqual(220)
  expect(s.enemies.every((e) => Number.isFinite(e.distance) && Number.isFinite(e.hp))).toBe(true)
})

it('previews the same shortest detour that installation commits, without changing the board', () => {
  const s = prepared(),
    short = s.routeLength
  for (let row = 0; row < 9; row++) expect(placeWall(s, gridCell(4, row))).toBe(true)
  const before = structuredClone(s),
    candidate = gridCell(4, 9),
    preview = previewWall(s, candidate)
  expect(s).toEqual(before)
  expect(preview.valid).toBe(true)
  expect(preview.plan!.length).toBeGreaterThan(short)
  expect(placeWall(s, candidate)).toBe(true)
  expect(s.route).toEqual(preview.plan!.points)
  expect(s.path).toEqual(preview.plan!.cells)
  expect(s.routeLength).toBe(860)
  expect(s.path).toContain(gridCell(4, 10))
  expect(s.path.every((cell) => !s.walls.includes(cell))).toBe(true)
  for (let i = 1; i < s.path.length; i++) {
    const a = s.path[i - 1],
      b = s.path[i]
    expect(
      Math.abs((a % GRID.columns) - (b % GRID.columns)) +
        Math.abs(Math.floor(a / GRID.columns) - Math.floor(b / GRID.columns)),
    ).toBe(1)
  }
})

it('rejects a sealed entrance and invalid cells without spending a wall or changing the route', () => {
  const s = prepared()
  expect(placeWall(s, gridCell(0, 4))).toBe(true)
  expect(placeWall(s, gridCell(0, 6))).toBe(true)
  const before = structuredClone(s),
    last = gridCell(1, 5)
  expect(previewWall(s, last)).toMatchObject({ valid: false, reason: 'blocked', plan: null })
  expect(placeWall(s, last)).toBe(false)
  expect(s).toEqual(before)
  expect(findRoute([gridCell(0, 4), gridCell(0, 6), last])).toBeNull()
  for (const cell of [ENTRANCE, ISLAND, -1, SITES.length, 1.5, NaN])
    expect(placeWall(s, cell)).toBe(false)
  expect(s).toEqual(before)
})

it('provides exactly ten reusable walls and requires selling a tower before reclaiming its base', () => {
  const s = prepared(),
    shells = s.shells
  const cells = Array.from({ length: GRID.columns }, (_, i) => gridCell(i, 0)).concat(
    gridCell(4, 1),
  )
  for (const cell of cells) expect(placeWall(s, cell)).toBe(true)
  expect(s.walls).toHaveLength(WALL_LIMIT)
  expect(previewWall(s, A)).toMatchObject({ valid: false, reason: 'limit' })
  expect(placeWall(s, A)).toBe(false)
  expect(s.shells).toBe(shells)
  expect(removeWall(s, cells[0])).toBe(true)
  expect(removeWall(s, cells[0])).toBe(false)
  expect(placeWall(s, A)).toBe(true)
  expect(buildTower(s, A, 'net')).toBe(true)
  expect(removeWall(s, A)).toBe(false)
  expect(sellTower(s, A)).toBe(true)
  expect(removeWall(s, A)).toBe(true)
  expect(s.walls).toHaveLength(9)
})

it('freezes terrain through combat and pause, then permits free redesign between waves', () => {
  const s = prepared()
  install(s, A, 'puffer')
  placeWall(s, B)
  startWave(s)
  const route = s.route,
    walls = [...s.walls]
  for (const phase of ['playing', 'paused'] as const) {
    s.phase = phase
    expect(placeWall(s, gridCell(5, 6))).toBe(false)
    expect(removeWall(s, B)).toBe(false)
    expect(s.route).toBe(route)
    expect(s.walls).toEqual(walls)
  }
  s.phase = 'playing'
  expect(buildTower(s, B, 'net')).toBe(true)
  expect(sellTower(s, B)).toBe(true)
  expect(s.route).toBe(route)
  s.enemies = []
  s.spawned = waveSize(s.wave)
  stepDefense(s, 0.05)
  expect(s.phase).toBe('build')
  expect(removeWall(s, B)).toBe(true)
  expect(placeWall(s, gridCell(5, 6))).toBe(true)
})

it('targets, moves and leaks using the designed route rather than the empty-board route', () => {
  const s = prepared()
  for (let row = 0; row < 10; row++) placeWall(s, gridCell(4, row))
  buildTower(s, gridCell(4, 8), 'net')
  startWave(s)
  s.spawnTimer = 99
  const near = enemy(430),
    far = enemy(600, 500)
  near.speed = 0
  far.speed = 0
  far.id = 1000
  s.enemies = [near, far]
  expect(routePoint(near.distance, s.route)).toMatchObject(SITES[gridCell(4, 10)])
  stepDefense(s, 0.05)
  stepDefense(s, 0.05)
  expect(near.hp).toBeLessThan(100)
  expect(near.slow).toBeLessThan(1)
  expect(s.enemies).toContain(far)
  expect(s.lives).toBe(20)
  far.distance = s.routeLength
  stepDefense(s, 0.05)
  expect(s.enemies).not.toContain(far)
  expect(s.lives).toBe(19)
})

it('lets the starting budget defend the first wave with a detour and the three complementary towers', () => {
  const s = prepared()
  for (let row = 0; row < 10; row++) placeWall(s, gridCell(4, row))
  for (const [row, kind] of [
    [4, 'puffer'],
    [6, 'net'],
    [8, 'jelly'],
  ] as const)
    expect(buildTower(s, gridCell(4, row), kind)).toBe(true)
  expect(s.shells).toBe(0)
  startWave(s)
  for (let frame = 0; frame < 2000 && s.phase === 'playing'; frame++) stepDefense(s, 0.05)
  expect(s.phase).toBe('build')
  expect(s.lives).toBe(20)
  expect(s.kills).toBe(waveSize(1))
})
