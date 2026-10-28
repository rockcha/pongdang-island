import {useEffect,useRef,useState} from 'react'
import {rarities} from '@/lib/game/rarity'
import {paintCatchMoment,type CatchMomentArt} from './moment-art'
import {limitedCollectionEvent} from '@/features/collection/limited-events'
import {collectibleUrl} from '@/features/collection/api'
import {optimizedThumbnailUrl} from '@/features/collection/thumbnail-art'
import {catchMomentTheme} from './moment-theme'
import {RelicIcon} from '@/components/collection-filter-icons'

type MomentProps=CatchMomentArt&{lazy?:boolean;onReadyChange?:(ready:boolean)=>void}
export function CatchMoment(props:MomentProps){
 return <MomentArtwork key={`${props.species.id}:${props.species.thumbnail_path}`} {...props}/>
}
function MomentArtwork({species,firstDiscovery=false,practice=false,preview=false,regionName,caughtAt,renderVersion=1,lazy=false,onReadyChange}:MomentProps){
 const canvas=useRef<HTMLCanvasElement>(null),[state,setState]=useState<'loading'|'ready'|'failed'>('loading'),[retry,setRetry]=useState(0)
 const container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(!lazy)
 const readyCallback=useRef(onReadyChange);readyCallback.current=onReadyChange
 const [original,setOriginal]=useState(false),[fallbackReady,setFallbackReady]=useState(false),[fallbackFailed,setFallbackFailed]=useState(false)
 const originalUrl=collectibleUrl(species.thumbnail_path),fallbackUrl=original?originalUrl:optimizedThumbnailUrl(species.thumbnail_path,'large')??originalUrl
 const theme=catchMomentTheme(species,regionName)
 useEffect(()=>{
  if(visible||!lazy)return
  if(typeof IntersectionObserver==='undefined'){setVisible(true);return}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'200px'})
  if(container.current)observer.observe(container.current)
  return()=>observer.disconnect()
 },[lazy,visible])
 useEffect(()=>{
  if(!visible)return
  let alive=true;setState('loading');setOriginal(false);setFallbackReady(false);setFallbackFailed(false);readyCallback.current?.(false)
  if(canvas.current)void paintCatchMoment(canvas.current,{species,firstDiscovery,practice,preview,regionName,caughtAt,renderVersion},lazy?720:1080).then(()=>{if(alive){setState('ready');readyCallback.current?.(true)}}).catch(()=>{if(alive)setState('failed')})
  return()=>{alive=false}
 },[species,firstDiscovery,practice,preview,regionName,caughtAt,renderVersion,lazy,visible,retry])
 function fallbackLoaded(){setFallbackReady(true);readyCallback.current?.(true)}
 function fallbackError(){
  if(!original&&fallbackUrl!==originalUrl){setOriginal(true);setFallbackReady(false);return}
  setFallbackFailed(true);setFallbackReady(false);readyCallback.current?.(false)
 }
 return <div ref={container} data-catch-moment aria-busy={state==='loading'||(state==='failed'&&!fallbackReady&&!fallbackFailed)} className="relative aspect-square w-full shrink-0 overflow-hidden" style={{backgroundColor:theme.background}}>
  <canvas ref={canvas} width={1} height={1} aria-hidden="true" className={`size-full object-contain ${state==='ready'?lazy?'':'catch-center-figure':'opacity-0'}`}/>
  <div role="status" className="sr-only"><span>{rarities[species.rarity].label}</span>{limitedCollectionEvent(species.id)&&<span>{limitedCollectionEvent(species.id)!.label} 한정</span>}<span>{species.name}</span><span>{species.description}</span>{firstDiscovery&&!practice&&<span aria-label="첫 발견">NEW</span>}{regionName&&<span>{regionName}</span>}</div>
  {state!=='ready'&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center" style={{color:theme.text}}>
   <div className="grid h-[55%] w-4/5 place-items-center">
    {state==='failed'&&!fallbackFailed?<img key={fallbackUrl} src={fallbackUrl} alt={species.name} className="size-full object-contain" onLoad={fallbackLoaded} onError={fallbackError}/>:<span className="size-16 animate-pulse rounded-full bg-current opacity-10 motion-reduce:animate-none" aria-hidden="true"/>}
   </div>
   <span className="rounded bg-current/10 px-2 py-1 text-xs">{rarities[species.rarity].label}</span>
   <strong className="text-balance text-lg">{species.kind==='relic'&&<span role="img" aria-label="유물" className="mr-1.5 inline-flex align-middle"><RelicIcon className="size-[1em] shrink-0"/></span>}{species.name}</strong>
   {species.description&&<p className="line-clamp-2 text-xs leading-5" style={{color:theme.muted}}>{species.description}</p>}
   {state==='loading'?<p className="text-xs" style={{color:theme.metadata}}>바다의 순간을 준비하는 중…</p>:<div className="text-xs" style={{color:theme.metadata}}>
    <p>{fallbackReady?'기본 이미지로 표시하고 있어요.':fallbackFailed?'이미지를 불러오지 못했어요.':'물고기를 불러오는 중…'}</p>
    <button type="button" onClick={()=>setRetry(v=>v+1)} className="pointer-events-auto relative mt-2 min-h-11 rounded-lg border border-current/25 px-4">다시 불러오기</button>
   </div>}
  </div>}
 </div>
}
