import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {BrickMovementControls} from '@/features/arcade/brick-movement-controls'
import {brickTargetDirection} from '@/features/arcade/brick-target-input'
import {BrickSession,BRICK_TICK,verifyBrickReplay} from '@/features/arcade/brick-breaker-replay'

afterEach(()=>cleanup())
function pointer(element:HTMLElement,type:string,id:number,x:number){
 const event=new Event(type,{bubbles:true,cancelable:true})
 Object.defineProperties(event,{pointerId:{value:id},clientX:{value:x},button:{value:0}})
 fireEvent(element,event)
}
function show(){
 const onTarget=vi.fn(),onDirection=vi.fn()
 const view=render(<BrickMovementControls enabled onTarget={onTarget} onDirection={onDirection}/>)
 const pad=screen.getByRole('group',{name:'퐁이 이동 조작'})
 vi.spyOn(pad,'getBoundingClientRect').mockReturnValue({left:100,width:400} as DOMRect)
 return {pad,onTarget,onDirection,view}
}
it('tracks a captured finger, clamps the edges and stops when released',()=>{
 const {pad,onTarget}=show()
 pointer(pad,'pointerdown',1,200);expect(onTarget).toHaveBeenLastCalledWith(0.25)
 pointer(pad,'pointermove',1,400);expect(onTarget).toHaveBeenLastCalledWith(0.75)
 pointer(pad,'pointermove',1,800);expect(onTarget).toHaveBeenLastCalledWith(1)
 pointer(pad,'pointermove',1,0);expect(onTarget).toHaveBeenLastCalledWith(0)
 pointer(pad,'pointerup',1,0);expect(onTarget).toHaveBeenLastCalledWith(null)
 pointer(pad,'pointermove',1,300);expect(onTarget).toHaveBeenLastCalledWith(null)
})
it.each(['pointercancel','lostpointercapture'])('stops on %s and ignores other fingers',type=>{
 const {pad,onTarget}=show()
 pointer(pad,'pointerdown',1,200)
 pointer(pad,'pointerdown',2,400);pointer(pad,'pointermove',2,400);pointer(pad,'pointerup',2,400)
 expect(onTarget).toHaveBeenLastCalledWith(0.25)
 pointer(pad,type,1,200);expect(onTarget).toHaveBeenLastCalledWith(null)
})
it('clears input on pause, blur and unmount',()=>{
 const {pad,onTarget,onDirection,view}=show()
 pointer(pad,'pointerdown',1,200);fireEvent.blur(window)
 expect(onTarget).toHaveBeenLastCalledWith(null)
 pointer(pad,'pointerdown',1,200)
 view.rerender(<BrickMovementControls enabled={false} onTarget={onTarget} onDirection={onDirection}/>)
 expect(onTarget).toHaveBeenLastCalledWith(null)
 pointer(pad,'pointerdown',2,300);expect(onTarget).toHaveBeenLastCalledWith(null)
 view.unmount();expect(onDirection).toHaveBeenLastCalledWith(0)
})
it('converges without teleporting and produces a replay accepted by the existing engine',()=>{
 const session=new BrickSession(42),target=270
 for(let tick=0;tick<120;tick++){
  const before=session.model.paddleX
  session.command('direction',brickTargetDirection(before,target,BRICK_TICK));session.step()
  expect(Math.abs(session.model.paddleX-before)).toBeLessThanOrEqual(420*BRICK_TICK+0.001)
 }
 // Direction-only replay inputs settle within half a simulation movement step.
 expect(Math.abs(session.model.paddleX-target)).toBeLessThanOrEqual(420*BRICK_TICK/2)
 expect(brickTargetDirection(target,target,BRICK_TICK)).toBe(0)
 expect(verifyBrickReplay(42,session.replay(),1)).toMatchObject({round:session.model.round,lives:session.model.lives})
})
