import {createRef} from 'react'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {FishingReel} from '@/features/fishing/fishing-reel'
afterEach(cleanup)
const setup=()=>({active:false,waiting:false,won:false,pressed:false,reduced:false,tension:38,rotation:0,buttonRef:createRef<HTMLButtonElement>(),onHold:vi.fn(),onRelease:vi.fn(),start:{label:'낚시 시작',disabled:false,onStart:vi.fn()}})
it('starts from the page, ignores repeats, and holds/releases from anywhere on the page',()=>{
 const props=setup(),view=render(<FishingReel {...props}/>)
 fireEvent.keyDown(document.body,{code:'Space'});fireEvent.keyDown(document.body,{code:'Space',repeat:true})
 expect(props.start.onStart).toHaveBeenCalledOnce()
 view.rerender(<FishingReel {...props} active waiting/>)
 fireEvent.keyUp(document.body,{code:'Space'})
 fireEvent.keyDown(document.body,{code:'Space'})
 expect(props.onHold).not.toHaveBeenCalled()
 view.rerender(<FishingReel {...props} active/>)
 fireEvent.keyDown(document.body,{code:'Space'})
 expect(props.onHold).toHaveBeenCalledOnce()
 fireEvent.keyUp(document.body,{code:'Space'})
 expect(props.onRelease).toHaveBeenCalledOnce()
 fireEvent.keyDown(document.body,{code:'Space'});fireEvent.blur(window)
 expect(props.onRelease).toHaveBeenCalledTimes(2)
})
it('leaves inputs, other buttons, dialogs, disabled starts and modifier shortcuts alone',()=>{
 const props=setup(),view=render(<><input aria-label="입력"/><button>다른 동작</button><FishingReel {...props}/></>)
 fireEvent.keyDown(screen.getByRole('textbox'),{code:'Space'})
 fireEvent.keyDown(screen.getByRole('button',{name:'다른 동작'}),{code:'Space'})
 fireEvent.keyDown(document.body,{code:'Space',ctrlKey:true})
 const modal=document.createElement('div');modal.setAttribute('role','dialog');document.body.append(modal)
 fireEvent.keyDown(document.body,{code:'Space'});modal.remove()
 view.rerender(<FishingReel {...props} start={{...props.start,disabled:true}}/>)
 fireEvent.keyDown(document.body,{code:'Space'})
 expect(props.start.onStart).not.toHaveBeenCalled()
 expect(props.onHold).not.toHaveBeenCalled()
})
