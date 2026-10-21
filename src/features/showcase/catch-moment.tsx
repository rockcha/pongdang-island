import {useEffect,useRef,useState} from 'react'
import {rarities} from '@/lib/game/rarity'
import {paintCatchMoment,type CatchMomentArt} from './moment-art'

export function CatchMoment({species,firstDiscovery=false,practice=false,preview=false,regionName,caughtAt,renderVersion=1,lazy=false}:CatchMomentArt&{lazy?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),[state,setState]=useState<'loading'|'ready'|'failed'>('loading'),[retry,setRetry]=useState(0)
 const container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(!lazy)
 useEffect(()=>{
  if(visible||!lazy)return
  if(typeof IntersectionObserver==='undefined'){setVisible(true);return}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'200px'})
  if(container.current)observer.observe(container.current)
  return()=>observer.disconnect()
 },[lazy,visible])
 useEffect(()=>{
  if(!visible)return
  let alive=true;setState('loading')
  if(canvas.current)void paintCatchMoment(canvas.current,{species,firstDiscovery,practice,preview,regionName,caughtAt,renderVersion},lazy?720:1080).then(()=>{if(alive)setState('ready')}).catch(()=>{if(alive)setState('failed')})
  return()=>{alive=false}
 },[species,firstDiscovery,practice,preview,regionName,caughtAt,renderVersion,lazy,visible,retry])
 return <div ref={container} data-catch-moment className="relative aspect-square w-full shrink-0 overflow-hidden bg-[#101b2a]">
  <canvas ref={canvas} width={1} height={1} aria-hidden="true" className={`size-full object-contain ${state==='ready'?lazy?'':'catch-center-figure':'opacity-0'}`}/>
  <div role="status" className="sr-only"><span>{rarities[species.rarity].label}</span><span>{species.name}</span><span>{species.description}</span>{firstDiscovery&&!practice&&<span aria-label="첫 발견">NEW</span>}{regionName&&<span>{regionName}</span>}</div>
  {state==='loading'&&<p className="absolute inset-0 grid place-items-center text-xs text-white/60">바다의 순간을 준비하는 중…</p>}
  {state==='failed'&&<p className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center text-xs text-white/80"><span>이미지를 불러오지 못했어요.</span><button type="button" onClick={()=>setRetry(v=>v+1)} className="pointer-events-auto relative min-h-11 rounded-lg border border-white/25 px-4">다시 불러오기</button></p>}
 </div>
}
