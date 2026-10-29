import type { Facility } from './island-model'
import sprites from './island-png-manifest.json'
import {destinationArtwork} from './destination-art'
import {buildingViewBox} from './island-art-sizing'

export function facilityPng(f:Facility) {
 const art=sprites as Record<string,string>
 return art[f.id.split('~')[0]]??(f.kind==='destination'?art[destinationArtwork(f.to??'')??'destination']:art[f.kind])
}
export function FacilityPngArt({src,f}:{src:string;f:Facility}) {
 const bridge=f.kind==='bridge'
 const [x,y,width,boxHeight]=bridge?[0,0,f.w*32,f.h*32]:buildingViewBox(f,0).split(' ').map(Number)
 const height=Math.min(boxHeight,f.h*32-y)
 return <g data-png-view="front">
  <image href={src} x={x} y={y} width={width} height={height} preserveAspectRatio={bridge?'none':'xMidYMax meet'} aria-hidden="true" data-facility-png/>
 </g>
}
