import {useState,type ReactNode} from 'react'
import {collectibleUrl} from '@/features/collection/api'

// Origins are the artwork's axle/body center, independent of the game's transforms.
const artwork:Record<string,{frame:number;rotor:number;float:number;rotorWidth:number;rotorX?:number}>={
 siren:{frame:.5,rotor:.5,float:.5,rotorWidth:84},
 whitenight:{frame:.5,rotor:.5,float:.5,rotorWidth:70},
 cloudferry:{frame:.5,rotor:.5,float:.5,rotorWidth:70},
 mukhyang:{frame:.5,rotor:.47,float:.52,rotorWidth:66,rotorX:.483},
 scrapisle:{frame:.5,rotor:.5,float:.5,rotorWidth:70},
 bluegrove:{frame:.49,rotor:.49,float:.51,rotorWidth:76},
 primal:{frame:.5,rotor:.5,float:.5,rotorWidth:64},
 basic:{frame:.495,rotor:.495,float:.50,rotorWidth:64},
 bronze:{frame:.495,rotor:.5,float:.45,rotorWidth:92},
 pongdang:{frame:.495,rotor:.49,float:.58,rotorWidth:84},
 coral:{frame:.52,rotor:.44,float:.43,rotorWidth:74},
 mistmoon:{frame:.51,rotor:.5,float:.58,rotorWidth:96},
 calm:{frame:.495,rotor:.495,float:.54,rotorWidth:62},
 swift:{frame:.55,rotor:.475,float:.60,rotorWidth:70},
 starruins:{frame:.495,rotor:.49,float:.53,rotorWidth:62},
 dreamabyss:{frame:.5,rotor:.5,float:.49,rotorWidth:62},
 lunea:{frame:.5,rotor:.49,float:.44,rotorWidth:70},
}
export function hasRodImages(id?:string){return !!id&&Object.hasOwn(artwork,id)}
export function rodImagePath(id:string,file:string){return `equipment/rods/${id==='basic'?'starter':id}/${file}.png`}
export function rodThumbnailUrl(id:string){return collectibleUrl(rodImagePath(id,'thumbnail'))}
export function RodPartImage({id,part,fallback}:{id:string;part:'frame'|'rotor'|'float';fallback:ReactNode}){
 const [failed,setFailed]=useState(false)
 const spec=artwork[id]
 if(failed||!spec)return fallback
 const width=part==='float'?34:part==='frame'?84:spec.rotorWidth
 const file=part==='float'?'float':`reel-${part}`
 return <g {...{[`data-skin-${part}`]:id}}><image
  href={collectibleUrl(rodImagePath(id,file))}
  x={-width*(part==='rotor'?(spec.rotorX??.5):.5)} y={-width*spec[part]} width={width} height={width}
  preserveAspectRatio="xMidYMid meet" onError={()=>setFailed(true)}/></g>
}
