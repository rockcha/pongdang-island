import {useEffect,useState} from 'react'
import {collectibleUrl} from './api'
import type {Species} from './api'
import {NativeRegionBadge} from './native-region-badge'

// Remember successes across filters and dialog reopening; retain no image objects.
const loadedUrls=new Set<string>()
function remember(url:string){loadedUrls.delete(url);loadedUrls.add(url);if(loadedUrls.size>256)loadedUrls.delete(loadedUrls.values().next().value!)}
type Props={path:string;name:string;className?:string;fadeIn?:boolean;loading?:'lazy'|'eager';species?:Pick<Species,'is_native'|'native_region_id'>}
export function CollectibleThumbnail({path,...props}:Props){
 const url=collectibleUrl(path)
 return <ThumbnailImage key={url} url={url} {...props}/>
}
function ThumbnailImage({url,name,className='size-16',species,fadeIn=true,loading='eager'}:Omit<Props,'path'>&{url:string}){
 const [loaded,setLoaded]=useState(()=>loadedUrls.has(url))
 const [failed,setFailed]=useState(false)
 const [attempt,setAttempt]=useState(0)
 const unavailable=failed&&attempt===1
 useEffect(()=>{
  if(!failed||attempt!==0)return
  const timer=setTimeout(()=>{setFailed(false);setAttempt(1)},800)
  return()=>clearTimeout(timer)
 },[failed,attempt])
 const src=attempt?`${url}${url.includes('?')?'&':'?'}retry=1`:url
 function ready(){remember(url);setLoaded(true);setFailed(false)}
 return <span className={`${className} relative inline-flex shrink-0`} aria-busy={!loaded&&!unavailable}>
  {!loaded&&!unavailable&&<span aria-hidden="true" className="absolute inset-0 rounded-lg bg-secondary/50 motion-safe:animate-pulse"/>}
  {unavailable?<img src="/fallback-image.svg" alt={`${name} 이미지 없음`} className="size-full rounded-lg object-contain"/>:<img key={attempt} src={src} alt={name} loading={loading} decoding="async" draggable={false} className={`size-full object-contain ${fadeIn?'transition-opacity duration-150 motion-reduce:transition-none':''} ${loaded?'opacity-100':'opacity-0'}`} ref={image=>{if(image?.complete&&image.naturalWidth>0&&!loaded)ready()}} onLoad={ready} onError={()=>{loadedUrls.delete(url);setLoaded(false);setFailed(true)}}/>}
  {species&&<NativeRegionBadge species={species}/>}
 </span>
}
