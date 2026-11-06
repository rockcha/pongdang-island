import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview} from '@/features/farm/topview-model'
import {buyFarmItem} from '@/features/farm/farm-stock'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('buys a batch atomically, preserves building metadata and refuses invalid, unaffordable or limited batches',()=>{
 const state=initialTopview(),decor=buyFarmItem(state,'duckBoat',5)
 expect(decor.gold).toBe(13750);expect(decor.stored.filter(k=>k==='duckBoat')).toHaveLength(5)
 const stores=buyFarmItem(state,'bakery',3)
 expect(stores.stored.filter(k=>k==='bakery')).toHaveLength(3);expect(stores.storedLevels?.bakery).toEqual([1,1,1])
 for(const quantity of [0,-1,1.5,NaN,Infinity,1001])expect(buyFarmItem(state,'duckBoat',quantity)).toBe(state)
 expect(buyFarmItem({...state,gold:499},'duckBoat',2).stored).toEqual([])
 expect(buyFarmItem(state,'warehouse',2)).toBe(state)
 expect(buyFarmItem(state,'cow',2)).toBe(state)
})
it('selects a shop quantity, charges the total once and adds every copy to storage',()=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('상점');click('장식')
 fireEvent.change(screen.getByRole('spinbutton',{name:'오리배 구매 수량'}),{target:{value:'3'}})
 click('오리배 3개 구매 · 750 G')
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('14,250')
 click('Close');act(()=>vi.advanceTimersByTime(200));click('보관함');click('장식')
 expect(screen.getByRole('button',{name:'오리배 보관 3개 배치하기'})).toBeTruthy()
})
function setup(){
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>),map=result.container.querySelector('.top-farm-map')!,viewport=result.container.querySelector<HTMLDivElement>('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:1120,height:960,right:1120,bottom:960,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,target:Element,x:number,y:number,pointerType='mouse',pointerId=1)=>fireEvent(target,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x*40+100,clientY:y*40+100,button:0}),{pointerId,pointerType}))
 click('이동하기');return {...result,viewport,pointer}
}
it.each(['mouse','touch'])('confirms the original position on a second %s tap anywhere on the selected footprint',pointerType=>{
 const {pointer,container}=setup(),house=screen.getByRole('button',{name:'종자 상점 (8,6)'})
 pointer('pointerdown',house,9,6,pointerType);pointer('pointerup',house,9,6,pointerType)
 expect(container.querySelector('[data-move-preview]')).toBeTruthy()
 pointer('pointerdown',house,8,6,pointerType);pointer('pointerup',house,8,6,pointerType)
 expect(container.querySelector('[data-move-preview]')).toBeNull()
 expect(screen.getByRole('button',{name:'종자 상점 (8,6)'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'한 단계 되돌리기'})).toHaveProperty('disabled',true)
 expect(screen.getByText('원래 자리에 놓았어요.')).toBeTruthy()
})
it.each(['mouse','touch'])('places an object unchanged after a %s drag returns to its starting position',pointerType=>{
 const {pointer,viewport,container}=setup(),house=screen.getByRole('button',{name:'종자 상점 (8,6)'})
 pointer('pointerdown',house,9,6,pointerType);pointer('pointermove',viewport,10,7,pointerType);pointer('pointermove',viewport,9,6,pointerType);pointer('pointerup',viewport,9,6,pointerType)
 expect(container.querySelector('[data-move-preview]')).toBeNull()
 expect(screen.getByRole('button',{name:'종자 상점 (8,6)'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'한 단계 되돌리기'})).toHaveProperty('disabled',true)
})
it.each(['mouse','touch'])('drags an object with %s and preserves the camera and original grabbed cell offset',pointerType=>{
 const {viewport,pointer,container}=setup();viewport.scrollLeft=123;viewport.scrollTop=234
 const house=screen.getByRole('button',{name:'종자 상점 (8,6)'})
 pointer('pointerdown',house,9,6,pointerType)
 pointer('pointermove',viewport,9,8,pointerType)
 expect(container.querySelector('[data-move-preview]')).toBeTruthy()
 pointer('pointerup',viewport,9,8,pointerType)
 expect(screen.getByRole('button',{name:'종자 상점 (8,8)'})).toBeTruthy()
 expect(viewport.scrollLeft).toBe(123);expect(viewport.scrollTop).toBe(234)
 fireEvent.click(container.querySelector('[data-farm-cell="9,8"]')!)
 expect(screen.getByRole('button',{name:'종자 상점 (8,8)'})).toBeTruthy()
 click('한 단계 되돌리기');expect(screen.getByRole('button',{name:'종자 상점 (8,6)'})).toBeTruthy()
})
it.each(['overlap','sea','outside','cancel','escape','second-touch'])('restores the object after %s instead of spending or duplicating it',reason=>{
 const {viewport,pointer,container}=setup(),tree=screen.getByRole('button',{name:'꽃밭 (7,10)'})
 pointer('pointerdown',tree,7,10,'touch');pointer('pointermove',viewport,8,10,'touch')
 if(reason==='cancel')pointer('pointercancel',viewport,8,10,'touch')
 else if(reason==='escape')fireEvent.keyDown(container.querySelector('.top-farm')!,{key:'Escape'})
 else if(reason==='second-touch'){pointer('pointerdown',viewport,9,10,'touch',2);pointer('pointerup',viewport,6,4,'touch',2)}
 const destination=reason==='overlap'?[6,6]:reason==='sea'?[3,4]:reason==='outside'?[-10,0]:[8,10]
 pointer('pointerup',viewport,destination[0],destination[1],'touch')
 expect(screen.getByRole('button',{name:'꽃밭 (7,10)'})).toBeTruthy()
 expect(container.querySelectorAll('[data-object-id="16"]')).toHaveLength(1)
 expect(container.querySelector('.top-farm-gold')?.textContent).toContain('15,000')
})
