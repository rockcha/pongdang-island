import {isBasicFarmBuilding} from './building-rules'
import {isFarmAnimal} from './animal-catalog'
import {isRetiredTradeBuilding} from './market-catalog'
import {farmBuildingStorageError} from './farm-simulation'
import {topviewItems,type FarmTool,type TopviewState} from './topview-model'

export type FarmResaleReceipt={kind:FarmTool;quantity:number;gold:number}
export type FarmResaleResult={state:TopviewState;message:string;receipt?:FarmResaleReceipt}
export const isResellableFarmKind=(kind:FarmTool):boolean=>!isBasicFarmBuilding(kind)&&!isRetiredTradeBuilding(kind)&&(topviewItems[kind].group==='건물'||isFarmAnimal(kind))
export const farmResalePrice=(kind:FarmTool)=>isResellableFarmKind(kind)?Math.floor(topviewItems[kind].price/2):0
export function farmObjectResaleError(state:TopviewState,id:number){
 const object=state.objects.find(o=>o.id===id)
 if(!object||!isResellableFarmKind(object.kind))return '기본 제공 건물과 장식물은 판매할 수 없어요.'
 if(isFarmAnimal(object.kind)&&state.simulation.animalJobs[id]!==undefined)return '생산물을 먼저 받은 뒤 동물을 판매할 수 있어요.'
 if(topviewItems[object.kind].group==='건물')return farmBuildingStorageError(state,id)?.replaceAll('보관','판매')??null
 return null
}
export function resellFarmObject(state:TopviewState,id:number):FarmResaleResult{
 const reason=farmObjectResaleError(state,id),object=state.objects.find(o=>o.id===id)
 if(reason||!object)return {state,message:reason??'판매할 개체를 선택해주세요.'}
 const gold=farmResalePrice(object.kind)
 if(!Number.isSafeInteger(state.gold+gold))return {state,message:'골드 금액을 확인해주세요.'}
 return {state:{...state,gold:state.gold+gold,objects:state.objects.filter(o=>o.id!==id)},message:`${topviewItems[object.kind].name}을 판매했어요.`,receipt:{kind:object.kind,quantity:1,gold}}
}
export function resellStoredFarmItem(state:TopviewState,kind:FarmTool):FarmResaleResult{
 const index=state.stored.indexOf(kind),gold=farmResalePrice(kind)
 if(index<0||!isResellableFarmKind(kind))return {state,message:'보관 중인 건물이나 동물을 선택해주세요.'}
 if(!Number.isSafeInteger(state.gold+gold))return {state,message:'골드 금액을 확인해주세요.'}
 return {state:{...state,gold:state.gold+gold,stored:state.stored.filter((_,i)=>i!==index),storedTransforms:{...state.storedTransforms,[kind]:state.storedTransforms?.[kind]?.slice(1)},storedLevels:{...state.storedLevels,[kind]:state.storedLevels?.[kind]?.slice(1)}},message:`${topviewItems[kind].name}을 판매했어요.`,receipt:{kind,quantity:1,gold}}
}
