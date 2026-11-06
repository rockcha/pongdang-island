import './clearing-art.css'

export const farmClearingArt={pickaxe:'/farm/art/v28/effects/pickaxe.png',soilPuff:'/farm/art/v28/effects/soilPuff.png'}
export function FarmClearingGlyph(){return <image href={farmClearingArt.pickaxe} x="-15" y="-16" width="30" height="30"/>}
export function FarmClearingEffect({x,y,complete=false}:{x:number;y:number;complete?:boolean}){
 return <g pointerEvents="none" aria-hidden="true" data-clearing-effect={complete?'complete':'working'} transform={`translate(${x} ${y})`}>
  {!complete&&<ellipse cx="20" cy="30" rx="17" ry="7" fill="#785438" opacity=".2"/>}
  <g className={complete?'farm-clearing-finish-puff':'farm-clearing-soil-puff'}><image href={farmClearingArt.soilPuff} x="-8" y="0" width="56" height="48"/></g>
  {!complete&&<g className="farm-clearing-painted-tool"><image href={farmClearingArt.pickaxe} x="6" y="-3" width="33" height="36"/></g>}
 </g>
}
