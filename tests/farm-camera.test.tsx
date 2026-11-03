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
 const before=map.style.width;fireEvent.wheel(screen.getByRole('button',{name:'심기'}),{deltaY:-300});expect(map.style.width).toBe(before)
 for(let i=0;i<15;i++)fireEvent.wheel(viewport,{deltaY:-500,clientX:100,clientY:100})
 expect(zoom()).toBeCloseTo(1.8)
 for(let i=0;i<15;i++)fireEvent.wheel(viewport,{deltaY:500,clientX:100,clientY:100})
 expect(zoom()).toBeCloseTo(.25)
})
it('supports pinch zoom in and out, and cancels a seed stroke without spending seeds',()=>{
 const {container,pointer,zoom}=setup();click('심기');click('밀 4개')
 const start=zoom(),x=(9*40+100)*start,y=(13*40+100)*start
 pointer('pointerdown',x,y,1)
 expect(container.querySelector('[data-crop-preview]')).toBeTruthy()
 pointer('pointerdown',x+50,y,2)
 expect(container.querySelector('[data-crop-preview]')).toBeNull()
 pointer('pointermove',x+100,y,2);expect(zoom()).toBeGreaterThan(start)
 pointer('pointermove',x+25,y,2);expect(zoom()).toBeLessThan(start)
 pointer('pointerup',x+25,y,2);pointer('pointerup',x,y,1)
 expect(container.querySelector('.farm-plant-bar')?.textContent).toContain('×4')
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
