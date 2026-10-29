import type {Facility} from './island-model'
import {facilityPng,FacilityPngArt} from './facility-png-art'

type Connections={north:boolean;east:boolean;south:boolean;west:boolean}
export function FrontSign({f,rotation,label}:{f:Facility;rotation:number;label?:string}){
 const src=facilityPng(f),reverse=rotation===180||rotation===270
 if(!src)return null
 return <g data-garden={f.kind} data-art-direction={reverse?180:0} data-sign-flipped={reverse}>
  <g transform={reverse?'translate(32 0) scale(-1 1)':undefined}><FacilityPngArt src={src} f={f}/></g><text x={reverse?18:14} y="11" textAnchor="middle" fill="#705b3e" fontSize="4.5" fontFamily="inherit" textLength={label&&label.length>4?24:undefined} lengthAdjust="spacingAndGlyphs">{label||'바닷길'}</text>
 </g>
}
export function FrontFence({f,rotation,connections}:{f:Facility;rotation:number;connections?:Connections}){
 const src=facilityPng(f)
 if(!src)return null
 const has=connections&&(connections.north||connections.east||connections.south||connections.west),horizontal=rotation%180===0
 const c=has?connections!:{north:!horizontal,east:horizontal,south:!horizontal,west:horizontal}
 const arms=[...(c.north?[[16,0]]:[]),...(c.east?[[32,16]]:[]),...(c.south?[[16,32]]:[]),...(c.west?[[0,16]]:[])]
 return <g data-garden={f.kind} data-art-direction={rotation} data-fence-heading={rotation} data-connected={[c.north?'n':'',c.east?'e':'',c.south?'s':'',c.west?'w':''].join('')}>
  {arms.map(([x,y],i)=><path key={i} d={`M16 16L${x} ${y}`} stroke={f.kind==='wood-fence'?'#c49b62':'#bcb7a4'} strokeWidth={f.kind==='wood-fence'?7:11} strokeLinecap="round"/>)}
  <g transform={rotation%180===90?'translate(32 0) matrix(0 1 -1 0 0 0)':rotation===180?'translate(32 0) scale(-1 1)':undefined}><image href={src} x="0" y="-12" width="32" height="44" preserveAspectRatio="xMidYMax meet" data-facility-png/></g>
 </g>
}
