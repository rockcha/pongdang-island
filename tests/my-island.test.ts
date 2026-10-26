import { expect, it } from 'vitest'
import {
  buyItem,
  canPlace,
  defaultState,
  initialLayout,
  parseState,
  readState,
  addLand,
  footprint,
  isLand,
  LAND_PRICE,
  sellDecoration,
  decorationSellPrice,
  facilities,
} from '@/features/my-island/island-model'
it('starts with valid non-overlapping buildings and decorations', () => {
  expect(initialLayout).toHaveLength(16)
  expect(initialLayout.filter((p) => p.id.startsWith('tree~'))).toHaveLength(2)
  for (const item of initialLayout) expect(canPlace(initialLayout, item), item.id).toBe(true)
})
it('restricts docks to the south shore and prevents overlapping facilities', () => {
  expect(canPlace([], { id: 'dock', x: 18, y: 30 })).toBe(true)
  expect(canPlace([], { id: 'dock', x: 8, y: 12 })).toBe(false)
  expect(canPlace([], { id: 'dock', x: 2, y: 18 })).toBe(false)
  expect(canPlace(initialLayout, { id: 'warehouse', x: 19, y: 11 })).toBe(false)
  expect(canPlace(initialLayout, { id: 'warehouse', x: 19, y: 12 })).toBe(true)
  expect(canPlace([], { id: 'fuel', x: 0, y: 0 })).toBe(false)
})
it('fits compact facilities beside each other and preserves their saved positions', () => {
  const state = defaultState()
  state.owned.push('fuel', 'tree~compact')
  state.layout.push({ id: 'fuel', x: 21, y: 10 }, { id: 'tree~compact', x: 23, y: 10 })
  expect(footprint({ id: 'fuel', x: 0, y: 0 })).toEqual({ w: 2, h: 2 })
  expect(footprint({ id: 'tree', x: 0, y: 0 })).toEqual({ w: 1, h: 1 })
  expect(parseState(state).layout).toEqual(state.layout)
  expect(canPlace(state.layout, { id: 'mail', x: 23, y: 11 })).toBe(true)
})
it('preserves stored facilities and rejects corrupt placements', () => {
  localStorage.setItem('island-test', JSON.stringify({ owned: ['mail'], layout: [], coins: 0 }))
  expect(readState('island-test')).toEqual({
    owned: ['mail'],
    layout: [],
    coins: 0,
    land: [],
    removedLand: [],
    landStock: 0,
    paving: [],
    tileStock: {},
  })
  const result = parseState({
    owned: ['mail', 'unknown'],
    layout: [
      { id: 'mail', x: 18, y: 15 },
      { id: 'mail', x: 19, y: 15 },
      { id: 'tree~unowned', x: 20, y: 20 },
    ],
    coins: -1,
  })
  expect(result.layout).toEqual([{ id: 'mail', x: 18, y: 15 }])
  expect(result.owned).toEqual(['mail'])
  localStorage.removeItem('island-test')
})
it('adds isolated sea tiles and joins them back to the square island', () => {
  let state = defaultState()
  const coins = state.coins
  for (const x of [36, 35, 34]) state = addLand(state, { x, y: 16 })!
  expect(state.land).toHaveLength(3)
  expect(state.coins).toBe(coins - 3 * LAND_PRICE)
  for (let x = 33; x <= 36; x++) expect(isLand(x, 16, state.land)).toBe(true)
  expect(canPlace([], { id: 'lamp', x: 36, y: 16 }, state.land)).toBe(true)
  expect(canPlace([], { id: 'bench', x: 35, y: 16 }, state.land)).toBe(true)
  expect(addLand(state, { x: 36, y: 16 })).toBeNull()
  expect(
    addLand(
      { ...state, layout: [...state.layout, { id: 'dock', x: 18, y: 30 }] },
      { x: 18, y: 31 },
    ),
  ).toBeNull()
  expect(addLand({ ...state, coins: 0 }, { x: 37, y: 16 })).toBeNull()
  expect(addLand(state, { x: 40, y: 16 })).toBeNull()
  expect(addLand(state, { x: 36.5, y: 16 })).toBeNull()
  expect(parseState(state)).toEqual(state)
})
it('uses rotated footprints and supports docks on all four coasts', () => {
  expect(footprint({ id: 'bench', x: 0, y: 0, rotation: 90 })).toEqual({ w: 1, h: 2 })
  expect(canPlace([], { id: 'bench', x: 33, y: 12, rotation: 90 })).toBe(true)
  expect(canPlace([], { id: 'bench', x: 33, y: 12 })).toBe(false)
  expect(canPlace([], { id: 'fuel', x: 20, y: 20, rotation: 90 })).toBe(false)
  for (const p of [
    { x: 18, y: 30, rotation: 0 },
    { x: 4, y: 14, rotation: 90 },
    { x: 18, y: 1, rotation: 180 },
    { x: 33, y: 14, rotation: 270 },
  ])
    expect(canPlace([], { id: 'dock', ...p })).toBe(true)
  expect(canPlace([], { id: 'dock', x: 18, y: 30, rotation: 90 })).toBe(true)
  expect(canPlace([], { id: 'dock', x: 18, y: 30 }, [{ x: 18, y: 31 }])).toBe(true)
  expect(canPlace([], { id: 'dock', x: 31, y: 12, rotation: 270 })).toBe(true)
  expect(canPlace([], { id: 'dock', x: 19, y: 15 })).toBe(false)
  expect(canPlace([], { id: 'dock', x: 0, y: 0 })).toBe(false)
  const state = defaultState()
  state.layout = [{ id: 'bench~starter', x: 33, y: 12, rotation: 90 }]
  expect(parseState(state).layout).toEqual(state.layout)
})
it('migrates the old coast without discarding a previously placed dock', () => {
  const state = defaultState()
  state.owned.push('dock')
  state.layout.push({ id: 'dock', x: 18, y: 30 })
  const { land, ...old } = state
  expect(land).toEqual([])
  old.layout = old.layout.map((p) => (p.id === 'dock' ? { ...p, y: 28 } : p))
  expect(parseState(old).layout.find((p) => p.id === 'dock')?.y).toBe(30)
})
it('buys independent copies into storage using only trial coins', () => {
  const state = defaultState(),
    next = buyItem(state, 'tree', 'tree~purchase-1')!
  expect(next.coins).toBe(state.coins - 300)
  expect(next.owned).toContain('tree~purchase-1')
  expect(next.layout).toEqual(state.layout)
  expect(buyItem(next, 'tree', 'tree~purchase-1')).toBeNull()
  expect(buyItem({ ...state, coins: 0 }, 'tree', 'tree~purchase-2')).toBeNull()
  expect(canPlace([], { id: 'tree~purchase-1', x: 15, y: 15 })).toBe(true)
})
it('sells placed or stored decorations for half the purchase price exactly once', () => {
  const state = defaultState(),
    id = 'tree~starter-1'
  expect(facilities.find((f) => f.id === 'tree')?.price).toBe(300)
  expect(facilities.find((f) => f.id === 'pine')?.price).toBe(300)
  expect(decorationSellPrice(id)).toBe(150)
  const sold = sellDecoration(state, id)!
  expect(sold.coins).toBe(state.coins + 150)
  expect(sold.owned).not.toContain(id)
  expect(sold.layout.some((p) => p.id === id)).toBe(false)
  expect(sellDecoration(sold, id)).toBeNull()
  expect(sellDecoration(state, 'aquarium-1')).toBeNull()
  const purchased = buyItem(state, 'tree', 'tree~purchased')!
  expect(sellDecoration(purchased, 'tree~purchased')?.coins).toBe(state.coins - 150)
  localStorage.setItem('island-sold', JSON.stringify(sold))
  expect(readState('island-sold').owned).not.toContain(id)
  localStorage.removeItem('island-sold')
})
it('keeps facilities stored in the previous prototype and migrates placed facilities', () => {
  const key = 'pongdang:island:v2:migration-test',
    oldKey = key.replace(':v2:', ':v1:')
  localStorage.setItem(oldKey, JSON.stringify([{ id: 'fuel', x: 4, y: 5 }]))
  const state = readState(key)
  expect(state.layout).toContainEqual({ id: 'fuel', x: 12, y: 10 })
  expect(state.layout.some((p) => p.id === 'warehouse')).toBe(false)
  expect(state.owned).toContain('warehouse')
  localStorage.removeItem(oldKey)
})
