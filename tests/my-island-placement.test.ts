import { expect, it } from 'vitest'
import { canPlace, canRotate, defaultState, parseState } from '@/features/my-island/island-model'

it('places rubber ducks on land, open sea and removed ground and restores sea placements', () => {
  for (const [x, y] of [
    [8, 8],
    [36, 16],
    [8, 9],
  ]) {
    const p = { id: 'rubber-duck~test', x, y }
    const state = { ...defaultState(), owned: [p.id], layout: [p], removedLand: [{ x: 8, y: 9 }] }
    expect(canPlace([], p, state.land, state.removedLand)).toBe(true)
    expect(parseState(state).layout).toEqual([p])
  }
  expect(canRotate('rubber-duck')).toBe(false)
  expect(canPlace([], { id: 'tree', x: 36, y: 16 })).toBe(false)
})
it('still prevents ducks from overlapping structures, leaving the map or rotating', () => {
  const duck = { id: 'rubber-duck~test', x: 36, y: 16 }
  expect(canPlace([{ id: 'rubber-duck~other', x: 36, y: 16 }], duck)).toBe(false)
  expect(canPlace(defaultState().layout, { ...duck, x: 19, y: 10 })).toBe(false)
  for (const p of [
    { x: -1, y: 16 },
    { x: 40, y: 16 },
    { x: 36, y: 36 },
    { x: 36.5, y: 16 },
  ])
    expect(canPlace([], { ...duck, ...p })).toBe(false)
  expect(canPlace([], { ...duck, rotation: 90 })).toBe(false)
})
