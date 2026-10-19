import {useEffect,useState} from 'react'
import type {CSSProperties,ReactNode} from 'react'
import './auth-frame.css'

export function AuthFrame({title,description,children}:{title:string;description:string;children:ReactNode}){
 const [height,setHeight]=useState<number|null>(null)
 useEffect(()=>{
  const viewport=window.visualViewport
  const update=()=>setHeight(viewport?.height??window.innerHeight)
  update();viewport?.addEventListener('resize',update);window.addEventListener('resize',update)
  return()=>{viewport?.removeEventListener('resize',update);window.removeEventListener('resize',update)}
 },[])
 return <section className="auth-page" data-compact={height!==null&&height<520} style={height?{'--auth-viewport-height':`${height}px`} as CSSProperties:undefined}>
  <div className="auth-topbar"><p className="auth-wordmark">퐁당섬</p></div>
  <div className="auth-panel">
   <header className="auth-intro">
    <img src="/branding/pongi-welcome.png" alt="" width={384} height={384} fetchPriority="high" className="auth-illustration"/>
    <h1 className="text-[23px] font-normal leading-8 tracking-tight">{title}</h1>
    <p className="auth-description text-xs leading-5 text-muted-foreground">{description}</p>
   </header>
   {children}
  </div>
 </section>
}
