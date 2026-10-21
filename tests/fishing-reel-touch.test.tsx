import {createRef} from 'react'
import {cleanup,fireEvent,render} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FishingReel} from '@/features/fishing/fishing-reel'

beforeEach(()=>{
 class TestPointerEvent extends MouseEvent{
  pointerId:number
  constructor(type:string,options:PointerEventInit={}){super(type,options);this.pointerId=options.pointerId??1}
 }
 vi.stubGlobal('PointerEvent',TestPointerEvent)
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
function setup(){
 const onHold=vi.fn(),onRelease=vi.fn(),buttonRef=createRef<HTMLButtonElement>()
 render(<FishingReel active waiting={false} won={false} pressed={false} reduced={false} tension={38} rotation={0} buttonRef={buttonRef} onHold={onHold} onRelease={onRelease}/> )
 const button=buttonRef.current!
 button.setPointerCapture=vi.fn()
 return {button,onHold,onRelease}
}
it('allows immediate release and press again without an old capture loss releasing the new press',()=>{
 const {button,onHold,onRelease}=setup()
 fireEvent.pointerDown(button,{pointerId:1})
 fireEvent.pointerUp(button,{pointerId:1})
 fireEvent.pointerDown(button,{pointerId:2})
 fireEvent.lostPointerCapture(button,{pointerId:1})
 expect(onHold.mock.calls).toEqual([[1],[2]])
 expect(onRelease).toHaveBeenCalledTimes(1)
 fireEvent.pointerUp(button,{pointerId:2})
 expect(onRelease).toHaveBeenCalledTimes(2)
})
it.each(['pointerCancel','lostPointerCapture'] as const)('only releases the owning pointer on %s, and accepts the next press',event=>{
 const {button,onHold,onRelease}=setup()
 fireEvent.pointerDown(button,{pointerId:1})
 fireEvent.pointerDown(button,{pointerId:2})
 fireEvent[event](button,{pointerId:2})
 expect(onRelease).not.toHaveBeenCalled()
 expect(onHold).toHaveBeenCalledTimes(1)
 fireEvent[event](button,{pointerId:1})
 expect(onRelease).toHaveBeenCalledTimes(1)
 fireEvent.pointerDown(button,{pointerId:3})
 expect(onHold.mock.calls).toEqual([[1],[3]])
})
