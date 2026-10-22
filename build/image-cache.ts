import type {RuntimeCaching} from 'workbox-build'

// Only public game art. Auth, RPCs, signed URLs, avatars and audio stay outside
// this cache. Query strings are retained, so an artwork revision is a new key.
export const imageRuntimeCaching:RuntimeCaching[]=[{
 urlPattern:/^https:\/\/ewafafphiovbpjwogwzn\.supabase\.co\/storage\/v1\/object\/public\/(collectibles|aquarium-backgrounds)\/[^?]+\.(png|webp|jpe?g|avif|svg)(\?[^#]*)?$/i,
 handler:'CacheFirst',
 options:{
  cacheName:'public-game-art-v1',
  fetchOptions:{mode:'cors',credentials:'omit'},
  cacheableResponse:{statuses:[200]},
  expiration:{maxEntries:96,maxAgeSeconds:7*24*60*60,purgeOnQuotaError:true},
 },
},{
 // Versioned same-origin action sheets need no Supabase download at all.
 urlPattern:({url,sameOrigin})=>sameOrigin&&url.pathname.startsWith('/aquarium/swim/')&&url.pathname.endsWith('.png')&&(url.searchParams.has('v')||/_v\d+_sprite\.png$/.test(url.pathname)),
 handler:'CacheFirst',
 options:{cacheName:'aquarium-action-art-v1',cacheableResponse:{statuses:[200]},expiration:{maxEntries:40,maxAgeSeconds:30*24*60*60,purgeOnQuotaError:true}},
}]
