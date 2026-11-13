// @vitest-environment node
import fs from 'node:fs'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import {
  BUILDINGS,
  MONSTERS,
  WAVES,
  HOME,
  SITES,
  GRID,
  PROJECTILE_LIMIT,
  createDefense,
  beginDefense,
  build,
  upgrade,
  canPlace,
  spawnEnemy,
  startWave,
  stepDefense,
  cellAt,
  type DefenseState,
  type EnemyKind,
  type TowerKind,
} from '../src/features/arcade/tower-defense-engine'
import { healthBoost, healthScale } from '../src/features/arcade/tower-defense-waves'

function arena() {
  const s = createDefense(42)
  beginDefense(s)
  s.gold = 10000
  return s
}
function combat(s: DefenseState) {
  startWave(s)
  s.spawned = s.plan.length
}
function enemy(s: DefenseState, kind: EnemyKind, cell = cellAt(6, 7)) {
  expect(spawnEnemy(s, kind, cell)).toBe(true)
  const e = s.enemies.at(-1)!
  e.hp = e.maxHp = 10000
  e.speed = 0
  return e
}
function ticks(s: DefenseState, n: number) {
  for (let i = 0; i < n; i++) stepDefense(s, 0.05)
}
it('makes wave thirty a flying boss that ignores ground-only attacks and takes missile damage', () => {
  expect(MONSTERS.abyss.layer).toBe('air')
  expect(WAVES[29].hint).toContain('공중 보스')
  const s = arena()
  build(s, cellAt(6, 8), 'seahorse')
  combat(s)
  const boss = enemy(s, 'abyss')
  ticks(s, 25)
  expect(boss.hp).toBe(boss.maxHp)
  build(s, cellAt(5, 8), 'missile')
  ticks(s, 25)
  expect(boss.hp).toBeLessThan(boss.maxHp)
})
it('flies directly across buildings and reaches the castle without following the flow field', () => {
  const s = arena()
  for (let y = 2; y < 14; y++) build(s, cellAt(6, y), 'wall')
  combat(s)
  spawnEnemy(s, 'flyingFish', cellAt(6, 0))
  const e = s.enemies[0],
    startY = e.y,
    hp = s.lives
  ticks(s, 100)
  expect(e.x).toBe(SITES[HOME].x)
  expect(e.y - startY).toBeCloseTo(MONSTERS.flyingFish.speed * GRID.cell * 5)
  expect(e.hp).toBe(e.maxHp)
  ticks(s, 310)
  expect(s.enemies).toHaveLength(0)
  expect(s.lives).toBe(hp - MONSTERS.flyingFish.leak)
  expect(s.kills).toBe(0)
})
it('allows constructing under a flying enemy while preserving ground entrance routes', () => {
  const s = arena()
  combat(s)
  enemy(s, 'flyingFish', cellAt(6, 7))
  expect(canPlace(s, cellAt(6, 7), 'wall')).toBe('')
  expect(build(s, cellAt(6, 7), 'wall')).toBe(true)
  enemy(s, 'crab', cellAt(5, 7))
  expect(canPlace(s, cellAt(5, 7), 'wall')).not.toBe('')
})
it.each(['octopus', 'seahorse', 'mortar', 'flame', 'laser', 'plasma', 'anemone'] as TowerKind[])(
  '%s ignores flying enemies even when they are closer than a ground target',
  (kind) => {
    const s = arena()
    build(s, cellAt(6, 8), kind)
    combat(s)
    const air = enemy(s, 'flyingFish'),
      ground = enemy(s, 'armored')
    ticks(s, 24)
    expect(air.hp).toBe(air.maxHp)
    expect(ground.hp).toBeLessThan(ground.maxHp)
  },
)
it.each(['missile', 'salvo'] as const)(
  '%s only damages air and supports three upgrades',
  (kind) => {
    const s = arena()
    build(s, cellAt(6, 8), kind)
    for (let i = 0; i < 3; i++) expect(upgrade(s, cellAt(6, 8))).toBe(true)
    expect(upgrade(s, cellAt(6, 8))).toBe(false)
    combat(s)
    const ground = enemy(s, 'armored'),
      air = enemy(s, 'cuttlefish')
    ticks(s, 12)
    expect(ground.hp).toBe(ground.maxHp)
    expect(air.maxHp - air.hp).toBeCloseTo(BUILDINGS[kind].damage[3])
    expect(s.projectilePool.length + s.projectiles.length).toBe(PROJECTILE_LIMIT)
  },
)
it('salvo launches at four distinct air targets, and only one missile at a lone enemy', () => {
  for (const count of [1, 6]) {
    const s = arena()
    build(s, cellAt(6, 8), 'salvo')
    combat(s)
    const group = Array.from({ length: count }, () => enemy(s, 'airJelly'))
    ticks(s, 1)
    expect(s.projectiles).toHaveLength(Math.min(count, 4))
    expect(new Set(s.projectiles.map((p) => p.target)).size).toBe(Math.min(count, 4))
    expect(s.projectiles.every((p) => p.missile)).toBe(true)
    ticks(s, 10)
    expect(group.filter((e) => e.hp < e.maxHp)).toHaveLength(Math.min(count, 4))
  }
})
it('salvo delivers the buffed 26 damage per target and fires again after two seconds', () => {
  const s = arena()
  build(s, cellAt(6, 8), 'salvo')
  combat(s)
  const group = Array.from({ length: 4 }, () => enemy(s, 'airJelly'))
  for (const e of group) e.hp = e.maxHp = 10000
  ticks(s, 1)
  expect(s.projectiles).toHaveLength(4)
  expect(s.projectiles.every((p) => p.damage === 26)).toBe(true)
  ticks(s, 38)
  expect(s.stats.shots).toBe(4)
  ticks(s, 3)
  expect(s.stats.shots).toBe(8)
  ticks(s, 12)
  for (const e of group) expect(e.maxHp - e.hp).toBe(52)
})
it('missiles track moving air targets with a curved trajectory', () => {
  const s = arena()
  build(s, cellAt(6, 8), 'missile')
  combat(s)
  const e = enemy(s, 'flyingFish')
  e.speed = MONSTERS.flyingFish.speed * GRID.cell
  ticks(s, 1)
  const p = s.projectiles[0]
  ticks(s, 4)
  expect(p.ty).toBe(e.y)
  const fraction = 1 - p.life / p.duration
  expect(
    Math.hypot(p.x - (p.sx + (p.tx - p.sx) * fraction), p.y - (p.sy + (p.ty - p.sy) * fraction)),
  ).toBeGreaterThan(1)
  ticks(s, 6)
  expect(e.hp).toBeLessThan(e.maxHp)
})
it('mako telegraphs then rushes for three seconds before recovering', () => {
  const s = arena()
  combat(s)
  const e = enemy(s, 'mako', cellAt(6, 0))
  e.speed = MONSTERS.mako.speed * GRID.cell
  ticks(s, 10)
  expect(e.rushing).toBe(false)
  ticks(s, 15)
  expect(e.rushing).toBe(true)
  ticks(s, 60)
  expect(e.rushing).toBe(false)
})
it('introduces every new enemy at the announced wave and scales existing enemy health', () => {
  const debut = { flyingFish: 8, shark: 12, dolphin: 15, airJelly: 15, mako: 18, cuttlefish: 22 }
  for (const [kind, wave] of Object.entries(debut)) {
    expect(WAVES.slice(0, wave - 1).every((w) => !w.counts[kind as EnemyKind])).toBe(true)
    expect(WAVES[wave - 1].counts[kind as EnemyKind]).toBeGreaterThan(0)
    const s = arena()
    s.wave = wave - 1
    combat(s)
    spawnEnemy(s, kind as EnemyKind)
    expect(s.enemies[0].maxHp).toBe(Math.round(MONSTERS[kind as EnemyKind].hp * healthScale(wave)))
  }
  for (const wave of [1, 6, 16, 30]) {
    const s = arena()
    s.wave = wave - 1
    combat(s)
    spawnEnemy(s, 'crab')
    expect(s.enemies[0].maxHp).toBe(Math.round(24 * healthScale(wave) * healthBoost(wave)))
  }
  expect([MONSTERS.boss.hp, MONSTERS.overlord.hp, MONSTERS.abyss.hp]).toEqual([3040, 8100, 14850])
})
it('packs all new enemies into transparent, nonempty atlas cells with safe margins', async () => {
  const { data, info } = await sharp(
    fs.readFileSync('public/arcade/tower-defense/enemies-v6-sprite.png'),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect([info.width, info.height]).toEqual([1024, 18 * 256])
  for (let frame = 48; frame < 72; frame++) {
    let opaque = 0,
      edge = 0
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const a =
          data[((Math.floor(frame / 4) * 256 + y) * info.width + (frame % 4) * 256 + x) * 4 + 3]
        if (a > 128) opaque++
        if (x < 4 || x > 251 || y < 4 || y > 251) edge = Math.max(edge, a)
      }
    expect(opaque).toBeGreaterThan(1000)
    expect(edge).toBe(0)
  }
})
