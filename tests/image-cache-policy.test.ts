import {expect,it} from 'vitest'
import {imageRuntimeCaching} from '../build/image-cache'
const base='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/'
function matches(value:string){
 const url=new URL(value),sameOrigin=url.origin==='https://pongdang.test'
 return imageRuntimeCaching.filter(route=>route.urlPattern instanceof RegExp?route.urlPattern.test(value):typeof route.urlPattern==='function'&&route.urlPattern({url,sameOrigin} as any))
}
it('separates small thumbnails, remote originals, sprite sheets and backgrounds without overlapping routes',()=>{
 for(const [url,cache] of [
  [base+'public/collectibles/fish/mythic/fish_v2_sprite.png?v=stable','game-art-sprites-v1'],
  [base+'public/collectibles/fish/rare/fish_thumbnail.png','game-art-thumbnails-v1'],
  [base+'public/aquarium-backgrounds/room.webp','game-art-backgrounds-v1'],
  ['https://pongdang.test/game-art/thumbnails/0123456789abcdef01234567-320.webp','game-art-small-v1'],
  ['https://pongdang.test/game-art/background-previews/0123456789abcdef01234567-960.webp','game-art-background-previews-v1'],
  ['https://pongdang.test/game-art/rod-shop/reel/0123456789abcdef01234567-320.webp','game-art-rod-shop-v1'],
  ['https://pongdang.test/game-art/island/0123456789abcdef01234567-384.png','game-art-island-v1'],
  ['https://pongdang.test/game-art/island/0123456789abcdef01234567-256.png','game-art-island-v1'],
  ['https://pongdang.test/aquarium/swim/fish_swim8_v1_sprite.png','aquarium-action-art-v1'],
 ]){const routes=matches(url);expect(routes).toHaveLength(1);expect(routes[0].options?.cacheName).toBe(cache)}
})
it('excludes signed URLs, accounts, RPCs, avatars, audio, other projects and unversioned local assets',()=>{
 for(const url of [
  base+'sign/collectibles/fish.png?token=secret',base+'public/avatars/user.png',base+'public/collectibles/music/song.mp3',
  base+'public/collectibles/fish.json','https://another.supabase.co/storage/v1/object/public/collectibles/fish.png',
  'https://ewafafphiovbpjwogwzn.supabase.co/rest/v1/collectible_species',
  'https://pongdang.test/game-art/thumbnails/mutable.webp','https://pongdang.test/aquarium/swim/fish_sprite.png',
  'https://another.test/game-art/background-previews/0123456789abcdef01234567-960.webp',
  'https://pongdang.test/game-art/background-previews/mutable.webp',
  'https://pongdang.test/game-art/island/mutable.png',
  'https://pongdang.test/game-art/island/0123456789abcdef01234567-384.png?v=1',
  'https://another.test/game-art/island/0123456789abcdef01234567-384.png',
 ])expect(matches(url)).toHaveLength(0)
})
it('preserves revision query strings, rejects failed responses and limits each cache independently',()=>{
 for(const route of imageRuntimeCaching){
  expect(route.handler).toBe('CacheFirst');expect(route.options?.cacheableResponse?.statuses).toEqual([200])
  expect(route.options?.expiration?.purgeOnQuotaError).toBe(true)
  expect(route.options?.matchOptions?.ignoreSearch).not.toBe(true)
 }
 expect(imageRuntimeCaching.find(r=>r.options?.cacheName==='game-art-small-v1')?.options?.expiration?.maxEntries).toBe(1024)
 expect(imageRuntimeCaching.find(r=>r.options?.cacheName==='game-art-sprites-v1')?.options?.expiration?.maxEntries).toBe(64)
 for(const r of imageRuntimeCaching.filter(r=>r.options?.fetchOptions)){expect(r.options?.fetchOptions?.mode).toBe('cors');expect(r.options?.expiration?.maxAgeSeconds).toBe(604800)}
})
