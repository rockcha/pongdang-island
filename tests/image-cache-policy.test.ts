import {expect,it} from 'vitest'
import {imageRuntimeCaching} from '../build/image-cache'
const pattern=imageRuntimeCaching[0].urlPattern as RegExp
const base='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/'
it('caches public game images but excludes personal, signed and non-image traffic',()=>{
 for(const path of ['public/collectibles/fish/mythic/fish.png','public/collectibles/fish/rare/fish.png?v=2','public/aquarium-backgrounds/room.webp'])expect(pattern.test(base+path)).toBe(true)
 for(const path of ['sign/collectibles/fish.png?token=secret','public/avatars/user.png','public/collectibles/music/song.mp3','public/collectibles/fish.json'])expect(pattern.test(base+path)).toBe(false)
 expect(pattern.test('https://another.supabase.co/storage/v1/object/public/collectibles/fish.png')).toBe(false)
 expect(pattern.test('https://ewafafphiovbpjwogwzn.supabase.co/rest/v1/collectible_species')).toBe(false)
})
it('keeps cached failures out and bounds device storage',()=>{
 const options=imageRuntimeCaching[0].options!
 expect(imageRuntimeCaching[0].handler).toBe('CacheFirst')
 expect(options.cacheableResponse?.statuses).toEqual([200])
 expect(options.fetchOptions?.mode).toBe('cors')
 expect(options.expiration?.purgeOnQuotaError).toBe(true)
 expect(options.expiration?.maxEntries).toBeLessThanOrEqual(100)
 expect(options.expiration?.maxAgeSeconds).toBe(604800)
 expect(options.matchOptions?.ignoreSearch).not.toBe(true)
})
