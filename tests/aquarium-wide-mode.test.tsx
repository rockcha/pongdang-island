import {createPortal} from 'react-dom'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {useAquariumWideMode} from '@/features/aquarium/use-aquarium-wide-mode'
import {PortraitOrientation} from '@/components/portrait-orientation'
import {hasOpenOverlay} from '@/components/overlay-back'
function Harness(){const wide=useAquariumWideMode();return <><button onClick={wide.enter}>enter</button>{wide.active&&createPortal(<button onClick={wide.exit}>exit</button>,document.body)}</>}
afterEach(()=>{cleanup();document.getElementById('root')?.remove();vi.unstubAllGlobals();vi.restoreAllMocks();Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});delete document.documentElement.requestFullscreen;delete document.exitFullscreen})
it('temporarily releases portrait locking, locks landscape when supported and restores everything on external fullscreen exit',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}))
 const lock=vi.fn().mockResolvedValue(undefined),unlock=vi.fn()
 vi.stubGlobal('screen',{orientation:{lock,unlock}})
 document.documentElement.requestFullscreen=vi.fn(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:document.documentElement});document.dispatchEvent(new Event('fullscreenchange'))})
 document.exitFullscreen=vi.fn(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});document.dispatchEvent(new Event('fullscreenchange'))})
 const root=document.createElement('div');root.id='root';document.body.append(root)
 render(<><PortraitOrientation/><Harness/></>,{container:root})
 fireEvent.click(screen.getByText('enter'))
 await waitFor(()=>expect(lock).toHaveBeenCalledWith('landscape'))
 expect(root.inert).toBe(true)
 expect(hasOpenOverlay()).toBe(false)
 const count=lock.mock.calls.length;fireEvent.pointerUp(document)
 expect(lock).toHaveBeenCalledTimes(count)
 await act(async()=>{await document.exitFullscreen()})
 await waitFor(()=>expect(screen.queryByText('exit')).toBeNull())
 expect(root.inert).toBe(false)
 expect(document.documentElement.hasAttribute('data-aquarium-wide')).toBe(false)
 expect(lock).toHaveBeenLastCalledWith('portrait-primary')
 expect(unlock).toHaveBeenCalled()
})
it('keeps a usable wide view if native fullscreen refuses and closes on Escape',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}))
 document.documentElement.requestFullscreen=vi.fn().mockRejectedValue(new Error('unsupported'))
 render(<Harness/>);fireEvent.click(screen.getByText('enter'))
 await act(async()=>{})
 expect(screen.getByText('exit')).toBeTruthy()
 fireEvent.keyDown(window,{key:'Escape'})
 expect(screen.queryByText('exit')).toBeNull()
 expect(document.body.style.overflow).not.toBe('hidden')
})
