import {
  BUILDINGS,
  ENTRANCES,
  GRID,
  HOME,
  MAX_WAVES,
  MONSTERS,
  SITES,
  TOWER_KINDS,
  WAVES,
  beginDefense,
  build,
  canPlace,
  cellAt,
  createDefense,
  damageOf,
  intervalOf,
  rangeOf,
  refreshFlow,
  routeCells,
  specialize,
  specializationCost,
  specializationOptions,
  startWave,
  stepDefense,
  targetLayerOf,
  upgrade,
  upgradeCastle,
  upgradeCost,
  type Building,
  type BuildKind,
  type DefenseState,
  type TowerKind,
} from '../src/features/arcade/tower-defense-engine.ts'
import { campaignStrategy } from './tower-defense-mixed-strategy.ts'

export const AUDIT_STRATEGIES = [
  {
    id: 'random',
    name: '무작위 배치',
    description: '벽 없이 위치·구매·강화를 무작위로 선택. 공중 포탑은 8웨이브부터 후보에 포함.',
    random: true,
  },
  {
    id: 'coverage',
    name: '화력 배치 · 벽 없음',
    description: '예상 이동 경로의 사거리 노출과 대공 필요량을 고려. 벽 구매 없음.',
  },
  {
    id: 'maze',
    name: '미로 · 기본 화력',
    description: '같은 화력 구매 규칙에 네 줄의 교대 통로를 추가.',
    walls: true,
  },
  {
    id: 'slow',
    name: '미로 · 감속 지원',
    description: '미로에 빙결 산호 두 기를 더해 지상 적의 체류 시간을 확보.',
    walls: true,
    slow: true,
  },
  {
    id: 'hybrid',
    name: '미로 · 감속·겸용',
    description: '감속 지원에 30웨이브 이후 겸용 특화를 사용.',
    walls: true,
    slow: true,
    hybrid: true,
  },
  {
    id: 'cruise',
    name: '미로 · 월광 추가',
    description: '감속·겸용 구성에 월광 기지 두 기를 우선 배치·강화.',
    walls: true,
    slow: true,
    hybrid: true,
    cruise: true,
  },
  {
    id: 'reactive',
    name: '미로 · 전투 중 보강',
    description: '월광 구성에 2초마다 최대 한 번, 번 코인으로 추가 건설·강화.',
    walls: true,
    slow: true,
    hybrid: true,
    cruise: true,
    reactive: true,
  },
  {
    id: 'groundOnly',
    name: '미로 · 대공 미준비',
    description: '지상 전용 포탑만 구매하는 비교군. 공중 공격·겸용 특화 없음.',
    walls: true,
    groundOnly: true,
  },
  {
    id: 'noCastle',
    name: '미로 · 성 강화 없음',
    description: '감속·겸용 전략과 같지만 성 강화는 구매하지 않는 비교군.',
    walls: true,
    slow: true,
    hybrid: true,
    noCastle: true,
  },
  {
    id: 'reference',
    name: '기존 혼합 전략',
    description: '기존 유료 구매 계획 그대로. 상단 미로·하단 대공·30웨이브 전 대공 전환.',
    reference: true,
  },
  {
    id: 'referenceExpanded',
    name: '기존 혼합 · 정예 포탑',
    description: '기존 혼합 전략의 일부 포탑을 빙결·작살·저격으로 교체.',
    reference: true,
    expanded: true,
  },
  {
    id: 'referenceReinvest',
    name: '기존 혼합 · 후반 재투자',
    description: '기존 혼합 전략에 31웨이브부터 남은 코인을 겸용·대공·월광에 재투자.',
    reference: true,
    reinvest: true,
    hybrid: true,
    cruise: true,
  },
  {
    id: 'referenceAir',
    name: '기존 혼합 · 대공 보강',
    description: '31·40·45웨이브에 다연장 두 기씩 우선 보강하고 남은 코인을 재투자.',
    reference: true,
    reinvest: true,
    airFocus: true,
    hybrid: true,
  },
  {
    id: 'referenceAirSlow',
    name: '기존 혼합 · 대공·공중 감속',
    description: '대공 보강에 겸용 빙결 두 기를 추가해 공중 적의 체류 시간을 확보.',
    reference: true,
    reinvest: true,
    airFocus: true,
    crossSlow: true,
    hybrid: true,
  },
] as const
type Strategy = {
  id: string
  name: string
  description: string
  random?: boolean
  walls?: boolean
  slow?: boolean
  hybrid?: boolean
  cruise?: boolean
  reactive?: boolean
  groundOnly?: boolean
  noCastle?: boolean
  reference?: boolean
  expanded?: boolean
  reinvest?: boolean
  airFocus?: boolean
  crossSlow?: boolean
}
type Checkpoint = {
  wave: number
  cleared: boolean
  entryHp: number
  exitHp: number
  entryGold: number
  exitGold: number
  seconds: number
  kills: number
  leaks: Record<string, number>
  routeTiles: number[]
  towerCount: number
  wallCount: number
  spent: number
}
type Action = {
  kind: BuildKind | 'upgrade' | 'castle' | 'specialize'
  cell: number
  specialization?: Building['specialization']
  cost: number
}
const OPENING = [cellAt(5, 8), cellAt(6, 8), cellAt(6, 10)]
const WALL_STAGES = [
  {
    wave: 5,
    cells: [
      ...Array.from({ length: 11 }, (_, x) => cellAt(x, 7)),
      ...Array.from({ length: 11 }, (_, x) => cellAt(x + 1, 10)).filter((c) => c !== cellAt(6, 10)),
    ],
  },
  { wave: 9, cells: Array.from({ length: 11 }, (_, x) => cellAt(x + 1, 4)) },
  { wave: 13, cells: Array.from({ length: 11 }, (_, x) => cellAt(x, 1)) },
]
const SLOTS = [
  ...[8, 11, 5, 2].flatMap((y) => [5, 6, 4, 7, 3, 8, 2, 9, 1, 10].map((x) => cellAt(x, y))),
  ...[6, 9, 3, 12].flatMap((y) => [3, 8, 5, 6, 2, 9].map((x) => cellAt(x, y))),
]
const BASIC: TowerKind[] = [
  'seahorse',
  'octopus',
  'mortar',
  'plasma',
  'laser',
  'anemone',
  'flame',
  'missile',
  'salvo',
]
function randomizer(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}
function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}
function waveThreat(wave: number) {
  let ground = 0,
    air = 0,
    groundCount = 0,
    airCount = 0,
    groundSpeed = 0,
    airSpeed = 0
  for (const [kind, n] of Object.entries(WAVES[wave - 1].counts)) {
    const m = MONSTERS[kind as keyof typeof MONSTERS],
      count = n ?? 0
    const hp = m.hp // Relative targeting weights; actual combat always uses the engine's HP.
    if (m.layer === 'air') {
      air += hp * count
      airCount += count
      airSpeed += m.speed * count
    } else {
      ground += hp * count
      groundCount += count
      groundSpeed += m.speed * count
    }
  }
  return {
    ground,
    air,
    groundCount,
    airCount,
    groundSpeed: groundSpeed / Math.max(1, groundCount),
    airSpeed: airSpeed / Math.max(1, airCount),
  }
}
function pathSamples(s: DefenseState) {
  refreshFlow(s)
  const samples: { x: number; y: number; weight: number }[][] = [[], []]
  for (const gate of ENTRANCES) {
    const ground = routeCells(s, gate)
    for (let i = 1; i < ground.length; i++) {
      const a = SITES[ground[i - 1]],
        b = SITES[ground[i]],
        distance = Math.hypot(b.x - a.x, b.y - a.y) / GRID.cell
      samples[0].push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, weight: distance / 2 })
    }
    const a = SITES[gate],
      b = SITES[HOME],
      length = Math.hypot(b.x - a.x, b.y - a.y) / GRID.cell,
      steps = Math.ceil(length * 2)
    for (let i = 0; i < steps; i++)
      samples[1].push({
        x: a.x + ((b.x - a.x) * (i + 0.5)) / steps,
        y: a.y + ((b.y - a.y) * (i + 0.5)) / steps,
        weight: length / steps / 2,
      })
  }
  return samples
}
function makePolicy(s: DefenseState, policy: Strategy, seed: number) {
  const random = randomizer(seed ^ 0x5eeda11),
    actions: {
      wave: number
      duringCombat: boolean
      kind: string
      cell: number
      cost: number
      gold: number
    }[] = []
  let spending = 0,
    income = 0,
    openingCursor = 0,
    lastGold = s.gold,
    shoppingReady = false
  const destinations = new Map<string, number>()
  const noteIncome = () => {
    const delta = s.gold - lastGold
    if (delta > 0) income += delta
    lastGold = s.gold
  }
  const execute = (a: Action) => {
    const old = s.gold
    const ok =
      a.kind === 'upgrade'
        ? upgrade(s, a.cell)
        : a.kind === 'castle'
          ? upgradeCastle(s)
          : a.kind === 'specialize'
            ? specialize(s, a.cell, a.specialization!)
            : build(s, a.cell, a.kind)
    if (ok) {
      spending += old - s.gold
      actions.push({
        wave: s.phase === 'build' ? s.wave + 1 : s.wave,
        duringCombat: s.phase === 'combat',
        kind: a.specialization ?? a.kind,
        cell: a.cell,
        cost: old - s.gold,
        gold: s.gold,
      })
      lastGold = s.gold
    }
    return ok
  }
  function castle() {
    if (policy.noCastle || s.lives > 8 || s.castleLevel === 3) return false
    return execute({ kind: 'castle', cell: HOME, cost: [60, 120, 220][s.castleLevel] })
  }
  function ensure(cell: number, kind: TowerKind, level: number) {
    const requested = cell
    const destinationKey = `${kind}:${requested}`
    cell = destinations.get(destinationKey) ?? cell
    let b = s.buildings.find((b) => b.cell === cell)
    if (!b || b.kind !== kind) {
      if (s.gold < BUILDINGS[kind].cost) return false
      const options = [
        requested,
        requested - 1,
        requested + 1,
        requested - GRID.columns,
        requested + GRID.columns,
        ...SLOTS,
      ]
      const alternative = options.find((c) => !canPlace(s, c, kind))
      if (alternative === undefined) return true
      cell = alternative
      destinations.set(destinationKey, cell)
      if (!execute({ kind, cell, cost: BUILDINGS[kind].cost }))
        throw Error('Validated support placement failed')
      b = s.buildings.find((b) => b.cell === cell)!
    }
    while (b.level < level)
      if (!execute({ kind: 'upgrade', cell, cost: upgradeCost(b) })) return false
    return true
  }
  function priorities(wave: number) {
    if (!policy.random) {
      while (openingCursor < 6) {
        const cell = OPENING[openingCursor % 3],
          b = s.buildings.find((b) => b.cell === cell)!
        if (!execute({ kind: 'upgrade', cell, cost: upgradeCost(b) })) return false
        openingCursor++
      }
      if (
        !policy.groundOnly &&
        wave >= 8 &&
        !ensure(cellAt(6, 11), 'missile', wave >= 17 ? 3 : wave >= 12 ? 2 : 0)
      )
        return false
      if (
        !policy.groundOnly &&
        wave >= 15 &&
        !ensure(cellAt(5, 11), 'salvo', wave >= 24 ? 3 : wave >= 20 ? 2 : wave >= 18 ? 1 : 0)
      )
        return false
      // Commit before the known flying boss rather than try to buy all counters on wave 30.
      if (!policy.groundOnly && wave >= 26)
        for (const cell of [cellAt(5, 12), cellAt(6, 12), cellAt(7, 12)])
          if (!ensure(cell, 'missile', 3)) return false
      if (policy.walls)
        for (const stage of WALL_STAGES)
          if (wave >= stage.wave) {
            const pending = stage.cells.filter((cell) => !s.buildings.some((b) => b.cell === cell))
            // Save for a complete barrier rather than stop a purchase queue on an invalid tile.
            if (s.gold < pending.length * BUILDINGS.wall.cost) return false
            for (const cell of pending)
              if (!execute({ kind: 'wall', cell, cost: BUILDINGS.wall.cost }))
                throw Error('Invalid planned wall ' + cell)
          }
      if (policy.slow && wave >= 15)
        for (const cell of [cellAt(2, 8), cellAt(9, 5)])
          if (!ensure(cell, 'frost', wave >= 23 ? 3 : wave >= 19 ? 2 : 0)) return false
      if (policy.cruise && wave >= 29)
        for (const cell of [cellAt(5, 6), cellAt(7, 9)])
          if (!ensure(cell, 'cruise', wave >= 38 ? 3 : wave >= 33 ? 2 : 0)) return false
    }
    return true
  }
  function randomAction(wave: number): Action | undefined {
    const candidates: Action[] = []
    for (const b of s.buildings)
      if (b.kind !== 'wall' && b.level < 3 && upgradeCost(b) <= s.gold)
        candidates.push({ kind: 'upgrade', cell: b.cell, cost: upgradeCost(b) })
    if (candidates.length && random() < 0.55)
      return candidates[Math.floor(random() * candidates.length)]
    const kinds = TOWER_KINDS.filter(
      (k) => BUILDINGS[k].cost <= s.gold && (wave >= 8 || BUILDINGS[k].targetLayer !== 'air'),
    )
    if (!kinds.length) return undefined
    const kind = kinds[Math.floor(random() * kinds.length)],
      cells = Array.from({ length: GRID.columns * 11 }, (_, i) => i + GRID.columns * 2)
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[cells[i], cells[j]] = [cells[j], cells[i]]
    }
    const cell = cells.find((c) => !canPlace(s, c, kind))
    return cell === undefined ? undefined : { kind, cell, cost: BUILDINGS[kind].cost }
  }
  function purchase(wave: number): Action | undefined {
    if (policy.random) return randomAction(wave)
    const threat = waveThreat(wave),
      samples = pathSamples(s),
      cache = new Map<string, number>()
    const exposure = (cell: number, range: number, layer: number) => {
      const key = `${cell}:${range}:${layer}`
      let value = cache.get(key)
      if (value === undefined) {
        const p = SITES[cell]
        value =
          sum(
            samples[layer]
              .filter((t) => (t.x - p.x) ** 2 + (t.y - p.y) ** 2 <= range * range)
              .map((t) => t.weight),
          ) / (layer ? threat.airSpeed : threat.groundSpeed)
        cache.set(key, value)
      }
      return value
    }
    const contribution = (b: Building, layer: number) => {
      const c = BUILDINGS[b.kind],
        target = targetLayerOf(b)
      if ((layer ? 'air' : 'ground') !== target && target !== 'both') return 0
      const count = layer ? threat.airCount : threat.groundCount
      if (!count) return 0
      const time = exposure(b.cell, rangeOf(b), layer),
        dps =
          c.attack === 'flame'
            ? damageOf(b) / (b.specialization === 'rapid' ? 0.8 : 1)
            : damageOf(b) / intervalOf(b)
      const duration = Math.max(
        8,
        sum(Object.values(WAVES[wave - 1].counts).map((n) => n ?? 0)) * WAVES[wave - 1].interval,
      )
      const group =
        c.attack === 'salvo'
          ? Math.min(c.cap, 1 + ((count * time) / duration) * 0.35)
          : c.attack === 'blast'
            ? Math.min(3, 1 + ((count * time) / duration) * 0.25)
            : c.attack === 'beam'
              ? Math.min(3.5, 1 + ((count * time) / duration) * 0.3)
              : c.attack === 'aura' || c.attack === 'flame'
                ? Math.min(c.cap, 1 + ((count * time) / duration) * 0.3)
                : 1
      const cross =
        b.specialization === 'hybrid' && c.targetLayer !== (layer ? 'air' : 'ground') ? 0.8 : 1
      return dps * time * group * cross
    }
    const existing = [
      sum(s.buildings.filter((b) => b.kind !== 'wall').map((b) => contribution(b, 0))),
      sum(s.buildings.filter((b) => b.kind !== 'wall').map((b) => contribution(b, 1))),
    ]
    // Prevent long maze exposure from hiding the short, direct flying route's demand.
    const airShare = threat.airCount
      ? Math.max(
          policy.airFocus ? 0.55 : 0.3,
          Math.min(0.75, threat.air / (threat.air + threat.ground)),
        )
      : 0
    const weights = [
      (1 - airShare) / (1 + existing[0] / Math.max(100, threat.ground)),
      airShare / (1 + existing[1] / Math.max(100, threat.air)),
    ]
    let best: Action | undefined,
      bestScore = 0
    const consider = (a: Action, b: Building, old?: Building) => {
      if (a.cost > s.gold) return
      const gains = [0, 1].map(
        (layer) => contribution(b, layer) - (old ? contribution(old, layer) : 0),
      )
      const score = (gains[0] * weights[0] + gains[1] * weights[1]) / a.cost
      if (score > bestScore + 1e-8) {
        best = a
        bestScore = score
      }
    }
    for (const b of s.buildings)
      if (b.kind !== 'wall') {
        if (b.level < 3)
          consider(
            { kind: 'upgrade', cell: b.cell, cost: upgradeCost(b) },
            { ...b, level: b.level + 1 },
            b,
          )
        if (b.level === 3 && !b.specialization && wave >= 31)
          for (const specialization of specializationOptions(b.kind)) {
            if (specialization === 'hybrid' && !policy.hybrid) continue
            if (specialization === 'bombard') continue
            consider(
              {
                kind: 'specialize',
                specialization,
                cell: b.cell,
                cost: specializationCost(b, specialization),
              },
              { ...b, specialization },
              b,
            )
          }
      }
    const kinds = BASIC.filter(
      (k) =>
        BUILDINGS[k].cost <= s.gold &&
        (!policy.groundOnly || BUILDINGS[k].targetLayer === 'ground'),
    )
    const reserved = new Set([
      ...(policy.slow ? [cellAt(2, 8), cellAt(9, 5)] : []),
      ...(policy.cruise ? [cellAt(5, 6), cellAt(7, 9)] : []),
      ...(!policy.groundOnly
        ? [cellAt(6, 11), cellAt(5, 11), cellAt(5, 12), cellAt(6, 12), cellAt(7, 12)]
        : []),
    ])
    for (const cell of SLOTS) {
      if (reserved.has(cell) || s.buildings.some((b) => b.cell === cell)) continue
      // Topology validation is identical for every tower; never let an invalid cell stall a plan.
      if (!kinds.length || canPlace(s, cell, kinds[0])) continue
      for (const kind of kinds)
        consider(
          { kind, cell, cost: BUILDINGS[kind].cost },
          {
            kind,
            cell,
            level: 0,
            spent: BUILDINGS[kind].cost,
            cooldown: 0,
            aim: 0,
            flash: 0,
            charge: 0,
            chargeTarget: 0,
          },
        )
    }
    return best
  }
  return {
    actions,
    get spending() {
      return spending
    },
    get income() {
      return income
    },
    noteIncome,
    initialize() {
      if (policy.random) {
        for (let n = 0; n < 3; n++) {
          let cell: number
          do {
            cell = cellAt(1 + Math.floor(random() * 10), 3 + Math.floor(random() * 9))
          } while (canPlace(s, cell, 'seahorse'))
          execute({ kind: 'seahorse', cell, cost: 60 })
        }
      } else
        for (const cell of OPENING)
          if (!execute({ kind: 'seahorse', cell, cost: 60 })) throw Error('Opening failed')
    },
    prepare() {
      noteIncome()
      castle()
      shoppingReady = priorities(s.wave + 1)
      if (!shoppingReady) return
      for (let i = 0; i < 150; i++) {
        const a = purchase(s.wave + 1)
        if (!a) break
        if (!execute(a)) throw Error('Scored action failed ' + JSON.stringify(a))
      }
    },
    reinforce() {
      noteIncome()
      if (!shoppingReady) return
      const a = purchase(s.wave)
      if (a && !execute(a)) throw Error('Reinforcement failed')
    },
    reinvest() {
      noteIncome()
      if (policy.crossSlow)
        for (const cell of [cellAt(5, 6), cellAt(7, 9)]) {
          if (!ensure(cell, 'frost', 3)) return
          const b = s.buildings.find((b) => b.cell === (destinations.get(`frost:${cell}`) ?? cell))
          if (b && !b.specialization) {
            if (s.gold < specializationCost(b, 'hybrid')) return
            execute({
              kind: 'specialize',
              cell: b.cell,
              specialization: 'hybrid',
              cost: specializationCost(b, 'hybrid'),
            })
          }
        }
      if (policy.airFocus) {
        const count = s.wave >= 45 ? 6 : s.wave >= 40 ? 4 : 2
        for (const cell of [
          cellAt(5, 6),
          cellAt(7, 6),
          cellAt(4, 9),
          cellAt(8, 9),
          cellAt(4, 12),
          cellAt(8, 12),
        ].slice(0, count))
          if (!ensure(cell, 'salvo', 3)) return
      }
      if (policy.cruise)
        for (const cell of [cellAt(5, 6), cellAt(7, 9)]) if (!ensure(cell, 'cruise', 3)) return
      for (let i = 0; i < 150; i++) {
        const a = purchase(s.wave)
        if (!a) break
        if (!execute(a)) throw Error('Reinvestment failed')
      }
    },
  }
}

