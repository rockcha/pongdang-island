import {createClient} from '@/lib/client'

export const pushCategories=['production','bait-production','expedition','harbor'] as const
export type PushCategory=typeof pushCategories[number]
export type PushDeviceState={registered:boolean;categories:PushCategory[]}
export const supportsPush=()=>typeof window!=='undefined'&&window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window
export const needsHomeScreen=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches&&!(navigator as Navigator&{standalone?:boolean}).standalone

export function pushAccount(userId?:string|null):Promise<void>{
 if(!('indexedDB' in window))return Promise.resolve()
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('pongdang-push',1)
  request.onupgradeneeded=()=>request.result.createObjectStore('device')
  request.onerror=()=>reject(request.error)
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('device','readwrite');tx.objectStore('device').put(userId??null,'account');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}}
 })
}
async function device(action:'state'|'save'|'delete'|'test',subscription:PushSubscription|{endpoint:string},categories:readonly PushCategory[]=pushCategories){
 const {data,error}=await createClient().rpc('web_push_device',{p_action:action,p_subscription:JSON.parse(JSON.stringify(subscription)),p_categories:[...categories]})
 if(error)throw error
 return data as unknown as PushDeviceState
}
export async function pushConfiguration(){
 const {data,error}=await createClient().functions.invoke('web-push',{body:{action:'config'}})
 if(error)throw Error('푸시 알림 서버에 연결하지 못했어요. 잠시 후 다시 확인해 주세요.')
 return data as {configured:boolean;publicKey:string|null}
}
async function registration(){
 const existing=await navigator.serviceWorker.getRegistration()
 if(existing?.active)return existing
 return new Promise<ServiceWorkerRegistration>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('앱 업데이트를 적용한 뒤 다시 시도해 주세요.')),8000)
  navigator.serviceWorker.ready.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)})
 })
}
function confirmWorker(worker:ServiceWorker,userId:string){
 return new Promise<void>((resolve,reject)=>{
  const channel=new MessageChannel()
  const finish=(ok:boolean)=>{clearTimeout(timer);channel.port1.close();if(ok)resolve();else reject(Error('앱 업데이트를 적용한 뒤 다시 시도해 주세요.'))}
  const timer=setTimeout(()=>finish(false),3000)
  channel.port1.onmessage=event=>finish(event.data?.ok===true)
  worker.postMessage({type:'PUSHDATA_ACCOUNT',userId},[channel.port2])
 })
}
export async function currentPushDevice(){
 const reg=await navigator.serviceWorker.getRegistration(),sub=await reg?.pushManager.getSubscription()
 return sub?await device('state',sub):{registered:false,categories:[...pushCategories]}
}
export async function enablePush(userId:string,key:string,categories:PushCategory[]){
 // iOS requires the permission call directly inside the button interaction.
 const permission=await Notification.requestPermission()
 if(permission!=='granted')throw Error('브라우저에서 알림을 허용해 주세요. 차단했다면 사이트 알림 설정에서 변경할 수 있어요.')
 const assertAccount=async()=>{const {data}=await createClient().auth.getSession();if(data.session?.user.id!==userId){await pushAccount(data.session?.user.id);throw Error('계정이 변경됐어요. 현재 계정에서 다시 설정해 주세요.')}}
 await assertAccount()
 const reg=await registration()
 await pushAccount(userId);await confirmWorker(reg.active!,userId)
 await assertAccount()
 const publicKey=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0))
 const existing=await reg.pushManager.getSubscription()
 const sub=existing??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKey})
 try{await assertAccount();return await device('save',sub,categories)}catch(error){if(!existing)await sub.unsubscribe().catch(()=>false);throw error}
}
export async function savePushCategories(categories:PushCategory[]){
 const sub=await (await registration()).pushManager.getSubscription()
 if(!sub)throw Error('이 기기의 알림을 먼저 켜 주세요.')
 return device('save',sub,categories)
}
export async function disablePush(){
 const reg=await navigator.serviceWorker.getRegistration(),sub=await reg?.pushManager.getSubscription()
 if(sub){await device('delete',sub);await sub.unsubscribe()}
 return {registered:false,categories:[...pushCategories]}
}
export async function disconnectPushForLogout(){
 // Clear the local recipient first, even when offline or remote cleanup fails.
 await pushAccount(null).catch(()=>{})
 if(!('serviceWorker' in navigator))return
 const reg=await navigator.serviceWorker.getRegistration().catch(()=>undefined),sub=await reg?.pushManager.getSubscription().catch(()=>null)
 if(reg)for(const notice of await reg.getNotifications().catch(()=>[]))notice.close()
 if(sub){await device('delete',sub).catch(()=>{});await sub.unsubscribe().catch(()=>false)}
}
export async function queuePushTest(){
 const sub=await (await registration()).pushManager.getSubscription()
 if(!sub)throw Error('이 기기의 알림을 먼저 켜 주세요.')
 await device('test',sub)
}
