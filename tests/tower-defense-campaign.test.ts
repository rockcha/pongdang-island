// @vitest-environment node
import { expect, it } from 'vitest'
import {
  createDefense,
  beginDefense,
  startWave,
  spawnEnemy,
  stepDefense,
  cellAt,
  SITES,
  HOME,
  ENTRANCES,
  ENEMY_LIMIT,
  canPlace,
  MONSTERS,
  type DefenseState,
  type Enemy,
  type EnemyKind,
} from '../src/features/arcade/tower-defense-engine'

function arena(wave = 1) {
  const s = createDefense(42)
  beginDefense(s)
  s.wave = wave - 1
  startWave(s)
  s.spawned = s.plan.length
  return s
}
function enemy(s: DefenseState, kind: EnemyKind, cell = cellAt(5, 7)) {
  expect(spawnEnemy(s, kind, cell)).toBe(true)
  const e = s.enemies.at(-1)!
  e.speed = 0
  return e
}
// Inject an arriving projectile to exercise the real shield/death/phase pipeline.
function hit(s: DefenseState, e: Enemy, damage: number) {
  const p = s.projectilePool.pop()!
  Object.assign(p, {
    blast: false,
    x: e.x,
    y: e.y,
    sx: e.x,
    sy: e.y,
    tx: e.x,
    ty: e.y,
    target: e.id,
    life: 0.01,
    duration: 0.01,
    damage,
    color: 0xffffff,
  })
  s.projectiles.push(p)
  stepDefense(s, 0.05)
}
it('spawns bosses at their announced gates and biases seven of ten ordinary spawns', () => {
  for (const [wave, kind, gate] of [
    [10, 'boss', 0],
    [20, 'overlord', 1],
    [30, 'abyss', 0],
  ] as const) {
    const s = arena(wave)
    s.spawned = s.plan.indexOf(kind)
    s.spawnTimer = 0
    stepDefense(s, 0.05)
    expect(s.enemies[0].kind).toBe(kind)
    expect(s.enemies[0].cell).toBe(ENTRANCES[gate])
  }
  for (const [wave, side] of [
    [7, 0],
    [9, 1],
  ] as const) {
    const s = arena(wave)
    s.plan = Array(10).fill('crab')
    s.spawned = 0
    for (let n = 0; n < 10; n++) {
      s.spawnTimer = 0
      stepDefense(s, 0.05)
      s.enemies.at(-1)!.speed = 0
    }
    expect(s.enemies.filter((e) => e.cell === ENTRANCES[side])).toHaveLength(7)
  }
})
it('absorbs shield damage before health and never regenerates the clam shield', () => {
  const s = arena(),
    e = enemy(s, 'shield'),
    shield = e.shield,
    hp = e.hp
  hit(s, e, 12)
  expect(e.shield).toBe(shield - 12)
  expect(e.hp).toBe(hp)
  hit(s, e, 12)
  expect(e.shield).toBe(0)
  expect(e.hp).toBe(hp - (24 - shield))
  for (let i = 0; i < 100; i++) stepDefense(s, 0.05)
  expect(e.shield).toBe(0)
})
it('splits once into two paid children at the parent location, preserving the wave', () => {
  const s = arena(),
    e = enemy(s, 'splitter'),
    gold = s.gold,
    point = { x: e.x, y: e.y }
  hit(s, e, e.hp)
  expect(s.phase).toBe('combat')
  expect(s.enemies.map((e) => e.kind)).toEqual(['mini', 'mini'])
  expect(s.enemies.every((e) => e.x === point.x && e.y === point.y)).toBe(true)
  expect(s.gold - gold).toBe(2)
  for (const child of [...s.enemies]) hit(s, child, child.hp)
  expect(s.kills).toBe(3)
  expect(s.enemies).toHaveLength(0)
  expect(s.gold - gold).toBe(4 + 55)
})
it('queues children without losing spawns when all pooled slots are occupied', () => {
  const s = arena(),
    parent = enemy(s, 'splitter')
  while (s.enemies.length < ENEMY_LIMIT) enemy(s, 'crab')
  hit(s, parent, parent.hp)
  expect(s.enemies).toHaveLength(ENEMY_LIMIT)
  expect(s.pending).toHaveLength(1)
  expect(canPlace(s, cellAt(5, 7), 'wall')).toContain('몬스터')
  s.enemies.find((e) => e.kind === 'crab')!.hp = 0
  stepDefense(s, 0.05)
  expect(s.pending).toHaveLength(0)
  expect(s.enemies.filter((e) => e.kind === 'mini')).toHaveLength(2)
  expect(s.byId.size + s.enemyPool.length).toBe(ENEMY_LIMIT)
})
it('gives the midboss a single shield and heals the castle only after a kill', () => {
  const s = arena(10),
    e = enemy(s, 'boss')
  s.lives = 6
  hit(s, e, e.maxHp * 0.5)
  expect(e.shield).toBe(250)
  hit(s, e, 251)
  expect(e.shield).toBe(0)
  hit(s, e, 1)
  expect(e.shield).toBe(0)
  hit(s, e, e.hp)
  expect(s.lives).toBe(11)
  const escaped = arena(10)
  escaped.lives = 10
  enemy(escaped, 'boss', HOME)
  stepDefense(escaped, 0.05)
  expect(escaped.lives).toBe(5)
})
it('summons exactly eight unrewarded minions at two final-boss thresholds', () => {
  const s = arena(20),
    e = enemy(s, 'overlord')
  hit(s, e, e.maxHp * 0.31)
  expect(s.enemies.filter((e) => e.kind === 'swarm')).toHaveLength(4)
  hit(s, e, 1)
  expect(s.enemies.filter((e) => e.kind === 'swarm')).toHaveLength(4)
  hit(s, e, e.maxHp * 0.35)
  expect(e.phaseFlags).toBe(3)
  expect(s.enemies.filter((e) => e.kind === 'swarm')).toHaveLength(8)
  expect(s.enemies.filter((e) => e.kind === 'swarm').every((e) => e.reward === 0)).toBe(true)
  hit(s, e, e.hp)
  expect(s.finalDefeated).toBe(false)
  expect(s.phase).toBe('combat')
  for (const child of [...s.enemies]) hit(s, child, child.hp)
  expect(s.phase).toBe('build')
})
it('requires a final boss kill even when the castle survives the breach', () => {
  const s = arena(30)
  s.lives = 30
  s.maxLives = 30
  enemy(s, 'abyss', HOME)
  stepDefense(s, 0.05)
  expect(s.lives).toBe(15)
  expect(s.finalEscaped).toBe(true)
  expect(s.finalDefeated).toBe(false)
  expect(s.phase).toBe('lost')
  const empty = arena(30)
  stepDefense(empty, 0.05)
  expect(empty.phase).toBe('lost')
})
it('triggers the final conch king phases once and wins only after the summoned rushers resolve', () => {
  const s = arena(30),
    e = enemy(s, 'abyss')
  hit(s, e, e.maxHp * 0.31)
  expect(e.shield).toBe(1000)
  hit(s, e, 1000)
  expect(e.shield).toBe(0)
  hit(s, e, e.hp - e.maxHp * 0.39)
  const adds = s.enemies.filter((e) => e.kind === 'rusher')
  expect(adds).toHaveLength(6)
  expect(adds.every((e) => e.cell === ENTRANCES[1] && e.reward === 0)).toBe(true)
  hit(s, e, 1)
  expect(s.enemies.filter((e) => e.kind === 'rusher')).toHaveLength(6)
  hit(s, e, e.hp - e.maxHp * 0.19)
  expect(e.phaseFlags).toBe(7)
  expect(e.shield).toBe(0)
  hit(s, e, e.hp)
  expect(s.finalDefeated).toBe(true)
  expect(s.phase).toBe('combat')
  for (const add of [...s.enemies]) hit(s, add, add.hp)
  expect(s.phase).toBe('won')
})
it('assigns late-wave tank and rush squads to separate entrances', () => {
  const s = arena(21)
  s.plan = ['armored', 'swift', 'healer', 'rusher']
  s.spawned = 0
  for (let i = 0; i < 4; i++) {
    s.spawnTimer = 0
    stepDefense(s, 0.05)
    s.enemies.at(-1)!.speed = 0
  }
  expect(s.enemies.map((e) => e.cell)).toEqual([
    ENTRANCES[0],
    ENTRANCES[1],
    ENTRANCES[0],
    ENTRANCES[1],
  ])
})
it('heals at most three ordinary monsters and never heals bosses', () => {
  const s = arena(10),
    h = enemy(s, 'healer')
  h.healTimer = 0
  const group = Array.from({ length: 5 }, () => enemy(s, 'armored'))
  const boss = enemy(s, 'boss')
  boss.hp = 500
  for (const e of group) e.hp = 10
  stepDefense(s, 0.05)
  expect(group.filter((e) => e.hp > 10)).toHaveLength(3)
  expect(boss.hp).toBe(500)
})
it('accelerates puffers only near the castle and keeps movement based on world distance', () => {
  const s = arena(),
    near = enemy(s, 'rusher', cellAt(6, 12)),
    far = enemy(s, 'rusher', cellAt(6, 4))
  near.speed = far.speed = MONSTERS.rusher.speed * 36
  const a = { x: near.x, y: near.y },
    b = { x: far.x, y: far.y }
  stepDefense(s, 0.05)
  expect(near.rushing).toBe(true)
  expect(far.rushing).toBe(false)
  expect(Math.hypot(near.x - a.x, near.y - a.y) / Math.hypot(far.x - b.x, far.y - b.y)).toBeCloseTo(
    1.8,
  )
  expect(SITES[HOME].y).toBeGreaterThan(SITES[ENTRANCES[0]].y)
})
