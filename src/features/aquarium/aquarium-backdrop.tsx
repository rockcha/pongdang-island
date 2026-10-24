import {useEffect,useMemo,useState} from 'react'
import {backgroundUrl} from './api'
import {TankBubbles} from './tank-bubbles'
import './aquarium-loading.css'

type Background={name:string;image_path:string;url?:string}
export function AquariumBackdrop({background,loading=false,panorama}:{background?:Background;loading?:boolean;panorama?:{src:string;view:number}}){
 const name=background?.name,path=panorama?.src??background?.image_path,url=panorama?.src??background?.url
 const desired=useMemo(()=>name!==undefined&&path!==undefined?{name,image_path:path,url}:undefined,[name,path,url])
 const [shown,setShown]=useState<{current:Background;previous?:Background}|null>(null)
 const [failed,setFailed]=useState('')
 // Reduced-motion mode has no animationend; also release the old image there.
 useEffect(()=>{
  if(!shown?.previous)return
  const timer=setTimeout(()=>setShown(old=>old?.current===shown.current?{current:old.current}:old),300)
  return()=>clearTimeout(timer)
 },[shown])
 useEffect(()=>{
  if(!desired)return
  let alive=true
  const next=desired
  const image=new Image()
  image.onload=()=>{if(alive)setShown(old=>old?.current.image_path===next.image_path?old:{current:next,previous:old?.current})}
  image.onerror=()=>{if(alive)setFailed(next.image_path)}
  image.src=next.url??backgroundUrl(next.image_path)
  return()=>{alive=false}
 },[desired])
 const preparing=loading||Boolean(desired&&!shown&&failed!==desired.image_path)
 const imageClass=(image:Background)=>image.url?'absolute inset-y-0 left-0 h-full w-[300%] max-w-none object-cover':'absolute inset-0 size-full object-cover'
 const imageStyle=(image:Background)=>image.url?{transform:`translateX(${-(panorama?.view??1)*100/3}%)`}:undefined
 return <>
  {shown?.previous&&<img src={shown.previous.url??backgroundUrl(shown.previous.image_path)} alt="" className={imageClass(shown.previous)} style={imageStyle(shown.previous)}/>}
  {shown&&<img key={shown.current.image_path} src={shown.current.url??backgroundUrl(shown.current.image_path)} alt={shown.current.name} className={`aquarium-background-enter ${imageClass(shown.current)}`} style={imageStyle(shown.current)} onAnimationEnd={()=>setShown(old=>old?.previous?{current:old.current}:old)}/>}
  {preparing&&<div role="status" className="aquarium-loading absolute inset-0 z-10 grid place-items-center overflow-hidden bg-background"><TankBubbles/><div className="relative flex flex-col items-center gap-3 text-primary"><img src="/branding/pongi-aquarium-loading.png" alt="" aria-hidden="true" width={480} height={480} className="h-[min(11rem,32dvh)] w-44 object-contain" draggable={false}/><span className="text-xs text-muted-foreground">어항을 준비하고 있어요…</span></div></div>}
 </>
}
