import {expect,it} from 'vitest'
import {bindTankPinchZoom} from '../src/features/aquarium/pinch-zoom'

it('zooms at the pinch midpoint, pans within the tank, and shrinks below the original size',()=>{
 const viewport=document.createElement('div'),content=document.createElement('div')
 Object.defineProperties(viewport,{clientWidth:{value:300},clientHeight:{value:500}})
 viewport.append(content)
 const stop=bindTankPinchZoom(viewport,content)
 const touch=(type:string,points:number[][])=>{
  const event=new Event(type,{bubbles:true,cancelable:true})
  Object.defineProperty(event,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))})
  viewport.dispatchEvent(event)
  return event
 }
 expect(touch('touchstart',[[100,200],[200,200]]).defaultPrevented).toBe(true)
 touch('touchmove',[[50,200],[250,200]])
 expect(content.style.transform).toBe('translate(-150px,-200px) scale(2)')
 touch('touchend',[[50,200]])
 touch('touchmove',[[2000,2000]])
 expect(content.style.transform).toBe('translate(0px,0px) scale(2)')
 touch('touchend',[])
 touch('touchstart',[[50,200],[250,200]])
 touch('touchmove',[[149,200],[151,200]])
 expect(content.style.transform).toBe('translate(75px,125px) scale(0.5)')
 touch('touchend',[])
 touch('touchstart',[[100,200],[200,200]])
 touch('touchmove',[[50,200],[250,200]])
 expect(content.style.transform).toBe('translate(0px,0px) scale(1)')
 touch('touchmove',[[0,200],[300,200]])
 expect(content.style.transform).toContain('scale(1.5)')
 touch('touchmove',[[125,200],[175,200]])
 expect(content.style.transform).toBe('translate(75px,125px) scale(0.5)')
 stop();expect(content.style.transform).toBe('')
})
