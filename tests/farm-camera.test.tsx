import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.restoreAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
function setup(){
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>),map=result.container.querySelector<SVGSVGElement>('.top-farm-map')!,viewport=result.container.querySelector<HTMLDivElement>('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockImplementation(()=>{const width=parseFloat(map.style.width),height=parseFloat(map.style.height);return {left:0,top:0,right:width,bottom:height,width,height,x:0,y:0,toJSON:()=>({})}})
 const pointer=(type:string,x:number,y:number,id=1)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}),{pointerId:id,pointerType:'touch'}))
 return {...result,map,viewport,pointer,zoom:()=>parseFloat(map.style.width)/1120}
}
it('zooms the map with wheel input, clamps both ends, and does not handle wheel input over controls',()=>{
 const {map,viewport,zoom}=setup(),start=zoom()
 fireEvent.wheel(viewport,{deltaY:-100,clientX:100,clientY:100});expect(zoom()).toBeGreaterThan(start)
 const before=map.style.width;fireEvent.wheel(screen.getByRole('button',{name:'농사'}),{deltaY:-300});expect(map.style.width).toBe(before)
 for(let i=0;i<15;i++)fireEvent.wheel(viewport,{deltaY:-500,clientX:100,clientY:100})
 expect(zoom()).toBeCloseTo(1.8)
 for(let i=0;i<15;i++)fireEvent.wheel(viewport,{deltaY:500,clientX:100,clientY:100})
 expect(zoom()).toBeCloseTo(.25)
})
it('supports pinch zoom in and out, and cancels a seed stroke without spending seeds',()=>{
 const {container,pointer,zoom}=setup();click('농사');click('씨앗 심기');click('밀 4개')
 const start=zoom(),x=(9*40+100)*start,y=(13*40+100)*start
 pointer('pointerdown',x,y,1)
 expect(container.querySelector('[data-crop-preview]')).toBeTruthy()
 pointer('pointerdown',x+50,y,2)
 expect(container.querySelector('[data-crop-preview]')).toBeNull()
 pointer('pointermove',x+100,y,2);expect(zoom()).toBeGreaterThan(start)
 pointer('pointermove',x+25,y,2);expect(zoom()).toBeLessThan(start)
 pointer('pointerup',x+25,y,2);pointer('pointerup',x,y,1)
 expect(screen.getByLabelText('보유 종자 4개')).toBeTruthy()
 expect(screen.queryByRole('progressbar',{name:/밀 성장/})).toBeNull()
})
it('keeps one-finger panning in both directions without activating the touched object',()=>{
 const {viewport,pointer}=setup();viewport.scrollLeft=100;viewport.scrollTop=100
 pointer('pointerdown',100,100);pointer('pointermove',60,70);pointer('pointerup',60,70)
 expect(viewport.scrollLeft).toBe(140);expect(viewport.scrollTop).toBe(130)
 pointer('pointerdown',100,100);pointer('pointermove',140,130);pointer('pointerup',140,130)
 expect(viewport.scrollLeft).toBe(100);expect(viewport.scrollTop).toBe(100)
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('preserves the current position and zoom when opening, closing and selecting farm tools',()=>{
 const {viewport,map}=setup()
 viewport.scrollLeft=137;viewport.scrollTop=253
 const width=map.style.width
 const unchanged=()=>{expect(viewport.scrollLeft).toBe(137);expect(viewport.scrollTop).toBe(253);expect(map.style.width).toBe(width)}
 click('농사');click('씨앗 심기');unchanged()
 click('Close');unchanged()
 click('씨앗 심기');click('밀 4개');unchanged()
 click('완료');unchanged()
 click('이동하기');unchanged()
 click('이동하기');unchanged()
 click('보관함');unchanged()
 click('완료');unchanged()
})

it.each(['mouse','touch'])('pans while holding seeds with %s, spends no seeds on a drag, and plants on a tap',pointerType=>{
 const {container,viewport,zoom}=setup()
 click('농사');click('씨앗 심기');click('밀 4개')
 const pointer=(type:string,x:number,y:number)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:(x*40+100)*zoom(),clientY:(y*40+100)*zoom(),button:0}),{pointerId:1,pointerType}))
 // Starting on an empty plot also pans instead of planting a stroke.
 for(const [x,y] of [[9,13],[8,7],[0,0]]){
  viewport.scrollLeft=100;viewport.scrollTop=100
  pointer('pointerdown',x,y);pointer('pointermove',x-1,y-1);pointer('pointerup',x-1,y-1)
  expect(viewport.scrollLeft).toBeCloseTo(100+40*zoom())
  expect(viewport.scrollTop).toBeCloseTo(100+40*zoom())
  fireEvent.click(container.querySelector('[data-farm-cell="9,13"]')!)
  expect(screen.getByLabelText('보유 종자 4개')).toBeTruthy()
  expect(container.querySelector('[data-crop-preview]')).toBeNull()
  expect(screen.queryByRole('progressbar',{name:/밀 성장/})).toBeNull()
 }
 pointer('pointerdown',9,13);pointer('pointerup',9,13)
 fireEvent.click(container.querySelector('[data-farm-cell="9,13"]')!)
 expect(screen.getByLabelText('보유 종자 3개')).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:/밀 성장/})).toBeTruthy()
})

it.each(['mouse','touch'])('pans from occupied land and sea while placing land and tiles with %s',pointerType=>{
 const {container,viewport,zoom}=setup()
 const pointer=(type:string,x:number,y:number,button=0)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:(x*40+100)*zoom(),clientY:(y*40+100)*zoom(),button}),{pointerId:1,pointerType}))
 const pan=(x:number,y:number,button=0)=>{
  viewport.scrollLeft=100;viewport.scrollTop=100
  pointer('pointerdown',x,y,button);pointer('pointermove',x-1,y-1,button);pointer('pointerup',x-1,y-1,button)
  expect(viewport.scrollLeft).toBeCloseTo(100+40*zoom());expect(viewport.scrollTop).toBeCloseTo(100+40*zoom())
  expect(container.querySelector('[data-land-preview],[data-tile-preview]')).toBeNull()
 }
 click('땅 0칸 보유');click('땅 구매하기');click('5칸 구매 · 250 G');click('땅 놓기')
 pan(8,7)
 expect(screen.getByRole('button',{name:'땅 5칸 보유'})).toBeTruthy()
 // A pan that ends over a placement target must not place land through its click.
 pointer('pointerdown',4,4);pointer('pointermove',3,4);pointer('pointerup',3,4)
 fireEvent.click(container.querySelector('[data-farm-cell="3,4"]')!)
 expect(screen.getByRole('button',{name:'땅 5칸 보유'})).toBeTruthy()
 click('완료');click('타일');click('구매하기');click('흙길 5개 구매 · 50 G');click('Close');click('타일 깔기');click('흙길 5개 선택')
 pan(0,0)
 pan(8,7,1)
 expect(screen.getAllByLabelText('보유 타일 5개')).toHaveLength(2)
})
