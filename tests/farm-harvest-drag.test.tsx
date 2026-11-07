import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {farmMapWidth,farmMapHeight,farmCellCenter} from './helpers/farm-map'

const config=vi.hoisted(()=>({stock:12,skip:false}))
vi.mock('@/features/farm/trial-inventory',async importOriginal=>{
 const original=await importOriginal<typeof import('@/features/farm/trial-inventory')>()
 return {...original,initialFarmTrial:()=>{
  const state=original.initialFarmTrial();state.simulation.inventory.wheat=config.stock
  state.simulation.cropJobs={10:{crop:'wheat',readyAt:0},11:{crop:'carrot',readyAt:0},12:{crop:'potato',readyAt:config.skip?999999:0},13:{crop:'corn',readyAt:config.skip?-1000000000:0}}
  return state
 }}
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();config.stock=12;config.skip=false})
function setup(touch=false){
 vi.useFakeTimers();vi.setSystemTime(1000)
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>),viewport=result.container.querySelector('.top-farm-viewport')!
 vi.spyOn(result.container.querySelector('.top-farm-map')!,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:farmMapWidth,bottom:farmMapHeight,width:farmMapWidth,height:farmMapHeight,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,x:number,y:number,id=1,target:Element=viewport)=>fireEvent(target,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:farmCellCenter(x),clientY:farmCellCenter(y),button:0}),{pointerId:id,pointerType:touch?'touch':'mouse'}))
 const stroke=()=>{pointer('pointerdown',10,11);pointer('pointermove',11,11);pointer('pointermove',11,12);pointer('pointermove',10,12);pointer('pointermove',10,11)}
 return {...result,viewport,pointer,stroke}
}
it.each([false,true])('previews and harvests each visited ripe plot once (touch=%s)',async touch=>{
 const s=setup(touch);s.stroke()
 expect(s.container.querySelectorAll('[data-harvest-preview="ready"]')).toHaveLength(4)
 expect(s.container.querySelector('[data-harvesting-effect]')).toBeNull()
 await act(async()=>{s.pointer('pointerup',10,11)})
 expect(s.container.querySelectorAll('[data-harvesting-effect]')).toHaveLength(4)
 expect(s.container.querySelector('[data-harvest-preview]')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(3001)})
 expect(s.container.querySelectorAll('[data-harvest-receipt]')).toHaveLength(4)
 expect(screen.getByRole('img',{name:/창고 30 \/ 40/})).toBeTruthy()
 expect(s.container.querySelector('[data-farm-effect="harvest"]')).toBeNull()
})
it('reserves only the available warehouse space and leaves other crops intact',async()=>{
 config.stock=37
 const s=setup();s.stroke()
 expect(s.container.querySelectorAll('[data-harvest-preview="ready"]')).toHaveLength(1)
 expect(s.container.querySelectorAll('[data-harvest-preview="blocked"]')).toHaveLength(3)
 await act(async()=>{s.pointer('pointerup',10,11)})
 expect(s.container.querySelectorAll('[data-harvesting-effect]')).toHaveLength(1)
 await act(async()=>{vi.advanceTimersByTime(3001)})
 expect(screen.getByRole('img',{name:/창고 40 \/ 40/})).toBeTruthy()
 expect(screen.getByRole('button',{name:'당근 성장 (11,11)'})).toBeTruthy()
})
it('skips growing and rotten crops without discarding or planting them',async()=>{
 config.skip=true
 const s=setup();s.stroke()
 expect(s.container.querySelectorAll('[data-harvest-preview="ready"]')).toHaveLength(2)
 await act(async()=>{s.pointer('pointerup',10,11)})
 expect(s.container.querySelectorAll('[data-harvesting-effect]')).toHaveLength(2)
 expect(s.container.querySelector('[data-crop-rotten="13"]')).toBeTruthy()
 expect(s.container.querySelector('[data-planting-effect]')).toBeNull()
})
it('starts from the crop badge even when its hit area extends into the neighboring cell',async()=>{
 const s=setup(),badge=s.container.querySelector('[data-crop-object="10"] [data-status-bubble]')!
 s.pointer('pointerdown',11,11,1,badge);s.pointer('pointermove',12,11)
 expect(s.container.querySelectorAll('[data-harvest-preview="ready"]')).toHaveLength(2)
 await act(async()=>{s.pointer('pointerup',12,11)})
 expect(s.container.querySelectorAll('[data-harvesting-effect]')).toHaveLength(2)
})
it('cancels a two-finger camera gesture without harvesting',async()=>{
 const s=setup(true);s.pointer('pointerdown',10,11);s.pointer('pointermove',11,11)
 s.pointer('pointerdown',11,12,2)
 await act(async()=>{s.pointer('pointerup',11,11);s.pointer('pointerup',11,12,2)})
 expect(s.container.querySelector('[data-harvest-preview]')).toBeNull()
 expect(s.container.querySelector('[data-harvesting-effect]')).toBeNull()
 expect(screen.getByRole('img',{name:/창고 12 \/ 40/})).toBeTruthy()
})
it('harvests ripe plots in planting mode without spending seeds',async()=>{
 const s=setup()
 fireEvent.click(screen.getByRole('button',{name:'농사',exact:true}));fireEvent.click(screen.getByRole('button',{name:'씨앗 심기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'밀 4개',exact:true}))
 s.stroke();await act(async()=>{s.pointer('pointerup',10,11)})
 expect(s.container.querySelectorAll('[data-harvesting-effect]')).toHaveLength(4)
 expect(s.container.querySelector('[data-planting-effect]')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'씨앗 심기',exact:true}))
 expect(screen.getByRole('button',{name:'밀 4개',exact:true})).toBeTruthy()
})
