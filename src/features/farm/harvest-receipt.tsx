import {farmGoods,type FarmGood} from './farm-simulation'
import {cropArt} from './crop-catalog'
import {TILE} from './topview-model'
import {TopviewArt} from './topview-art'
import {topviewItems} from './topview-model'
import type {FarmAnimal} from './animal-catalog'
import './harvest-receipt.css'

export type HarvestReceipt={id:number;x:number;y:number;good:FarmGood;quantity:number;expiresAt:number;action?:'harvest'|'received';animal?:FarmAnimal}
export function FarmHarvestReceipt({x,y,good,quantity,action='harvest',animal}:HarvestReceipt){
 const item=farmGoods[good],image=item.crop?cropArt(item.crop):item.image
 return <g data-harvest-receipt={good} data-receipt-action={action} data-receipt-animal={animal} pointerEvents="none" role="img" aria-label={`${animal?topviewItems[animal].name:item.name} ${quantity}${animal?'마리':'개'} ${action==='harvest'?'수확':'수령'} · ${animal?'보관함':'창고'}에 보관`} transform={`translate(${(x+.5)*TILE} ${y*TILE+8})`}>
  <g className="farm-harvest-receipt">{animal?<svg x="-22" y="-25" width="28" height="28"><TopviewArt kind={animal} compact/></svg>:<image href={image} x="-22" y="-25" width="28" height="28"/>}<text x="7" y="-5" fontSize="15" fontWeight="bold" fill="#577c38" stroke="#fff8df" strokeWidth="3" paintOrder="stroke">+{quantity}</text></g>
 </g>
}
