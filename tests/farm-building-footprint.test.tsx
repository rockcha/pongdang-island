import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview,topviewItems,objectFootprint,objectArtHeight,objectAt,placementValid,TILE,type FarmTool} from '@/features/farm/topview-model'
import {farmWorkPosition} from '@/features/farm/work-status'
import {applyLandStroke} from '@/features/farm/land-tools'

afterEach(cleanup)
it('gives every building a two-wide, one-deep footprint while keeping two-row artwork',()=>{
 for(const [kind,item] of Object.entries(topviewItems))if(item.group==='건물'){
  expect(objectFootprint({kind:kind as FarmTool})).toEqual({w:2,h:1})
  expect(objectArtHeight(kind as FarmTool)).toBe(TILE*2)
 }
 const state=initialTopview(),office=state.objects.find(o=>o.kind==='office')!
 expect(office).toMatchObject({x:6,y:6})
 expect((office.y+1)*TILE-objectArtHeight('office')).toBe(200)
 expect(farmWorkPosition(office)).toEqual({x:280,y:191})
 expect(objectAt(state,6,5)).toBeUndefined();expect(objectAt(state,7,5)).toBeUndefined()
 expect(objectAt(state,6,6)?.id).toBe(office.id);expect(objectAt(state,7,6)?.id).toBe(office.id)
 expect(placementValid(state,'warehouse',6,5)).toBe(true)
 expect(placementValid(state,'warehouse',6,6)).toBe(false)
 const single={...state,land:['0,0','1,0'],objects:[]}
 expect(placementValid(single,'office',0,0)).toBe(true)
 const placed={...single,objects:[{id:90,kind:'office' as const,x:0,y:0}]}
 expect(applyLandStroke(placed,'recover',[{x:0,y:0},{x:1,y:0}]).changed).toEqual([])
})
it('draws the placement highlight only beneath the image and lets a building move into the free row above',()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'이동하기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'농지 관리소 (6,6)'}))
 const object=container.querySelector('[data-object-id="1"]')!,foot=object.querySelector('[data-object-footprint]')!,art=object.querySelector('[data-object-art]')!,preview=container.querySelector('[data-move-preview]>rect')!
 expect(foot.getAttribute('width')).toBe('80');expect(foot.getAttribute('height')).toBe('40');expect(foot.getAttribute('y')).toBe('240')
 expect(art.getAttribute('height')).toBe('80');expect(art.getAttribute('y')).toBe('200');expect(art.getAttribute('pointer-events')).toBe('none')
 expect(preview.getAttribute('height')).toBe('38');expect(preview.getAttribute('y')).toBe('241')
 fireEvent(container.querySelector('.top-farm-viewport')!,Object.assign(new MouseEvent('pointerout',{bubbles:true,relatedTarget:null}),{pointerType:'touch'}))
 expect(container.querySelector('[data-move-preview]')).toBeTruthy()
 fireEvent.click(container.querySelector('[data-farm-cell="6,5"]')!)
 expect(screen.getByRole('button',{name:'농지 관리소 (6,5)'})).toBeTruthy()
 expect(container.querySelector('[data-object-id="1"] [data-object-art]')?.getAttribute('y')).toBe('160')
})
