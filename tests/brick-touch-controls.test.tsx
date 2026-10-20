import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {BrickMovementControls} from '@/features/arcade/brick-movement-controls'
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
it('tracks touch precisely without teleporting and produces a valid replay',()=>{
 const session=new BrickSession(42),target=270
 for(let tick=0;tick<120;tick++){
  const before=session.model.paddleX
  session.command('target',target);session.step()
  expect(Math.abs(session.model.paddleX-before)).toBeLessThanOrEqual(960*BRICK_TICK+0.001)
 }
 expect(session.model.paddleX).toBeCloseTo(target)
 expect(session.inputs.filter(input=>input.action==='target')).toHaveLength(1)
 expect(verifyBrickReplay(42,session.replay(),1)).toMatchObject({round:session.model.round,lives:session.model.lives})
})
it('follows touch faster than keyboard input while preserving the sticky slowdown',()=>{
 const touch=new BrickSession(42),keyboard=new BrickSession(42),sticky=new BrickSession(42)
 touch.command('target',300);keyboard.command('direction',1)
 sticky.model.stickySeconds=6;sticky.command('target',300)
 for(const game of [touch,keyboard,sticky])game.step()
 expect(touch.model.paddleX-180).toBe(8)
 expect(keyboard.model.paddleX-180).toBe(3.5)
 expect(sticky.model.paddleX-180).toBe(4)
})
