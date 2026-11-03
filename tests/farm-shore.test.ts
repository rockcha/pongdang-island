import {expect,it} from 'vitest'
import {islandShorePath} from '@/features/farm/island-shore'
it('merges adjacent tiles into one rounded perimeter without repeating tile-sized corners',()=>{
 const path=islandShorePath(['4,4','5,4','6,4','4,5','5,5','6,5'])
 expect(path.match(/M/g)).toHaveLength(1);expect(path.match(/Q/g)).toHaveLength(4)
 expect(path).not.toContain('NaN');expect(islandShorePath([])).toBe('')
})
it('reconnects an added plot and retains water holes as separate closed loops',()=>{
 const base=['0,0','1,0','0,1'],extended=islandShorePath([...base,'1,1'])
 expect(islandShorePath(base).match(/Q/g)).toHaveLength(6);expect(extended.match(/Q/g)).toHaveLength(4)
 const ring=Array.from({length:9},(_,i)=>`${i%3},${Math.floor(i/3)}`).filter(k=>k!=='1,1')
 expect(islandShorePath(ring).match(/Z/g)).toHaveLength(2)
 expect(islandShorePath(['0,0','1,1']).match(/Z/g)).toHaveLength(2)
})
