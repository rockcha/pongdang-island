import {expect,it,vi} from 'vitest'
import {bindTankPinchZoom,type TankCamera} from '../src/features/aquarium/pinch-zoom'
import {clampTankCameraView} from '../src/features/aquarium/tank-world'

function setup(){
 const viewport=document.createElement('div')
 Object.defineProperty(viewport,'clientWidth',{value:300})
 let state:TankCamera={zoom:1/3,view:0}
 const begin=vi.fn(),end=vi.fn()
 const stop=bindTankPinchZoom(viewport,{columns:3,getState:()=>state,onChange:value=>{state=value},onBegin:begin,onEnd:end})
 const touch=(type:string,points:number[][])=>{
  const event=new Event(type,{bubbles:true,cancelable:true})
  Object.defineProperty(event,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))})
  viewport.dispatchEvent(event);return event
 }
 return {viewport,touch,stop,begin,end,state:()=>state}
}
it('starts with the entire world and zooms at the pinch midpoint up to the original viewing size',()=>{
 const t=setup()
 expect(t.touch('touchstart',[[100,150],[200,150]]).defaultPrevented).toBe(true)
 t.touch('touchmove',[[0,150],[300,150]])
 expect(t.state()).toEqual({zoom:1,view:1})
 t.touch('touchmove',[[-200,150],[500,150]])
 expect(t.state().zoom).toBe(1)
 t.touch('touchend',[]);expect(t.end).toHaveBeenCalledOnce()
 t.touch('touchstart',[[0,150],[300,150]])
 t.touch('touchmove',[[149,150],[151,150]])
 expect(t.state()).toEqual({zoom:1/3,view:0})
 expect(t.viewport.style.transform).toBe('')
 t.stop()
})
it('leaves object dragging to Phaser and consumes the rest of a pinch without accidental placement',()=>{
 const t=setup()
 expect(t.touch('touchstart',[[100,100]]).defaultPrevented).toBe(false)
 t.touch('touchstart',[[100,100],[200,100]])
 t.touch('touchend',[[100,100]])
 expect(t.touch('touchmove',[[200,100]]).defaultPrevented).toBe(true)
 t.touch('touchend',[])
 expect(t.touch('touchmove',[[210,100]]).defaultPrevented).toBe(false)
 t.stop();expect(t.touch('touchstart',[[100,100],[200,100]]).defaultPrevented).toBe(false)
})
it('keeps both world edges visible at minimum zoom and clamps panning at every intermediate zoom',()=>{
 for(const zoom of [1/3,.4,.6,.8,1]){
  const left=clampTankCameraView(-100,3,zoom),right=clampTankCameraView(100,3,zoom)
  expect(left).toBe(0);expect(right+1/zoom).toBeCloseTo(3)
 }
})
it('zooms inside a fitted portrait viewport and pinches back to fit without shrinking the scene below it',()=>{
 const viewport=document.createElement('div')
 Object.defineProperty(viewport,'clientWidth',{value:300})
 let state:TankCamera={zoom:1,view:1,y:0}
 const stop=bindTankPinchZoom(viewport,{columns:3,minZoom:1,maxZoom:2,getState:()=>state,onChange:value=>{state=value}})
 const touch=(type:string,points:number[][])=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))});viewport.dispatchEvent(e)}
 touch('touchstart',[[100,150],[200,150]])
 touch('touchmove',[[0,150],[300,150]])
 expect(state.zoom).toBe(2)
 expect(state.view).toBeCloseTo(1.25)
 expect(state.y).toBeCloseTo(.25)
 touch('touchmove',[[145,150],[155,150]])
 expect(state.zoom).toBe(1)
 expect(state.view).toBeCloseTo(1)
 expect(state.y).toBeCloseTo(0)
 stop()
})
it('keeps the vertical pinch anchor when a fixed landscape viewport is zoomed',()=>{
 const viewport=document.createElement('div')
 Object.defineProperty(viewport,'clientWidth',{value:300})
 let state:TankCamera={zoom:1/3,view:0,y:0}
 const stop=bindTankPinchZoom(viewport,{columns:3,getState:()=>state,onChange:value=>{state=value}})
 const touch=(type:string,points:number[][])=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))});viewport.dispatchEvent(e)}
 touch('touchstart',[[100,150],[200,150]])
 touch('touchmove',[[0,150],[300,150]])
 expect(state).toEqual({zoom:1,view:1,y:1})
 touch('touchmove',[[100,150],[200,150]])
 expect(state.y).toBeCloseTo(0)
 stop()
})
