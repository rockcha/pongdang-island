import {gardenDecorations} from './garden-decoration-catalog'
export type Cell = { x: number; y: number }
export const floorTiles = [
  { id: 'grass', name: '잔디 타일', price: 10 },
  { id: 'dirt', name: '흙길', price: 10 },
  { id: 'gravel', name: '자갈길', price: 10 },
  { id: 'sand', name: '모래 바닥', price: 10 },
  { id: 'stone', name: '돌 포장길', price: 20 },
  { id: 'brick', name: '벽돌길', price: 20 },
  { id: 'wood', name: '나무 데크', price: 20 },
] as const
export type FloorKind = (typeof floorTiles)[number]['id']
export type FloorPlacement = Cell & { type: FloorKind }
export type Placement = { id: string; x: number; y: number; rotation?: number; label?:string }
export const LAND_PRICE = 50
export const canRotate = (id: string) => {
  const f = facilityFor(id)
  return f?.rotatable === true
}
export function footprint(p: Placement) {
  const f = facilityFor(p.id)!
  return (p.rotation ?? 0) % 180 === 90 ? { w: f.h, h: f.w } : { w: f.w, h: f.h }
}
export type Facility = {
  id: string
  name: string
  kind: string
  w: number
  h: number
  color: string
  to?: string
  price: number
  category: 'building' | 'decoration'
  rotatable?: boolean
  placementTerrain?: 'land' | 'any' | 'water'
}
export const facilities: Facility[] = [
  ...gardenDecorations,
  ...[1,2,3].map(length=>({id:'wood-bridge-'+length,name:length===1?'짧은 나무다리':length===2?'나무다리':'긴 나무다리',kind:'bridge',w:1,h:length,color:'#bd996d',price:length*100,category:'decoration' as const,rotatable:true,placementTerrain:'water' as const})),
  {id:'stepping-stones',name:'물길 징검돌',kind:'stepping-stones',w:1,h:1,color:'#b8b9a6',price:80,category:'decoration',rotatable:false,placementTerrain:'water'},
  {id:'reeds',name:'물가 갈대',kind:'reeds',w:1,h:1,color:'#97af78',price:60,category:'decoration',rotatable:false,placementTerrain:'any'},
  {
    id: 'title-flag',
    name: '칭호',
    kind: 'title-flag',
    w: 1,
    h: 1,
    color: '#d5af74',
    to: '/titles',
    price: 0,
    category: 'building',
  },
  {
    id: 'relic-case',
    name: '유물',
    kind: 'relic-case',
    w: 1,
    h: 1,
    color: '#9cbfb4',
    to: '/relics',
    price: 0,
    category: 'building',
  },
  {
    id: 'map-table',
    name: '지도',
    kind: 'map-table',
    w: 1,
    h: 1,
    color: '#c9ae7c',
    to: '/harbor',
    price: 0,
    category: 'building',
  },
  {
    id: 'notice-board',
    name: '공지',
    kind: 'notice-board',
    w: 1,
    h: 1,
    color: '#8ba694',
    to: '/square/notices',
    price: 0,
    category: 'building',
  },
  {
    id: 'community-board',
    name: '자유게시판',
    kind: 'community-board',
    w: 1,
    h: 1,
    color: '#bd9779',
    to: '/board',
    price: 0,
    category: 'building',
  },
  {
    id: 'gramophone',
    name: '음악 감상',
    kind: 'gramophone',
    w: 1,
    h: 1,
    color: '#d6b977',
    to: '/music-room',
    price: 0,
    category: 'building',
  },
  {
    id: 'shell-safe',
    name: '조개 적금',
    kind: 'shell-safe',
    w: 1,
    h: 1,
    color: '#b2bbbf',
    to: '/savings',
    price: 0,
    category: 'building',
  },
  {
    id: 'arcade-cabinet',
    name: '미니게임',
    kind: 'arcade-cabinet',
    w: 1,
    h: 1,
    color: '#88afb0',
    to: '/arcade',
    price: 0,
    category: 'building',
  },
  {
    id: 'books',
    name: '도감',
    kind: 'books',
    w: 1,
    h: 1,
    color: '#88a8a0',
    to: '/collection',
    price: 0,
    category: 'building',
  },
  {
    id: 'stash',
    name: '보관함',
    kind: 'stash',
    w: 1,
    h: 1,
    color: '#c19865',
    to: '/storage',
    price: 0,
    category: 'building',
  },
  {
    id: 'lighthouse',
    name: '등대',
    kind: 'lighthouse',
    w: 2,
    h: 2,
    color: '#d8917d',
    to: '/friends',
    price: 0,
    category: 'building',
  },
  {
    id: 'portal',
    name: '섬의 건물',
    kind: 'destination',
    w: 2,
    h: 2,
    color: '#93aa91',
    price: 0,
    category: 'building',
  },
  {
    id: 'shipyard',
    name: '조선소',
    kind: 'shipyard',
    w: 2,
    h: 2,
    color: '#8dabc0',
    to: '/shipyard',
    price: 0,
    category: 'building',
  },
  {
    id: 'shop',
    name: '낚시 상점',
    kind: 'shop',
    w: 2,
    h: 2,
    color: '#d8957b',
    to: '/shop',
    price: 0,
    category: 'building',
  },
  {
    id: 'fuel',
    name: '연료 생산시설',
    kind: 'fuel',
    w: 2,
    h: 2,
    color: '#bc7960',
    to: '/production',
    price: 600,
    category: 'building',
  },
  {
    id: 'aquarium-1',
    name: '아쿠아리움 1',
    kind: 'aquarium',
    w: 2,
    h: 2,
    color: '#69b7b5',
    to: '/aquarium',
    price: 800,
    category: 'building',
  },
  {
    id: 'aquarium-2',
    name: '아쿠아리움 2',
    kind: 'aquarium',
    w: 2,
    h: 2,
    color: '#829cc8',
    to: '/aquarium',
    price: 800,
    category: 'building',
  },
  {
    id: 'mail',
    name: '우편함',
    kind: 'mail',
    w: 1,
    h: 1,
    color: '#d77e70',
    to: '/notifications',
    price: 100,
    category: 'building',
  },
  {
    id: 'bait',
    name: '미끼 생산소',
    kind: 'bait',
    w: 2,
    h: 2,
    color: '#8ca577',
    to: '/my-bait-production',
    price: 400,
    category: 'building',
  },
  {
    id: 'warehouse',
    name: '창고',
    kind: 'warehouse',
    w: 2,
    h: 2,
    color: '#c19865',
    to: '/warehouse',
    price: 350,
    category: 'building',
  },
  {
    id: 'dock',
    rotatable: true,
    name: '어선 시설',
    kind: 'dock',
    w: 2,
    h: 3,
    color: '#b18b63',
    to: '/port',
    price: 700,
    category: 'building',
  },
  {
    id: 'tree',
    rotatable: true,
    name: '동글 나무',
    kind: 'tree',
    w: 1,
    h: 1,
    color: '#78a46e',
    price: 300,
    category: 'decoration',
  },
  {
    id: 'pine',
    rotatable: true,
    name: '솔솔 소나무',
    kind: 'pine',
    w: 1,
    h: 1,
    color: '#638f7b',
    price: 300,
    category: 'decoration',
  },
  {
    id: 'flowers',
    rotatable: true,
    name: '봄꽃 화단',
    kind: 'flowers',
    w: 1,
    h: 1,
    color: '#dc9a99',
    price: 50,
    category: 'decoration',
  },
  {
    id: 'bench',
    rotatable: true,
    name: '나무 벤치',
    kind: 'bench',
    w: 2,
    h: 1,
    color: '#bd9463',
    price: 120,
    category: 'decoration',
  },
  {
    id: 'lamp',
    rotatable: true,
    name: '별빛 가로등',
    kind: 'lamp',
    w: 1,
    h: 1,
    color: '#e4bc6d',
    price: 150,
    category: 'decoration',
  },
  {
    id: 'pond',
    rotatable: true,
    name: '작은 연못',
    kind: 'pond',
    w: 2,
    h: 1,
    color: '#83bfc0',
    price: 250,
    category: 'decoration',
  },
  {
    id: 'rubber-duck',
    placementTerrain: 'any',
    name: '고무오리',
    kind: 'rubber-duck',
    w: 1,
    h: 1,
    color: '#edc665',
    price: 100,
    category: 'decoration',
    rotatable: false,
  },
]
export function facilityFor(id: string) {
  const f = facilities.find((f) => f.id === id.split('~')[0])
  if (f?.kind === 'destination' && compactDestinations.has(id.slice('portal~owned:page:'.length)))
    return { ...f, w: 1, h: 1 }
  return f
}
const compactDestinations = new Set([
  '/square/begging',
  '/island-news',
  '/hall-of-fame',
  '/development-fund',
  '/square/sponsorship',
  '/expeditions',
  '/square/suggestions',
  '/square/bugs',
  '/merchant-orders',
])
export const initialLayout: Placement[] = [
  { id: 'aquarium-1', x: 19, y: 10 },
  { id: 'mail', x: 17, y: 17 },
  { id: 'tree~starter-1', x: 12, y: 12 },
  { id: 'tree~starter-2', x: 26, y: 12 },
  { id: 'bench~starter', x: 19, y: 25 },
  { id: 'books', x: 15, y: 14 },
  { id: 'stash', x: 22, y: 17 },
  { id: 'lighthouse', x: 32, y: 21 },
  { id: 'title-flag', x: 15, y: 22 },
  { id: 'relic-case', x: 15, y: 18 },
  { id: 'map-table', x: 19, y: 21 },
  { id: 'notice-board', x: 24, y: 14 },
  { id: 'community-board', x: 24, y: 18 },
  { id: 'gramophone', x: 16, y: 25 },
  { id: 'shell-safe', x: 25, y: 22 },
  { id: 'arcade-cabinet', x: 24, y: 25 },
]
export const initialOwned = initialLayout.map((p) => p.id)
export const WORLD = { width: 1280, height: 1152 }
const isBaseLand = (x: number, y: number) => x >= 6 && x < 34 && y >= 3 && y < 31
export function isLand(x: number, y: number, land: Cell[] = [], removedLand: Cell[] = []) {
  return (
    (isBaseLand(x, y) && !removedLand.some((p) => p.x === x && p.y === y)) ||
    land.some((p) => p.x === x && p.y === y)
  )
}
export function canPlace(
  layout: Placement[],
  item: Placement,
  land: Cell[] = [],
  removedLand: Cell[] = [],
) {
  const f = facilityFor(item.id)
  if (
    !f ||
    !Number.isInteger(item.x) ||
    !Number.isInteger(item.y) ||
    item.x < 0 ||
    item.y < 0 ||
    ![0, 90, 180, 270].includes(item.rotation ?? 0) ||
    (!!item.rotation && !canRotate(item.id))
  )
    return false
  const { w, h } = footprint(item)
  if (item.x + w > 40 || item.y + h > 36) return false
  if (f.kind === 'dock') {
    const r = item.rotation ?? 0
    let anchored = false,
      waterfront = false
    for (let dx = 0; dx < w; dx++)
      for (let dy = 0; dy < h; dy++) {
        const shore =
          r === 0 ? dy === 0 : r === 90 ? dx === w - 1 : r === 180 ? dy === h - 1 : dx === 0
        if (shore && isLand(item.x + dx, item.y + dy, land, removedLand)) anchored = true
        const front =
          r === 0 ? dy === h - 1 : r === 90 ? dx === 0 : r === 180 ? dy === 0 : dx === w - 1
        if (front) {
          const x = item.x + dx,
            y = item.y + dy
          const outsideX = x + (r === 90 ? -1 : r === 270 ? 1 : 0),
            outsideY = y + (r === 0 ? 1 : r === 180 ? -1 : 0)
          if (!isLand(x, y, land, removedLand) || !isLand(outsideX, outsideY, land, removedLand))
            waterfront = true
        }
      }
    if (!anchored || !waterfront) return false
  } else if(f.placementTerrain==='water'){
    for(let x=item.x;x<item.x+w;x++)for(let y=item.y;y<item.y+h;y++)if(isLand(x,y,land,removedLand))return false
  } else if (f.placementTerrain !== 'any')
    for (let x = item.x; x < item.x + w; x++)
      for (let y = item.y; y < item.y + h; y++) if (!isLand(x, y, land, removedLand)) return false
  return !layout.some((p) => {
    if (p.id === item.id) return false
    const other = facilityFor(p.id) ? footprint(p) : null
    return (
      !!other &&
      item.x < p.x + other.w &&
      item.x + w > p.x &&
      item.y < p.y + other.h &&
      item.y + h > p.y
    )
  })
}
export type IslandState = {
  signLabels?:Record<string,string>
  layout: Placement[]
  owned: string[]
  coins: number
  land: Cell[]
  removedLand: Cell[]
  landStock: number
  paving: FloorPlacement[]
  tileStock: Record<string, number>
}
export function defaultState(): IslandState {
  return {
    layout: initialLayout.map((p) => ({ ...p })),
    owned: [...initialOwned],
    coins: 3000,
    land: [],
    removedLand: [],
    landStock: 0,
    paving: [],
    tileStock: {},
  }
}
export function parseState(value: unknown): IslandState {
  if (!value || typeof value !== 'object') return defaultState()
  const data = value as Partial<IslandState>
  if (!Array.isArray(data.owned) || !Array.isArray(data.layout)) return defaultState()
  const owned = [
    ...new Set(
      data.owned.filter((id): id is string => typeof id === 'string' && !!facilityFor(id)),
    ),
  ].slice(0, 300)
  const layout: Placement[] = []
  const land: Cell[] = []
  const removedLand: Cell[] = []
  if (Array.isArray(data.removedLand))
    for (const p of data.removedLand) {
      if (
        p &&
        Number.isInteger(p.x) &&
        Number.isInteger(p.y) &&
        isBaseLand(p.x, p.y) &&
        !removedLand.some((i) => i.x === p.x && i.y === p.y)
      )
        removedLand.push({ x: p.x, y: p.y })
    }
  if (Array.isArray(data.land))
    for (const p of data.land) {
      if (
        p &&
        Number.isInteger(p.x) &&
        Number.isInteger(p.y) &&
        p.x >= 0 &&
        p.x < 40 &&
        p.y >= 0 &&
        p.y < 36 &&
        !isLand(p.x, p.y, land)
      )
        land.push({ x: p.x, y: p.y })
    }
  for (const p of data.layout) {
    // Earlier previews had a fixed southern dock before the square coastline.
    let item =
      p &&
      typeof p.id === 'string' &&
      facilityFor(p.id)?.kind === 'dock' &&
      !('land' in data) &&
      p.y === 28
        ? { ...p, y: 30 }
        : p
    if (
      item &&
      typeof item.id === 'string' &&
      facilityFor(item.id) &&
      !canRotate(item.id) &&
      [90, 180, 270].includes(item.rotation ?? 0)
    )
      item = { ...item, rotation: 0 }
    if (
      p &&
      typeof p === 'object' &&
      typeof p.id === 'string' &&
      (owned.includes(p.id) || p.id.includes('~owned:')) &&
      !layout.some((i) => i.id === p.id) &&
      canPlace(layout, item, land, removedLand)
    )
      layout.push({
        id: item.id,
        x: item.x,
        y: item.y,
        ...(item.rotation ? { rotation: item.rotation } : {}),
        ...((facilityFor(item.id)?.kind==='arrow-sign'||facilityFor(item.id)?.kind==='name-sign')&&typeof item.label==='string'?{label:item.label.trim().slice(0,16)}:{}),
      })
  }
  const tileStock: Record<string, number> = {}
  for (const tile of floorTiles) {
    const count = data.tileStock?.[tile.id]
    if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 && count <= 10000)
      tileStock[tile.id] = count
  }
  const paving: FloorPlacement[] = []
  if (Array.isArray(data.paving))
    for (const p of data.paving) {
      if (
        p &&
        Number.isInteger(p.x) &&
        Number.isInteger(p.y) &&
        p.x >= 0 &&
        p.x < 40 &&
        p.y >= 0 &&
        p.y < 36 &&
        floorTiles.some((t) => t.id === p.type) &&
        isLand(p.x, p.y, land, removedLand) &&
        !paving.some((t) => t.x === p.x && t.y === p.y)
      )
        paving.push({ x: p.x, y: p.y, type: p.type })
    }
  const signLabels:Record<string,string>={}
  if(data.signLabels&&typeof data.signLabels==='object')for(const id of owned){const label=data.signLabels[id],kind=facilityFor(id)?.kind;if((kind==='arrow-sign'||kind==='name-sign')&&typeof label==='string')signLabels[id]=label.trim().slice(0,16)}
  return {
    ...(Object.keys(signLabels).length?{signLabels}:{}),
    owned,
    layout,
    land,
    removedLand,
    landStock:
      typeof data.landStock === 'number' &&
      Number.isSafeInteger(data.landStock) &&
      data.landStock >= 0 &&
      data.landStock <= 10000
        ? data.landStock
        : 0,
    paving,
    tileStock,
    coins:
      typeof data.coins === 'number' && Number.isSafeInteger(data.coins) && data.coins >= 0
        ? data.coins
        : 3000,
  }
}
export function readState(key: string): IslandState {
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) return parseState(JSON.parse(saved))
    if (key.includes(':v2:')) {
      const previous = JSON.parse(localStorage.getItem(key.replace(':v2:', ':v1:')) ?? 'null')
      if (Array.isArray(previous)) {
        const next = defaultState()
        next.owned = [
          ...new Set([
            ...next.owned,
            ...facilities.filter((f) => f.category === 'building').map((f) => f.id),
          ]),
        ]
        next.layout = []
        for (const old of previous) {
          if (
            !old ||
            typeof old.id !== 'string' ||
            !next.owned.includes(old.id) ||
            !Number.isInteger(old.x) ||
            !Number.isInteger(old.y)
          )
            continue
          const p = {
            id: old.id,
            x: old.id === 'dock' ? old.x + 10 : old.x + 8,
            y: old.id === 'dock' ? 30 : old.y + 5,
          }
          if (canPlace(next.layout, p) && !next.layout.some((p) => p.id === old.id))
            next.layout.push(p)
        }
        for (const p of initialLayout.filter((p) => facilityFor(p.id)?.category === 'decoration'))
          if (canPlace(next.layout, p)) next.layout.push({ ...p })
        return next
      }
    }
    return defaultState()
  } catch {
    return defaultState()
  }
}
export function buyItem(state: IslandState, type: string, id: string): IslandState | null {
  const f = facilityFor(type)
  if (
    !f ||
    id.split('~')[0] !== f.id ||
    state.coins < f.price ||
    state.owned.length >= 300 ||
    state.owned.includes(id)
  )
    return null
  return { ...state, coins: state.coins - f.price, owned: [...state.owned, id] }
}
export function buyLand(state:IslandState):IslandState|null{
 if(state.coins<LAND_PRICE||state.landStock>=10000)return null
 return {...state,coins:state.coins-LAND_PRICE,landStock:state.landStock+1}
}
export function addLand(state: IslandState, cell: Cell): IslandState | null {
  if (
    !Number.isInteger(cell.x) ||
    !Number.isInteger(cell.y) ||
    cell.x < 0 ||
    cell.x >= 40 ||
    cell.y < 0 ||
    cell.y >= 36 ||
    isLand(cell.x, cell.y, state.land, state.removedLand) ||
    state.landStock < 1
  )
    return null
  if (
    state.layout.some((p) => {
      const { w, h } = footprint(p)
      return cell.x >= p.x && cell.x < p.x + w && cell.y >= p.y && cell.y < p.y + h
    })
  )
    return null
  const next = {
    ...state,
    coins: state.coins,
    landStock: Math.max(0, state.landStock - 1),
    removedLand: state.removedLand.filter((p) => p.x !== cell.x || p.y !== cell.y),
    land: isBaseLand(cell.x, cell.y) ? state.land : [...state.land, { x: cell.x, y: cell.y }],
  }
  return next.layout.every((p) => canPlace(next.layout, p, next.land, next.removedLand))
    ? next
    : null
}
export function storeLand(state: IslandState, cell: Cell): IslandState | null {
  if (
    !Number.isInteger(cell.x) ||
    !Number.isInteger(cell.y) ||
    cell.x < 0 ||
    cell.x >= 40 ||
    cell.y < 0 ||
    cell.y >= 36 ||
    !isLand(cell.x, cell.y, state.land, state.removedLand) ||
    state.landStock >= 10000
  )
    return null
  if (
    state.layout.some((p) => {
      const { w, h } = footprint(p)
      return cell.x >= p.x && cell.x < p.x + w && cell.y >= p.y && cell.y < p.y + h
    })
  )
    return null
  const tile = state.paving.find((p) => p.x === cell.x && p.y === cell.y)
  const next = {
    ...state,
    land: state.land.filter((p) => p.x !== cell.x || p.y !== cell.y),
    removedLand: isBaseLand(cell.x, cell.y)
      ? [...state.removedLand, { ...cell }]
      : state.removedLand,
    landStock: state.landStock + 1,
    paving: state.paving.filter((p) => p.x !== cell.x || p.y !== cell.y),
    tileStock: tile
      ? { ...state.tileStock, [tile.type]: (state.tileStock[tile.type] ?? 0) + 1 }
      : state.tileStock,
  }
  return next.layout.every((p) => canPlace(next.layout, p, next.land, next.removedLand))
    ? next
    : null
}
/** Move terrain and its surface atomically without changing inventory or charging coins. */
export function moveLand(state:IslandState,from:Cell,to:Cell):IslandState|null{
 if(from.x===to.x&&from.y===to.y)return null
 const tile=state.paving.find(p=>p.x===from.x&&p.y===from.y)
 const lifted=storeLand({...state,landStock:0},from)
 if(!lifted)return null
 const placed=addLand(lifted,to)
 if(!placed)return null
 return {...placed,landStock:state.landStock,tileStock:state.tileStock,paving:tile?[...placed.paving,{...to,type:tile.type}]:placed.paving}
}
export function decorationSellPrice(id: string) {
  const f = facilityFor(id)
  return f?.category === 'decoration' ? Math.floor(f.price / 2) : 0
}
export function sellDecoration(state: IslandState, id: string): IslandState | null {
  const f = facilityFor(id)
  if (f?.category !== 'decoration' || !state.owned.includes(id)) return null
  return {
    ...state,
    coins: state.coins + decorationSellPrice(id),
    owned: state.owned.filter((item) => item !== id),
    layout: state.layout.filter((p) => p.id !== id),
  }
}
export function buyFloor(state: IslandState, type: FloorKind): IslandState | null {
  const tile = floorTiles.find((t) => t.id === type)
  if (!tile || state.coins < tile.price || (state.tileStock[type] ?? 0) >= 10000) return null
  return {
    ...state,
    coins: state.coins - tile.price,
    tileStock: { ...state.tileStock, [type]: (state.tileStock[type] ?? 0) + 1 },
  }
}
export function paintFloor(
  state: IslandState,
  cell: Cell,
  type: FloorKind | 'bare',
): IslandState | null {
  if (
    !Number.isInteger(cell.x) ||
    !Number.isInteger(cell.y) ||
    cell.x < 0 ||
    cell.x >= 40 ||
    cell.y < 0 ||
    cell.y >= 36 ||
    !isLand(cell.x, cell.y, state.land, state.removedLand)
  )
    return null
  const old = state.paving.find((p) => p.x === cell.x && p.y === cell.y)
  if (type === old?.type || (type === 'bare' && !old)) return null
  const tileStock = { ...state.tileStock }
  if (type !== 'bare') {
    if (!floorTiles.some((t) => t.id === type) || (tileStock[type] ?? 0) < 1) return null
    tileStock[type]--
  }
  if (old) tileStock[old.type] = (tileStock[old.type] ?? 0) + 1
  return {
    ...state,
    tileStock,
    paving: [
      ...state.paving.filter((p) => p.x !== cell.x || p.y !== cell.y),
      ...(type === 'bare' ? [] : [{ ...cell, type }]),
    ],
  }
}

export function decorationConnections(layout:Placement[],item:Placement){
 const kind=facilityFor(item.id)?.kind
 const linked=(dx:number,dy:number)=>layout.some(p=>p.id!==item.id&&p.x===item.x+dx&&p.y===item.y+dy&&facilityFor(p.id)?.kind===kind)
 return {north:linked(0,-1),east:linked(1,0),south:linked(0,1),west:linked(-1,0)}
}
