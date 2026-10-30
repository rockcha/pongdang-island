// @vitest-environment node
import { expect, it } from 'vitest'
import {
  fromIso,
  toIso,
  tilePoints,
  canPlaceFarm,
  depth,
  turnPlacement,
} from '@/features/farm/isometric'
import { materializeIsland } from '@/features/my-island/island-document'
import { farmFixture } from './farm-fixture'
import { footprint } from '@/features/my-island/island-model'
it('round-trips world coordinates through the diamond projection without changing saved cells', () => {
  for (const [x, y] of [
    [0, 0],
    [19, 16],
    [20.5, 18.25],
    [39, 35],
  ]) {
    const screen = toIso(x, y),
      cell = fromIso(screen.x, screen.y)
    expect(cell.x).toBeCloseTo(x)
    expect(cell.y).toBeCloseTo(y)
  }
  expect(tilePoints(0, 0)).toBe('0,0 32,18 0,36 -32,18')
})
it('swaps asymmetric footprints on rotation and enforces animal capacity in previews', () => {
  const state = materializeIsland(farmFixture({ office: 1, store: 0, barn: 1 })),
    cow = { id: 'farm-cow~test', x: 23, y: 16, rotation: 90 }
  state.owned.push(cow.id)
  expect(footprint(cow)).toEqual({ w: 1, h: 2 })
  expect(canPlaceFarm(state, cow, 0)).toBe(false)
  expect(canPlaceFarm(state, cow, 3)).toBe(true)
  expect(depth({ ...cow, y: 17 })).toBeGreaterThan(depth(cow))
})
it('keeps an asymmetric building on the same ground anchor through a complete turn', () => {
  let p = { id: 'farm-barn~test', x: 22, y: 15, rotation: 0 }
  const original = { ...p },
    anchor = toIso(p.x + footprint(p).w, p.y + footprint(p).h)
  for (const rotation of [90, 180, 270, 0]) {
    p = turnPlacement(p, rotation)
    expect(toIso(p.x + footprint(p).w, p.y + footprint(p).h)).toEqual(anchor)
  }
  expect(p).toEqual(original)
})
