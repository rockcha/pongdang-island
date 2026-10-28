import {useState,type ReactNode} from 'react'
import {collectibleUrl} from '@/features/collection/api'
import artwork from './rod-artwork.json'

// Origins are the artwork's axle/body center, independent of the game's transforms.
const partArtwork=artwork as Record<string,{frame:number;rotor:number;float:number;rotorWidth:number;rotorX?:number}>
export function hasRodImages(id?:string){return !!id&&Object.hasOwn(partArtwork,id)}
export function rodImagePath(id:string,file:string){return `equipment/rods/${id==='basic'?'starter':id==='swift'?'swift-v2':id}/${file}.png`}
export function rodThumbnailUrl(id:string){return collectibleUrl(rodImagePath(id,'thumbnail'))}
export function RodPartImage({id,part,fallback}:{id:string;part:'frame'|'rotor'|'float';fallback:ReactNode}){
 const [failed,setFailed]=useState(false)
 const spec=partArtwork[id]
 if(failed||!spec)return fallback
 const width=part==='float'?34:part==='frame'?84:spec.rotorWidth
 const file=part==='float'?'float':`reel-${part}`
 return <g {...{[`data-skin-${part}`]:id}}><image
  href={collectibleUrl(rodImagePath(id,file))}
  x={-width*(part==='rotor'?(spec.rotorX??.5):.5)} y={-width*spec[part]} width={width} height={width}
  preserveAspectRatio="xMidYMid meet" onError={()=>setFailed(true)}/></g>
}
