export function watchPwaUpdates(registration:ServiceWorkerRegistration){
 let active=true,pending=false
 const check=async()=>{
  if(!active||pending||document.visibilityState==='hidden'||!navigator.onLine||registration.installing||registration.waiting)return
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
