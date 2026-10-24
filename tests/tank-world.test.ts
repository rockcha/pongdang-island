import { expect, it } from 'vitest'
import { clampTankView, tankWorldItem, tankItemSpace } from '@/features/aquarium/tank-world'
import { InhabitantMotion } from '@/features/aquarium/inhabitant-motion'
import type { OwnedCollectible } from '@/features/collection/api'

const fish: OwnedCollectible = {
  id: 'wide-tank-fish', species_id: 'sample', tank_id: 'local', animation_seed: 12345,
  position_x: null, position_y: null, acquired_at: '',
  species: { id: 'sample', name: '테스트 물고기', kind: 'fish', description: '', rarity: 'common', size: 44, speed: .065, swim_y_min: .2, swim_y_max: .8, movement_type: 'swim', travel_direction: 'both', flip_with_direction: true, thumbnail_path: '', sprite_sheet_path: null, sell_price: 1 },
}
it('keeps the existing tank payload unchanged and bounds the panorama camera', () => {
  expect(tankWorldItem(fish, 390, 1)).toBe(fish)
  expect(clampTankView(-1)).toBe(0)
  expect(clampTankView(3)).toBe(2)
  expect(clampTankView(1.25)).toBe(1.25)
  expect(clampTankView(NaN)).toBe(0)
})
it('anchors existing arrangeable inhabitants to the center with their original geometry and normalized coordinates',()=>{
  for(const kind of ['decoration','trash','fish'] as const){
    const item={...fish,position_x:.23,position_y:.71,rotation:45,scale:1.7,species:{...fish.species,kind,movement_type:'fixed' as const}}
    const space=tankItemSpace(item,320,3,true)
    expect(space).toEqual({width:320,offset:320,local:true})
    const before=new InhabitantMotion(item).update(0,0,320,560)
    const after=new InhabitantMotion(item).update(0,0,space.width,560)
    expect(after).toEqual(before)
    expect(after.x+space.offset-320).toBeCloseTo(before.x,10)
    expect(item.position_x).toBe(.23)
    expect(item.position_y).toBe(.71)
  }
  expect(tankItemSpace(fish,320,3,true)).toEqual({width:960,offset:0,local:false})
  expect(tankItemSpace({...fish,species:{...fish.species,kind:'decoration'}},320,1,true)).toEqual({width:320,offset:0,local:false})
})
it('keeps fish size and pixel cruising speed independent of the number of panes', () => {
  const wide = tankWorldItem(fish, 390, 3)
  expect(wide.species.size).toBe(fish.species.size)
  expect(wide.species.speed * 1170).toBeCloseTo(fish.species.speed * 390)
  const whale = { ...fish, species: { ...fish.species, size: 600 } }
  expect(tankWorldItem(whale, 320, 3).species.size).toBeCloseTo(320 * .48)
  expect(whale.species.size).toBe(600)
})
it('lets the same fish cross both pane boundaries smoothly in both directions', () => {
  const motion = new InhabitantMotion(tankWorldItem(fish, 390, 3), 0, { x: .15, y: .5, direction: 1 })
  const crossed = new Set<string>()
  let previous = motion.update(0, 0, 1170, 620).x
  let minimum = previous, maximum = previous
  for (let tick = 1; tick <= 7200; tick++) {
    const x = motion.update(tick / 30, 1 / 30, 1170, 620).x
    minimum = Math.min(minimum, x); maximum = Math.max(maximum, x)
    for (const boundary of [390, 780]) {
      if (previous < boundary && x >= boundary) crossed.add(`${boundary}:right`)
      if (previous > boundary && x <= boundary) crossed.add(`${boundary}:left`)
    }
    expect(Math.abs(x - previous)).toBeLessThan(12)
    expect(motion.pose.size).toBe(44)
    previous = x
  }
  expect(minimum).toBeLessThan(390)
  expect(maximum).toBeGreaterThan(780)
  expect([...crossed].sort()).toEqual(['390:left', '390:right', '780:left', '780:right'])
})
