import {ImageLoadingSpinner} from '@/components/image-loading-spinner'
import {sharedDecorationFrame} from '@/features/aquarium/shared-decoration-animation'
import { glassAttachedSpecies } from '@/features/aquarium/glass-attached-species'
import { useEffect, useRef, useState } from 'react'
import { collectibleUrl, type Species } from './api'
import { CollectibleThumbnail } from './collectible-thumbnail'
import { mythicSheetColumns, mythicSwimAsset, mythicSwimFrame, mythicSwimLayout } from '@/features/aquarium/mythic-swim'
import { premiumSwimFrame } from '@/features/aquarium/premium-swim-frame'
import { swimFrameLayout } from '@/features/aquarium/swim-frame-layout'
import { whitenightFixedFrame } from '@/features/aquarium/whitenight-animation'
import { cloudferryFixedFrame } from '@/features/aquarium/cloudferry-animation'
import { scrapisleFixedFrame } from '@/features/aquarium/scrapisle-animation'
import { dreamabyssFixedFrame } from '@/features/aquarium/dreamabyss-animation'

export function CollectiblePreview({species,large=false}:{species:Species;large?:boolean}) {
  if(glassAttachedSpecies.has(species.id))return <CollectibleThumbnail fadeIn path={species.thumbnail_path} name={species.name} className={large?"aspect-square w-full max-w-64":"size-32"}/>
  return <Preview key={species.id+species.sprite_sheet_path} species={species} large={large}/>
}
function Preview({species,large=false}:{species:Species;large?:boolean}) {
  const viewport=large?320:160
  const canvas=useRef<HTMLCanvasElement>(null)
  const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading')
  useEffect(()=>{
    if(!species.sprite_sheet_path)return
    const element=canvas.current,context=element?.getContext('2d')
    if(!element||!context){setStatus('failed');return}
    const enhanced=mythicSwimAsset(species.sprite_sheet_path,species.rarity)
    const path=enhanced?.path??species.sprite_sheet_path,columns=mythicSheetColumns(path)
    const media=window.matchMedia('(prefers-reduced-motion: reduce)')
    const image=new Image()
    let alive=true,frame=0,start=0,loaded=false,onScreen=true,lastFrame=-1
    let timer:ReturnType<typeof setTimeout>|undefined
    const ratio=Math.min(window.devicePixelRatio||1,2)
    element.width=viewport*ratio;element.height=viewport*ratio
    const allowed=()=>alive&&loaded&&onScreen&&!document.hidden
    const stop=()=>{cancelAnimationFrame(frame);clearTimeout(timer);frame=0;timer=undefined}
    const sync=()=>{stop();lastFrame=-1;if(allowed())frame=requestAnimationFrame(draw)}
    function draw(now:number){
      frame=0
      if(!allowed())return
      if(!start)start=now
      const time=(now-start)/1000,reduced=media.matches
      const index=sharedDecorationFrame(species.id,time,reduced,false)??dreamabyssFixedFrame(species.id,time,reduced,false)??scrapisleFixedFrame(species.id,time,reduced,false)??cloudferryFixedFrame(species.id,time,reduced,false)??whitenightFixedFrame(species.id,time,reduced,false)??mythicSwimFrame(path,time,0,reduced)??premiumSwimFrame(path,time,0,reduced?0:Math.floor(time*3)%4,reduced)
      if(index!==lastFrame){
        lastFrame=index
        const layout=mythicSwimLayout(path,index)??swimFrameLayout(path,index)
        const cellWidth=image.width/columns,cellHeight=image.height/2,size=viewport*.8*layout.scale
        context!.setTransform(ratio,0,0,ratio,0,0);context!.clearRect(0,0,viewport,viewport)
        context!.drawImage(image,(index%columns)*cellWidth,Math.floor(index/columns)*cellHeight,cellWidth,cellHeight,viewport/2-layout.originX*size,viewport/2-layout.originY*size,size,size)
      }
      // Sheets change only a few times per second; avoid repainting on every refresh.
      if(!media.matches)timer=setTimeout(()=>{if(allowed())frame=requestAnimationFrame(draw)},1000/15)
    }
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{onScreen=entries[0]?.isIntersecting??true;sync()})
    observer?.observe(element)
    document.addEventListener('visibilitychange',sync);media.addEventListener?.('change',sync)
    image.onload=()=>{if(alive){loaded=true;setStatus('ready');sync()}}
    image.onerror=()=>{if(alive)setStatus('failed')}
    image.src=enhanced?.url??collectibleUrl(path)
    return()=>{alive=false;stop();observer?.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener?.('change',sync);image.onload=null;image.onerror=null}
  },[species.id,species.sprite_sheet_path,species.rarity,viewport])
  if(!species.sprite_sheet_path||status==='failed')return <CollectibleThumbnail fadeIn path={species.thumbnail_path} name={species.name} className={large?"aspect-square w-full max-w-80":"size-40"}/>
  return <div className={large?'relative aspect-square':'relative size-40'} style={large?{width:viewport,maxWidth:'100%'}:undefined} aria-busy={status==='loading'}>{status==='loading'&&<ImageLoadingSpinner/>}<canvas ref={canvas} role="img" aria-label={species.name+' 움직이는 모습'} className={'size-full transition-opacity duration-150 motion-reduce:transition-none '+(status==='ready'?'opacity-100':'opacity-0')}/></div>
}
