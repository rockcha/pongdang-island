import {useSyncExternalStore} from 'react'

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
type InstallState={available:boolean;installed:boolean;busy:boolean;error:string}
let state:InstallState={available:false,installed:false,busy:false,error:''}
let deferred:InstallPrompt|null=null
let started=false
const listeners=new Set<()=>void>()
function update(next:Partial<InstallState>){state={...state,...next};listeners.forEach(listener=>listener())}

// Start before routing: browsers may offer installation before /download is opened.
export function initializePwaInstall(){
 if(started)return
 started=true
 const standalone=window.matchMedia('(display-mode: standalone)')
 const sync=()=>{if(standalone.matches||(navigator as Navigator&{standalone?:boolean}).standalone)update({installed:true,available:false})}
 sync();standalone.addEventListener('change',sync)
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferred=event as InstallPrompt
  update({available:!state.installed,error:''})
 })
 window.addEventListener('appinstalled',()=>{deferred=null;update({installed:true,available:false,busy:false,error:''})})
}
export async function installPwa(){
 if(!deferred||state.busy||state.installed)return
 const prompt=deferred;deferred=null
 update({busy:true,available:false,error:''})
 try{
  await prompt.prompt()
  await prompt.userChoice
  // Only appinstalled (or standalone mode) confirms installation, not acceptance.
 }catch{update({error:'설치 창을 열지 못했어요. 브라우저 메뉴에서 설치해주세요.'})}
 finally{update({busy:false})}
}
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}
export function usePwaInstall(){return useSyncExternalStore(subscribe,()=>state)}
