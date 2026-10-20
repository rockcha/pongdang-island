export function watchPwaUpdates(registration:ServiceWorkerRegistration){
 let active=true,pending=false
 const check=async()=>{
  if(!active||pending||document.visibilityState==='hidden'||!navigator.onLine||registration.installing)return
  pending=true
  try{await registration.update()}catch{/* Retry when the network recovers or at the next interval. */}
  finally{pending=false}
 }
 const wake=()=>{void check()}
 const timer=window.setInterval(wake,60_000)
 window.addEventListener('focus',wake)
 window.addEventListener('online',wake)
 document.addEventListener('visibilitychange',wake)
 wake()
 return()=>{
  active=false;window.clearInterval(timer)
  window.removeEventListener('focus',wake);window.removeEventListener('online',wake)
  document.removeEventListener('visibilitychange',wake)
 }
}

// A waiting worker may predate several deployments. Refresh it before activation.
// The caller owns the deadline and cancels this when gameplay resumes or it unmounts.
export async function prepareLatestPwaUpdate(registration:ServiceWorkerRegistration,signal:AbortSignal){
 signal.throwIfAborted()
 await registration.update()
 signal.throwIfAborted()
 while(registration.installing){
  const worker=registration.installing
  await new Promise<void>((resolve,reject)=>{
   const cleanup=()=>{worker.removeEventListener('statechange',changed);signal.removeEventListener('abort',aborted)}
   const aborted=()=>{cleanup();reject(signal.reason)}
   const changed=()=>{
    if(worker.state==='installed'||worker.state==='activated'){cleanup();resolve()}
    else if(worker.state==='redundant'){
     cleanup()
     if(registration.installing&&registration.installing!==worker)resolve()
     else reject(new Error('Latest service worker installation failed'))
    }
   }
   worker.addEventListener('statechange',changed)
   signal.addEventListener('abort',aborted,{once:true})
   if(signal.aborted)aborted();else changed()
  })
  signal.throwIfAborted()
  // Let the browser move the newly installed worker into registration.waiting.
  await new Promise(resolve=>window.setTimeout(resolve,0))
  signal.throwIfAborted()
 }
 if(!registration.waiting)throw new Error('No latest update waiting for activation')
}
