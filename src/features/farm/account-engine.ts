import {initialTopview,topviewItems,placementValid,cellKey,canRotateFarmObject,type TopviewState,type FarmTool,type FarmObjectTransform} from './topview-model'
import {simulateFarm,farmPlacementError,farmBuildingStorageError,type FarmSimAction} from './farm-simulation'
import {buyFarmItem,buyFarmTiles,applyTileStroke} from './farm-stock'
import {applyLandStroke,buyLandStock,type LandCell,type LandTool} from './land-tools'
import {finishFarmConstruction,FARM_CONSTRUCTION_MS} from './construction-model'
import {transformFarmObject} from './object-transform'
import {resellFarmObject,resellStoredFarmItem} from './resale'
import type {FarmTile} from './tile-catalog'
import {farmResearchJobs} from './research-jobs'

// The trusted server executes these intentions with its own clock and wallet.
// No command accepts client inventory, gold, prices, deadlines or replacement saves.
export type FarmCommand=
 |{type:'simulate';id:number;action:FarmSimAction}
 |{type:'buy';kind:FarmTool;quantity:number}
 |{type:'buyTiles';tile:FarmTile;quantity:number}
 |{type:'buyLand';quantity:number}
 |{type:'land';tool:LandTool;cells:LandCell[]}
 |{type:'tile';tool:LandTool;cells:LandCell[];tile:FarmTile}
 |{type:'clear';cells:LandCell[]}
 |{type:'place';kind:FarmTool;x:number;y:number;transform:FarmObjectTransform}
 |{type:'move';id:number;x:number;y:number;transform:FarmObjectTransform}
 |{type:'recover';id:number}
 |{type:'transform';id:number;action:'rotate'|'flip'}
 |{type:'resell';id:number}
 |{type:'resellStored';kind:FarmTool}
 |{type:'tick'}|{type:'undo'}
 |{type:'batch';commands:FarmCommand[]}

