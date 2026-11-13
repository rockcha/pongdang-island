import { campaignStrategy } from './tower-defense-campaign-strategy.ts'
import fs from 'node:fs'
import { performance } from 'node:perf_hooks'
import {
  createDefense,
  beginDefense,
  startWave,
  build,
  upgrade,
  cellAt,
  stepDefense,
  spawnEnemy,
  ENEMY_LIMIT,
  HOME,
  MONSTER_KINDS,
  MONSTERS,
  GRID,
  MAX_WAVES,
  refreshFlow,
} from '../src/features/arcade/tower-defense-engine.ts'
const records = [1, 7, 42, 91, 731, 2026].map((seed) => {
  const { state: s, checkpoints } = campaignStrategy(seed)
  return {
    seed,
    phase: s.phase,
    wave: s.wave,
    hp: s.lives,
    kills: s.kills,
    gold: s.gold,
    finalDefeated: s.finalDefeated,
    checkpoints,
    stats: s.stats,
  }
})
const dense = createDefense(8)
beginDefense(dense)
dense.gold = 100000
for (const [x, y, kind] of [
  [2, 10, 'octopus'],
  [8, 10, 'seahorse'],
  [3, 7, 'mortar'],
  [5, 9, 'flame'],
  [5, 4, 'laser'],
  [7, 7, 'plasma'],
  [5, 11, 'anemone'],
]) {
  if (!build(dense, cellAt(x, y), kind)) throw Error('Stress setup failed')
  upgrade(dense, cellAt(x, y))
  upgrade(dense, cellAt(x, y))
}
for (let y = 1; y < 13; y++)
  for (const x of [0, 11]) {
    if (!build(dense, cellAt(x, y), 'plasma')) throw Error('Dense tower setup failed')
  }

startWave(dense)
dense.spawned = dense.plan.length
refreshFlow(dense)
const sites = Array.from({ length: GRID.columns * 9 }, (_, i) => i + GRID.columns * 2).filter(
  (c) => c !== HOME && Number.isFinite(dense.flow[c]),
)
const kinds = MONSTER_KINDS.filter((kind) => !MONSTERS[kind].boss)
for (let i = 0; i < ENEMY_LIMIT; i++) {
  if (!spawnEnemy(dense, kinds[i % kinds.length], sites[i % sites.length]))
    throw Error('Stress spawn failed')
  const e = dense.enemies.at(-1)
  e.hp = 100000
  e.maxHp = 100000
  e.speed = 0
}
const started = performance.now()
for (let i = 0; i < 2400; i++) stepDefense(dense, 0.05)
const duration = performance.now() - started
if (
  !records.some((r) => r.phase === 'won' && r.wave === MAX_WAVES && r.finalDefeated) ||
  records.some((r) => !['won', 'lost'].includes(r.phase))
)
  throw Error('Campaign must terminate and the paid mixed strategy must be capable of a clear')
if (dense.enemies.length !== ENEMY_LIMIT) throw Error('Stress population changed')
const record = {
  balance: records,
  stress: {
    enemies: 256,
    towers: dense.buildings.length,
    steps: 2400,
    simulatedSeconds: 120,
    wallMilliseconds: duration,
    microsecondsPerStep: (duration / 2400) * 1000,
    stats: dense.stats,
    scope: 'Local Node CPU simulation; not mobile FPS or WebGL performance.',
  },
}
const output = process.argv[2] ?? 'artifacts/tower-defense/benchmark.json'
fs.mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n')
console.log(JSON.stringify(record, null, 2))
