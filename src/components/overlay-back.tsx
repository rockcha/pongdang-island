import {createContext,useContext,useEffect,useLayoutEffect,useRef} from 'react'
import {flushSync} from 'react-dom'
import {useLocation} from 'react-router'

type Layer={close:()=>void;depth:number;historyEntry:boolean;pauseBackground:boolean}
type Watcher=EventTarget&{destroy:()=>void}
type WatcherConstructor=new()=>Watcher
export const OverlayDepth=createContext(0)
const layers:Layer[]=[]
const overlayListeners=new Set<()=>void>()
let overlayActive=false
export const hasOpenOverlay=()=>layers.some(layer=>layer.pauseBackground)
export function subscribeOverlayActivity(listener:()=>void){overlayListeners.add(listener);return()=>{overlayListeners.delete(listener)}}
const marker='pongdangOverlay'
let watcher:Watcher|null=null
let guard:{id:string;url:string;retiring:boolean}|null=null
let listening=false
let routeIndex=0
let routeUrl:string|null=null

function closeTop(){
 const top=layers.reduce<Layer|undefined>((current,layer)=>!current||layer.depth>=current.depth?layer:current,undefined)
 // Commit before rearming: a dirty editor may open a confirmation instead of closing.
 if(top)flushSync(()=>top.close())
 queueMicrotask(sync)
}
function onPop(event:PopStateEvent){
 if(guard&&location.href===guard.url&&event.state?.[marker]!==guard.id){
  event.stopImmediatePropagation()
  const retiring=guard.retiring
  guard=null
  if(!retiring)closeTop()
  else queueMicrotask(sync)
  return
 }
 if(event.state?.[marker]){
  // A link followed from a sheet can leave its guard behind in history.
  // Skip that duplicate on both Back and Forward without reopening the sheet.
  event.stopImmediatePropagation()
  history.go((event.state.idx??0)<routeIndex?-1:1)
  return
 }
 routeIndex=event.state?.idx??0
 queueMicrotask(sync)
}
function sync(){
 const active=hasOpenOverlay()
 if(active!==overlayActive){overlayActive=active;for(const listener of overlayListeners)listener()}
 if(!layers.length){
  watcher?.destroy();watcher=null
  if(guard&&!guard.retiring){
   if(history.state?.[marker]===guard.id&&location.href===guard.url){guard.retiring=true;history.back()}
   else guard=null
  }
  return
 }
 const NativeWatcher=(window as Window&{CloseWatcher?:WatcherConstructor}).CloseWatcher
 if(NativeWatcher){
  if(!watcher){
   watcher=new NativeWatcher()
   watcher.addEventListener('cancel',event=>{
    // Retain the watcher when the caller refuses to close (saving, confirmation, etc.).
    if(event.cancelable){event.preventDefault();closeTop()}
   })
   watcher.addEventListener('close',()=>{watcher=null;closeTop()})
  }
  return
 }
 if(!listening){window.addEventListener('popstate',onPop,true);listening=true}
 if(!guard){
  // Standalone alerts can be driven by a router blocker (with its own pending POP).
  // They join an existing drawer's stack, but must not add a route history entry.
  if(!layers.some(layer=>layer.historyEntry))return
  // A router blocker may still be restoring a rejected POP (e.g. active fishing).
  // Wait for that restoration rather than truncating its forward history entry.
  if(routeUrl&&location.href!==routeUrl)return
  routeIndex=history.state?.idx??0
  guard={id:crypto.randomUUID(),url:location.href,retiring:false}
  // Preserve React Router's usr/key/idx. This is a close step, not a new route.
  history.pushState({...history.state,[marker]:guard.id},'',location.href)
 }
}

export function useOverlayBack(open:boolean,close:()=>void,historyEntry=true,pauseBackground=true){
 const depth=useContext(OverlayDepth),latest=useRef(close)
 latest.current=close
 useEffect(()=>{
  if(!open)return
  const layer={depth,historyEntry,pauseBackground,close:()=>latest.current()}
  layers.push(layer);sync()
  return()=>{
   const index=layers.indexOf(layer)
   if(index!==-1)layers.splice(index,1)
   // StrictMode's cleanup/setup and replacing one sheet with another share a guard.
   queueMicrotask(sync)
  }
 },[open,depth,historyEntry,pauseBackground])
 return depth
}

/** Track real router navigation so stale fallback entries can be skipped in either direction. */
export function OverlayHistoryTracker(){
 const location=useLocation()
 useLayoutEffect(()=>{
  routeUrl=new URL(location.pathname+location.search+location.hash,window.location.origin).href
  routeIndex=history.state?.idx??0
  if(guard&&history.state?.[marker]!==guard.id)guard=null
  queueMicrotask(sync)
  return()=>{routeUrl=null}
 },[location.key,location.pathname,location.search,location.hash])
 return null
}
