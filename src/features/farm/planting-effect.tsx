import {farmClearingArt} from './clearing-art'
import {TILE} from './topview-model'
import './planting-effect.css'

export const farmPlantingArt='/farm/art/planting-v1/shovel.png'
export function FarmPlantingEffect({x,y}:{x:number;y:number}){
 return <g pointerEvents="none" aria-hidden="true" data-planting-effect={`${x},${y}`} transform={`translate(${x*TILE} ${y*TILE})`}>
  <g className="farm-planting-soil"><image href={farmClearingArt.soilPuff} x="-5" y="3" width="48" height="40"/></g>
  <g className="farm-planting-shovel"><image href={farmPlantingArt} x="3" y="-13" width="38" height="38"/></g>
 </g>
}