export function initialAccountFarm():TopviewState{return {...initialTopview(),gold:0}}
const fail=():never=>{throw new Error('INVALID_FARM_COMMAND')}
function validTransform(kind:FarmTool,t:FarmObjectTransform){return t&&typeof t==='object'&&!Array.isArray(t)&&Object.keys(t).every(k=>k==='rotation'||k==='flipped')&&[undefined,0,90,180,270].includes(t.rotation)&&(!t.rotation||canRotateFarmObject(kind))&&(t.flipped===undefined||typeof t.flipped==='boolean')}
export function applyFarmCommand(state:TopviewState,command:FarmCommand,now:number):TopviewState{
 if(!command||typeof command!=='object'||!Number.isSafeInteger(now))return fail()
 if(command.type==='batch'){
  if(!Array.isArray(command.commands)||!command.commands.length||command.commands.length>100||command.commands.some(c=>!c||c.type==='batch'||c.type==='undo'))return fail()
  return command.commands.reduce((s,c)=>{const next=applyFarmCommand(s,c,now);if(next===s)throw new Error('FARM_ACTION_REJECTED');return next},state)
 }
 switch(command.type){
  case 'simulate':{
   if(!Number.isSafeInteger(command.id)||!command.action||typeof command.action.type!=='string')return fail()
   if('quantity'in command.action&&(!Number.isSafeInteger(command.action.quantity)||command.action.quantity<1||command.action.quantity>1000))return fail()
   const result=simulateFarm(state,command.id,command.action,now)
   if(result.state===state)throw new Error(result.message)
   return result.state
  }
  case 'buy':if(!Object.hasOwn(topviewItems,command.kind))return fail();return buyFarmItem(state,command.kind,command.quantity)
  case 'buyTiles':return buyFarmTiles(state,command.quantity,command.tile)
  case 'buyLand':return buyLandStock(state,command.quantity)
  case 'land':case 'tile':{
   if(!['place','recover'].includes(command.tool)||!Array.isArray(command.cells)||command.cells.length>1000)return fail()
   return command.type==='land'?applyLandStroke(state,command.tool,command.cells).state:applyTileStroke(state,command.tool,command.cells,[],command.tile).state
  }
  case 'clear':{
   if(!Array.isArray(command.cells)||command.cells.length>1000)return fail()
   let next=state
   for(const c of command.cells){if(farmPlacementError(next,'plot')||!placementValid(next,'plot',c.x,c.y)||next.paths.includes(cellKey(c.x,c.y)))continue;next={...next,objects:[...next.objects,{id:next.nextId,kind:'plot',x:c.x,y:c.y}],nextId:next.nextId+1}}
   return next
  }
  case 'place':{
   const {kind,x,y,transform}=command
   if(!Object.hasOwn(topviewItems,kind)||!validTransform(kind,transform)||kind==='plot')return fail()
   const index=state.stored.indexOf(kind)
   if(index<0||farmPlacementError(state,kind,{fromStorage:true})||!placementValid(state,kind,x,y,undefined,transform.rotation))return state
   const orderKind=kind==='store'||kind==='processed'?kind:null
   return {...state,stored:state.stored.filter((_,i)=>i!==index),storedTransforms:{...state.storedTransforms,[kind]:state.storedTransforms?.[kind]?.slice(1)},storedLevels:{...state.storedLevels,[kind]:state.storedLevels?.[kind]?.slice(1)},storedOrderKeys:orderKind?{...state.storedOrderKeys,[orderKind]:state.storedOrderKeys?.[orderKind]?.slice(1)}:state.storedOrderKeys,objects:[...state.objects,{id:state.nextId,kind,x,y,...transform,level:state.storedLevels?.[kind]?.[0]??1,orderKey:orderKind?(state.storedOrderKeys?.[orderKind]?.[0]??state.nextId):undefined,constructionReadyAt:topviewItems[kind].group==='건물'?now+FARM_CONSTRUCTION_MS:undefined}],nextId:state.nextId+1}
  }
  case 'move':{
   const o=state.objects.find(o=>o.id===command.id),t=command.transform
   if(!o||o.constructionReadyAt||!validTransform(o.kind,t)||!placementValid(state,o.kind,command.x,command.y,o.id,t.rotation))return state
   return {...state,objects:state.objects.map(item=>item===o?{...o,x:command.x,y:command.y,...t}:item)}
  }
  case 'recover':{
   const o=state.objects.find(o=>o.id===command.id)
   if(!o)return state
   if(topviewItems[o.kind].group==='건물')return farmBuildingStorageError(state,o.id)?state:simulateFarm(state,o.id,{type:'storeBuilding'},now).state
   const sim=state.simulation
   if(o.constructionReadyAt||sim.animalJobs[o.id]!==undefined||sim.cropJobs[o.id]||sim.upgradeJobs[o.id]||sim.animalPurchaseJobs[o.id])return state
   if(o.kind==='plot')return {...state,objects:state.objects.filter(item=>item!==o)}
   return {...state,objects:state.objects.filter(item=>item!==o),stored:[...state.stored,o.kind],storedTransforms:{...state.storedTransforms,[o.kind]:[...(state.storedTransforms?.[o.kind]??state.stored.filter(k=>k===o.kind).map(()=>({}))),{rotation:o.rotation,flipped:o.flipped}]}}
  }
  case 'transform':if(!['rotate','flip'].includes(command.action))return fail();return transformFarmObject(state,command.id,command.action)
  case 'resell':return resellFarmObject(state,command.id).state
  case 'resellStored':if(!Object.hasOwn(topviewItems,command.kind))return fail();return resellStoredFarmItem(state,command.kind).state
  case 'tick':{
   let next=finishFarmConstruction(state,now)
   for(const [id,job] of Object.entries(next.simulation.upgradeJobs))if(job.readyAt<=now)next=simulateFarm(next,Number(id),{type:'completeUpgrade'},now).state
   for(const job of Object.values(farmResearchJobs(next.simulation)))if(job.readyAt<=now)next=simulateFarm(next,job.labId,{type:'completeResearch'},now).state
   return next
  }
  default:return fail()
 }
}

export function validFarmState(state:TopviewState){
 return Number.isSafeInteger(state.gold)&&state.gold>=0&&state.gold<=1000000000&&state.objects.length<=2000&&state.stored.length<=10000&&
  Object.values(state.simulation.inventory).every(n=>Number.isSafeInteger(n)&&n>=0)&&
  state.objects.every(o=>Object.hasOwn(topviewItems,o.kind)&&Number.isSafeInteger(o.id)&&placementValid(state,o.kind,o.x,o.y,o.id,o.rotation))&&
  new Set(state.objects.map(o=>o.id)).size===state.objects.length
}
