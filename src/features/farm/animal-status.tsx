import {farmGoods} from './farm-simulation'
import {TopviewArt} from './topview-art'
import {objectArtHeight,TILE,topviewItems,type TopviewObject} from './topview-model'
import {FarmSleepGlyph,FarmStatusBubble} from './status-bubble'
export function FarmAnimalStatus({object,readyAt,now,purchase,onClaim,onActivate,revealTime}:{object:TopviewObject;readyAt?:number;now:number;purchase?:'cow'|'chicken';onClaim?:()=>void;onActivate?:()=>void;revealTime?:boolean}){
 const item=topviewItems[object.kind],x=(object.x+item.w/2)*TILE,y=(object.y+item.h)*TILE-objectArtHeight(object.kind)-18,idle=readyAt===undefined,ready=!idle&&now>=readyAt,progress=idle?undefined:Math.min(1,Math.max(0,1-(readyAt-now)/10000)),good=object.kind==='cow'?'milk':'egg'
 const label=purchase?(ready?`${purchase==='cow'?'젖소':'닭'} 보관함으로 받기`:'동물 준비 진행'):idle?`${item.name} 생산 시작`:`${good==='milk'?'우유':'달걀'} 생산 (${object.x},${object.y})`
 return <g data-animal-status={purchase?(ready?'purchase-ready':'preparing'):idle?'idle':ready?'ready':'producing'}>
  <FarmStatusBubble x={x} y={y} label={label} progress={progress} remaining={idle?undefined:Math.max(0,(readyAt-now)/1000)} ready={ready} resting={idle&&!purchase} onActivate={purchase?onClaim:onActivate} revealTime={revealTime}>
   {purchase?<svg x="-12" y="-13" width="24" height="24"><TopviewArt kind={purchase}/></svg>:idle?<FarmSleepGlyph/>:<image href={farmGoods[good].image} x="-10" y="-11" width="20" height="20"/>}
  </FarmStatusBubble>
 </g>
}
