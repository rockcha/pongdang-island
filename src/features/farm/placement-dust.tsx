import {TILE} from './topview-model'
import './placement-dust.css'

export function FarmPlacementDust({x,y,w,h,soft=false}:{x:number;y:number;w:number;h:number;soft?:boolean}){
 return <g pointerEvents="none" aria-hidden="true" data-placement-dust="true" opacity={soft ? .6 : 1} transform={`translate(${(x+w/2)*TILE} ${(y+h)*TILE-4})`}>
  <g className="farm-placement-dust">
   <ellipse className="farm-placement-dust-ring" rx={w*TILE*.48} ry="7" fill="none" stroke="#e7d1a6" strokeWidth="3"/>
   {[-1,1].map(side=><g key={side} transform={`scale(${side} 1)`}>
    <g className="farm-placement-dust-puff"><ellipse cx={w*TILE*.26} cy="-3" rx="12" ry="7" fill="#e5cfaa"/><circle cx={w*TILE*.32} cy="-8" r="7" fill="#efddbc"/><circle cx={w*TILE*.17} cy="-5" r="6" fill="#f3e5ca"/></g>
   </g>)}
  </g>
 </g>
}
