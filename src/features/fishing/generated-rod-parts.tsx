import {memo} from 'react'
import {pointOnRodCurve,type RodCurve} from './rod-line-guides'

const rods=new Set(['loveletter','hologram','galaxy','hangang','pharaoh','firefly','mechsanctum','plunder','mukhyang','whitenight','scrapisle','nyamnyam'])
const assetRoot='/fishing/equipment/painted-rods-v1'
type Part='frame'|'rotor'|'float'|'grip'
const sizes:Record<Part,{x:number;y:number;w:number;h:number}>={
 frame:{x:-32,y:-32,w:64,h:64},
 rotor:{x:-23,y:-23,w:46,h:46},
 float:{x:-17,y:-18,w:34,h:34},
 grip:{x:-9,y:-23,w:18,h:46},
}

export function hasGeneratedRod(id?:string){return !!id&&rods.has(id)}
export function generatedRodAsset(id:string,part:Part|'shaft'|'thumbnail'){return `${assetRoot}/${id}/${part}.webp`}

export const GeneratedRodPart=memo(function GeneratedRodPart({id,part,rotation=0,edgeTilt=0}:{id:string;part:Part;rotation?:number;edgeTilt?:number}){
 const {x,y,w,h}=sizes[part]
 const transform=part==='grip'?'translate(6 21) rotate(-27)':part==='float'&&edgeTilt?`rotate(${edgeTilt} 0 -12)`:undefined
 return <g {...{[`data-skin-${part}`]:id}} data-generated-rod-part={part} transform={transform}>
  <image href={generatedRodAsset(id,part)} x={x} y={y} width={w} height={h}/>
  {id==='mechsanctum'&&part==='frame'&&<image href={generatedRodAsset(id,'rotor')} x="-8" y="-8" width="16" height="16" transform={`translate(21 13) rotate(${-rotation*1.5})`}/>}
 </g>
})

// Draw adjacent slices of the same painted strip along the live bend.
export function GeneratedRodShaft({id,curve}:{id:string;curve:RodCurve}){
 const slices=16, textureWidth=320,textureHeight=24
 const image=generatedRodAsset(id,'shaft')
 return <g data-skin-shaft={id} data-equipped-rod={id} data-generated-rod-part="shaft">
  {Array.from({length:slices},(_,index)=>{
   const start=pointOnRodCurve(curve,index/slices),end=pointOnRodCurve(curve,(index+1)/slices)
   const dx=end.x-start.x,dy=end.y-start.y
   const length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI
   const height=8.4-4.9*index/(slices-1)
   const segment=textureWidth/slices
   return <svg key={index} x="0" y={-height/2} width={length+.8} height={height} viewBox={`${index*segment} 0 ${segment} ${textureHeight}`}
    transform={`translate(${start.x} ${start.y}) rotate(${angle})`} preserveAspectRatio="none" overflow="hidden">
    <image href={image} width={textureWidth} height={textureHeight} preserveAspectRatio="none"/>
   </svg>
  })}
 </g>
}
