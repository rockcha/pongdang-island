import { useEffect, useRef } from 'react'
import { collectibleUrl } from '@/features/collection/api'
import type { OwnedCollectible } from '@/features/collection/api'
export function TankInhabitants({items}:{items:OwnedCollectible[]}){
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const layer=root.current
  if(!layer)return
  let frame=0
  const start=performance.now()
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)')
  function draw(now:number){
   if(!layer)return
   const time=reduced.matches?0:(now-start)/1000
   const width=layer.clientWidth,height=layer.clientHeight
   items.forEach((item,index)=>{
    const node=layer.children[index] as HTMLElement|undefined
    if(!node)return
    const s=item.species,seed=item.animation_seed/1000000
    const size=Math.min(s.size,width*.4)
    let x:number,y:number,direction=1,rotation=0
    if(s.kind==='structure'){x=(item.position_x??(.2+seed*.6))*(width-size);y=(item.position_y??.86)*(height-size)}
    else{
     const phase=(time*Number(s.speed)+seed*2)%2
     direction=phase<1?1:-1
     x=(phase<1?phase:2-phase)*(width-size)
     const low=Number(s.swim_y_min),high=Number(s.swim_y_max)
     y=(low+(high-low)*(0.5+0.5*Math.sin(time*.35+seed*Math.PI*2)))*(height-size)
     if(s.kind==='trash')rotation=time*25+seed*360
    }
    node.style.width=`${size}px`;node.style.height=`${size}px`
    node.style.transform=`translate(${x}px,${y}px) rotate(${rotation}deg)`
    const facing=node.firstElementChild as HTMLElement
    if(facing)facing.style.transform=s.kind==='fish'?`scaleX(${direction})`:''
    const sheet=node.querySelector<HTMLElement>('[data-fish-sheet]')
    if(sheet){
     const current=Math.floor(time*5+seed*4)%4
     sheet.style.backgroundPosition=`${(current%2)*100}% ${Math.floor(current/2)*100}%`
    }
   })
   if(!reduced.matches)frame=requestAnimationFrame(draw)
  }
  draw(start)
  const observer=new ResizeObserver(()=>{if(reduced.matches)draw(start)})
  observer.observe(layer)
  const change=()=>{cancelAnimationFrame(frame);draw(performance.now())}
  reduced.addEventListener('change',change)
  return()=>{cancelAnimationFrame(frame);observer.disconnect();reduced.removeEventListener('change',change)}
 },[items])
 return <div ref={root} className="pointer-events-none absolute inset-0 overflow-hidden" aria-label={`어항 속 개체 ${items.length}개`}>{items.map(item=><div key={item.id} className="absolute left-0 top-0" role="img" aria-label={item.species.name}><div className="relative h-full w-full">{item.species.kind==='fish'&&item.species.sprite_sheet_path?<div data-fish-sheet aria-hidden="true" className="absolute inset-0" style={{backgroundImage:`url("${collectibleUrl(item.species.sprite_sheet_path)}")`,backgroundSize:'200% 200%',backgroundRepeat:'no-repeat',backgroundPosition:'0% 0%'}}/>:<img src={collectibleUrl(item.species.thumbnail_path)} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain"/>}</div></div>)}</div>
}
