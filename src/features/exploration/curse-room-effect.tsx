import {useEffect,useState,type CSSProperties} from 'react'
import {createPortal} from 'react-dom'
import './curse-room-effect.css'

export function CurseRoomEffect({lost}:{lost:boolean}){
 const [visible,setVisible]=useState(lost)
 useEffect(()=>{
  if(!lost){setVisible(false);return}
  setVisible(true)
  const timer=setTimeout(()=>setVisible(false),1400)
  return()=>clearTimeout(timer)
 },[lost])
 if(!lost||!visible)return null
 return createPortal(<div className="exploration-curse-effect" aria-hidden="true">
  <div className="curse-absorption-aura"/>
  <svg className="curse-absorption-seal" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.2">
   <circle cx="100" cy="100" r="78" strokeDasharray="36 9 2 9"/><circle cx="100" cy="100" r="65" opacity=".45"/>
   <path d="M100 34v16m0 100v16M34 100h16m100 0h16m-18-48-9 9m-78 78-9 9m96 0-9-9M61 61l-9-9"/>
   <path d="M100 103c-38-22-16-55 0-43 16-12 38 21 0 43Zm0 0v43m-23-27h46" strokeWidth="2"/>
  </svg>
  <div className="curse-absorption-wisps">{Array.from({length:12},(_,index)=><i key={index} style={{'--curse-x':`${(index%2?-1:1)*(30+index%3*9)}vw`,'--curse-y':`${(Math.floor(index/2)%3-1)*27}vh`,'--curse-delay':`${index*24}ms`} as CSSProperties}/>)}</div>
 </div>,document.body)
}
