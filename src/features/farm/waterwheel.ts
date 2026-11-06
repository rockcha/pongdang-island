import {objectFootprint,type TopviewObject,type TopviewState} from './topview-model'
import {buildingLevel} from './building-upgrades'
import {isProcessingBuilding} from './workshop-catalog'

export function waterwheelBonusMinutes(state:TopviewState,source:TopviewObject){
 if(!(isProcessingBuilding(source.kind)||source.kind==='mill'||source.kind==='butcher'))return 0
 const a=objectFootprint(source)
 return state.objects.reduce((best,w)=>{
  if(w.kind!=='waterwheel'||w.constructionReadyAt||state.simulation.upgradeJobs[w.id])return best
  const b=objectFootprint(w)
  const adjacent=((source.x+a.w===w.x||w.x+b.w===source.x)&&source.y<w.y+b.h&&w.y<source.y+a.h)||((source.y+a.h===w.y||w.y+b.h===source.y)&&source.x<w.x+b.w&&w.x<source.x+a.w)
  return adjacent?Math.max(best,buildingLevel(w)):best
 },0)
}
export const waterwheelDuration=(seconds:number,bonus:number)=>Math.max(1,seconds-bonus*60)

export const hasWaterwheelBonus=(state:TopviewState,source:TopviewObject)=>waterwheelBonusMinutes(state,source)>0
