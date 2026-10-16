import { useEffect,useRef,useState } from 'react'
import type { CatalogEntry } from '@/features/collection/api'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'

export function NativeSpeciesCarousel({items,onSelect}:{items:CatalogEntry[];onSelect:(item:CatalogEntry)=>void}){
 const viewport=useRef<HTMLDivElement>(null),group=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState({loop:false,width:0})
 useEffect(()=>{
  const view=viewport.current,content=group.current
  if(!view||!content)return
  const measure=()=>{
   const width=content.scrollWidth,loop=view.clientWidth>0&&width-8>view.clientWidth
   setSize(previous=>previous.loop===loop&&previous.width===width?previous:{loop,width})
  }
  measure()
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure)
  observer?.observe(view);observer?.observe(content)
  window.addEventListener('resize',measure)
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure)}
 },[items.length])
 const cards=(duplicate=false)=>items.map(item=><button key={item.id} tabIndex={duplicate?-1:undefined} aria-label={item.discovered?`${item.name} 살펴보기`:'미발견 개체'} onClick={()=>onSelect(item)} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white">
  <span className={item.discovered?'':'brightness-0 opacity-50'}><CollectibleThumbnail path={item.thumbnail_path} name={item.discovered?item.name:'미발견 개체'} className="size-10"/></span>
 </button>)
 return <div ref={viewport} role="group" aria-label="이 바다의 특별한 개체 미리보기" data-looping={size.loop} className="native-species-carousel overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  <div className={`flex w-max ${size.loop?'native-species-carousel-track':''}`} style={{animationDuration:`${Math.max(1,size.width/24)}s`}}>
   <div ref={group} className="flex w-max shrink-0 gap-2 pr-2">{cards()}</div>
   {size.loop&&<div aria-hidden="true" className="native-species-carousel-copy flex w-max shrink-0 gap-2 pr-2">{cards(true)}</div>}
  </div>
 </div>
}
