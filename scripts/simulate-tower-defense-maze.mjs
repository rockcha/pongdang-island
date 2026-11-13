import fs from 'node:fs'
import {
  createDefense,
  beginDefense,
  build,
  sell,
  upgrade,
  upgradeCastle,
  startWave,
  stepDefense,
  cellAt,
  ENTRANCES,
  HOME,
  refreshFlow,
  routeCells,
  BUILDINGS,
} from '../src/features/arcade/tower-defense-engine.ts'
import { legacyCampaignStrategy as campaignStrategy } from './tower-defense-campaign-strategy.ts'

// Paid actions only, from wave one. No state edits, mid-combat rerouting,
// injected gold, enemy overrides, or seed-dependent decisions.
const seeds = [1, 7, 42, 91]
const plans = process.argv.includes('--dense-only')
  ? ['dense-maze']
  : ['maze-first', 'balanced', 'firepower-first', 'dense-maze']
const action = (kind, x, y) => ({ kind, cell: cellAt(x, y) })
function plan(mode) {
  if (mode === 'dense-maze') {
    const q = [action('seahorse', 5, 13), action('seahorse', 6, 13)]
    const row = (y, gap) => {
      for (let x = 0; x < 12; x++)
        if (x !== gap && !(y === 13 && [5, 6].includes(x))) q.push(action('wall', x, y))
    }
    const up = (x, y, n = 1) => {
      for (let i = 0; i < n; i++) q.push(action('upgrade', x, y))
    }
    row(13, 11)
    up(5, 13)
    up(6, 13)
    row(11, 0)
    up(5, 13)
    up(6, 13)
    row(9, 11)
    row(7, 0)
    q.push(action('mortar', 5, 11))
    up(5, 11)
    q.push(action('plasma', 6, 11))
    up(6, 11)
    row(5, 11)
    row(3, 0)
    row(1, 11)
    up(5, 11, 2)
    up(6, 11, 2)
    up(5, 13)
    up(6, 13)
    q.push({ kind: 'castle' })
    for (const [kind, x, y] of [
      ['plasma', 5, 9],
      ['mortar', 6, 9],
      ['laser', 3, 11],
      ['plasma', 8, 11],
      ['laser', 8, 9],
      ['plasma', 3, 9],
      ['plasma', 5, 7],
      ['mortar', 6, 7],
      ['plasma', 8, 7],
    ]) {
      q.push(action(kind, x, y))
      up(x, y, 3)
    }
    q.push({ kind: 'castle' }, { kind: 'castle' })
    return q
  }
  const result = [action('seahorse', 5, 12), action('seahorse', 6, 12)]
  const row = (y, gap) => {
    // Close a cross-field barrier; alternate the open edge to form a snake.
    for (let x = 0; x < 12; x++)
      if (x !== gap && !(y === 12 && [5, 6].includes(x))) result.push(action('wall', x, y))
  }
  const up = (x, y, times = 1) => {
    for (let i = 0; i < times; i++) result.push(action('upgrade', x, y))
  }
  const tower = (kind, x, y) => result.push(action(kind, x, y))
  row(12, 11)
  up(5, 12)
  up(6, 12)
  if (mode === 'firepower-first') {
    up(5, 12, 2)
    up(6, 12, 2)
  }
  row(9, 0)
  if (mode !== 'firepower-first') {
    up(5, 12)
    up(6, 12)
  }
  if (mode === 'maze-first') {
    row(6, 11)
    row(3, 0)
  }
  tower('mortar', 5, 9)
  up(5, 9)
  tower('plasma', 6, 9)
  up(6, 9)
  if (mode === 'balanced') {
    row(6, 11)
    row(3, 0)
  }
  up(5, 9, 2)
  up(6, 9, 2)
  if (mode === 'firepower-first') {
    row(6, 11)
    row(3, 0)
  }
  if (mode !== 'firepower-first') {
    up(5, 12)
    up(6, 12)
  }
  result.push({ kind: 'castle' })
  for (const [kind, x, y] of [
    ['plasma', 5, 6],
    ['mortar', 6, 6],
    ['laser', 3, 9],
    ['plasma', 8, 9],
    ['laser', 8, 6],
    ['plasma', 3, 6],
    ['plasma', 5, 3],
    ['mortar', 6, 3],
    ['plasma', 8, 3],
  ]) {
    tower(kind, x, y)
    up(x, y, 3)
  }
  result.push({ kind: 'castle' }, { kind: 'castle' })
  return result
}
function routes(s) {
  refreshFlow(s)
  return ENTRANCES.map((c) => Number(s.flow[c].toFixed(2)))
}
function simulate(seed, mode) {
  const s = createDefense(seed)
  beginDefense(s)
  const emptyRoutes = routes(s),
    actions = plan(mode),
    purchases = [],
    checkpoints = []
  let cursor = 0,
    steps = 0,
    previousHp = s.lives
  function prepare() {
    while (cursor < actions.length) {
      const a = actions[cursor],
        existing = s.buildings.find((b) => b.cell === a.cell)
      if (existing?.kind === 'wall' && a.kind !== 'upgrade') {
        if (s.gold + Math.floor(existing.spent / 2) < BUILDINGS[a.kind].cost) break
        if (!sell(s, a.cell)) throw Error('Wall replacement failed')
      }
      const bought =
        a.kind === 'castle'
          ? upgradeCastle(s)
          : a.kind === 'upgrade'
            ? upgrade(s, a.cell)
            : build(s, a.cell, a.kind)
      if (!bought) break
      purchases.push({ beforeWave: s.wave + 1, ...a, goldLeft: s.gold })
      cursor++
    }
    checkpoints.push({
      beforeWave: s.wave + 1,
      hp: s.lives,
      hpChange: s.lives - previousHp,
      gold: s.gold,
      routes: routes(s),
      walls: s.buildings.filter((b) => b.kind === 'wall').length,
      towers: s.buildings.filter((b) => b.kind !== 'wall').length,
    })
    previousHp = s.lives
    startWave(s)
  }
  while (!['won', 'lost'].includes(s.phase) && steps < 240000) {
    if (s.phase === 'build') prepare()
    stepDefense(s, 0.05)
    steps++
  }
  return {
    mode,
    seed,
    phase: s.phase,
    wave: s.wave,
    hp: s.lives,
    finalDefeated: s.finalDefeated,
    finalEscaped: s.finalEscaped,
    gold: s.gold,
    kills: s.kills,
    simulatedSeconds: steps * 0.05,
    emptyRoutes,
    finalRoutes: routes(s),
    completedActions: cursor,
    nextAction: actions[cursor],
    purchases,
    checkpoints,
    buildings: s.buildings.map(({ cell, kind, level }) => ({ cell, kind, level })),
    routeCells: ENTRANCES.map((c) => routeCells(s, c)),
    home: HOME,
  }
}
const records = []
for (const mode of plans) {
  for (const seed of seeds) {
    const r = simulate(seed, mode)
    records.push(r)
    console.log(
      JSON.stringify({
        mode,
        seed,
        phase: r.phase,
        wave: r.wave,
        hp: r.hp,
        routes: r.finalRoutes,
        actions: r.completedActions,
        next: r.nextAction,
      }),
    )
  }
}
for (const seed of process.argv.includes('--dense-only') ? [] : seeds) {
  const { state: s, checkpoints } = campaignStrategy(seed)
  const r = {
    mode: 'existing-no-wall',
    seed,
    phase: s.phase,
    wave: s.wave,
    hp: s.lives,
    finalDefeated: s.finalDefeated,
    routes: routes(s),
    checkpoints,
  }
  records.push(r)
  console.log(JSON.stringify({ ...r, checkpoints: undefined }))
}
const output = 'artifacts/tower-defense/maze-difficulty.json'
if (process.argv.includes('--dense-only')) {
  const previous = JSON.parse(fs.readFileSync(output, 'utf8'))
  records.unshift(...previous.records.filter((r) => r.mode !== 'dense-maze'))
}
const summary = [...new Set(records.map((r) => r.mode))].map((mode) => {
  const runs = records.filter((r) => r.mode === mode)
  return {
    mode,
    runs: runs.length,
    wins: runs.filter((r) => r.phase === 'won' && r.finalDefeated).length,
    endWaves: runs.map((r) => r.wave),
    endHp: runs.map((r) => r.hp),
  }
})
fs.mkdirSync('artifacts/tower-defense', { recursive: true })
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      seeds,
      stepSeconds: 0.05,
      scope:
        'Local engine simulation, 1-30 waves, paid build-phase purchases only. Small fixed seed sample; not a player-population win rate or a proof of globally longest routes.',
      summary,
      records,
    },
    null,
    2,
  ) + '\n',
)
console.log(JSON.stringify({ output, summary }, null, 2))