export function auditRun(seed: number, policy: Strategy) {
  if (policy.reference) return referenceRun(seed, policy)
  const s = createDefense(seed)
  beginDefense(s)
  const agent = makePolicy(s, policy, seed)
  agent.initialize()
  const checkpoints: Checkpoint[] = []
  let current: (typeof checkpoints)[number] | undefined,
    enteredAt = 0,
    entryKills = 0,
    nextReinforce = 2,
    steps = 0
  const maxSteps = 360000,
    home = SITES[HOME]
  while (!['won', 'lost'].includes(s.phase) && steps < maxSteps) {
    if (s.phase === 'build') {
      if (current) {
        agent.noteIncome()
        Object.assign(current, {
          cleared: true,
          exitHp: s.lives,
          exitGold: s.gold,
          seconds: s.elapsed - enteredAt,
          kills: s.kills - entryKills,
        })
      }
      agent.prepare()
      refreshFlow(s)
      current = {
        wave: s.wave + 1,
        cleared: false,
        entryHp: s.lives,
        exitHp: s.lives,
        entryGold: s.gold,
        exitGold: s.gold,
        seconds: 0,
        kills: 0,
        leaks: {},
        routeTiles: ENTRANCES.map((c) => Number(s.flow[c].toFixed(3))),
        towerCount: s.buildings.filter((b) => b.kind !== 'wall').length,
        wallCount: s.buildings.filter((b) => b.kind === 'wall').length,
        spent: agent.spending,
      }
      checkpoints.push(current)
      enteredAt = s.elapsed
      entryKills = s.kills
      nextReinforce = s.elapsed + 2
      if (!startWave(s)) throw Error('Could not start wave')
    }
    if (policy.reactive && s.elapsed >= nextReinforce) {
      agent.reinforce()
      nextReinforce += 2
    }
    // The engine breaches at the start of its next step after arriving at HOME.
    for (const e of s.enemies)
      if (e.hp > 0 && e.nav === HOME && Math.abs(e.x - home.x) + Math.abs(e.y - home.y) < 0.001)
        current!.leaks[e.kind] = (current!.leaks[e.kind] ?? 0) + 1
    stepDefense(s, 0.05)
    steps++
    if (s.gold < 0 || s.lives < 0) throw Error('Invalid economy or health')
  }
  agent.noteIncome()
  if (current)
    Object.assign(current, {
      cleared: s.phase === 'won',
      exitHp: s.lives,
      exitGold: s.gold,
      seconds: s.elapsed - enteredAt,
      kills: s.kills - entryKills,
    })
  if (s.gold !== 180 + agent.income - agent.spending) throw Error('Economy conservation failed')
  const timedOut = !['won', 'lost'].includes(s.phase),
    cleared = checkpoints.filter((c) => c.cleared).length
  if (!timedOut && s.phase === 'won' && (cleared !== MAX_WAVES || !s.finalDefeated))
    throw Error('False campaign victory')
  return {
    seed,
    strategy: policy.id,
    phase: s.phase,
    timedOut,
    reached: s.wave,
    cleared,
    hp: s.lives,
    gold: s.gold,
    income: agent.income,
    spent: agent.spending,
    seconds: s.elapsed,
    kills: s.kills,
    finalDefeated: s.finalDefeated,
    checkpoints,
    actions: agent.actions,
    buildings: s.buildings.map(({ cell, kind, level, specialization }) => ({
      cell,
      kind,
      level,
      specialization,
    })),
    stats: s.stats,
  }
}

