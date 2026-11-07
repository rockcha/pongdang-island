import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render} from '@testing-library/react'
import {useFarmObjectDrag} from '@/features/farm/use-object-drag'
afterEach(cleanup)
function setup(movingId:number|null=null){
 const onDrop=vi.fn(),onSelect=vi.fn(),onPreview=vi.fn();let shift=0
 function Harness(){
  const drag=useFarmObjectDrag({enabled:true,movingId,readCell:(x,y)=>({x:Math.floor(x/10)+shift,y:Math.floor(y/10)}),find:id=>({id,kind:'warehouse',x:4,y:4}),onSelect,onDrop,onPreview,onCancel:()=>{}})
  return <div data-testid="viewport" onPointerDownCapture={drag.down} onPointerMoveCapture={drag.move} onPointerUpCapture={drag.up}><button data-object-id="1">first</button><button data-object-id="2">second</button></div>
 }
 const {container}=render(<Harness/>),viewport=container.firstElementChild!,first=container.querySelector('[data-object-id="1"]')!,second=container.querySelector('[data-object-id="2"]')!
 const pointer=(type:string,target:Element,x:number,y:number)=>fireEvent(target,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}),{pointerId:1,pointerType:'touch'}))
 return {viewport,first,second,pointer,onDrop,onSelect,onPreview,shiftOnRelease:()=>{
  Object.assign(viewport,{hasPointerCapture:()=>true,releasePointerCapture:()=>{shift=50}})
 }}
}
it('keeps the selected object when its destination is covered by another building artwork',()=>{
 const s=setup(1)
 s.pointer('pointerdown',s.second,65,45);s.pointer('pointerup',s.viewport,65,45)
 expect(s.onDrop).toHaveBeenCalledExactlyOnceWith(1,{x:6,y:4})
 expect(s.onSelect).not.toHaveBeenCalled()
})
it('preserves the grabbed roof offset rather than clamping it to the building footprint',()=>{
 const s=setup()
 s.pointer('pointerdown',s.first,45,25);s.pointer('pointermove',s.viewport,55,25);s.pointer('pointerup',s.viewport,55,25)
 expect(s.onPreview).toHaveBeenLastCalledWith({x:5,y:4})
 expect(s.onDrop).toHaveBeenCalledExactlyOnceWith(1,{x:5,y:4})
})
it('reads the destination before releasing pointer capture',()=>{
 const s=setup();s.shiftOnRelease()
 s.pointer('pointerdown',s.first,45,45);s.pointer('pointermove',s.viewport,65,45);s.pointer('pointerup',s.viewport,65,45)
 expect(s.onDrop).toHaveBeenCalledExactlyOnceWith(1,{x:6,y:4})
})
it('commits a fast drag even when the browser has not delivered an intermediate move event',()=>{
 const s=setup()
 s.pointer('pointerdown',s.first,45,45);s.pointer('pointerup',s.viewport,65,45)
 expect(s.onDrop).toHaveBeenCalledExactlyOnceWith(1,{x:6,y:4})
})
