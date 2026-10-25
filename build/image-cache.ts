import type {RuntimeCaching} from 'workbox-build'

// Keep small list art independent of large sheets. Query strings remain part of
// the key; a published artwork revision must never serve another revision.
// Legacy, unversioned Storage images retain the existing seven-day lifetime.
export const imageRuntimeCaching:RuntimeCaching[]=[{
 urlPattern:/^https:\/\/ewafafphiovbpjwogwzn\.supabase\.co\/storage\/v1\/object\/public\/collectibles\/[^?]+_sprite\.(png|webp|jpe?g|avif|svg)(\?[^#]*)?$/i,
 handler:'CacheFirst',
 options:{cacheName:'game-art-sprites-v1',fetchOptions:{mode:'cors',credentials:'omit'},cacheableResponse:{statuses:[200]},expiration:{maxEntries:64,maxAgeSeconds:7*24*60*60,purgeOnQuotaError:true}},
},{
 urlPattern:/^https:\/\/ewafafphiovbpjwogwzn\.supabase\.co\/storage\/v1\/object\/public\/collectibles\/(?![^?]+_sprite\.)([^?]+)\.(png|webp|jpe?g|avif|svg)(\?[^#]*)?$/i,
 handler:'CacheFirst',
 options:{cacheName:'game-art-thumbnails-v1',fetchOptions:{mode:'cors',credentials:'omit'},cacheableResponse:{statuses:[200]},expiration:{maxEntries:192,maxAgeSeconds:7*24*60*60,purgeOnQuotaError:true}},
},{
 urlPattern:/^https:\/\/ewafafphiovbpjwogwzn\.supabase\.co\/storage\/v1\/object\/public\/aquarium-backgrounds\/[^?]+\.(png|webp|jpe?g|avif|svg)(\?[^#]*)?$/i,
 handler:'CacheFirst',
 options:{cacheName:'game-art-backgrounds-v1',fetchOptions:{mode:'cors',credentials:'omit'},cacheableResponse:{statuses:[200]},expiration:{maxEntries:16,maxAgeSeconds:7*24*60*60,purgeOnQuotaError:true}},
},{
 urlPattern:({url,sameOrigin})=>sameOrigin&&/^\/game-art\/thumbnails\/[a-f0-9]{24}-(320|640)\.webp$/.test(url.pathname)&&!url.search,
 handler:'CacheFirst',
 options:{cacheName:'game-art-small-v1',cacheableResponse:{statuses:[200],headers:{'Content-Type':'image/webp'}},expiration:{maxEntries:1024,maxAgeSeconds:180*24*60*60,purgeOnQuotaError:true}},
},{
 // Keep the existing action cache, so a deploy does not re-download these sheets.
 urlPattern:({url,sameOrigin})=>sameOrigin&&url.pathname.startsWith('/aquarium/swim/')&&url.pathname.endsWith('.png')&&(url.searchParams.has('v')||/_v\d+_sprite\.png$/.test(url.pathname)),
 handler:'CacheFirst',
 options:{cacheName:'aquarium-action-art-v1',cacheableResponse:{statuses:[200]},expiration:{maxEntries:40,maxAgeSeconds:30*24*60*60,purgeOnQuotaError:true}},
}]
