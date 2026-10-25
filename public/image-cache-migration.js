/* Move existing public images locally on activation: no network download and
   no mass cache flush. The action-sheet cache already has the correct name. */
(()=>{
 const legacy='public-game-art-v1'
 const classify=value=>{
  const url=new URL(value)
  if(url.origin!=='https://ewafafphiovbpjwogwzn.supabase.co')return null
  if(!/\.(png|webp|jpe?g|avif|svg)$/i.test(url.pathname))return null
  if(url.pathname.startsWith('/storage/v1/object/public/aquarium-backgrounds/'))return 'game-art-backgrounds-v1'
  if(!url.pathname.startsWith('/storage/v1/object/public/collectibles/'))return null
  return /_sprite\.(png|webp|jpe?g|avif|svg)$/i.test(url.pathname)?'game-art-sprites-v1':'game-art-thumbnails-v1'
 }
 async function migrate(){
  if(!(await caches.keys()).includes(legacy))return
  const old=await caches.open(legacy)
  for(const request of await old.keys()){
   const name=classify(request.url)
   if(!name)continue
   const response=await old.match(request)
   if(!response||response.status!==200)continue
   const target=await caches.open(name)
   if(!await target.match(request))await target.put(request,response)
   // Free each old response immediately; do not double the entire image cache.
   await old.delete(request)
  }
  await caches.delete(legacy)
 }
 self.addEventListener('activate',event=>event.waitUntil(migrate().catch(()=>{
  // Quota or unavailable CacheStorage must not prevent the app from activating.
  // Unmoved responses remain available for a later migration attempt.
 })))
})()
