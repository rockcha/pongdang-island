import { expect, it } from 'vitest'
import {
  addLand,
  buyFloor,
  canPlace,
  defaultState,
  isLand,
  paintFloor,
  parseState,
  storeLand,
} from '@/features/my-island/island-model'

it('stores original land as water and reuses it without charging coins', () => {
  const original = defaultState(),
    cell = { x: 8, y: 8 }
  const stored = storeLand(original, cell)!
  expect(stored.landStock).toBe(1)
  expect(stored.coins).toBe(original.coins)
  expect(isLand(cell.x, cell.y, stored.land, stored.removedLand)).toBe(false)
  expect(canPlace([], { id: 'mail', ...cell }, stored.land, stored.removedLand)).toBe(false)
  expect(storeLand(stored, cell)).toBeNull()
  const restored = addLand({ ...stored, coins: 0 }, cell)!
  expect(restored.landStock).toBe(0)
  expect(restored.coins).toBe(0)
  expect(restored.removedLand).toEqual([])
  expect(restored.land).toEqual([])
  expect(canPlace([], { id: 'mail', ...cell }, restored.land, restored.removedLand)).toBe(true)
})
it('moves original ground to a new island and stores purchased ground', () => {
  let state = storeLand(defaultState(), { x: 8, y: 8 })!
  const coins = state.coins
  state = addLand(state, { x: 36, y: 16 })!
  expect(state.coins).toBe(coins)
  expect(state.land).toContainEqual({ x: 36, y: 16 })
  state = storeLand(state, { x: 36, y: 16 })!
  expect(state.land).toEqual([])
  expect(state.landStock).toBe(1)
  expect(state.removedLand).toEqual([{ x: 8, y: 8 }])
  const bought = addLand(defaultState(), { x: 36, y: 16 })!
  expect(storeLand(bought, { x: 36, y: 16 })?.landStock).toBe(1)
})
it('rejects removal under buildings, decorations and all rotated dock footprints', () => {
  const state = defaultState()
  expect(storeLand(state, { x: 19, y: 10 })).toBeNull()
  expect(storeLand(state, { x: 20, y: 11 })).toBeNull()
  expect(storeLand(state, { x: 12, y: 12 })).toBeNull()
  for (const rotation of [0, 90, 180, 270]) {
    const placement = { id: 'dock', x: 18, y: 29, rotation }
    expect(storeLand({ ...state, layout: [placement] }, { x: 19, y: 30 })).toBeNull()
  }
})
it('returns the surface tile to inventory and prevents painting water holes', () => {
  const cell = { x: 8, y: 8 }
  const tiled = paintFloor(buyFloor(defaultState(), 'brick')!, cell, 'brick')!
  const stored = storeLand(tiled, cell)!
  expect(stored.paving).toEqual([])
  expect(stored.tileStock.brick).toBe(1)
  expect(paintFloor(stored, cell, 'brick')).toBeNull()
  expect(parseState(stored)).toEqual(stored)
})
it('preserves holes, land inventory and layouts after a save round trip', () => {
  const stored = storeLand(defaultState(), { x: 8, y: 8 })!
  expect(parseState(JSON.parse(JSON.stringify(stored)))).toEqual(stored)
  const { removedLand, landStock, ...old } = defaultState()
  expect(removedLand).toEqual([])
  expect(landStock).toBe(0)
  expect(parseState(old)).toEqual(defaultState())
  expect(
    parseState({
      ...stored,
      removedLand: [
        { x: -1, y: 8 },
        { x: 8.5, y: 8 },
        { x: 8, y: 8 },
        { x: 8, y: 8 },
      ],
      landStock: -1,
    }).removedLand,
  ).toEqual([{ x: 8, y: 8 }])
  expect(parseState({ ...stored, landStock: -1 }).landStock).toBe(0)
  expect(storeLand(stored, { x: -1, y: 8 })).toBeNull()
  expect(storeLand(stored, { x: 7.5, y: 8 })).toBeNull()
})
