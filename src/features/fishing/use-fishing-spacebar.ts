import {useEffect,useRef} from 'react'
import type {RefObject} from 'react'

type Controls={active:boolean;onStart?:()=>void;onHold:()=>void;onRelease:()=>void}
export function useFishingSpacebar(buttonRef:RefObject<HTMLButtonElement|null>,controls:Controls){
 const latest=useRef(controls)
 latest.current=controls
 useEffect(()=>{
  let down=false,holding=false
  const release=()=>{down=false;if(holding){holding=false;latest.current.onRelease()}}
  const keyDown=(event:KeyboardEvent)=>{
   if(event.code!=='Space'||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return
   const button=buttonRef.current,target=event.target
   if(!button||button.disabled||document.hidden||button.closest('[hidden],[inert],[aria-hidden="true"]'))return
   if(document.querySelector('[role="dialog"],[role="alertdialog"],dialog[open]'))return
   if(target instanceof HTMLElement&&target!==button&&(target.isContentEditable||target.closest('input,textarea,select,button,a,[role="button"],[role="textbox"],[contenteditable]:not([contenteditable="false"])')))return
   event.preventDefault()
   if(down||event.repeat)return
   down=true
   if(latest.current.active){holding=true;latest.current.onHold()}
   else latest.current.onStart?.()
  }
  const keyUp=(event:KeyboardEvent)=>{if(event.code==='Space'&&down){event.preventDefault();release()}}
  const visibility=()=>{if(document.hidden)release()}
  window.addEventListener('keydown',keyDown)
  window.addEventListener('keyup',keyUp)
  window.addEventListener('blur',release)
  document.addEventListener('visibilitychange',visibility)
  return()=>{
   window.removeEventListener('keydown',keyDown)
   window.removeEventListener('keyup',keyUp)
   window.removeEventListener('blur',release)
   document.removeEventListener('visibilitychange',visibility)
   release()
  }
 },[buttonRef])
}
