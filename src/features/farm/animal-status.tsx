import {farmAnimals,isFarmAnimal,ANIMAL_PURCHASE_SECONDS,type FarmAnimal} from './animal-catalog'
import {farmGoods} from './farm-simulation'
import {TopviewArt} from './topview-art'
import {topviewItems,type TopviewObject} from './topview-model'
import {farmWorkPosition} from './work-status'
import {FarmSleepGlyph,FarmStatusBubble} from './status-bubble'
export function FarmAnimalStatus({object,readyAt,now,purchase,onClaim,onActivate,revealTime}:{object:TopviewObject;readyAt?:number;now:number;purchase?:FarmAnimal;onClaim?:()=>void;onActivate?:()=>void;revealTime?:boolean}){
 const item=topviewItems[object.kind],{x,y}=farmWorkPosition(object),idle=readyAt===undefined,ready=!idle&&now>=readyAt,progress=idle?undefined:Math.min(1,Math.max(0,1-(readyAt-now)/((purchase?ANIMAL_PURCHASE_SECONDS:isFarmAnimal(object.kind)?farmAnimals[object.kind].seconds:ANIMAL_PURCHASE_SECONDS)*1000))),good=isFarmAnimal(object.kind)?farmAnimals[object.kind].product:'egg'
 const label=purchase?(ready?`${farmAnimals[purchase].name} 보관함으로 받기`:'동물 준비 진행'):idle?`${item.name} 생산 시작`:`${farmGoods[good].name} 생산 (${object.x},${object.y})`
 return <g data-animal-status={purchase?(ready?'purchase-ready':'preparing'):idle?'idle':ready?'ready':'producing'}>
  <FarmStatusBubble x={x} y={idle?y-9:y} label={label} progress={progress} remaining={idle?undefined:Math.max(0,(readyAt-now)/1000)} ready={ready} resting={idle&&!purchase} onActivate={purchase?onClaim:onActivate} revealTime={revealTime}>
   {purchase?<svg x="-12" y="-13" width="24" height="24"><TopviewArt kind={purchase}/></svg>:idle?<FarmSleepGlyph/>:<image href={farmGoods[good].image} x="-10" y="-11" width="20" height="20"/>}
  </FarmStatusBubble>
 </g>
}
