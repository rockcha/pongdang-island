import {createGroupedIsland} from './island-starter-layout'
import {
  facilityFor,
  defaultState,
  readState,
  supportsSavedRotation,
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
  add('books', 'hub', '개체 도감', '/collection')
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
    if (!supportsSavedRotation(p.id)) delete p.rotation
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
/** Keep header categories together, with a quiet lake between neighborhoods. */
export function createDefaultIsland(): IslandState {
 return createGroupedIsland(ownedFacilities(),localIslandState(defaultState()))
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
