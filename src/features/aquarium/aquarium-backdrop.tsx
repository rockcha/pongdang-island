import {useEffect,useState} from 'react'
import {backgroundUrl} from './api'
import {TankBubbles} from './tank-bubbles'
import './aquarium-loading.css'

type Background={name:string;image_path:string}
export function AquariumBackdrop({background,loading=false}:{background?:Background;loading?:boolean}){
 const [shown,setShown]=useState<{current:Background;previous?:Background}|null>(null)
 const [failed,setFailed]=useState('')
 // Reduced-motion mode has no animationend; also release the old image there.
 useEffect(()=>{
  if(!shown?.previous)return
  const timer=setTimeout(()=>setShown(old=>old?.current===shown.current?{current:old.current}:old),300)
  return()=>clearTimeout(timer)
 },[shown])
 useEffect(()=>{
  if(!background)return
  let alive=true
  const next=background
  const image=new Image()
  image.onload=()=>{if(alive)setShown(old=>old?.current.image_path===next.image_path?old:{current:next,previous:old?.current})}
  image.onerror=()=>{if(alive)setFailed(next.image_path)}
  image.src=backgroundUrl(next.image_path)
  return()=>{alive=false}
 },[background?.image_path,background?.name])
 const preparing=loading||Boolean(background&&!shown&&failed!==background.image_path)
 return <>
  {shown?.previous&&<img src={backgroundUrl(shown.previous.image_path)} alt="" className="absolute inset-0 size-full object-cover"/>}
  {shown&&<img key={shown.current.image_path} src={backgroundUrl(shown.current.image_path)} alt={shown.current.name} className="aquarium-background-enter absolute inset-0 size-full object-cover" onAnimationEnd={()=>setShown(old=>old?.previous?{current:old.current}:old)}/>}
  {preparing&&<div role="status" className="aquarium-loading absolute inset-0 z-10 grid place-items-center overflow-hidden bg-background"><TankBubbles/><div className="relative flex flex-col items-center gap-3 text-primary"><img src="/branding/pongi-aquarium-loading.png" alt="" aria-hidden="true" width={480} height={480} className="h-[min(11rem,32dvh)] w-44 object-contain" draggable={false}/><span className="text-xs text-muted-foreground">어항을 준비하고 있어요…</span></div></div>}
 </>
}
