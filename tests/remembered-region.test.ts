import {afterEach,expect,it,vi} from 'vitest'
import {rememberRegion,rememberedRegionIndex} from '@/features/regions/remembered-region'
const regions=[{id:'pongdang'},{id:'primal'},{id:'coral'}]
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()})
it('restores the last selection and replaces it with the next fishing destination for the same account',()=>{
 rememberRegion('primal','owner')
 expect(rememberedRegionIndex(regions,'pongdang','owner')).toBe(1)
 rememberRegion('coral','owner')
 expect(rememberedRegionIndex(regions,'coral','owner')).toBe(2)
 expect(rememberedRegionIndex(regions,'pongdang','other')).toBe(0)
})
it('falls back to current location, then the starting sea when saved regions no longer exist',()=>{
 rememberRegion('removed','owner')
 expect(rememberedRegionIndex(regions,'primal','owner')).toBe(1)
 expect(rememberedRegionIndex(regions,'removed','owner')).toBe(0)
 expect(rememberedRegionIndex([{id:'coral'}],'removed','owner')).toBe(0)
})
it('keeps navigation usable when browser storage is unavailable',()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked')})
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked')})
 expect(()=>rememberRegion('primal','owner')).not.toThrow()
 expect(rememberedRegionIndex(regions,'primal','owner')).toBe(1)
})
