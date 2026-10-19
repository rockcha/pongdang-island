import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {VoyageProgress} from '@/features/port/voyage-progress'
import type {HarborVoyage} from '@/features/port/api'

afterEach(cleanup)
it('tracks elapsed voyage time and clamps progress before departure and after arrival',()=>{
 const start=Date.parse('2026-10-19T10:00:00Z')
 const voyage={departed_at:new Date(start).toISOString(),returns_at:new Date(start+1800000).toISOString(),vessel_snapshot:{name:'낚시용 뗏목'}} as HarborVoyage
 const {rerender}=render(<VoyageProgress voyage={voyage} now={start-1000}/>)
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
 rerender(<VoyageProgress voyage={voyage} now={start+900000}/>)
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50')
 expect(screen.getByText('15분')).toBeTruthy()
 rerender(<VoyageProgress voyage={voyage} now={start+3600000}/>)
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
 expect(screen.getByText('어획물 수령 가능')).toBeTruthy()
})
