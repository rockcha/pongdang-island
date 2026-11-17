import {farmAnimals,isFarmAnimal,ANIMAL_PURCHASE_SECONDS,type FarmAnimal} from './animal-catalog'
import {farmGoods} from './farm-simulation'
import {TopviewArt} from './topview-art'
import {type TopviewObject} from './topview-model'
import {farmWorkPosition} from './work-status'
import {FarmStatusBubble} from './status-bubble'
export function FarmAnimalStatus({object,readyAt,now,purchase,purchaseCount=1,onClaim,onActivate,revealTime}:{object:TopviewObject;readyAt?:number;now:number;purchase?:FarmAnimal;purchaseCount?:number;onClaim?:()=>void;onActivate?:()=>void;revealTime?:boolean}){
 const {x,y}=farmWorkPosition(object),idle=readyAt===undefined,ready=!idle&&now>=readyAt,progress=idle?undefined:Math.min(1,Math.max(0,1-(readyAt-now)/((purchase?ANIMAL_PURCHASE_SECONDS*purchaseCount:isFarmAnimal(object.kind)?farmAnimals[object.kind].seconds:ANIMAL_PURCHASE_SECONDS)*1000))),good=isFarmAnimal(object.kind)?farmAnimals[object.kind].product:'egg'
 if(idle&&!purchase)return null
 const label=purchase?(ready?`${farmAnimals[purchase].name}${purchaseCount>1?` ${purchaseCount}마리`:''} 보관함으로 받기`:purchaseCount>1?`${farmAnimals[purchase].name} ${purchaseCount}마리 준비 진행`:'동물 준비 진행'):`${farmGoods[good].name} 생산 (${object.x},${object.y})`
 return <g data-animal-status={purchase?(ready?'purchase-ready':'preparing'):idle?'idle':ready?'ready':'producing'}>
  <FarmStatusBubble x={x} y={idle?y-9:y} label={label} progress={progress} remaining={idle?undefined:Math.max(0,(readyAt-now)/1000)} ready={ready} resting={idle&&!purchase} onActivate={purchase?onClaim:onActivate} revealTime={revealTime}>
   {purchase?<svg x="-12" y="-13" width="24" height="24"><TopviewArt kind={purchase}/></svg>:<image href={farmGoods[good].image} x="-10" y="-11" width="20" height="20"/>}
   {purchase&&purchaseCount>1&&<g pointerEvents="none"><rect x="4" y="5" width="19" height="13" rx="6" fill="#fff8e9" stroke="#d9c7aa" strokeWidth=".7"/><text x="13.5" y="14.5" textAnchor="middle" fontSize="8" fontWeight="600" fill="#805d37">×{purchaseCount}</text></g>}
  </FarmStatusBubble>
 </g>
}
