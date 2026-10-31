import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {HealthMeter} from '@/features/exploration/health-meter'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('keeps the real value current and delays only damage, including repeated hits',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false}))
 const view=render(<HealthMeter label="체력" value={100} max={100}/>),trail=document.querySelector('.exploration-health-trail') as HTMLElement
 expect(trail.style.transition).toBe('none')
 view.rerender(<HealthMeter label="체력" value={70} max={100}/>)
 expect(screen.getByRole('progressbar',{name:'체력'})).toHaveProperty('value',70)
 expect(trail.style.width).toBe('70%');expect(trail.style.transition).toContain('400ms')
 view.rerender(<HealthMeter label="체력" value={40} max={100}/>)
 expect(trail.style.width).toBe('40%');expect(trail.style.transition).toContain('750ms')
 view.rerender(<HealthMeter label="체력" value={90} max={100}/>)
 expect(trail.style.width).toBe('90%');expect(trail.style.transition).toBe('none')
 view.rerender(<HealthMeter label="체력" value={80} max={125}/>)
 expect(trail.style.width).toBe('64%');expect(trail.style.transition).toBe('none')
})
it('disables delayed movement for reduced motion and handles zero health',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}))
 const view=render(<HealthMeter label="체력" value={100} max={100}/>)
 view.rerender(<HealthMeter label="체력" value={0} max={100}/>)
 const trail=document.querySelector('.exploration-health-trail') as HTMLElement
 expect(trail.style.width).toBe('0%');expect(trail.style.transition).toBe('none')
 expect(screen.getByRole('progressbar')).toHaveProperty('value',0)
})
