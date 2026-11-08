import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {farmMapWidth,farmMapHeight,farmCellCenter} from './helpers/farm-map'

const fixture=vi.hoisted(()=>({seeds:4,occupied:false}))
vi.mock('@/features/farm/trial-inventory',async importOriginal=>{
 const original=await importOriginal<typeof import('@/features/farm/trial-inventory')>()
 return {...original,initialFarmTrial:()=>{
  const state=original.initialFarmTrial();state.simulation.inventory.wheatSeed=fixture.seeds
  if(fixture.occupied)state.simulation.cropJobs[11]={crop:'wheat',readyAt:Date.now()+600000}
  return state
 }}
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();fixture.seeds=4;fixture.occupied=false})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
function setup(touch=false){
 vi.useFakeTimers();vi.setSystemTime(1000)
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>),viewport=result.container.querySelector('.top-farm-viewport')!
 vi.spyOn(result.container.querySelector('.top-farm-map')!,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:farmMapWidth,bottom:farmMapHeight,width:farmMapWidth,height:farmMapHeight,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,x:number,y:number,id=1)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:farmCellCenter(x),clientY:farmCellCenter(y),button:0}),{pointerId:id,pointerType:touch?'touch':'mouse'}))
 click('농사');click('씨앗 심기');click(`밀 ${fixture.seeds}개`)
 return {...result,viewport,pointer}
}
it.each([false,true])('previews a mouse/touch stroke and plants each visited plot once (touch=%s)',async touch=>{
 const {container,pointer}=setup(touch)
 pointer('pointerdown',10,11);pointer('pointermove',11,11);pointer('pointermove',11,12);pointer('pointermove',10,12);pointer('pointermove',10,11)
 expect(container.querySelectorAll('[data-crop-preview]')).toHaveLength(4)
 expect(container.querySelector('[data-planting-effect]')).toBeNull()
 await act(async()=>{pointer('pointerup',10,11)})
 expect(container.querySelectorAll('[data-planting-effect]')).toHaveLength(4)
 expect(container.querySelector('[data-crop-preview]')).toBeNull()
 click('변경');expect(screen.getByRole('button',{name:'밀 0개'})).toHaveProperty('disabled',true)
})
it('skips occupied plots and limits preview and seed spending to available stock',async()=>{
 fixture.seeds=1;fixture.occupied=true
 const {container,pointer}=setup()
 pointer('pointerdown',10,11);pointer('pointermove',11,11);pointer('pointermove',11,12)
 expect(container.querySelectorAll('[data-crop-preview]')).toHaveLength(1)
 await act(async()=>{pointer('pointerup',11,12)})
 expect(container.querySelectorAll('[data-planting-effect]')).toHaveLength(1)
 expect(container.querySelector('[data-planting-effect="10,11"]')).toBeTruthy()
 expect(container.querySelector('[data-planting-effect="11,11"]')).toBeNull()
 click('변경');expect(screen.getByRole('button',{name:'밀 0개'})).toHaveProperty('disabled',true)
})
it('pans from empty land and cancels a planting stroke without spending seeds',async()=>{
 const {container,viewport,pointer}=setup()
 pointer('pointerdown',7,7);pointer('pointermove',8,7);pointer('pointerup',8,7)
 expect(viewport.scrollLeft).toBe(-40)
 expect(container.querySelector('[data-planting-effect]')).toBeNull()
 pointer('pointerdown',10,11);pointer('pointermove',11,11)
 expect(container.querySelectorAll('[data-crop-preview]')).toHaveLength(2)
 await act(async()=>{pointer('pointercancel',11,11)})
 expect(container.querySelector('[data-crop-preview]')).toBeNull()
 expect(container.querySelector('[data-planting-effect]')).toBeNull()
 click('변경');expect(screen.getByRole('button',{name:'밀 4개'})).toBeTruthy()
})
it('cancels planting when a second finger starts camera control',async()=>{
 const {container,pointer}=setup(true)
 pointer('pointerdown',10,11);pointer('pointermove',11,11)
 pointer('pointerdown',11,12,2)
 await act(async()=>{pointer('pointerup',11,11);pointer('pointerup',11,12,2)})
 expect(container.querySelector('[data-crop-preview]')).toBeNull()
 expect(container.querySelector('[data-planting-effect]')).toBeNull()
 click('변경');expect(screen.getByRole('button',{name:'밀 4개'})).toBeTruthy()
})
