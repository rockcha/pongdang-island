/* Imported by the existing Workbox worker: cache/update behavior stays intact. */
importScripts('/push-presentation.js')
function binding(value,write=false){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('pongdang-push',1)
  request.onupgradeneeded=()=>request.result.createObjectStore('device')
  request.onerror=()=>reject(request.error)
  request.onsuccess=()=>{
   const db=request.result,tx=db.transaction('device',write?'readwrite':'readonly'),store=tx.objectStore('device')
   const operation=write?store.put(value,'account'):store.get('account')
   let result=null;operation.onsuccess=()=>{result=operation.result}
   tx.oncomplete=()=>{db.close();resolve(write?value:result)};tx.onerror=()=>{db.close();reject(tx.error)}
  }
 })
}
const validPath=value=>['/production','/bait-production','/expeditions','/port','/settings','/voyage-bets'].includes(value)?value:'/settings'
let displayQueue=Promise.resolve()
function serializeDisplay(work){const result=displayQueue.then(work,work);displayQueue=result.catch(()=>{});return result}
async function showPush(payload,merge=false){
 payload=self.PongdangPush.presentPush(payload)
 const tag=self.PongdangPush.pushGroupTag(payload)
 const previous=merge&&self.PongdangPush.groupedCategories.includes(payload.category)?(await self.registration.getNotifications()).filter(n=>n.data?.userId===payload.userId&&n.data?.payload?.category===payload.category):[]
 if(previous.length){
  const members=previous.flatMap(n=>self.PongdangPush.membersOf(n.data.payload)).filter(m=>!m.expiresAt||Date.parse(m.expiresAt)>Date.now())
  payload=self.PongdangPush.presentPush(payload,[...members,...self.PongdangPush.membersOf(payload)])
 }
 payload={...payload,tag}
 await self.registration.showNotification(String(payload.title||'퐁당섬').slice(0,100),{
  body:String(payload.body||'새로운 소식이 도착했어요.').slice(0,300),
  icon:'/branding/pongi.png',badge:'/notification-icons/push-badge-pongi-v1.png',
  tag:String(tag||'pongdang'),renotify:false,
  data:{url:validPath(payload.url),userId:payload.userId,payload,receivedAt:Date.now()},
 })
 // Replace old per-batch tags only after the combined notification was shown.
 for(const notice of previous)if(notice.tag!==tag)notice.close()
}
function offerToPage(client,payload){
 return new Promise(resolve=>{
  const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false)},700)
  channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.shown===true)}
  try{client.postMessage({type:'PONGDANG_PUSH',payload},[channel.port2])}catch{clearTimeout(timer);channel.port1.close();resolve(false)}
 })
}
self.addEventListener('message',event=>{
 if(event.data?.type==='PUSHDATA_RECONCILE'){
  event.waitUntil(serializeDisplay(async()=>{
   const {userId,active,observedBefore}=event.data
   if(typeof userId!=='string'||!Array.isArray(active)||!Number.isFinite(observedBefore)||await binding()!==userId)return
   const current=new Map(active.map(p=>[p.tag,p]))
   for(const notice of await self.registration.getNotifications()){
    if(notice.data?.userId!==userId||notice.data?.receivedAt>observedBefore)continue
    const payload=notice.data?.payload
    // Legacy deliveries retain their original notice tag.
    if(!payload){if(String(notice.tag).startsWith('notice:')&&!current.has(notice.tag))notice.close();continue}
    if(payload.category==='test')continue
    const previous=self.PongdangPush.membersOf(payload)
    const remaining=previous.map(m=>current.get(m.tag)).filter(Boolean)
    if(!remaining.length){notice.close();continue}
    if(remaining.length!==previous.length){
     await showPush(self.PongdangPush.presentPush(payload,remaining))
     if(typeof notice.tag==='string'&&notice.tag!==self.PongdangPush.pushGroupTag(payload))notice.close()
    }
   }
  }))
  return
 }
 if(event.data?.type!=='PUSHDATA_ACCOUNT')return
 event.waitUntil(serializeDisplay(async()=>{
  try{
   const userId=typeof event.data.userId==='string'?event.data.userId:null
   await binding(userId,true)
   for(const notice of await self.registration.getNotifications())if(notice.data?.userId!==userId)notice.close()
   event.ports[0]?.postMessage({ok:true})
  }catch{event.ports[0]?.postMessage({ok:false})}
 }))
})
self.addEventListener('push',event=>{
 event.waitUntil(serializeDisplay(async()=>{
  let payload;try{payload=event.data?.json()}catch{return}
  if(!payload||typeof payload.userId!=='string')return
  if(payload.members?.length){
   const remaining=payload.members.filter(m=>!m.expiresAt||(Number.isFinite(Date.parse(m.expiresAt))&&Date.parse(m.expiresAt)>Date.now()))
   if(!remaining.length)return
   payload=self.PongdangPush.presentPush(payload,remaining)
  }else if(payload.expiresAt&&(!Number.isFinite(Date.parse(payload.expiresAt))||Date.parse(payload.expiresAt)<=Date.now()))return
  // Fail closed on account mismatch, including delayed delivery after logout.
  try{if(await binding()!==payload.userId)return}catch{return}
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
  // Chromium exempts visible tabs from notification enforcement; WebKit requires
  // a system notification for every push even when the page shows its own card.
  const canUsePageOnly=/Chrome\/|Chromium\/|Edg\/|SamsungBrowser\//.test(self.navigator?.userAgent||'')
  for(const client of windows.filter(client=>client.visibilityState==='visible'))if(await offerToPage(client,payload)){if(canUsePageOnly)return;break}
  await showPush(payload,true)
 }))
})
self.addEventListener('notificationclick',event=>{
 event.notification.close()
 event.waitUntil((async()=>{
  const data=event.notification.data
  try{if(!data?.userId||await binding()!==data.userId)return}catch{return}
  const url=new URL(validPath(data.url),self.location.origin).href
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
  const existing=windows.find(client=>new URL(client.url).origin===self.location.origin)
  if(existing){await existing.navigate(url);await existing.focus()}else await self.clients.openWindow(url)
 })())
})
