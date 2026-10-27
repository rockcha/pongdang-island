import {
  facilityFor,
  defaultState,
  readState,
  canPlace,
  footprint,
  canRotate,
  isLand,
} from './island-model'
import type { Facility, IslandState } from './island-model'
import { headerPlaces } from '@/components/header-place-navigation'

export const isOwnedFacility = (id: string) => id.includes('~owned:')
export const isDecoration = (id: string) => facilityFor(id)?.category === 'decoration'
const initiallyStored = new Set(['/farm', '/decoration-shop'])
export function ownedFacilities(): Facility[] {
  const result: Facility[] = []
  const add = (base: string, id: string, name: string, to: string) => {
    const template = facilityFor(`${base}~owned:${id}`)!
    result.push({ ...template, id: `${base}~owned:${id}`, name, to, price: 0 })
    if (id === 'personal-workshop') {
      result[result.length - 1].kind = 'workshop'
      result[result.length - 1].color = '#a2a6c1'
    }
  }
  add('aquarium-1', 'hub', '아쿠아리움', '/aquarium')
  add('fuel', 'hub', '연료 생산소', '/production')
  add('bait', 'hub', '미끼 생산소', '/bait-production')
  add('dock', 'hub', '항구', '/port')
  add('shop', 'hub', '낚시 상점', '/shop')
  add('mail', 'mail', '우편함', '/notifications')
  add('warehouse', 'warehouse', '창고', '/warehouse')
  add('bait', 'personal-workshop', '나만의 미끼 공방', '/my-bait-production')
  add('shipyard', 'hub', '조선소', '/shipyard')
  add('books', 'hub', '도감', '/collection')
  add('stash', 'hub', '보관함', '/storage')
  add('lighthouse', 'hub', '등대', '/friends')
  for (const base of [
    'title-flag',
    'relic-case',
    'map-table',
    'notice-board',
    'community-board',
    'gramophone',
    'shell-safe',
    'arcade-cabinet',
  ]) {
    const f = facilityFor(base)!
    add(base, 'hub', f.name, f.to!)
  }
  const included = new Set([...result.map((f) => f.to), '/my-island', '/collection-animation'])
  const colors = ['#96ada0', '#c4a18b', '#9fa9bf', '#b3b48d', '#b8a1b1', '#88b0b1']
  for (const place of headerPlaces) {
    if (included.has(place.to)) continue
    add('portal', `page:${place.to}`, place.label, place.to)
    const hash = [...place.to].reduce((n, c) => n + c.charCodeAt(0), 0)
    result[result.length - 1].color = colors[hash % colors.length]
  }
  return result
}
/** One navigation building per page; keep the first old placement when merging duplicates. */
function mergeBuildings(layout: IslandState['layout']) {
  const seen = new Set<string>()
  const destinations = new Map(ownedFacilities().map((f) => [f.to, f.id]))
  return layout.flatMap((original) => {
    const oldPath = original.id.startsWith('portal~owned:page:')
      ? original.id.slice('portal~owned:page:'.length)
      : undefined
    const replacement = oldPath ? destinations.get(oldPath) : undefined
    const p = replacement ? { ...original, id: replacement } : { ...original }
    if (!canRotate(p.id)) delete p.rotation
    if (isDecoration(p.id)) return [p]
    const f = facilityFor(p.id)
    if (!f) return []
    if (f.id === 'portal') {
      if (seen.has(p.id)) return []
      seen.add(p.id)
      return [p]
    }
    const base = f.kind === 'aquarium' ? 'aquarium-1' : f.id
    const suffix =
      base === 'mail'
        ? 'mail'
        : base === 'warehouse'
          ? 'warehouse'
          : p.id === 'bait~owned:personal-workshop'
            ? 'personal-workshop'
            : 'hub'
    const id = `${base}~owned:${suffix}`
    if (seen.has(id)) return []
    seen.add(id)
    return [{ ...p, id }]
  })
}
/** Persist decorations and positions, never duplicate the real facility inventories. */
export function localIslandState(state: IslandState): IslandState {
  return {
    ...state,
    owned: state.owned.filter(isDecoration),
    layout: mergeBuildings(state.layout),
  }
}
export function visibleIslandState(local: IslandState, items: Facility[]): IslandState {
  const ids = new Set(items.map((f) => f.id))
  return {
    ...local,
    owned: [...local.owned.filter(isDecoration), ...ids],
    layout: mergeBuildings(local.layout).filter((p) => isDecoration(p.id) || ids.has(p.id)),
  }
}
/** Keep a quiet central lake, with shops north and production along the west edge. */
export function createDefaultIsland(): IslandState {
  const state = localIslandState(defaultState()),
    items = ownedFacilities()
  state.removedLand = Array.from({length:9},(_,i)=>({x:19+i%3,y:16+Math.floor(i/3)}))
  state.owned.push('rubber-duck~starter-lake')
  state.layout.push({id:'rubber-duck~starter-lake',x:20,y:17})
  const preferred: Record<string, [number, number]> = {
    '/aquarium':[19,9],'/notifications':[17,13],'/collection':[13,12],'/storage':[25,12],'/friends':[31,21],
    '/titles':[15,23],'/relics':[13,18],'/harbor':[19,23],'/square/notices':[27,14],'/board':[27,18],'/music-room':[16,26],'/savings':[27,23],'/arcade':[24,26],

    '/production': [8, 12],
    '/bait-production': [8, 17],
    '/my-bait-production': [8, 22],
    '/warehouse': [8, 27],
    '/shop': [27, 5],
    '/shipyard': [25, 28],
    '/port': [20, 30],
    '/farm': [11, 24],
    '/item-shop': [31, 5],
    '/decoration-shop': [23, 5],
    '/production-shop': [15, 5],
    '/bait-production-shop': [19, 5],
    '/profile': [11, 5],
    '/island-news': [7, 5],
    '/exchange': [31, 24],
    '/merchant-orders': [31, 28],
    '/hall-of-fame': [31, 10],
    '/showcase': [31, 14],
    '/square/sponsorship': [7, 9],
    '/square/begging': [11, 17],
  }
  // Reposition the starter facilities into clear shop, production and community areas.
  for(const p of state.layout){const f=items.find(f=>f.id===p.id),spot=f&&preferred[f.to??''];if(spot){p.x=spot[0];p.y=spot[1]}}
  const missing = items.filter(
    (f) => !initiallyStored.has(f.to ?? '') && !state.layout.some((p) => p.id === f.id),
  )
  const place = (id: string, x: number, y: number) => {
    const p = { id, x, y }
    if (!canPlace(state.layout, p, state.land,state.removedLand)) return false
    const size=footprint(p)
    if(x<23&&x+size.w>18&&y<20&&y+size.h>15)return false
    state.layout.push(p)
    return true
  }
  for (const f of missing) {
    const spot = preferred[f.to ?? '']
    if (spot) place(f.id, ...spot)
  }
  for (const f of missing) {
    if (state.layout.some((p) => p.id === f.id)) continue
    let placed = false
    for (const y of [5, 9, 13, 17, 21, 25, 28]) {
      for (const x of [7, 11, 15, 19, 23, 27, 31]) {
        const candidate = { id: f.id, x, y },
          size = footprint(candidate)
        const spaced = !state.layout.some((p) => {
          const other = footprint(p)
          return (
            x < p.x + other.w + 1 &&
            x + size.w + 1 > p.x &&
            y < p.y + other.h + 1 &&
            y + size.h + 1 > p.y
          )
        })
        if (spaced && place(f.id, x, y)) {
          placed = true
          break
        }
      }
      if (placed) break
    }
    // Retain a deterministic fallback if new destinations are added to the menu later.
    if (!placed)
      for (let y = 3; y < 31 && !placed; y++)
        for (let x = 6; x < 34 && !placed; x++) placed = place(f.id, x, y)
    if (!placed) throw new Error(`기본 섬의 배치 공간이 부족해요: ${f.name}`)
  }
  const surfaces=new Map<string,{x:number;y:number;type:'grass'|'stone'|'wood'}>()
  const surface=(x:number,y:number,type:'grass'|'stone'|'wood')=>{if(isLand(x,y,state.land,state.removedLand))surfaces.set(x+','+y,{x,y,type})}
  // Grass is a recoverable surface, rather than the underlying land.
  for(const [left,top,right,bottom] of [[12,11,16,21],[24,11,28,21],[17,8,23,12],[14,23,26,27]])
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)surface(x,y,'grass')
  for(let x=11;x<=30;x++){surface(x,8,'stone');surface(x,28,'stone')}
  for(let y=8;y<=28;y++){surface(11,y,'stone');surface(29,y,'stone')}
  for(let y=15;y<=19;y++)for(let x=18;x<=22;x++)if(x===18||x===22||y===15||y===19)surface(x,y,'wood')
  state.paving=[...surfaces.values()]
  return state
}
export function readPageIsland(key: string): IslandState {
  const migrationKey = `${key}:stored-garden-and-aquascape:v1`
  try {
    if (
      localStorage.getItem(key) !== null ||
      localStorage.getItem(key.replace(':v2:', ':v1:')) !== null
    ) {
      const state = localIslandState(readState(key))
      if (localStorage.getItem(migrationKey) === null) {
        const storedIds = new Set(
          ownedFacilities()
            .filter((f) => initiallyStored.has(f.to ?? ''))
            .map((f) => f.id),
        )
        state.layout = state.layout.filter((p) => !storedIds.has(p.id))
        // Persist before the marker so a reload cannot undo this one-time move.
        localStorage.setItem(key, JSON.stringify(state))
        localStorage.setItem(migrationKey, '1')
      }
      return state
    }
    localStorage.setItem(migrationKey, '1')
  } catch {
    return createDefaultIsland()
  }
  return createDefaultIsland()
}
