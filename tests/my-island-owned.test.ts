import { expect, it } from 'vitest'
import {
  ownedFacilities,
  localIslandState,
  visibleIslandState,
  createDefaultIsland,
  readPageIsland,
} from '@/features/my-island/owned-facilities'
import { defaultState, parseState, canPlace, footprint } from '@/features/my-island/island-model'
import { headerPlaces } from '@/components/header-place-navigation'
import { destinationArtwork } from '@/features/my-island/destination-art'

it('provides semantic artwork for every page rendered as a destination', () => {
  for (const item of ownedFacilities().filter((f) => f.kind === 'destination'))
    expect(destinationArtwork(item.to ?? ''), item.to).toBeDefined()
})
it('keeps existing building positions while clearing their old rotations', () => {
  const state = defaultState()
  state.layout = [
    { id: 'fuel~owned:hub', x: 15, y: 15, rotation: 90 },
    { id: 'bench~starter', x: 25, y: 18, rotation: 90 },
  ]
  const normalized = localIslandState(state)
  expect(normalized.layout).toEqual([
    { id: 'fuel~owned:hub', x: 15, y: 15 },
    { id: 'bench~starter', x: 25, y: 18, rotation: 90 },
  ])
  expect(state.layout[0].rotation).toBe(90)
})
it('places every navigation destination in the complete starter without collisions', () => {
  const state = createDefaultIsland(),
    items = ownedFacilities()
  expect(state.layout.length).toBe(items.length + state.owned.length)
  for (const item of items)
    expect(
      state.layout.filter((p) => p.id === item.id),
      item.name,
    ).toHaveLength(1)
  for (const p of state.layout) expect(canPlace(state.layout, p, state.land,state.removedLand), p.id).toBe(true)
  expect(parseState(state).layout).toEqual(state.layout)
})
it('sizes compact destinations consistently for rendering and collision checks', () => {
  for (const path of [
    '/square/begging',
    '/island-news',
    '/hall-of-fame',
    '/development-fund',
    '/square/sponsorship',
    '/expeditions',
    '/square/suggestions',
    '/square/bugs',
    '/merchant-orders',
  ]) {
    const item = ownedFacilities().find((f) => f.to === path)!
    expect(item).toMatchObject({ w: 1, h: 1 })
    expect(footprint({ id: item.id, x: 0, y: 0 })).toEqual({ w: 1, h: 1 })
  }
  expect(ownedFacilities().find((f) => f.kind === 'lighthouse')).toMatchObject({ w: 2, h: 2 })
})
it('uses two by two production equipment footprints and preserves adjacent placements', () => {
  const items = ownedFacilities().filter((f) => ['fuel', 'bait', 'workshop'].includes(f.kind))
  expect(items).toHaveLength(3)
  for (const item of items) {
    expect(item).toMatchObject({ w: 2, h: 2 })
    const placement = { id: item.id, x: 20, y: 20 }
    expect(footprint(placement)).toEqual({ w: 2, h: 2 })
    expect(canPlace([placement], { id: 'warehouse', x: 20, y: 18 })).toBe(true)
    expect(canPlace([placement], { id: 'mail', x: 21, y: 22 })).toBe(true)
    expect(canPlace([placement], { id: 'mail', x: 21, y: 21 })).toBe(false)
    expect(canPlace([placement], { id: 'mail', x: 21, y: 20 })).toBe(false)
  }
  const state = defaultState()
  state.layout = items.map((f, i) => ({ id: f.id, x: 20, y: 18 + i * 2 }))
  expect(parseState(state).layout).toEqual(state.layout)
})
it('moves the garden and aquascape shop into storage once and permits placing them again', () => {
  const key = 'island-storage-adjustment-test'
  const marker = `${key}:stored-garden-and-aquascape:v1`
  localStorage.removeItem(marker)
  const state = createDefaultIsland()
  const items = ownedFacilities().filter((f) => ['/farm', '/decoration-shop'].includes(f.to ?? ''))
  state.layout.push({ id: items[0].id, x: 11, y: 24 }, { id: items[1].id, x: 23, y: 5 })
  localStorage.setItem(key, JSON.stringify(state))
  const migrated = readPageIsland(key)
  expect(migrated.layout).toEqual(state.layout.filter((p) => !items.some((f) => f.id === p.id)))
  expect(visibleIslandState(migrated, ownedFacilities()).owned).toEqual(
    expect.arrayContaining(items.map((f) => f.id)),
  )
  migrated.layout.push({ id: items[0].id, x: 6, y: 3 })
  localStorage.setItem(key, JSON.stringify(migrated))
  expect(readPageIsland(key).layout).toEqual(migrated.layout)
  localStorage.removeItem(key)
  localStorage.removeItem(marker)
  const fresh = readPageIsland(key)
  fresh.layout=fresh.layout.filter(p=>p.id!==items[0].id)
  fresh.layout.push({ id: items[0].id, x: 6, y: 3 })
  localStorage.setItem(key, JSON.stringify(fresh))
  expect(readPageIsland(key).layout).toEqual(fresh.layout)
  localStorage.removeItem(key)
  localStorage.removeItem(marker)
})
it('uses the complete default only for a fresh browser save and preserves edited layouts', () => {
  const key = 'pongdang:island:v2:default-placement-test'
  localStorage.removeItem(key)
  localStorage.removeItem(key.replace(':v2:', ':v1:'))
  expect(readPageIsland(key)).toEqual(createDefaultIsland())
  const edited = localIslandState(defaultState())
  edited.coins = 1330
  edited.layout = []
  localStorage.setItem(key, JSON.stringify(edited))
  expect(readPageIsland(key)).toEqual(edited)
  localStorage.removeItem(key)
})
it('ships every proposed activity landmark in the default scene with its own destination', () => {
  const items = ownedFacilities(),
    state = visibleIslandState(defaultState(), items)
  for (const path of [
    '/titles',
    '/relics',
    '/harbor',
    '/square/notices',
    '/board',
    '/music-room',
    '/savings',
    '/arcade',
  ]) {
    const item = items.find((f) => f.to === path)!
    expect(item.kind, path).not.toBe('destination')
    expect(
      state.layout.some((p) => p.id === item.id),
      path,
    ).toBe(true)
    const old = defaultState()
    old.layout = [{ id: `portal~owned:page:${path}`, x: 12, y: 12 }]
    expect(visibleIslandState(old, items).layout).toEqual([{ id: item.id, x: 12, y: 12 }])
  }
})
it('provides exactly one navigation building per destination', () => {
  const items = ownedFacilities()
  expect(items.filter((f) => f.kind === 'aquarium')).toHaveLength(1)
  expect(items.filter((f) => f.kind === 'dock')).toHaveLength(1)
  expect(items.filter((f) => f.kind === 'fuel')).toHaveLength(1)
  expect(items.filter((f) => f.kind === 'shop')).toHaveLength(1)
  expect(new Set(items.map((f) => f.to)).size).toBe(items.length)
  expect(items.find((f) => f.kind === 'aquarium')).toMatchObject({
    name: '아쿠아리움',
    to: '/aquarium',
  })
  expect(items.find((f) => f.kind === 'fuel')?.to).toBe('/production')
  expect(items.find((f) => f.kind === 'shop')?.to).toBe('/shop')
  expect(items.find((f) => f.kind === 'shipyard')?.to).toBe('/shipyard')
  expect(items.find((f) => f.id === 'mail~owned:mail')?.to).toBe('/notifications')
  expect(items.find((f) => f.to === '/collection')).toMatchObject({
    id: 'books~owned:hub',
    name: '도감',
    kind: 'books',
    w: 1,
    h: 1,
  })
  expect(items.find((f) => f.to === '/storage')).toMatchObject({
    id: 'stash~owned:hub',
    name: '보관함',
    w: 1,
    h: 1,
  })
  expect(items.find((f) => f.to === '/friends')).toMatchObject({
    id: 'lighthouse~owned:hub',
    name: '등대',
    kind: 'lighthouse',
  })
  for (const p of headerPlaces.filter(
    (p) => !['/my-island', '/collection-animation'].includes(p.to),
  ))
    expect(
      items.some((f) => f.to === p.to),
      p.to,
    ).toBe(true)
})
it('starts the three landmarks on the island and migrates their earlier generic buildings', () => {
  const items = ownedFacilities(),
    state = visibleIslandState(defaultState(), items)
  for (const id of ['books~owned:hub', 'stash~owned:hub', 'lighthouse~owned:hub'])
    expect(
      state.layout.some((p) => p.id === id),
      id,
    ).toBe(true)
  const old = defaultState()
  old.layout = [
    { id: 'portal~owned:page:/collection', x: 10, y: 10 },
    { id: 'portal~owned:page:/storage', x: 20, y: 20 },
    { id: 'portal~owned:page:/friends', x: 28, y: 18 },
  ]
  const migrated = visibleIslandState(old, items)
  expect(migrated.layout).toEqual([
    { id: 'books~owned:hub', x: 10, y: 10 },
    { id: 'stash~owned:hub', x: 20, y: 20 },
    { id: 'lighthouse~owned:hub', x: 28, y: 18 },
  ])
  expect(visibleIslandState(parseState(localIslandState(old)), items).layout).toEqual(
    migrated.layout,
  )
})
it('keeps distinct destination building positions instead of merging all generic pages', () => {
  const state = defaultState()
  state.layout = [
    { id: 'portal~owned:page:/profile', x: 10, y: 10 },
    { id: 'portal~owned:page:/farm', x: 20, y: 20 },
  ]
  expect(visibleIslandState(state, ownedFacilities()).layout).toEqual(state.layout)
  expect(visibleIslandState(parseState(localIslandState(state)), ownedFacilities()).layout).toEqual(
    state.layout,
  )
})
it('merges previously placed individual tanks, sites and docks while preserving their first position', () => {
  const state = defaultState()
  state.layout = [
    { id: 'aquarium-1~owned:tank-a', x: 19, y: 8 },
    { id: 'aquarium-1~owned:tank-b', x: 25, y: 13 },
    { id: 'fuel~owned:site-a', x: 11, y: 9 },
    { id: 'fuel~owned:site-b', x: 11, y: 19 },
    { id: 'dock~owned:slot:1', x: 18, y: 30 },
    { id: 'dock~owned:slot:2', x: 23, y: 30 },
  ]
  const merged = visibleIslandState(state, ownedFacilities())
  expect(merged.layout).toEqual([
    { id: 'aquarium-1~owned:hub', x: 19, y: 8 },
    { id: 'fuel~owned:hub', x: 11, y: 9 },
    { id: 'dock~owned:hub', x: 18, y: 30 },
  ])
  expect(merged.owned).toContain('shop~owned:hub')
  expect(merged.owned).not.toContain('fuel')
})
it('retains decorations and persists only one position for each navigation building', () => {
  const state = visibleIslandState(defaultState(), ownedFacilities())
  expect(state.layout.filter((p) => p.id.startsWith('aquarium-'))).toHaveLength(1)
  expect(state.layout.some((p) => p.id === 'tree~starter-1')).toBe(true)
  const saved = localIslandState(state)
  expect(saved.owned.every((id) => !id.includes('~owned:'))).toBe(true)
  expect(visibleIslandState(parseState(saved), ownedFacilities()).layout).toEqual(saved.layout)
})
