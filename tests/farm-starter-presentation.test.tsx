import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
import {initialTopview,placementValid,topviewItems,objectAt} from '@/features/farm/topview-model'
import {FarmPurchaseEffect} from '@/features/farm/purchase-effect'

afterEach(cleanup)

it('starts with one duck boat and three simple land decorations, with no flower garden',()=>{
 const state=initialTopview()
 expect(state.objects.filter(o=>o.kind==='duckBoat')).toHaveLength(1)
 expect(state.objects.some(o=>o.kind==='flowers')).toBe(false)
 const decorations=state.objects.filter(o=>topviewItems[o.kind].group==='꾸미기'&&o.kind!=='plot'&&o.kind!=='duckBoat')
 expect(decorations.map(o=>o.kind).sort()).toEqual(['bench','pongiMailbox','strawScarecrow'])
 for(const object of state.objects)expect(placementValid(state,object.kind,object.x,object.y,object.id)).toBe(true)
 const plots=state.objects.filter(o=>o.kind==='plot')
 expect(plots).toHaveLength(4)
 expect(new Set(plots.map(o=>o.x)).size).toBe(2)
 expect(new Set(plots.map(o=>o.y)).size).toBe(2)
 for(const key of state.paths){const [x,y]=key.split(',').map(Number);expect(objectAt(state,x,y)).toBeUndefined()}
 expect(new Set(state.objects.map(o=>o.id)).size).toBe(state.objects.length)
 expect(state.nextId).toBeGreaterThan(Math.max(...state.objects.map(o=>o.id)))
})

it('shows one static fountain thumbnail in the purchase receipt, without its animation sheet',()=>{
 render(<FarmPurchaseEffect receipt={{id:1,kind:'starClamFountain',name:'별빛 조개 분수',quantity:1}} onDismiss={vi.fn()}/>)
 const receipt=screen.getByRole('status'),images=receipt.querySelectorAll('image')
 expect(images).toHaveLength(1)
 expect(images[0].getAttribute('href')).toBe('/farm/art/star-clam-fountain-v1/thumbnail.png')
 expect(receipt.querySelector('.farm-star-clam-sprite')).toBeNull()
})
