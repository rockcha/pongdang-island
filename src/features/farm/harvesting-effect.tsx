import {farmClearingArt} from './clearing-art'
import {TILE} from './topview-model'
import './harvesting-effect.css'

export const farmHarvestingArt='/farm/art/harvesting-v1/sickle.png'
export function FarmHarvestGlyph(){return <image href={farmHarvestingArt} x="-15" y="-16" width="30" height="30"/>}
export function FarmHarvestingEffect({x,y}:{x:number;y:number}){
 return <g pointerEvents="none" aria-hidden="true" data-harvesting-effect={`${x},${y}`} transform={`translate(${x*TILE} ${y*TILE})`}>
  <g className="farm-harvesting-puff"><image href={farmClearingArt.soilPuff} x="-5" y="5" width="48" height="36"/></g>
  <g className="farm-harvesting-sickle"><image href={farmHarvestingArt} x="2" y="-14" width="40" height="40"/></g>
 </g>
}
