import {expect,it} from 'vitest'
import {voyageDuration} from '@/features/port/voyage-duration'

it('formats relic reductions to seconds without decimal minute artifacts',()=>{
 expect(voyageDuration(5*0.97)).toBe('4분 51초')
 expect(voyageDuration(40*0.94)).toBe('37분 36초')
 expect(voyageDuration(840*0.9)).toBe('12시간 36분')
 expect(voyageDuration(90)).toBe('1시간 30분')
})
