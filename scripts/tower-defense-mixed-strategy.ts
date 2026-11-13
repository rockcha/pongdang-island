import {
  createDefense,
  beginDefense,
  build,
  upgrade,
  upgradeCastle,
  sell,
  startWave,
  stepDefense,
  cellAt,
  GRID,
  specialize,
  BUILDINGS,
  type BuildKind,
  type DefenseState,
} from '../src/features/arcade/tower-defense-engine.ts'

type Purchase = { kind: BuildKind | 'upgrade'; x: number; y: number; minGold?: number }
// Deterministic purchases using earned income and normal game commands.
export function campaignStrategy(
  seed: number,
  stopAtWave = 51,
  expanded = false,
  hybridMix = false,
  observe?: (state: DefenseState, stage: 'prepared' | 'before-step' | 'after-step') => void,
) {
  const s = createDefense(seed)
  beginDefense(s)
  for (const x of [5, 6]) build(s, cellAt(x, 8), 'seahorse')
  build(s, cellAt(6, 10), 'seahorse')
  const purchases: Purchase[] = []
  const buy = (kind: Purchase['kind'], x: number, y: number) => purchases.push({ kind, x, y })
  const up = (x: number, y: number, count = 1) => {
    for (let i = 0; i < count; i++) buy('upgrade', x, y)
  }
  up(5, 8)
  up(6, 8)
  up(6, 10)
  up(5, 8)
  up(6, 8)
  up(6, 10)
  const firstWall = purchases.length
  for (let x = 0; x < 11; x++) buy('wall', x, 7)
  for (let x = 1; x < 12; x++) if (x !== 6) buy('wall', x, 10)
  purchases[firstWall].minGold = 21 * 8
  up(5, 8)
  up(6, 8)
  up(6, 10)
  for (let x = 1; x < 12; x++) buy('wall', x, 4)
  for (let x = 0; x < 11; x++) buy('wall', x, 1)
  for (const [kind, x, y] of [
    ['mortar', 5, 5],
    ['plasma', 6, 5],
    ['plasma', 7, 5],
    ['laser', 3, 5],
    ['mortar', 4, 5],
    ['plasma', 8, 5],
    ['laser', 8, 2],
    ['plasma', 5, 2],
    ['plasma', 6, 2],
    ['mortar', 4, 2],
    ['plasma', 7, 2],
    ['plasma', 3, 2],
  ] as [BuildKind, number, number][]) {
    const replacement =
      expanded && y === 5
        ? x === 4
          ? 'frost'
          : x === 6
            ? 'harpoon'
            : x === 3
              ? 'sniper'
              : kind
        : kind
    buy(replacement, x, y)
    up(x, y, 3)
  }
  const air = [
    { wave: 7, kind: 'missile', x: 6, y: 11 },
    { wave: 9, kind: 'upgrade', x: 6, y: 11 },
    { wave: 12, kind: 'upgrade', x: 6, y: 11 },
    { wave: 14, kind: 'salvo', x: 5, y: 11 },
    { wave: 17, kind: 'upgrade', x: 6, y: 11 },
    { wave: 18, kind: 'upgrade', x: 5, y: 11 },
    { wave: 21, kind: 'upgrade', x: 5, y: 11 },
    { wave: 22, kind: 'missile', x: 7, y: 11 },
    { wave: 23, kind: 'upgrade', x: 7, y: 11 },
    { wave: 24, kind: 'upgrade', x: 5, y: 11 },
    { wave: 25, kind: 'upgrade', x: 7, y: 11 },
    { wave: 26, kind: 'upgrade', x: 7, y: 11 },
  ] satisfies (Purchase & { wave: number })[]
  let cursor = 0,
    airCursor = 0
  const checkpoints: {
    wave: number
    hp: number
    gold: number
    kills: number
    buildings: number
  }[] = []
  const execute = (p: Purchase) =>
    p.kind === 'upgrade' ? upgrade(s, cellAt(p.x, p.y)) : build(s, cellAt(p.x, p.y), p.kind)
  const specializationFor = (b: { kind: BuildKind; cell: number }): 'power' | 'rapid' | 'hybrid' =>
    hybridMix && BUILDINGS[b.kind].targetLayer === 'air' && Math.floor(b.cell / GRID.columns) < 10
      ? 'hybrid'
      : b.kind === 'frost'
        ? 'power'
        : 'rapid'
  function prepare() {
    // The final boss flies over the maze: use normal sale refunds to pivot to anti-air.
    if (s.wave === 29) {
      for (const b of [...s.buildings]) {
        if (Math.floor(b.cell / GRID.columns) !== 2 || !['plasma', 'laser'].includes(b.kind))
          continue
        if (!sell(s, b.cell) || !build(s, b.cell, 'missile')) continue
        for (let level = 0; level < 3; level++) upgrade(s, b.cell)
      }
      for (const x of [5, 6, 7]) {
        const cell = cellAt(x, 12)
        if (build(s, cell, 'missile')) for (let level = 0; level < 3; level++) upgrade(s, cell)
      }
    }
    while (airCursor < air.length && air[airCursor].wave <= s.wave) {
      if (!execute(air[airCursor])) return
      airCursor++
    }
    if (s.lives <= 8 && s.castleLevel < 3) upgradeCastle(s)
    while (cursor < purchases.length) {
      if (s.gold < (purchases[cursor].minGold ?? 0)) break
      if (!execute(purchases[cursor])) break
      cursor++
    }
    if (cursor === purchases.length) upgradeCastle(s)
    if (s.wave >= 30) {
      for (const b of s.buildings)
        if (b.level === 3 && !b.specialization) specialize(s, b.cell, specializationFor(b))
      for (const [kind, x, y] of [
        ['plasma', 4, 8],
        ['plasma', 7, 8],
        ['missile', 4, 11],
        ['missile', 8, 11],
        ['sniper', 3, 8],
        ['harpoon', 8, 8],
      ] as const) {
        const cell = cellAt(x, y)
        if (!s.buildings.some((b) => b.cell === cell)) build(s, cell, kind)
        const b = s.buildings.find((b) => b.cell === cell)
        if (b) {
          while (b.level < 3 && upgrade(s, cell)) {}
          specialize(s, cell, kind === 'sniper' ? 'power' : 'rapid')
        }
      }
    }
    if (s.wave >= 35) {
      for (const [kind, x, y] of [
        ['frost', 5, 6],
        ['frost', 7, 6],
        ['plasma', 2, 5],
        ['plasma', 9, 5],
        ['plasma', 3, 8],
        ['plasma', 8, 6],
        ['missile', 4, 12],
        ['missile', 8, 12],
      ] as const) {
        const cell = cellAt(x, y)
        if (!s.buildings.some((b) => b.cell === cell)) build(s, cell, kind)
        const b = s.buildings.find((b) => b.cell === cell)
        if (b) {
          while (b.level < 3 && upgrade(s, cell)) {}
          specialize(s, cell, kind === 'frost' ? 'power' : 'rapid')
        }
      }
    }
  }
  startWave(s)
  observe?.(s, 'prepared')
  for (let n = 0; n < 240000 && !['won', 'lost'].includes(s.phase); n++) {
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
      observe?.(s, 'prepared')
    }
    if (s.wave === stopAtWave) break
    observe?.(s, 'before-step')
    stepDefense(s, 0.05)
    observe?.(s, 'after-step')
  }
  return {
    state: s,
    checkpoints,
    purchases: cursor,
    next: purchases[cursor],
    airPurchases: airCursor,
  }
}
