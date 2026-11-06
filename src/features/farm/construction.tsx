import {FarmStatusBubble} from './status-bubble'
import {farmClearingArt} from './clearing-art'
import {TILE,objectFootprint,topviewItems,type TopviewObject} from './topview-model'
import {FARM_CONSTRUCTION_MS} from './construction-model'
const hammerArt='/farm/art/construction-v1/hammer.png'
export function FarmConstructionEffect({object}:{object:TopviewObject}){
 const {w,h}=objectFootprint(object)
 return <g pointerEvents="none" data-construction-effect={object.id} transform={`translate(${object.x*TILE} ${object.y*TILE})`}>
  <rect x="2" y="2" width={w*TILE-4} height={h*TILE-4} rx="5" fill="#c9aa7c99" stroke="#916b44" strokeDasharray="5 3"/>
  <g transform={`translate(${w*TILE/2-20} 0)`}>
   <g className="farm-clearing-soil-puff"><image href={farmClearingArt.soilPuff} x="-8" y="0" width="56" height="48"/></g>
   <g className="farm-clearing-painted-tool"><image href={hammerArt} x="3" y="-8" width="38" height="38"/></g>
  </g>
 </g>
}
export function FarmConstructionStatus({object,now}:{object:TopviewObject;now:number}){
 const {w}=objectFootprint(object),remaining=Math.max(0,(object.constructionReadyAt!-now)/1000)
 return <FarmStatusBubble x={(object.x+w/2)*TILE} y={object.y*TILE-20} label={`${topviewItems[object.kind].name} 건설 진행`} progress={1-remaining*1000/FARM_CONSTRUCTION_MS} remaining={remaining}><image href={hammerArt} x="-14" y="-15" width="28" height="28"/></FarmStatusBubble>
}
