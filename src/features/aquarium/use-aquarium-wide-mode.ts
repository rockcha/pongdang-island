import {useEffect,useRef,useState} from 'react'
import {hasOpenOverlay,useOverlayBack} from '@/components/overlay-back'
import {usePwaUpdateBlock} from '@/features/pwa/update-blockers'

type Orientation=ScreenOrientation&{lock?:(mode:'landscape')=>Promise<void>}
export function useAquariumWideMode(){
 const [active,setActive]=useState(false)
 const wanted=useRef(false),ownsFullscreen=useRef(false)
 function exit(){wanted.current=false;setActive(false)}
 useOverlayBack(active,exit,true,false)
 usePwaUpdateBlock(active)
 function enter(){
  if(wanted.current)return
  wanted.current=true
  document.documentElement.setAttribute('data-aquarium-wide','')
  setActive(true)
  // Desktop stays inside the browser; mobile can request native rotation only
  // from this user gesture. The wide layout also works if either API refuses.
  if(window.matchMedia('(pointer: coarse)').matches&&!document.fullscreenElement){
   void (async()=>{
    try{
     if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();ownsFullscreen.current=true}
     if(!wanted.current){if(ownsFullscreen.current&&document.fullscreenElement)await document.exitFullscreen();return}
     await (screen.orientation as Orientation)?.lock?.('landscape')
    }catch{/* Keep the usable browser layout and manual rotation hint. */}
   })()
  }
 }
 useEffect(()=>{
  if(!active)return
  const root=document.getElementById('root'),wasInert=root?.inert
  const overflow=document.body.style.overflow
  if(root)root.inert=true
  document.body.style.overflow='hidden'
  const fullscreen=()=>{if(ownsFullscreen.current&&!document.fullscreenElement)exit()}
  const key=(event:KeyboardEvent)=>{if(!event.defaultPrevented&&event.key==='Escape'&&!hasOpenOverlay()){event.preventDefault();exit()}}
  document.addEventListener('fullscreenchange',fullscreen)
  window.addEventListener('keydown',key)
  return()=>{
   wanted.current=false
   if(root)root.inert=wasInert??false
   document.body.style.overflow=overflow
   document.documentElement.removeAttribute('data-aquarium-wide')
   document.removeEventListener('fullscreenchange',fullscreen);window.removeEventListener('keydown',key)
   if(ownsFullscreen.current&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{})
   ownsFullscreen.current=false
   try{screen.orientation?.unlock?.()}catch{/* Not all browsers expose orientation control. */}
   window.dispatchEvent(new Event('aquarium-wide-change'))
   requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('[data-wide-trigger]')?.focus({preventScroll:true}))
  }
 },[active])
 return {active,enter,exit}
}
