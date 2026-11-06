import {FlipHorizontal2,RotateCw,Coins} from 'lucide-react'
import {farmResalePrice} from './resale'
import {useLayoutEffect,useState,type RefObject} from 'react'
import {canRotateFarmObject,canFlipFarmObject,objectFootprint,MAP_W,TILE,type TopviewObject} from './topview-model'
export function FarmObjectOrientationControls({object,onRotate,onFlip,onSell,saleReason,viewport,map}:{object:TopviewObject;onRotate:()=>void;onFlip:()=>void;onSell?:()=>void;saleReason?:string|null;viewport:RefObject<HTMLDivElement|null>;map:RefObject<SVGSVGElement|null>}){
 const rotate=canRotateFarmObject(object.kind),flip=canFlipFarmObject(object.kind),size=objectFootprint(object),width=onSell?192:rotate&&flip?142:86
 const [left,setLeft]=useState<number|null>(null)
 useLayoutEffect(()=>{
  const container=viewport.current,svg=map.current;if(!container||!svg)return
  const update=()=>{const bounds=svg.getBoundingClientRect(),view=container.getBoundingClientRect(),scale=bounds.width/((MAP_W+4)*TILE);if(!scale)return;const min=(view.left+8-bounds.left)/scale-2*TILE,max=(view.right-8-bounds.left)/scale-2*TILE-width;setLeft(Math.max(min,Math.min(max,(object.x+size.w/2)*TILE-width/2)))}
  update();container.addEventListener('scroll',update);window.addEventListener('resize',update)
  const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(update);observer?.observe(svg)
  return()=>{container.removeEventListener('scroll',update);window.removeEventListener('resize',update);observer?.disconnect()}
 },[object.x,object.y,size.w,width,viewport,map])
 if(!rotate&&!flip)return null
 const x=left??Math.max(-60,Math.min(MAP_W*TILE+60-width,(object.x+size.w/2)*TILE-width/2)),y=(object.y+size.h)*TILE+5
 return <foreignObject x={x} y={y} width={width} height={42} overflow="visible" data-object-actions={object.id} onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
  <div className="farm-object-quick-actions" role="group" aria-label="개체 방향 조절">
   {rotate&&<button onClick={onRotate} aria-label={'다리 90도 회전'} title="회전"><RotateCw size={14}/><span>회전</span></button>}
   {onSell&&<button onClick={onSell} disabled={!!saleReason} title={saleReason??'구매가의 절반으로 판매'} aria-label="동물 반값 판매"><Coins size={14}/><span>+{farmResalePrice(object.kind).toLocaleString()} G</span></button>}
   {flip&&<button onClick={onFlip} aria-label="좌우반전" aria-pressed={!!object.flipped} title="좌우반전"><FlipHorizontal2 size={14}/><span>좌우반전</span></button>}
  </div>
 </foreignObject>
}