function referenceRun(seed: number, policy: Strategy) {
  const checkpoints: Checkpoint[] = []
  let current: (typeof checkpoints)[number] | undefined,
    enteredAt = 0,
    entryKills = 0,
    income = 0,
    previousGold = 180
  let allocator: ReturnType<typeof makePolicy> | undefined
  const { state: s } = campaignStrategy(seed, 51, !!policy.expanded, false, (s, stage) => {
    if (stage === 'prepared') {
      if (policy.reinvest && s.wave >= 31) {
        allocator ??= makePolicy(s, policy, seed)
        allocator.reinvest()
      }
      refreshFlow(s)
      current = {
        wave: s.wave,
        cleared: false,
        entryHp: s.lives,
        exitHp: s.lives,
        entryGold: s.gold,
        exitGold: s.gold,
        seconds: 0,
        kills: 0,
        leaks: {},
        routeTiles: ENTRANCES.map((c) => Number(s.flow[c].toFixed(3))),
        towerCount: s.buildings.filter((b) => b.kind !== 'wall').length,
        wallCount: s.buildings.filter((b) => b.kind === 'wall').length,
        spent: 180 + income - s.gold,
      }
      checkpoints.push(current)
      enteredAt = s.elapsed
      entryKills = s.kills
      previousGold = s.gold
    } else if (stage === 'before-step') {
      const home = SITES[HOME]
      for (const e of s.enemies)
        if (e.hp > 0 && e.nav === HOME && Math.abs(e.x - home.x) + Math.abs(e.y - home.y) < 0.001)
          current!.leaks[e.kind] = (current!.leaks[e.kind] ?? 0) + 1
    } else {
      income += Math.max(0, s.gold - previousGold)
      previousGold = s.gold
      Object.assign(current!, {
        cleared: s.phase === 'build' || s.phase === 'won',
        exitHp: s.lives,
        exitGold: s.gold,
        seconds: s.elapsed - enteredAt,
        kills: s.kills - entryKills,
      })
    }
  })
  return {
    seed,
    strategy: policy.id,
    phase: s.phase,
    timedOut: !['won', 'lost'].includes(s.phase),
    reached: s.wave,
    cleared: checkpoints.filter((c) => c.cleared).length,
    hp: s.lives,
    gold: s.gold,
    income,
    spent: 180 + income - s.gold,
    seconds: s.elapsed,
    kills: s.kills,
    finalDefeated: s.finalDefeated,
    checkpoints,
    actions: allocator?.actions ?? [],
    buildings: s.buildings.map(({ cell, kind, level, specialization }) => ({
      cell,
      kind,
      level,
      specialization,
    })),
    stats: s.stats,
  }
}
