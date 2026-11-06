import type {TopviewState} from './topview-model'

export const FARM_CLEARING_MS=10_000
export const FARM_CONSTRUCTION_MS=10_000
export function finishFarmConstruction(state:TopviewState,now:number):TopviewState{
 if(!state.objects.some(o=>o.constructionReadyAt!==undefined&&o.constructionReadyAt<=now))return state
 return {...state,objects:state.objects.map(o=>{
  if(o.constructionReadyAt===undefined||o.constructionReadyAt>now)return o
  const {constructionReadyAt:_,...finished}=o
  return finished
 })}
}
