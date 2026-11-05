import {FarmSleepGlyph,FarmStatusBubble,StatusGlyph} from './status-bubble'
import {cropArt,farmCrops,seedGood} from './crop-catalog'
import {farmProducts} from './food-catalog'
import {CROP_FRESH_MS,cropIsRotten,farmGoods,type FarmSimulation,type FarmGood} from './farm-simulation'
import {topviewItems,type TopviewObject} from './topview-model'
import {farmWorkPosition} from './work-status'
import {farmUpgradeArt} from './upgrade-art'
export type FarmCompletedWork={objectId:number;kind:'upgrade'|'research'|'harvest'|'clearing';good?:FarmGood;expiresAt:number}
export function FarmJobStatus({object,simulation,now,onActivate,completed}:{object:TopviewObject;simulation:FarmSimulation;now:number;onActivate:()=>void;completed?:FarmCompletedWork}){
 const research=simulation.researchJob?.labId===object.id?simulation.researchJob:null,craft=simulation.processingJobs[object.id],mill=simulation.millJobs[object.id]??null,crop=simulation.cropJobs[object.id]
 const item=topviewItems[object.kind],{x,y}=farmWorkPosition(object)
 if(simulation.upgradeJobs[object.id])return null
 if(crop){
  if(crop.harvestingAt!==undefined)return null
  const rotten=cropIsRotten(crop,now),ready=crop.readyAt<=now,progress=1-(crop.readyAt-now)/(farmCrops[crop.crop].growSeconds*1000)
  return <g data-crop-rotten={rotten?object.id:undefined} data-crop-status-compact="true"><FarmStatusBubble x={x} y={y} compact label={rotten?'폐기하기':`${farmCrops[crop.crop].name} 성장 (${object.x},${object.y})`} warning={ready&&!rotten&&crop.readyAt+CROP_FRESH_MS-now<=15000} progress={rotten?undefined:progress} ready={ready} remaining={ready?undefined:Math.max(0,(crop.readyAt-now)/1000)} onActivate={onActivate}>
   {rotten?<StatusGlyph kind="trash"/>:<image href={cropArt(crop.crop)} x="-10" y="-13" width="20" height="20"/>}
  </FarmStatusBubble></g>
 }
 const job=research??craft??(mill)
 if(!job){
  if(completed){
   const label={upgrade:'건물 업그레이드 진행',research:'종자 연구 진행',harvest:'수확 진행',clearing:'개간 진행'}[completed.kind],good=completed.good?farmGoods[completed.good]:null,image=completed.kind==='upgrade'?farmUpgradeArt:good?.crop?cropArt(good.crop):good?.image
   return <g data-work-completed={object.id}><FarmStatusBubble x={x} y={y} compact={object.kind==='plot'} label={label} progress={1} ready onActivate={onActivate}>{image?<image href={image} x="-13" y="-13" width="26" height="26"/>:<StatusGlyph kind="pickaxe"/>}</FarmStatusBubble></g>
  }
  if(!['mill','bakery','dairy','kitchen','barn','coop'].includes(object.kind)||simulation.upgradeJobs[object.id]||simulation.animalPurchaseJobs[object.id])return null
  return <FarmStatusBubble x={x} y={y-9} label={`${item.name} 쉬는 중`} resting onActivate={onActivate}><FarmSleepGlyph/></FarmStatusBubble>
 }
 const good=research?seedGood(research.crop):craft?craft.recipe:mill?.product??'flour'
 const label=research?'종자 연구 진행':craft?`${farmProducts[craft.recipe].name} 제작 진행`:'제분 진행'
 const product=farmGoods[good]
 return <FarmStatusBubble x={x} y={y} label={label} progress={(now-job.startedAt)/(job.readyAt-job.startedAt)} remaining={Math.max(0,(job.readyAt-now)/1000)} ready={job.readyAt<=now} onActivate={onActivate}><image href={product.crop?cropArt(product.crop):product.image} x="-12" y="-13" width="24" height="24"/></FarmStatusBubble>
}
