import {farmMapWidth,farmMapHeight,farmCellCenter} from './helpers/farm-map'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {playFarmPlacementSound} from '@/features/farm/placement-sound'
vi.mock('@/features/farm/placement-sound',()=>({playFarmPlacementSound:vi.fn()}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn(),playSaleSound:vi.fn()}))

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.clearAllMocks();vi.useRealTimers()})
function setup(){
 vi.useFakeTimers()
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const viewport=result.container.querySelector('.top-farm-viewport')!
 vi.spyOn(result.container.querySelector('.top-farm-map')!,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:farmMapWidth,height:farmMapHeight,right:farmMapWidth,bottom:farmMapHeight,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,target:Element,x:number,y:number)=>fireEvent(target,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:farmCellCenter(x),clientY:farmCellCenter(y),button:0}),{pointerId:1,pointerType:'mouse'}))
 fireEvent.click(screen.getByRole('button',{name:'이동하기',exact:true}))
 return {...result,viewport,pointer,house:screen.getByRole('button',{name:'종자 상점 (9,8)'})}
}
it('shows one dust burst at the building destination and removes it after 600ms',()=>{
 const {container,viewport,pointer,house}=setup()
 pointer('pointerdown',house,10,8);pointer('pointermove',viewport,10,6);pointer('pointerup',viewport,10,6)
 expect(screen.getByRole('button',{name:'종자 상점 (9,6)'})).toBeTruthy()
 expect(container.querySelectorAll('[data-placement-dust]')).toHaveLength(1)
 expect(playFarmPlacementSound).toHaveBeenCalledTimes(1)
 expect(container.querySelector('[data-placement-dust]')?.getAttribute('transform')).toBe('translate(400 276)')
 act(()=>vi.advanceTimersByTime(601))
 expect(container.querySelector('[data-placement-dust]')).toBeNull()
})
it('rejects an invalid drop without a dust burst or a duplicate building',()=>{
 const {container,viewport,pointer,house}=setup()
 pointer('pointerdown',house,10,8);pointer('pointermove',viewport,2,3);pointer('pointerup',viewport,2,3)
 expect(screen.getByRole('button',{name:'종자 상점 (9,8)'})).toBeTruthy()
 expect(container.querySelector('[data-placement-dust]')).toBeNull()
 expect(container.querySelectorAll('[data-object-id="23"]')).toHaveLength(1)
 expect(playFarmPlacementSound).not.toHaveBeenCalled()
})
it('adds soft dust to placed land, plays once per stroke and stays silent on recovery',async()=>{
 const {container,viewport,pointer}=setup()
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 click('땅 0칸 보유');click('땅 구매하기')
 await act(async()=>{click('5칸 구매 · 500골드')})
 click('땅 놓기')
 pointer('pointerdown',viewport,0,0);pointer('pointermove',viewport,2,0);pointer('pointerup',viewport,2,0)
 expect(container.querySelectorAll('[data-placement-dust]')).toHaveLength(3)
 expect(container.querySelector('[data-placement-dust]')?.getAttribute('opacity')).toBe('0.6')
 expect(playFarmPlacementSound).toHaveBeenCalledExactlyOnceWith(.22)
 act(()=>vi.advanceTimersByTime(601))
 expect(container.querySelector('[data-placement-dust]')).toBeNull()
 click('땅 회수하기')
 pointer('pointerdown',viewport,0,0);pointer('pointerup',viewport,0,0)
 expect(container.querySelector('[data-placement-dust]')).toBeNull()
 expect(playFarmPlacementSound).toHaveBeenCalledTimes(1)
})
it('plays the placement sound when a purchased building is placed from storage',()=>{
 const {container}=setup()
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 click('상점');click('종자 연구소 구매 · 1500 G');click('Close')
 act(()=>vi.advanceTimersByTime(1801))
 click('보관함');click('건물');click('종자 연구소 보관 1개 배치하기')
 fireEvent.click(container.querySelector('[data-farm-cell="8,6"]')!)
 expect(playFarmPlacementSound).toHaveBeenCalledTimes(1)
 expect(container.querySelector('[aria-label="종자 연구소 (8,6)"]')).toBeTruthy()
})
