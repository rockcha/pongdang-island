import {FarmSleepGlyph,FarmStatusBubble,StatusGlyph} from './status-bubble'
import {cropArt,farmCrops,seedGood} from './crop-catalog'
import {farmProducts} from './food-catalog'
import {CROP_FRESH_MS,cropIsRotten,farmGoods,type FarmSimulation} from './farm-simulation'
import {TILE,topviewItems,type TopviewObject} from './topview-model'
export function FarmJobStatus({object,simulation,now,onActivate}:{object:TopviewObject;simulation:FarmSimulation;now:number;onActivate:()=>void}){
 const research=simulation.researchJob?.labId===object.id?simulation.researchJob:null,craft=simulation.processingJobs[object.id],mill=simulation.millJobs[object.id]??null,crop=simulation.cropJobs[object.id]
 const item=topviewItems[object.kind],x=(object.x+item.w/2)*TILE,y=object.y*TILE-18
 if(crop){
  if(crop.harvestingAt!==undefined)return null
  const rotten=cropIsRotten(crop,now),ready=crop.readyAt<=now,progress=1-(crop.readyAt-now)/(farmCrops[crop.crop].growSeconds*1000)
  return <g data-crop-rotten={rotten?object.id:undefined} data-crop-status-compact="true" transform={`translate(${(object.x+.75)*TILE} ${object.y*TILE+10}) scale(.55)`}><FarmStatusBubble x={0} y={0} label={rotten?'폐기하기':`${farmCrops[crop.crop].name} 성장 (${object.x},${object.y})`} warning={ready&&!rotten&&crop.readyAt+CROP_FRESH_MS-now<=15000} progress={rotten?undefined:progress} ready={ready} remaining={ready?undefined:Math.max(0,(crop.readyAt-now)/1000)} onActivate={onActivate}>
   {rotten?<StatusGlyph kind="trash"/>:<><image href={cropArt(crop.crop)} x="-10" y="-13" width="20" height="20"/>{ready&&<text y="12" x="0" textAnchor="middle" fill="#907044" fontSize="6">{Math.max(0,Math.ceil((crop.readyAt+CROP_FRESH_MS-now)/1000))}초</text>}</>}
  </FarmStatusBubble></g>
 }
 const job=research??craft??(mill)
 if(!job){
  if(!['mill','bakery','dairy','barn','coop'].includes(object.kind)||simulation.upgradeJobs[object.id]||simulation.animalPurchaseJobs[object.id])return null
  return <FarmStatusBubble x={x} y={y} label={`${item.name} 쉬는 중`} resting onActivate={onActivate}><FarmSleepGlyph/></FarmStatusBubble>
 }
 const good=research?seedGood(research.crop):craft?craft.recipe:'flour'
 const label=research?'종자 연구 진행':craft?`${farmProducts[craft.recipe].name} 제작 진행`:'제분 진행'
 const product=farmGoods[good]
 return <FarmStatusBubble x={x} y={y} label={label} progress={(now-job.startedAt)/(job.readyAt-job.startedAt)} remaining={Math.max(0,(job.readyAt-now)/1000)} ready={job.readyAt<=now} onActivate={onActivate}><image href={product.crop?cropArt(product.crop):product.image} x="-12" y="-13" width="24" height="24"/></FarmStatusBubble>
}
