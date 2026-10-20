import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AppReady,AppRecoveryBoundary} from '@/components/app-recovery'

afterEach(()=>{cleanup();delete window.pongdangStartup;vi.restoreAllMocks()})
it('dismisses startup feedback once the app mounts',()=>{
 const ready=vi.fn();window.pongdangStartup={ready,fail:vi.fn()}
 render(<AppReady/>);expect(ready).toHaveBeenCalledOnce()
})
it('offers recovery after a React render error',()=>{
 vi.spyOn(console,'error').mockImplementation(()=>{})
 const fail=vi.fn();window.pongdangStartup={ready:vi.fn(),fail}
 function Broken():never{throw new Error('render failed')}
 render(<AppRecoveryBoundary><Broken/></AppRecoveryBoundary>)
 expect(screen.getByRole('button',{name:'다시 시도'})).toBeTruthy()
 expect(fail).toHaveBeenCalledWith('render-error')
})
