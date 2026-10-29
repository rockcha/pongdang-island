import { placeGroups } from '@/lib/place-groups'
import { canPlace, isLand, type Facility, type IslandState, type Placement } from './island-model'

export const islandZoneSigns: Record<string, { x: number; y: number }> = {
  home: { x: 10, y: 4 },
  production: { x: 19, y: 4 },
  market: { x: 28, y: 4 },
  community: { x: 10, y: 17 },
  collection: { x: 28, y: 17 },
  sea: { x: 19, y: 22 },
  news: { x: 28, y: 26 },
}
const positions: Record<string, [number, number]> = {
  '/voyage-bets': [12, 13],
  '/fishing-records': [20, 25],
  '/aquarium': [8, 7],
  '/profile': [12, 7],
  '/notifications': [8, 11],
  '/music-room': [11, 11],
  '/arcade': [14, 11],
  '/bait-production': [18, 7],
  '/my-bait-production': [22, 7],
  '/production': [18, 11],
  '/farm': [22, 11],
  '/shop': [25, 7],
  '/item-shop': [28, 7],
  '/decoration-shop': [31, 7],
  '/shipyard': [25, 10],
  '/bait-production-shop': [28, 10],
  '/production-shop': [31, 10],
  '/exchange': [25, 13],
  '/merchant-orders': [28, 13],
  '/savings': [31, 13],
  '/friends': [8, 20],
  '/showcase': [12, 20],
  '/board': [8, 23],
  '/hall-of-fame': [11, 23],
  '/development-fund': [14, 23],
  '/square/sponsorship': [8, 26],
  '/square/begging': [12, 26],
  '/collection': [26, 20],
  '/storage': [28, 20],
  '/warehouse': [30, 20],
  '/titles': [26, 22],
  '/relics': [29, 22],
  '/fishing': [18, 25],
  '/harbor': [22, 25],
  '/expeditions': [23, 28],
  '/port': [20, 30],
  '/island-news': [26, 28],
  '/square/notices': [30, 28],
  '/square/suggestions': [26, 30],
  '/square/bugs': [30, 30],
}
export function createGroupedIsland(items: Facility[], initial: IslandState): IslandState {
  const state: IslandState = {
    ...initial,
    layout: [],
    land: [],
    landStock: 0,
    paving: [],
    signLabels: {},
    removedLand: Array.from({ length: 9 }, (_, i) => ({
      x: 19 + (i % 3),
      y: 16 + Math.floor(i / 3),
    })),
  }
  const add = (p: Placement) => {
    if (!canPlace(state.layout, p, state.land, state.removedLand))
      throw Error('기본 섬의 배치 위치를 확인해주세요: ' + p.id)
    state.layout.push(p)
  }
  const groups = new Map(
    placeGroups.flatMap((group) =>
      group.sections.flatMap((section) => section.paths.map((path) => [path, group.id] as const)),
    ),
  )
  for (const f of items) {
    const path = f.to ?? '',
      spot = positions[path]
    if (!spot || (!groups.has(path) && path !== '/notifications'))
      throw Error('기본 섬 분류와 위치가 필요한 장소: ' + path)
    add({ id: f.id, x: spot[0], y: spot[1] })
  }
  const trees = state.owned.filter((id) => id.split('~')[0] === 'tree')
  trees.forEach((id, i) => add({ id, x: i === 0 ? 7 : 14, y: 5 }))
  const bench = state.owned.find((id) => id.split('~')[0] === 'bench')
  if (bench) add({ id: bench, x: 10, y: 13 })
  for (const p of [
    { id: 'rubber-duck~starter-lake', x: 20, y: 17 },
    { id: 'wood-arrow-sign~starter-aquarium', x: 6, y: 8, label: '아쿠아리움' },
    ...placeGroups.map((group) => ({
      id: 'island-name-sign~zone-' + group.id,
      ...islandZoneSigns[group.id],
      label: group.label,
    })),
  ]) {
    state.owned.push(p.id)
    add(p)
  }
  const surfaces = new Map<string, { x: number; y: number; type: 'grass' | 'stone' | 'wood' }>()
  const surface = (x: number, y: number, type: 'grass' | 'stone' | 'wood') => {
    if (isLand(x, y, state.land, state.removedLand)) surfaces.set(x + ',' + y, { x, y, type })
  }
  for (const [x, y] of [
    [18, 7],
    [22, 7],
    [18, 11],
    [22, 11],
    [8, 7],
    [12, 7],
  ])
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) surface(x + dx, y + dy, 'grass')
  for (const [x, y] of [
    [8, 11],
    [11, 11],
    [14, 11],
    [10, 13],
    [11, 13],
    [8, 23],
    [11, 23],
    [14, 23],
  ])
    surface(x, y, 'grass')
  for (let y = 20; y <= 22; y++) for (let x = 7; x <= 14; x++) surface(x, y, 'grass')
  for (const [x, y] of [
    [17, 14],
    [23, 14],
    [17, 20],
    [23, 20],
    [24, 20],
    [17, 21],
    [23, 21],
    [24, 21],
    [17, 13],
    [23, 13],
  ])
    surface(x, y, 'grass')
  for (let y = 4; y <= 30; y++) surface(16, y, 'stone')
  for (let x = 7; x <= 32; x++) surface(x, 15, 'stone')
  for (let x = 16; x <= 31; x++) surface(x, 24, 'stone')
  for (let x = 8; x <= 15; x++) surface(x, 27, 'stone')
  for (let y = 7; y <= 14; y++) surface(24, y, 'stone')
  for (let y = 15; y <= 19; y++)
    for (let x = 18; x <= 22; x++)
      if (x === 18 || x === 22 || y === 15 || y === 19) surface(x, y, 'wood')
  state.paving = [...surfaces.values()]
  return state
}
