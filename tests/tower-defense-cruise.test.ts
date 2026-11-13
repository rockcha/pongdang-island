// @vitest-environment node
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import {
  BUILDINGS,
  SITES,
  PROJECTILE_LIMIT,
  beginDefense,
  build,
  cellAt,
  createDefense,
  damageOf,
  moveTower,
  sell,
  spawnEnemy,
  specialize,
  specializationOptions,
  startWave,
  stepDefense,
  upgrade,
  type EnemyKind,
} from '../src/features/arcade/tower-defense-engine'
import { missileAngle, missilePoint } from '../src/features/arcade/tower-defense-flight'

function arena(spec?: 'bombard' | 'tracking') {
  const s = createDefense(42)
  beginDefense(s)
  s.gold = 10000
  build(s, cellAt(6, 11), 'cruise')
  if (spec) {
    for (let i = 0; i < 3; i++) upgrade(s, cellAt(6, 11))
    s.wave = 30
    expect(specialize(s, cellAt(6, 11), spec)).toBe(true)
  }
  startWave(s)
  s.spawned = s.plan.length
  return s
}
function enemy(s: ReturnType<typeof arena>, kind: EnemyKind, x = 6, y = 5) {
  expect(spawnEnemy(s, kind, cellAt(x, y))).toBe(true)
  const e = s.enemies.at(-1)!
  e.speed = 0
  e.hp = e.maxHp = 10000
  e.shield = 0
  return e
}
function ticks(s: ReturnType<typeof arena>, count: number) {
  for (let i = 0; i < count; i++) stepDefense(s, 0.05)
}
it.each(['armored', 'cuttlefish'] as const)(
  'hits a distant %s with a slow, homing 240-damage missile and keeps a six-second cadence',
  (kind) => {
    const s = arena(),
      e = enemy(s, kind, 6, 4)
    ticks(s, 1)
    expect(s.projectiles[0]).toMatchObject({
      source: 'cruise',
      damage: 240,
      missile: true,
      blast: false,
      target: e.id,
    })
    expect(s.projectiles[0].duration).toBeCloseTo(1.4)
    const shot = s.projectiles[0]
    e.x += 10
    ticks(s, 1)
    expect(shot.tx).toBe(e.x)
    expect(shot.y).toBeLessThan(SITES[s.buildings[0].cell].y)
    ticks(s, 31)
    expect(e.maxHp - e.hp).toBe(240)
    ticks(s, 85)
    expect(s.stats.shots).toBe(1)
    ticks(s, 5)
    expect(s.stats.shots).toBe(2)
    expect(s.projectiles.length + s.projectilePool.length).toBe(PROJECTILE_LIMIT)
  },
)
it('prioritizes a boss over an elite with greater max HP, then chooses the toughest non-boss', () => {
  const s = arena(),
    elite = enemy(s, 'armored'),
    boss = enemy(s, 'abyss', 7, 5)
  elite.hp = elite.maxHp = 1000000
  boss.hp = boss.maxHp = 1000
  ticks(s, 1)
  expect(s.projectiles[0].target).toBe(boss.id)
  boss.hp = 0
  elite.hp = elite.maxHp = 10000
  const weak = enemy(s, 'crab', 5, 5)
  weak.hp = weak.maxHp = 9000
  s.buildings[0].cooldown = 0
  ticks(s, 1)
  expect(s.projectiles.at(-1)!.target).toBe(elite.id)
})
it('respects its circular eight-cell range and waits when only out-of-range targets exist', () => {
  const s = arena(),
    e = enemy(s, 'armored', 6, 2)
  expect(BUILDINGS.cruise.range[0]).toBe(8)
  ticks(s, 1)
  expect(s.stats.shots).toBe(0)
  Object.assign(e, SITES[cellAt(6, 3)], { cell: cellAt(6, 3), nav: cellAt(6, 3) })
  ticks(s, 1)
  expect(s.stats.shots).toBe(1)
})
it('offers two dedicated specializations, buffs tracking damage and shortens flight time', () => {
  expect(specializationOptions('cruise')).toEqual(['bombard', 'tracking'])
  const s = arena('tracking'),
    e = enemy(s, 'armored')
  expect(damageOf(s.buildings[0])).toBeCloseTo(748.8)
  expect(specialize(s, s.buildings[0].cell, 'power')).toBe(false)
  ticks(s, 1)
  expect(s.projectiles[0].duration).toBeCloseTo(0.9)
  ticks(s, 20)
  expect(e.maxHp - e.hp).toBeCloseTo(748.8)
})
it('keeps a homing bombardment and its capped mixed-layer splash after moving or selling the source', () => {
  for (const action of ['move', 'sell']) {
    const s = arena('bombard'),
      primary = enemy(s, 'armored'),
      air = enemy(s, 'cuttlefish'),
      other = enemy(s, 'armored'),
      extra = enemy(s, 'armored'),
      far = enemy(s, 'armored', 8, 5)
    primary.maxHp = 20000
    primary.hp = 10000
    ticks(s, 1)
    const p = s.projectiles[0]
    expect(p).toMatchObject({ blast: true, missile: true, area: 0.75, cap: 3, target: primary.id })
    if (action === 'move') moveTower(s, s.buildings[0].cell, cellAt(9, 11))
    else sell(s, s.buildings[0].cell)
    for (const e of [primary, air, other, extra]) e.x += 12
    ticks(s, 3)
    expect(p.tx).toBe(primary.x)
    ticks(s, 28)
    expect(10000 - primary.hp).toBe(624)
    expect(10000 - air.hp).toBeCloseTo(249.6)
    expect(10000 - other.hp).toBeCloseTo(249.6)
    expect(extra.hp).toBe(10000)
    expect(far.hp).toBe(10000)
  }
})
it('clears pooled bombardment fields on a subsequent native guided missile', () => {
  const s = arena('bombard')
  enemy(s, 'armored')
  ticks(s, 1)
  const shot = s.projectiles[0]
  sell(s, s.buildings[0].cell)
  ticks(s, 33)
  expect(s.projectilePool).toContain(shot)
  build(s, cellAt(6, 8), 'missile')
  enemy(s, 'cuttlefish', 6, 5)
  ticks(s, 1)
  expect(s.projectiles[0]).toBe(shot)
  expect(shot).toMatchObject({
    source: 'missile',
    blast: false,
    area: 0,
    cap: 1,
    targetLayer: 'air',
    hybrid: false,
  })
})
it('keeps the vertical launch and exact curve endpoints with finite bearings at every sample', () => {
  const p = { source: 'cruise', sx: 100, sy: 400, tx: 280, ty: 150 },
    out = { x: 0, y: 0 }
  missilePoint(p, 0, out)
  expect(out).toEqual({ x: 100, y: 400 })
  expect(missileAngle(p, 0)).toBeCloseTo(-Math.PI / 2)
  missilePoint(p, 0.1, out)
  expect(out.y).toBeLessThan(p.sy)
  expect(out.x - p.sx).toBeLessThan(6)
  for (let i = 0; i <= 100; i++) {
    missilePoint(p, i / 100, out)
    expect(Number.isFinite(out.x + out.y + missileAngle(p, i / 100))).toBe(true)
  }
  missilePoint(p, 1, out)
  expect(out).toEqual({ x: 280, y: 150 })
})
it('ships four transparent, aligned firing frames and matching editable SVG artwork', async () => {
  const manifest = JSON.parse(
    fs.readFileSync('public/arcade/tower-defense/cruise-art-manifest.json', 'utf8'),
  )
  for (const file of manifest.files)
    expect(
      createHash('sha256')
        .update(fs.readFileSync('public/' + file.path))
        .digest('hex'),
    ).toBe(file.sha256)
  const { data, info } = await sharp('public/arcade/tower-defense/cruise-v1-sprite.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect([info.width, info.height]).toEqual([1024, 256])
  const bounds = []
  for (let frame = 0; frame < 4; frame++) {
    let minX = 256,
      minY = 256,
      maxX = 0,
      maxY = 0
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++)
        if (data[(y * info.width + frame * 256 + x) * 4 + 3] > 127) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
    expect(Math.min(minX, minY, 255 - maxX, 255 - maxY)).toBeGreaterThan(8)
    bounds.push([minX, maxX, maxY])
  }
  expect(bounds.every((b) => JSON.stringify(b) === JSON.stringify(bounds[0]))).toBe(true)
  expect(fs.readFileSync('public/arcade/tower-defense/cruise-v1.svg', 'utf8')).not.toMatch(
    /<image|<script/,
  )
})
