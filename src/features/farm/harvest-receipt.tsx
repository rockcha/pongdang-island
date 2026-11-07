import {farmGoods,type FarmGood} from './farm-simulation'
import {cropArt} from './crop-catalog'
import {TILE} from './topview-model'
import './harvest-receipt.css'

export type HarvestReceipt={id:number;x:number;y:number;good:FarmGood;quantity:number;expiresAt:number}
export function FarmHarvestReceipt({x,y,good,quantity}:HarvestReceipt){
 const item=farmGoods[good],image=item.crop?cropArt(item.crop):item.image
 return <g data-harvest-receipt={good} pointerEvents="none" role="img" aria-label={`${item.name} ${quantity}개 수확 · 창고에 보관`} transform={`translate(${(x+.5)*TILE} ${y*TILE+8})`}>
  <g className="farm-harvest-receipt"><image href={image} x="-22" y="-25" width="28" height="28"/><text x="7" y="-5" fontSize="15" fontWeight="bold" fill="#577c38" stroke="#fff8df" strokeWidth="3" paintOrder="stroke">+{quantity}</text></g>
 </g>
}
