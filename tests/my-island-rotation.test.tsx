import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Building } from '@/features/my-island/island-art'
import {
  facilities,
  canRotate,
  footprint,
  canPlace,
  defaultState,
  parseState,
  storeLand,
} from '@/features/my-island/island-model'
import { ownedFacilities } from '@/features/my-island/owned-facilities'

const items = [...ownedFacilities(), ...facilities.filter((f) => f.category === 'decoration')]

it('limits rotation to decorations and the coastal dock with matching collision dimensions', () => {
  expect(canRotate('unknown')).toBe(false)
  for (const f of items) {
    const rotatable = f.rotatable === true
    expect(canRotate(f.id), f.name).toBe(rotatable)
    for (const rotation of [0, 90, 180, 270]) {
      const p = { id: f.id, x: 20, y: 15, rotation }
      expect(footprint(p)).toEqual(rotation % 180 === 90 ? { w: f.h, h: f.w } : { w: f.w, h: f.h })
      if (f.kind === 'dock') continue
      if (!rotatable && rotation) {
        expect(canPlace([], p), f.name).toBe(false)
        expect(parseState({ ...defaultState(), owned: [f.id], layout: [p] }).layout).toEqual([
          { id: f.id, x: 20, y: 15 },
        ])
        continue
      }
      expect(canPlace([], p), f.name).toBe(true)
      const state = { ...defaultState(), owned: [f.id], layout: [p] }
      expect(parseState(state).layout).toEqual([
        { id: f.id, x: 20, y: 15, ...(rotation ? { rotation } : {}) },
      ])
      expect(
        storeLand(state, { x: p.x + footprint(p).w - 1, y: p.y + footprint(p).h - 1 }),
      ).toBeNull()
    }
    expect(canPlace([], { id: f.id, x: 20, y: 15, rotation: 45 })).toBe(false)
  }
})
it('renders four distinct directional drawings without turning upright objects upside down', () => {
  for (const f of items) {
    const drawings = [0, 90, 180, 270].map((rotation) =>
      renderToStaticMarkup(
        <svg>
          <Building f={f} rotation={rotation} />
        </svg>,
      ).replace(/data-art-direction="[^"]*"/g, ''),
    )
    expect(new Set(drawings).size, f.name).toBe(canRotate(f.id) ? 4 : 1)
    if (f.kind !== 'dock')
      for (const drawing of drawings) expect(drawing, f.name).not.toMatch(/rotate\((?:90|180|270)/)
  }
})
