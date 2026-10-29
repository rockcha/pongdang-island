import type { Facility } from './island-model'
import sprites from './island-png-manifest.json'

export function facilityPng(f:Facility) {
 return (sprites as Record<string,string>)[f.kind]
}
const bounds:Record<string,[number,number,number,number]>={
 warehouse:[-12,-50,120,120],lighthouse:[-10,-85,90,170],
 tree:[-10,-60,84,128],pine:[-10,-60,84,128],
 flowers:[-8,-12,80,44],bench:[-8,-24,80,60],
}
export function FacilityPngArt({src,kind}:{src:string;kind:string}) {
 const [x,y,width,height]=bounds[kind]??[-16,-55,128,152]
 // Mirror around the illustration's center; keep the placement and labels intact.
 return <g transform={`translate(${2*x+width} 0) scale(-1 1)`} data-png-mirrored="true">
  <image href={src} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-facility-png/>
 </g>
}
