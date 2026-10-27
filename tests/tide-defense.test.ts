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
  type Enemy,
} from '../src/features/arcade/tide-defense-engine'

function prepared() {
  const s = createDefense()
  beginDefense(s)
  return s
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
  expect(buildTower(s, 0, 'puffer')).toBe(true)
  expect(s.shells).toBe(125)
  expect(buildTower(s, 0, 'jelly')).toBe(false)
  expect(buildTower(s, 0.2, 'net')).toBe(false)
  expect(upgradeTower(s, 0)).toBe(true)
  expect(s.towers[0].level).toBe(2)
  expect(towerRange(s.towers[0])).toBeGreaterThan(112)
  s.shells = 0
  expect(upgradeTower(s, 0)).toBe(false)
  const spent = s.towers[0].spent
  expect(sellTower(s, 0)).toBe(true)
  expect(s.shells).toBe(Math.floor(spent * 0.7))
  expect(s.towers).toEqual([])
  expect(sellTower(s, 0)).toBe(false)
})

it('requires a defense before starting and freezes combat, construction and clocks on pause', () => {
  const s = prepared()
  expect(startWave(s)).toBe(false)
  buildTower(s, 0, 'puffer')
  expect(startWave(s)).toBe(true)
  expect(startWave(s)).toBe(false)
  stepDefense(s, 0.05)
  const before = s.elapsed
  s.phase = 'paused'
  stepDefense(s, 100)
  expect(s.elapsed).toBe(before)
  expect(buildTower(s, 1, 'jelly')).toBe(false)
  expect(sellTower(s, 0)).toBe(false)
})

it('slows enemies in a net and only rewards a defeated enemy once across multiple towers', () => {
  const s = prepared()
  s.shells = 500
  buildTower(s, 0, 'net')
  buildTower(s, 1, 'puffer')
  startWave(s)
  const nearFirst = enemy(120, 500)
  nearFirst.speed = 0
  s.enemies = [nearFirst]
  s.spawnTimer = 99
  stepDefense(s, 0.05)
  stepDefense(s, 0.05)
  expect(nearFirst.slow).toBeLessThan(1)
  s.enemies = [enemy(190, 1)]
  s.towers.forEach((t) => (t.cooldown = 0))
  const shells = s.shells
  stepDefense(s, 0.05)
  stepDefense(s, 0.05)
  expect(s.kills).toBe(1)
  expect(s.shells).toBe(shells + 8)
})

it('hits up to three nearby enemies with lightning and does not hit distant ones', () => {
  const s = prepared()
  buildTower(s, 0, 'jelly')
  startWave(s)
  s.spawnTimer = 99
  s.enemies = [enemy(105), enemy(135), enemy(165), enemy(900)]
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
  buildTower(s, 0, 'net')
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
  buildTower(s, 0, 'puffer')
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
  SITES.forEach((_, site) => buildTower(s, site, site % 2 ? 'net' : 'jelly'))
  startWave(s)
  s.spawnTimer = 99
  s.enemies = Array.from({ length: 300 }, (_, i) => ({ ...enemy(100 + (i % 40) * 20, 500), id: i }))
  for (let frame = 0; frame < 100; frame++) stepDefense(s, 0.016)
  expect(s.enemies.length).toBeGreaterThan(200)
  expect(s.effects.length).toBeLessThanOrEqual(220)
  expect(s.enemies.every((e) => Number.isFinite(e.distance) && Number.isFinite(e.hp))).toBe(true)
})
