import { expect,it } from 'vitest'
import { tankSwipeDirection } from '../src/features/aquarium/tank-swipe'
it('recognizes deliberate horizontal swipes and ignores taps, scrolling and slow drags',()=>{
 expect(tankSwipeDirection(-120,12,250)).toBe('next')
 expect(tankSwipeDirection(100,15,300)).toBe('previous')
 expect(tankSwipeDirection(20,0,100)).toBeNull()
 expect(tankSwipeDirection(80,110,250)).toBeNull()
 expect(tankSwipeDirection(-100,0,1200)).toBe('next')
 expect(tankSwipeDirection(-100,0,2000)).toBeNull()
})
