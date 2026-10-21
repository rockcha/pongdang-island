import {afterEach,expect,it,vi} from 'vitest'
import {readDockRegion,rememberDockRegion} from '@/features/port/dock-region'

const regions=[{id:'pongdang',unlocked:true},{id:'bluegrove',unlocked:true},{id:'mistmoon',unlocked:true}]
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()})
it('remembers each dock and account independently across departures',()=>{
 rememberDockRegion('me',1,'bluegrove')
 rememberDockRegion('me',2,'mistmoon')
 expect(readDockRegion('me',1,regions)).toBe('bluegrove')
 expect(readDockRegion('me',2,regions)).toBe('mistmoon')
 expect(readDockRegion('other',1,regions)).toBe('pongdang')
 rememberDockRegion('me',1,'mistmoon')
 expect(readDockRegion('me',1,regions)).toBe('mistmoon')
})
it('falls back to an unlocked region for missing or locked saved destinations',()=>{
 rememberDockRegion('me',1,'bluegrove')
 expect(readDockRegion('me',1,regions.map(r=>({...r,unlocked:r.id!=='bluegrove'})))).toBe('pongdang')
 expect(readDockRegion('me',1,[{id:'mistmoon',unlocked:true}])).toBe('mistmoon')
})
it('keeps departure usable when browser storage is unavailable',()=>{
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked')})
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('blocked')})
 expect(()=>rememberDockRegion('me',1,'mistmoon')).not.toThrow()
 expect(readDockRegion('me',1,regions)).toBe('pongdang')
})
