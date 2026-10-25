import {useContext,useEffect,useLayoutEffect,useMemo,useState} from 'react'
import {backgroundUrl} from './api'
import {AquariumLoading} from './aquarium-loading'
import {TankLoadingContext} from './tank-loading-context'
import './aquarium-loading.css'

type Background={name:string;image_path:string;url?:string}
export function AquariumBackdrop({background,loading=false,panorama}:{background?:Background;loading?:boolean;panorama?:{src:string;view:number;zoom?:number;fixedViewport?:boolean;heightRatio?:number;y?:number}}){
 const report=useContext(TankLoadingContext)
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
  const timer=setTimeout(()=>{if(alive)setFailed(next.image_path)},15000)
  const show=()=>{if(alive){clearTimeout(timer);setFailed('');setShown(old=>old?.current.image_path===next.image_path?old:{current:next,previous:old?.current})}}
  image.onload=()=>{if(image.decode)void image.decode().then(show).catch(()=>{if(alive){clearTimeout(timer);setFailed(next.image_path)}});else show()}
  image.onerror=()=>{if(alive){clearTimeout(timer);setFailed(next.image_path)}}
  image.src=next.url??backgroundUrl(next.image_path)
  return()=>{alive=false;clearTimeout(timer);image.onload=null;image.onerror=null}
 },[desired])
 useLayoutEffect(()=>{report?.(loading?'loading':desired&&failed===desired.image_path?'failed':desired&&shown?.current.image_path!==desired.image_path?'loading':'ready')},[loading,desired,failed,shown?.current.image_path,report])
 const preparing=loading||Boolean(desired&&!shown&&failed!==desired.image_path)
 const imageClass=(image:Background)=>image.url?'absolute inset-y-0 left-0 h-full w-[300%] max-w-none object-fill':'absolute inset-0 size-full object-cover'
 const imageStyle=(image:Background)=>image.url?{width:`${300*(panorama?.zoom??1)}%`,...(panorama?.fixedViewport?{height:`${100*1.6*(panorama.zoom??1/3)/(panorama.heightRatio??1.6/3)}%`}:{}),transform:`translate(${-(panorama?.view??1)*100/3}%,${panorama?.fixedViewport?-(panorama.y??0)/1.6*100:0}%)`}:undefined
 return <>
  {shown?.previous&&<img src={shown.previous.url??backgroundUrl(shown.previous.image_path)} alt="" className={imageClass(shown.previous)} style={imageStyle(shown.previous)}/>}
  {shown&&<img key={shown.current.image_path} src={shown.current.url??backgroundUrl(shown.current.image_path)} alt={shown.current.name} className={`${report?'':'aquarium-background-enter'} ${imageClass(shown.current)}`} style={imageStyle(shown.current)} onAnimationEnd={()=>setShown(old=>old?.previous?{current:old.current}:old)}/>}
  {!report&&preparing&&<AquariumLoading/>}
 </>
}
