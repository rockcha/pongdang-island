import {beforeEach,expect,it,vi} from 'vitest'
import {regionImageUrl} from '@/features/regions/api'
const storage=vi.hoisted(()=>({from:vi.fn(),getPublicUrl:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({storage:{from:storage.from}})}))
beforeEach(()=>{vi.clearAllMocks();storage.from.mockReturnValue({getPublicUrl:storage.getPublicUrl});storage.getPublicUrl.mockImplementation(path=>({data:{publicUrl:'https://example.supabase.co/storage/v1/object/public/regions/'+path}}))})
it('keeps the Pharaoh public background URL intact instead of treating it as a Storage key',()=>{
 const url='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/scenery-v1.png'
 expect(regionImageUrl(url)).toBe(url)
 expect(storage.from).not.toHaveBeenCalled()
})
it('preserves local public artwork and resolves legacy region bucket keys',()=>{
 expect(regionImageUrl('/regions/pharaoh/scenery-v1.png')).toBe('/regions/pharaoh/scenery-v1.png')
 expect(storage.from).not.toHaveBeenCalled()
 expect(regionImageUrl('pongdang.png')).toBe('https://example.supabase.co/storage/v1/object/public/regions/pongdang.png')
 expect(storage.from).toHaveBeenCalledWith('regions')
 expect(storage.getPublicUrl).toHaveBeenCalledWith('pongdang.png')
})
