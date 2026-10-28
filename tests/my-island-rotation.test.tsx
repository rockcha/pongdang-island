import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Building } from '@/features/my-island/island-art'
import {
  facilities,
  canRotate,
  supportsSavedRotation,
  footprint,
  canPlace,
  defaultState,
  parseState,
  storeLand,
} from '@/features/my-island/island-model'
import { ownedFacilities } from '@/features/my-island/owned-facilities'
import {buildingViewBox,usesDirectionalFenceArt} from '@/features/my-island/island-art-sizing'

const items = [...ownedFacilities(), ...facilities.filter((f) => f.category === 'decoration')]

it('limits rotation to decorations and the coastal dock with matching collision dimensions', () => {
  expect(canRotate('unknown')).toBe(false)
  for (const f of items) {
    const rotatable = f.rotatable === true
    expect(canRotate(f.id), f.name).toBe(rotatable)
    for (const rotation of [0, 90, 180, 270]) {
      const p = { id: f.id, x: f.placementTerrain==='water'?35:20, y: 15, rotation }
      expect(footprint(p)).toEqual(rotation % 180 === 90 ? { w: f.h, h: f.w } : { w: f.w, h: f.h })
      if (!canRotate(f.id)&&supportsSavedRotation(f.id)) continue
      if (!rotatable && rotation) {
        expect(canPlace([], p), f.name).toBe(false)
        expect(parseState({ ...defaultState(), owned: [f.id], layout: [p] }).layout).toEqual([
          { id: f.id, x: p.x, y: 15 },
        ])
        continue
      }
      expect(canPlace([], p), f.name).toBe(true)
      const state = { ...defaultState(), owned: [f.id], layout: [p] }
      expect(parseState(state).layout).toEqual([
        { id: f.id, x: p.x, y: 15, ...(rotation ? { rotation } : {}) },
      ])
      expect(
        storeLand(state, { x: p.x + footprint(p).w - 1, y: p.y + footprint(p).h - 1 }),
      ).toBeNull()
    }
    expect(canPlace([], { id: f.id, x: 20, y: 15, rotation: 45 })).toBe(false)
  }
})
it('rotates the original artwork except for directional fence and wall pieces', () => {
  for (const f of items) {
    const drawings = [0, 90, 180, 270].map((rotation) =>
      renderToStaticMarkup(
        <svg>
          <Building f={f} rotation={rotation} />
        </svg>,
      ).replace(/data-art-direction="[^"]*"/g, ''),
    )
    expect(new Set(drawings).size, f.name).toBe(f.kind==='arrow-sign'?2:supportsSavedRotation(f.id) ? 4 : 1)
    const original=renderToStaticMarkup(<Building f={f} label="우리 섬"/>)
    for(const rotation of [90,180,270]){
      const drawing=renderToStaticMarkup(<Building f={f} rotation={rotation} label="우리 섬"/>)
      if(supportsSavedRotation(f.id)&&!usesDirectionalFenceArt(f)&&f.kind!=='arrow-sign'){
        expect(drawing,f.name).toContain(`rotate(${rotation})`)
        expect(drawing,f.name).toContain(original)
        const normal=buildingViewBox(f,0).split(' ').map(Number),rotated=buildingViewBox(f,rotation).split(' ').map(Number)
        expect(rotated.slice(2),f.name).toEqual(rotation===180?normal.slice(2):[normal[3],normal[2]])
      }else expect(drawing,f.name).not.toMatch(/rotate\((?:90|180|270)/)
    }
  }
})
it('locks new harbor rotation but preserves legacy coastal headings when loading',()=>{
 const id='dock~owned:hub',placement={id,x:31,y:12,rotation:270}
 expect(canRotate(id)).toBe(false)
 expect(parseState({...defaultState(),owned:[id],layout:[placement]}).layout).toContainEqual(placement)
})
