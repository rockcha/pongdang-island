import { glassAttachedSpecies } from '@/features/aquarium/glass-attached-species'
import { useEffect, useRef, useState } from 'react'
import { collectibleUrl, type Species } from './api'
import { CollectibleThumbnail } from './collectible-thumbnail'
import { mythicDetailedPaths, mythicSwimAsset, mythicSwimFrame, mythicSwimLayout } from '@/features/aquarium/mythic-swim'
import { premiumSwimFrame } from '@/features/aquarium/premium-swim-frame'
import { swimFrameLayout } from '@/features/aquarium/swim-frame-layout'
import { whitenightFixedFrame } from '@/features/aquarium/whitenight-animation'
import { cloudferryFixedFrame } from '@/features/aquarium/cloudferry-animation'
import { scrapisleFixedFrame } from '@/features/aquarium/scrapisle-animation'

export function CollectiblePreview({species}:{species:Species}) {
  if(glassAttachedSpecies.has(species.id))return <CollectibleThumbnail fadeIn path={species.thumbnail_path} name={species.name} className="size-32"/>
  return <Preview key={species.id+species.sprite_sheet_path} species={species}/>
}
function Preview({species}:{species:Species}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading')
  useEffect(()=>{
    if(!species.sprite_sheet_path)return
    const element=canvas.current,context=element?.getContext('2d')
    if(!element||!context){setStatus('failed');return}
    const enhanced=mythicSwimAsset(species.sprite_sheet_path,species.rarity)
    const path=enhanced?.path??species.sprite_sheet_path,columns=enhanced||mythicDetailedPaths.includes(path)?4:2
    const media=window.matchMedia('(prefers-reduced-motion: reduce)')
    const image=new Image()
    let alive=true,frame=0,start=0
    const ratio=Math.min(window.devicePixelRatio||1,3)
    element.width=160*ratio;element.height=160*ratio
    function draw(now:number){
      if(!alive)return
      if(!start)start=now
      if(!document.hidden){
        const time=(now-start)/1000,reduced=media.matches
        const index=scrapisleFixedFrame(species.id,time,reduced,false)??cloudferryFixedFrame(species.id,time,reduced,false)??whitenightFixedFrame(species.id,time,reduced,false)??mythicSwimFrame(path,time,0,reduced)??premiumSwimFrame(path,time,0,reduced?0:Math.floor(time*3)%4,reduced)
        const layout=mythicSwimLayout(path,index)??swimFrameLayout(path,index)
        const cellWidth=image.width/columns,cellHeight=image.height/2,size=128*layout.scale
        context!.setTransform(ratio,0,0,ratio,0,0);context!.clearRect(0,0,160,160)
        context!.drawImage(image,(index%columns)*cellWidth,Math.floor(index/columns)*cellHeight,cellWidth,cellHeight,80-layout.originX*size,80-layout.originY*size,size,size)
      }
      frame=requestAnimationFrame(draw)
    }
    image.onload=()=>{if(alive){setStatus('ready');frame=requestAnimationFrame(draw)}}
    image.onerror=()=>{if(alive)setStatus('failed')}
    image.src=enhanced?.url??collectibleUrl(path)
    return()=>{alive=false;cancelAnimationFrame(frame);image.onload=null;image.onerror=null}
  },[species])
  if(!species.sprite_sheet_path||status==='failed')return <CollectibleThumbnail fadeIn path={species.thumbnail_path} name={species.name} className="size-40"/>
  return <div className="relative size-40" aria-busy={status==='loading'}>{status==='loading'&&<div aria-hidden="true" className="absolute inset-0 rounded-xl bg-secondary/50 motion-safe:animate-pulse"/>}<canvas ref={canvas} role="img" aria-label={species.name+' 움직이는 모습'} className={'size-full transition-opacity duration-150 motion-reduce:transition-none '+(status==='ready'?'opacity-100':'opacity-0')}/></div>
}
