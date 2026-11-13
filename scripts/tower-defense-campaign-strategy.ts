import {
  createDefense,
  beginDefense,
  build,
  upgrade,
  upgradeCastle,
  startWave,
  stepDefense,
  cellAt,
  type DefenseState,
  type BuildKind,
} from '../src/features/arcade/tower-defense-engine.ts'
type Purchase = { wave: number; kind: BuildKind | 'upgrade' | 'castle'; x?: number; y?: number }
// A reproducible, paid mixed build. No balance overrides, healing cheats or seed-specific actions.
const purchases: Purchase[] = [
  { wave: 1, kind: 'upgrade', x: 5, y: 8 },
  { wave: 1, kind: 'upgrade', x: 6, y: 8 },
  { wave: 1, kind: 'upgrade', x: 6, y: 10 },
  { wave: 2, kind: 'upgrade', x: 5, y: 8 },
  { wave: 2, kind: 'upgrade', x: 6, y: 8 },
  { wave: 3, kind: 'upgrade', x: 6, y: 10 },
  { wave: 4, kind: 'mortar', x: 6, y: 9 },
  { wave: 5, kind: 'upgrade', x: 6, y: 9 },
  { wave: 5, kind: 'castle' },
  { wave: 6, kind: 'upgrade', x: 5, y: 8 },
  { wave: 6, kind: 'upgrade', x: 6, y: 8 },
  { wave: 7, kind: 'plasma', x: 5, y: 9 },
  { wave: 8, kind: 'upgrade', x: 5, y: 9 },
  { wave: 8, kind: 'upgrade', x: 6, y: 9 },
  { wave: 9, kind: 'upgrade', x: 5, y: 9 },
  { wave: 10, kind: 'laser', x: 5, y: 13 },
  { wave: 11, kind: 'upgrade', x: 5, y: 13 },
  { wave: 11, kind: 'upgrade', x: 5, y: 9 },
  { wave: 12, kind: 'upgrade', x: 6, y: 10 },
  { wave: 12, kind: 'upgrade', x: 6, y: 9 },
  { wave: 12, kind: 'castle' },
  { wave: 13, kind: 'flame', x: 6, y: 6 },
  { wave: 13, kind: 'upgrade', x: 6, y: 6 },
  { wave: 14, kind: 'upgrade', x: 6, y: 6 },
  { wave: 14, kind: 'anemone', x: 5, y: 11 },
  { wave: 15, kind: 'upgrade', x: 5, y: 13 },
  { wave: 15, kind: 'upgrade', x: 5, y: 11 },
  { wave: 16, kind: 'upgrade', x: 6, y: 6 },
  { wave: 16, kind: 'upgrade', x: 5, y: 11 },
  { wave: 17, kind: 'upgrade', x: 5, y: 13 },
  { wave: 17, kind: 'upgrade', x: 5, y: 11 },
  { wave: 17, kind: 'castle' },
  { wave: 18, kind: 'plasma', x: 7, y: 9 },
  { wave: 18, kind: 'upgrade', x: 7, y: 9 },
  { wave: 18, kind: 'upgrade', x: 7, y: 9 },
  { wave: 18, kind: 'upgrade', x: 7, y: 9 },
  { wave: 20, kind: 'plasma', x: 7, y: 8 },
  { wave: 20, kind: 'upgrade', x: 7, y: 8 },
  { wave: 20, kind: 'upgrade', x: 7, y: 8 },
  { wave: 21, kind: 'mortar', x: 4, y: 9 },
  { wave: 21, kind: 'upgrade', x: 4, y: 9 },
  { wave: 21, kind: 'upgrade', x: 4, y: 9 },
  { wave: 22, kind: 'upgrade', x: 7, y: 8 },
  { wave: 23, kind: 'laser', x: 7, y: 12 },
  { wave: 23, kind: 'upgrade', x: 7, y: 12 },
  { wave: 23, kind: 'upgrade', x: 7, y: 12 },
  { wave: 24, kind: 'upgrade', x: 4, y: 9 },
  { wave: 24, kind: 'plasma', x: 4, y: 8 },
  { wave: 24, kind: 'upgrade', x: 4, y: 8 },
  { wave: 25, kind: 'upgrade', x: 4, y: 8 },
  { wave: 25, kind: 'upgrade', x: 4, y: 8 },
  { wave: 25, kind: 'upgrade', x: 7, y: 12 },
  { wave: 26, kind: 'mortar', x: 8, y: 10 },
  { wave: 26, kind: 'upgrade', x: 8, y: 10 },
  { wave: 26, kind: 'upgrade', x: 8, y: 10 },
  { wave: 27, kind: 'plasma', x: 8, y: 8 },
  { wave: 27, kind: 'upgrade', x: 8, y: 8 },
  { wave: 27, kind: 'upgrade', x: 8, y: 8 },
  { wave: 28, kind: 'upgrade', x: 8, y: 8 },
  { wave: 28, kind: 'upgrade', x: 8, y: 10 },
  { wave: 29, kind: 'plasma', x: 4, y: 10 },
  { wave: 29, kind: 'upgrade', x: 4, y: 10 },
  { wave: 29, kind: 'upgrade', x: 4, y: 10 },
  { wave: 29, kind: 'upgrade', x: 4, y: 10 },
]
export { campaignStrategy } from './tower-defense-mixed-strategy.ts'
export function legacyCampaignStrategy(seed: number, stopAtWave = 31) {
  const s = createDefense(seed)
  beginDefense(s)
  for (const [x, y] of [
    [5, 8],
    [6, 8],
    [6, 10],
  ])
    if (!build(s, cellAt(x, y), 'seahorse')) throw Error('Initial setup failed')
  let cursor = 0
  const checkpoints: {
    wave: number
    hp: number
    gold: number
    kills: number
    buildings: number
  }[] = []
  function prepare() {
    while (cursor < purchases.length && purchases[cursor].wave <= s.wave) {
      const p = purchases[cursor],
        cell = cellAt(p.x ?? 0, p.y ?? 0)
      const bought =
        p.kind === 'upgrade'
          ? upgrade(s, cell)
          : p.kind === 'castle'
            ? upgradeCastle(s)
            : build(s, cell, p.kind)
      if (!bought) break
      cursor++
    }
  }
  startWave(s)
  for (let n = 0; n < 120000 && !['won', 'lost'].includes(s.phase); n++) {
    if (s.phase === 'build') {
      checkpoints.push({
        wave: s.wave,
        hp: s.lives,
        gold: s.gold,
        kills: s.kills,
        buildings: s.buildings.length,
      })
      prepare()
      startWave(s)
    }
    if (s.wave === stopAtWave) break
    stepDefense(s, 0.05)
  }
  return { state: s, checkpoints, purchases: cursor, next: purchases[cursor] }
}
