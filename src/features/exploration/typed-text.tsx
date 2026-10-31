import {useEffect,useState} from 'react'

/** Keep one complete accessible sentence while the visual text catches up. */
export function TypedText({text,animate=true}:{text:string;animate?:boolean}){
 const [frame,setFrame]=useState({text:'',count:0})
 const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches
 useEffect(()=>{
  if(!animate||reduced)return
  const started=performance.now()
  const duration=Math.min(1100,Math.max(280,Array.from(text).length*22))
  const timer=setInterval(()=>{
   const progress=Math.min(1,(performance.now()-started)/duration)
   setFrame({text,count:Math.ceil(Array.from(text).length*progress)})
   if(progress===1)clearInterval(timer)
  },16)
  return()=>clearInterval(timer)
 },[text,animate,reduced])
 if(!animate||reduced)return <>{text}</>
 const visible=Array.from(text).slice(0,frame.text===text?frame.count:0).join('')
 return <><span className="sr-only">{text}</span><span aria-hidden="true">{visible}</span></>
}
