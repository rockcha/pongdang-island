import {FarmGold} from './farm-gold'
import {ConfirmDialog} from '@/components/confirm-dialog'
import type {FarmAccountConnection} from './account-api'
import type {FarmCommand} from './account-engine'
import {useFarmGoldSpend} from './gold-spend'
import {FARM_CLEARING_MS,FARM_CONSTRUCTION_MS,finishFarmConstruction} from './construction-model'
import {FarmPlantingEffect,farmPlantingArt} from './planting-effect'
import {FarmPlacementDust} from './placement-dust'
import {FarmHarvestingEffect,FarmHarvestGlyph} from './harvesting-effect'
import {canUseFarmTrialStock,initialFarmTrial} from './trial-inventory'
import {FarmConstructionEffect,FarmConstructionStatus} from './construction'
import {FarmClearingEffect,FarmClearingGlyph,farmClearingArt} from './clearing-art'
import {transformFarmObject} from './object-transform'
import './object-quick-actions.css'
import {FarmFenceRails,fenceConnections,isFarmFence} from './fence-art'
import {FarmPurchaseEffect,type FarmPurchaseReceipt} from './purchase-effect'
import {playSaleSound} from '@/features/gold/purchase-sound'
import {playFarmPlacementSound} from './placement-sound'
import {removeRetiredMarket} from './market-catalog'
import {FarmObjectOrientationControls} from './object-orientation-controls'
import {useFarmObjectDrag} from './use-object-drag'
import {isFarmAnimal} from './animal-catalog'
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {Link} from 'react-router'
import {ArrowLeft,Plus,Minus,RotateCcw,Undo2,MoreHorizontal,Scan} from 'lucide-react'
import {FarmToolbar} from './farm-toolbar'
import {FarmSeedPicker} from './seed-picker'
import {farmPlotImages} from './plot-art-assets'
import {FarmGrassPattern} from './grass-pattern'
import {FarmDirtPattern} from './dirt-art'
import {FarmTilePatterns} from './tile-art'
import {farmTiles,tileCount,totalTiles,pathTile,type FarmTile} from './tile-catalog'
import {islandShorePath} from './island-shore'
import {TopviewArt} from './topview-art'
import {FarmProductionDialog} from './production-dialog'
import {CROP_FRESH_MS,farmLimits,farmPlacementError,farmBuildingStorageError,simulateFarm,cropIsRotten,type FarmSimAction,type FarmEffect} from './farm-simulation'
import {FarmActionEffect} from './action-effect'
import './sale-effect.css'
import {FarmGoodIcon} from './farm-good-icon'
import {FARM_SEA_MARGIN,canPlaceLand,cellKey,MAP_H,MAP_W,objectAt,objectArtHeight,placementValid,farmPlacementTerrain,TILE,topviewItems,objectFootprint,canFlipFarmObject,type FarmObjectTransform,type FarmTool,type TopviewState,type TopviewObject} from './topview-model'
import {applyLandStroke,buyLandStock,landBlockMessages,type LandCell,type LandTool} from './land-tools'
import {useLandBrush} from './use-land-brush'
import {useFarmCamera} from './use-farm-camera'
import {LandPurchaseDialog,LandToolPanel} from './land-controls'
import {cropKinds,farmCrops,seedGood,type CropKind} from './crop-catalog'
import {FarmWarehouse} from './warehouse'
import {FarmCapacitySummary} from './capacity-summary'
import {FarmObjectStorage,type StorageCategory} from './object-storage'
import {FarmShop,type FarmShopTab} from './farm-shop'
import {FarmTileMenu,FarmTilePicker} from './tile-controls'
import {applyTileStroke,buyFarmItem,buyFarmTiles} from './farm-stock'
import {FarmCountBadge} from './count-badge'
import {FarmAnimalStatus} from './animal-status'
import {FarmJobStatus,type FarmCompletedWork} from './job-status'
import {FarmStatusBubble} from './status-bubble'
import {farmStorageUsage} from './farm-simulation'
import {activeBuildings,buildingLevel,isUpgradeable,warehouseAvailable,warehouseCapacity} from './building-upgrades'
import {BuildingUpgradeEffect} from './building-upgrade-effect'
import {FarmCookbook} from './cookbook'

import {farmOrderDay} from './daily-orders'
import {farmSupplies,farmSupplyKinds,isFarmSupply,withFarmSupplyInventory,type FarmSupply} from './supply-catalog'
import {resellFarmObject,resellStoredFarmItem,farmObjectResaleError,farmResalePrice,isResellableFarmKind,type FarmResaleResult,type FarmResaleReceipt} from './resale'
import {FarmGoldEffect} from './gold-effect'
import './supply-effects.css'
import {FarmToolPanel} from './farm-tool-panel'
import './topview-farm.css'
import './farm-layout.css'
import './building-upgrade.css'
import './farm-lifecycle.css'
import './farm-ux.css'
import './compact-dialog.css'
import './farm-tool-menu.css'
import './farm-stock.css'
import './farm-overview.css'
import './building-dialog.css'
import './facility-unified.css'
import './workbench-layout.css'

type Mode=FarmSupply|'look'|'land'|'land-recover'|'move'|'tile-place'|'tile-recover'|'seed'|FarmTool
type ToolMenu='land'|'farm'|'tile'|'storage'|'move'|'recover'
type FarmSaleTarget={source:'placed';id:number;kind:FarmTool}|{source:'stored';kind:FarmTool}
const seaMargin=FARM_SEA_MARGIN
export function TopviewFarm({trialEmail,trialOperator=false,account}:{trialEmail?:string;trialOperator?:boolean;account?:FarmAccountConnection}={}){
 const farmNow=()=>account?.now()??Date.now()
 const createTrial=()=>initialFarmTrial(canUseFarmTrialStock(trialOperator,trialEmail))
 useEffect(()=>{for(const path of Object.values(farmPlotImages)){if(path){const image=new Image();image.src=path}}},[])
 const [purchaseReceipt,setPurchaseReceipt]=useState<FarmPurchaseReceipt|null>(null),purchaseSequence=useRef(0)
 const dismissPurchase=useCallback(()=>setPurchaseReceipt(null),[])
 function celebratePurchase(receipt:Omit<FarmPurchaseReceipt,'id'>){const id=++purchaseSequence.current;setPurchaseReceipt({...receipt,id} as FarmPurchaseReceipt)}
 const [selectedTile,setSelectedTile]=useState<FarmTile>('dirt')
 const [previewState,setPreviewState]=useState(createTrial),state=account?.snapshot.state??previewState
 const [mode,setMode]=useState<Mode>('look'),[group,setGroup]=useState<'보관함'|null>(null)
 const goldSpend=useFarmGoldSpend(state.gold)
 const [editing,setEditing]=useState(false),[history,setHistory]=useState<TopviewState[]>([])
 useEffect(()=>{if(account)return;setState(previous=>withFarmSupplyInventory(removeRetiredMarket(previous)));setHistory(previous=>previous.map(item=>withFarmSupplyInventory(removeRetiredMarket(item))))},[])
 const [landBuyOpen,setLandBuyOpen]=useState(false)
 const [toolMenu,setToolMenu]=useState<ToolMenu|null>(null)
 const [resaleReceipt,setResaleReceipt]=useState<(FarmResaleReceipt&{id:number})|null>(null)
 const [saleTarget,setSaleTarget]=useState<FarmSaleTarget|null>(null),saleTargetRef=useRef<FarmSaleTarget|null>(null)
 const [fertilizerEffects,setFertilizerEffects]=useState<{id:number;x:number;y:number;supply:FarmSupply;expiresAt:number}[]>([])
 useEffect(()=>{if(!resaleReceipt)return;const timer=window.setTimeout(()=>setResaleReceipt(null),1800);return()=>window.clearTimeout(timer)},[resaleReceipt])
 useEffect(()=>{if(!fertilizerEffects.length)return;const timer=window.setTimeout(()=>setFertilizerEffects(previous=>previous.filter(item=>item.expiresAt>farmNow())),Math.max(0,Math.min(...fertilizerEffects.map(item=>item.expiresAt))-farmNow()));return()=>window.clearTimeout(timer)},[fertilizerEffects])
 const seedCursor=useRef<HTMLDivElement>(null)
 const [storageCategory,setStorageCategory]=useState<StorageCategory>('건물')
 const [shopFocus,setShopFocus]=useState<FarmTool|null>(null)
 const [shopOpen,setShopOpen]=useState(false),[shopTab,setShopTab]=useState<FarmShopTab>('건물'),[tilePickerOpen,setTilePickerOpen]=useState(false)
 const [inspectedAnimal,setInspectedAnimal]=useState<number|null>(null)
 useEffect(()=>{if(inspectedAnimal===null)return;const timer=window.setTimeout(()=>setInspectedAnimal(null),2600);return()=>window.clearTimeout(timer)},[inspectedAnimal])
 const [clearing,setClearing]=useState<{x:number;y:number;readyAt:number}[]>([])
 const [plantingEffects,setPlantingEffects]=useState<{id:number;x:number;y:number;expiresAt:number}[]>([])
 const [placementDust,setPlacementDust]=useState<{id:number;x:number;y:number;w:number;h:number;soft?:boolean;expiresAt:number}[]>([])
 useEffect(()=>{if(!placementDust.length)return;const timer=window.setTimeout(()=>setPlacementDust(items=>items.filter(item=>item.expiresAt>farmNow())),Math.max(0,Math.min(...placementDust.map(item=>item.expiresAt))-farmNow()));return()=>window.clearTimeout(timer)},[placementDust])
 useEffect(()=>{if(!plantingEffects.length)return;const timer=window.setTimeout(()=>setPlantingEffects(items=>items.filter(item=>item.expiresAt>farmNow())),Math.max(0,Math.min(...plantingEffects.map(item=>item.expiresAt))-farmNow()));return()=>window.clearTimeout(timer)},[plantingEffects])
 const [lastPurchasedSeed,setLastPurchasedSeed]=useState<CropKind>('wheat')
 const [selectedSeed,setSelectedSeed]=useState<CropKind>('wheat'),[seedMenu,setSeedMenu]=useState(false),[warehouseOpen,setWarehouseOpen]=useState(false)
 const [harvesting,setHarvesting]=useState<{id:number;readyAt:number}[]>([])
 const harvestingRef=useRef(harvesting);harvestingRef.current=harvesting
 const clearingRef=useRef(clearing);clearingRef.current=clearing
 const currentState=useRef(state);currentState.current=state
 function setState(action:TopviewState|((s:TopviewState)=>TopviewState)){
  if(account)return
  const next=typeof action==='function'?action(currentState.current):action
  currentState.current=next;setPreviewState(next)
 }
 async function confirmCommand(command:FarmCommand){
  if(!account)return true
  const saved=await account.execute(command)
  if(!saved)return false
  currentState.current=saved.state
  return true
 }
 const [productionId,setProductionId]=useState<number|null>(null),[productionMessage,setProductionMessage]=useState(''),[clock,setClock]=useState(farmNow)
 const [effect,setEffect]=useState<(FarmEffect&{id:number})|null>(null),effectId=useRef(0)
 const svgRef=useRef<SVGSVGElement>(null)
 const [orientationId,setOrientationId]=useState<number|null>(null)
 const [placementTransform,setPlacementTransform]=useState<FarmObjectTransform>({})
 const [moveTarget,setMoveTarget]=useState<{x:number;y:number}|null>(null),[notice,setNotice]=useState<{name:string}|null>(null)
 const [lastAdded,setLastAdded]=useState<string|null>(null)
 const [selected,setSelected]=useState<number|null>(null),[hover,setHover]=useState<{x:number;y:number}|null>(null)
 const [zoom,setZoom]=useState(()=>window.innerWidth<600?Math.max(.25,Math.min(1.05,(window.innerWidth-24)/(14*TILE))):1.15),[grid,setGrid]=useState(false),[message,setMessage]=useState(''),[help,setHelp]=useState(false)
 const [feedback,setFeedback]=useState(false)
 const [cookbookOpen,setCookbookOpen]=useState(false)
 const [completedWork,setCompletedWork]=useState<FarmCompletedWork[]>([])
 function retainCompletedWork(items:Omit<FarmCompletedWork,'expiresAt'>[]){if(items.length)setCompletedWork(old=>[...old.filter(work=>!items.some(item=>item.objectId===work.objectId)),...items.map(item=>({...item,expiresAt:farmNow()+1800}))])}
 useEffect(()=>{if(!completedWork.length)return;const timer=window.setTimeout(()=>setCompletedWork(old=>old.filter(work=>work.expiresAt>farmNow())),Math.max(0,Math.min(...completedWork.map(work=>work.expiresAt))-farmNow()));return()=>window.clearTimeout(timer)},[completedWork])
 useEffect(()=>{if(!message)return;setFeedback(true);const timer=window.setTimeout(()=>setFeedback(false),2600);return()=>window.clearTimeout(timer)},[message])
 const viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number;moved:boolean}|null>(null)
 const manualCamera=useRef(true),[cameraTarget,setCameraTarget]=useState<{x:number;y:number}|null>(null)
 const landTool:LandTool|null=mode==='land'?'place':mode==='land-recover'?'recover':null
 const tileTool:LandTool|null=mode==='tile-place'?'place':mode==='tile-recover'?'recover':null
 const clearingTool=mode==='plot',fertilizerTool=isFarmSupply(mode)?mode:null
 const cropTool=mode==='seed',availableLandTool=landTool==='place'&&!state.landStock?null:landTool,availableTileTool=tileTool==='place'&&!tileCount(state,selectedTile)?null:tileTool,brushActive=!!availableLandTool||!!availableTileTool||clearingTool||cropTool||!!fertilizerTool
 const landBrush=useLandBrush({tool:landBuyOpen||seedMenu||warehouseOpen||shopOpen||tilePickerOpen?null:clearingTool||cropTool||fertilizerTool?'place':availableTileTool??availableLandTool,readCell:readLandCell,tapOnly:!!fertilizerTool,canStart:cropTool?cell=>{const object=objectAt(state,cell.x,cell.y);return !!object&&(object.kind==='plot'||isFarmAnimal(object.kind))}:landTool?cell=>applyLandStroke(state,landTool,[cell]).changed.length>0:tileTool?cell=>applyTileStroke(state,tileTool,[cell],clearing,selectedTile).changed.length>0:undefined,onCommit:(active,cells)=>fertilizerTool?(cells[0]&&applyFertilizer(cells[0].x,cells[0].y,fertilizerTool)):clearingTool?startClearing(cells):cropTool?plantCells(cells):tileTool?commitTileStroke(active,cells):commitLandStroke(active,cells)})
 const objectDrag=useFarmObjectDrag({movingId:mode==='move'?selected:null,enabled:toolMenu==='move'&&!shopOpen&&!productionId&&!warehouseOpen,readCell:readLandCell,find:id=>currentState.current.objects.find(o=>o.id===id&&!o.constructionReadyAt),onSelect:moveFromDialog,onPreview:setMoveTarget,onDrop:(id,target)=>confirmMove(target,id),onCancel:()=>{cancelMove();setSelected(null)}})
 const camera=useFarmCamera({viewport,svg:svgRef,zoom,setZoom,brushActive:brushActive||mode==='move',manual:()=>{manualCamera.current=true;setCameraTarget(null)},cancelTool:()=>{objectDrag.cancel();landBrush.cancel();drag.current=null}})
 const landPreview=useMemo(()=>landBrush.draft&&landTool?applyLandStroke(state,landBrush.draft.tool,landBrush.draft.cells):null,[state,landBrush.draft,landTool])
 const tilePreview=useMemo(()=>landBrush.draft&&tileTool?applyTileStroke(state,landBrush.draft.tool,landBrush.draft.cells,clearing,selectedTile):null,[state,landBrush.draft,tileTool,clearing,selectedTile])
 const limits=farmLimits(state),productionObject=state.objects.find(o=>o.id===productionId)
 const clearingCapacity=Math.max(0,limits.plots-limits.usedPlots-clearing.length)
 const seedTotal=cropKinds.reduce((total,crop)=>total+state.simulation.inventory[seedGood(crop)],0)
 const seedCursorActive=cropTool&&!seedMenu&&state.simulation.inventory[seedGood(selectedSeed)]>0
 useEffect(()=>{if(!seedCursorActive&&seedCursor.current)seedCursor.current.style.display='none'},[seedCursorActive])
 const constructing=state.objects.filter(o=>o.constructionReadyAt!==undefined)
 useEffect(()=>{
  const before=currentState.current,next=finishFarmConstruction(before,clock)
  if(next===before)return
  if(account){void confirmCommand({type:'tick'});return}
  setState(next);setHistory([]);setMessage('건설 완료! 건물을 사용할 수 있어요.')
 },[state,clock])
 const running=[...constructing.map(o=>o.constructionReadyAt),...clearing.map(job=>job.readyAt),...harvesting.map(job=>job.readyAt),state.simulation.researchJob?.readyAt,...Object.values(state.simulation.butcherJobs??{}).map(job=>job.readyAt),...Object.values(state.simulation.millJobs).map(job=>job.readyAt),...Object.values(state.simulation.animalPurchaseJobs).map(j=>j.readyAt),...Object.values(state.simulation.upgradeJobs).map(j=>j.readyAt),...Object.values(state.simulation.processingJobs).map(j=>j.readyAt),...Object.values(state.simulation.cropJobs).map(j=>j.readyAt+CROP_FRESH_MS),...Object.values(state.simulation.animalJobs)].some(t=>t&&t>clock)
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setClock(farmNow()),running?100:1000);return()=>window.clearInterval(timer)},[running])
 const orderDay=farmOrderDay(clock)
 useEffect(()=>{
  const refresh=()=>setClock(farmNow()),now=farmNow(),day=86400000,offset=9*60*60*1000
  const timer=window.setTimeout(refresh,(Math.floor((now+offset)/day)+1)*day-offset-now)
  window.addEventListener('focus',refresh)
  return()=>{window.clearTimeout(timer);window.removeEventListener('focus',refresh)}
 },[orderDay])
 useEffect(()=>{if(!effect)return;const timer=window.setTimeout(()=>setEffect(null),1800);return()=>window.clearTimeout(timer)},[effect])
 useEffect(()=>{
  const before=currentState.current,done:Omit<FarmCompletedWork,'expiresAt'>[]=[];let next=before
  for(const [id,job] of Object.entries(before.simulation.upgradeJobs))if(job.readyAt<=clock){const result=simulateFarm(next,Number(id),{type:'completeUpgrade'},clock);if(result.state!==next){done.push({objectId:Number(id),kind:'upgrade'});next=result.state}}
  if(next!==before){if(account){void confirmCommand({type:'tick'});return}setState(next);setHistory([]);retainCompletedWork(done);setMessage('업그레이드 완료! 건물을 다시 사용할 수 있어요.')}
 },[state,clock])
 useEffect(()=>{
  const before=currentState.current,job=before.simulation.researchJob
  if(!job||job.readyAt>clock)return
  const result=simulateFarm(before,job.labId,{type:'completeResearch'},clock)
  if(result.state===before)return
  if(account){void confirmCommand({type:'tick'});return}
  setState(result.state);setHistory([])
  retainCompletedWork([{objectId:job.labId,kind:'research',good:seedGood(job.crop)}])
  if(productionId===job.labId)setProductionMessage(result.message)
  if(result.effect)setEffect({...result.effect,id:++effectId.current})
 },[state,clock,productionId])
 function completeResale(result:FarmResaleResult){
  if(result.state===currentState.current){setMessage(result.message);setProductionMessage(result.message);return}
  setState(result.state);setHistory([]);setClock(farmNow());finishTool();setProductionId(null);setWarehouseOpen(false);setOrientationId(null);setSelected(null);setMessage(result.receipt&&topviewItems[result.receipt.kind].group==='건물'?`${topviewItems[result.receipt.kind].name} 건물을 제거했어요.`:result.message);setProductionMessage('');setEffect(null);setPurchaseReceipt(null)
  if(result.receipt){const id=++effectId.current;setResaleReceipt({...result.receipt,id});playSaleSound('farm-resale-'+crypto.randomUUID())}
 }
 function openSaleConfirmation(target:FarmSaleTarget){saleTargetRef.current=target;setSaleTarget(target)}
 function closeSaleConfirmation(){saleTargetRef.current=null;setSaleTarget(null)}
 function sellObject(id:number){
  const before=currentState.current,object=before.objects.find(o=>o.id===id),reason=farmObjectResaleError(before,id)
  if(!object||reason){setMessage(reason??'판매할 개체를 선택해주세요.');return}
  openSaleConfirmation({source:'placed',id,kind:object.kind})
 }
 function sellStored(kind:FarmTool){
  if(!currentState.current.stored.includes(kind)||!isResellableFarmKind(kind)){setMessage('판매할 건물이나 동물을 확인해주세요.');return}
  openSaleConfirmation({source:'stored',kind})
 }
 async function confirmSale(){
  const target=saleTargetRef.current;if(!target)return
  // Consume the request before selling, so a second click cannot sell another copy.
  closeSaleConfirmation()
  const before=currentState.current
  if(target.source==='placed'&&before.objects.find(o=>o.id===target.id)?.kind!==target.kind){setMessage('판매할 개체를 다시 확인해주세요.');return}
  if(account&&!await confirmCommand(target.source==='placed'?{type:'resell',id:target.id}:{type:'resellStored',kind:target.kind}))return
  completeResale(target.source==='placed'?resellFarmObject(before,target.id):resellStoredFarmItem(before,target.kind))
 }
 async function applyFertilizer(x:number,y:number,supply:FarmSupply){
  const before=currentState.current,plot=objectAt(before,x,y)
  if(!plot){setMessage('자라고 있는 작물이 심어진 밭을 선택해주세요.');return}
  const result=simulateFarm(before,plot.id,{type:'fertilize',supply},farmNow());setMessage(result.message)
  if(result.state===before)return
  if(account&&!await confirmCommand({type:'simulate',id:plot.id,action:{type:'fertilize',supply}}))return
  setState(result.state);setHistory([]);setClock(farmNow());setFertilizerEffects(previous=>[...previous,{id:++effectId.current,x,y,supply,expiresAt:farmNow()+900}])
 }
 function selectFertilizer(supply:FarmSupply){landBrush.cancel();setSeedMenu(false);setEditing(false);setGrid(true);setGroup(null);setToolMenu('farm');choose(fertilizerTool===supply?'look':supply);setMessage(fertilizerTool===supply?'':farmSupplies[supply].description+' · 자라고 있는 밭을 눌러주세요.')}
 async function act(action:FarmSimAction){
  if(!productionObject)return
  if(action.type==='collectFlour'||action.type==='collectCraft'||action.type==='completeAnimalPurchase'||action.type==='discardCrop'){receiveProduction(productionObject.id,action);return}
  if(action.type==='harvest'){setProductionId(null);startHarvest([{x:productionObject.x,y:productionObject.y}]);return}
  const result=simulateFarm(state,productionObject.id,action,farmNow())
  if(result.state!==state&&account&&!await confirmCommand({type:'simulate',id:productionObject.id,action}))return
  setProductionMessage(result.message)
  if(result.state!==state){
   if(action.type==='plant')setPlantingEffects(items=>[...items,{id:++effectId.current,x:productionObject.x,y:productionObject.y,expiresAt:farmNow()+900}])
   if(action.type==='seed'){const purchased=cropKinds.find(c=>seedGood(c)===action.good);if(purchased)setLastPurchasedSeed(purchased)}
   if(['plant','mill','craft','research','animal','startAnimal','feed'].includes(action.type)){setProductionId(null);setSelected(null);setProductionMessage('');}
  }
  if(result.state!==state){setState(result.state);setHistory([]);setClock(farmNow());if(result.effect){const id=++effectId.current;setEffect({...result.effect,id});if(result.effect.type==='sell')playSaleSound('farm-sale-'+farmNow()+'-'+id)}}
  if(result.place){setProductionId(null);setEditing(true);setGrid(true);choose(result.place);setGroup('보관함');setMessage(result.message)}
 }
 async function receiveProduction(id:number,action:FarmSimAction){
  const before=currentState.current,result=simulateFarm(before,id,action,farmNow())
  if(result.state===before){setMessage(result.message);setProductionMessage(result.message);return}
  if(account&&!await confirmCommand({type:'simulate',id,action}))return
  setState(result.state);setHistory([]);setClock(farmNow());setProductionId(null);setProductionMessage('');setMessage('');setNotice(null)
  if(result.effect)setEffect({...result.effect,id:++effectId.current})
 }
 async function collectAnimal(id:number){
  const before=currentState.current,readyAt=before.simulation.animalJobs[id],now=farmNow()
  if(readyAt!==undefined&&readyAt>now){setInspectedAnimal(id);return}
  setInspectedAnimal(null)
  const result=simulateFarm(before,id,{type:readyAt===undefined?'startAnimal':'collectAnimal'},now)
  if(result.state!==before&&account&&!await confirmCommand({type:'simulate',id,action:{type:readyAt===undefined?'startAnimal':'collectAnimal'}}))return
  if(result.state!==before){setState(result.state);setHistory([]);setClock(farmNow());if(result.effect){const id=++effectId.current;setEffect({...result.effect,id});if(result.effect.type==='sell')playSaleSound('farm-sale-'+farmNow()+'-'+id)}}
  setMessage(result.state!==before&&result.effect?'':result.message)
 }
 function claimAnimalPurchase(id:number){
  receiveProduction(id,{type:'completeAnimalPurchase'})
 }
 async function warehouseAction(action:FarmSimAction){
  const object=warehouseObject;if(!object)return
  const result=simulateFarm(currentState.current,object.id,action,farmNow())
  if(result.state!==currentState.current&&account&&!await confirmCommand({type:'simulate',id:object.id,action}))return
  if(result.state!==currentState.current){setState(result.state);setHistory([]);setClock(farmNow())}
  setMessage(result.message)
 }
 const warehouseObject=(state.objects.find(o=>o.id===selected&&o.kind==='warehouse')??activeBuildings(state,'warehouse')[0]??state.objects.find(o=>o.kind==='warehouse'))

 function startPlanting(crop:CropKind){setProductionId(null);setWarehouseOpen(false);setSeedMenu(false);setEditing(false);setGroup(null);setToolMenu('farm');choose('seed');setSelectedSeed(crop);setMessage('빈 밭을 누르거나 드래그해 연속으로 심어요. 빈 곳을 드래그하면 지도를 이동해요.')}
 function toggleToolMenu(next:ToolMenu){const active=toolMenu!==next;finishTool();setProductionId(null);setWarehouseOpen(false);setToolMenu(active?next:null);if(active&&(next==='move'||next==='recover')){setEditing(true);setGrid(true);setMessage(next==='move'?'건물·동물·장식물을 드래그해 옮겨요.':'보관함으로 회수할 대상을 선택해주세요. 밭은 제거돼요.')}}
 function finishTool(){choose('look');setToolMenu(null);setSeedMenu(false);setTilePickerOpen(false);setEditing(false);setGrid(false);setGroup(null);setMessage('')}
 function navigateCookbook(kind:FarmTool){
  setCookbookOpen(false);finishTool();setHelp(false)
  const object=currentState.current.objects.find(o=>o.kind===kind&&!o.constructionReadyAt)
  if(object){setSelected(object.id);setProductionMessage('');setProductionId(object.id);manualCamera.current=false;setCameraTarget({x:(object.x+topviewItems[kind].w/2)*TILE,y:(object.y+topviewItems[kind].h/2)*TILE});return}
  if(currentState.current.stored.includes(kind)){setEditing(true);setGrid(true);choose(kind);setGroup('보관함');return}
  openFarmShop('건물');setShopFocus(kind)
 }
 function openCookbook(){finishTool();setHelp(false);setProductionId(null);setWarehouseOpen(false);setClock(farmNow());setCookbookOpen(true)}

 function openFarmShop(tab:FarmShopTab='건물'){setShopFocus(null);choose('look');setEditing(false);setGrid(false);setSeedMenu(false);setTilePickerOpen(false);setProductionId(null);setWarehouseOpen(false);setGroup(null);setShopTab(tab);setShopOpen(true)}
 async function purchaseItem(kind:FarmTool,quantity=1){const before=currentState.current,next=buyFarmItem(before,kind,quantity);if(next===before)return '보유 한도와 골드를 확인해주세요.';if(account&&!await confirmCommand({type:'buy',kind,quantity}))return '구매 결과를 확인해주세요.';setState(next);setHistory([]);celebratePurchase({kind,name:topviewItems[kind].name,quantity});return ''}
 async function purchaseTiles(quantity:number,tile:FarmTile='dirt'){const before=currentState.current,next=buyFarmTiles(before,quantity,tile);if(next===before)return '수량과 남은 골드를 확인해주세요.';if(account&&!await confirmCommand({type:'buyTiles',quantity,tile}))return '구매 결과를 확인해주세요.';setState(next);setHistory([]);celebratePurchase({tile,name:farmTiles.find(item=>item.id===tile)!.name,quantity});return ''}
 function openSeedPicker(){landBrush.cancel();choose('look');setEditing(false);setGroup(null);setToolMenu('farm');setSeedMenu(true)}
 function moveFromDialog(id:number){setOrientationId(id);const object=currentState.current.objects.find(item=>item.id===id);if(!object||object.constructionReadyAt)return;if(mode!=='move'||selected!==id)setPlacementTransform({rotation:object.rotation,flipped:object.flipped});landBrush.cancel();setToolMenu('move');drag.current=null;setProductionId(null);setWarehouseOpen(false);setEditing(true);setGrid(true);setGroup(null);setSelected(id);setMode('move');setMoveTarget({x:object.x,y:object.y});setMessage('드래그해서 놓거나, 원하는 곳을 눌러 이동해요. 놓을 수 없는 곳은 원래 자리로 돌아가요.')}
 useLayoutEffect(()=>{
  const el=viewport.current;if(!el)return
  const fit=()=>{if(!manualCamera.current)setZoom(Math.max(.25,Math.min(1,(el.clientWidth-32)/800,(el.clientHeight-32)/640)))}
  fit();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(fit);observer?.observe(el)
  return()=>observer?.disconnect()
 },[])
 useLayoutEffect(()=>{
  if(camera.skipCenter.current){camera.skipCenter.current=false;return}
  const el=viewport.current,svg=svgRef.current;if(!el||!svg)return
  const bounds=svg.getBoundingClientRect(),box=el.getBoundingClientRect(),scale=bounds.width/(MAP_W*TILE+seaMargin*2)
  const target=cameraTarget??{x:11.5*TILE,y:10.5*TILE}
  el.scrollLeft+=bounds.left+(target.x+seaMargin)*scale-box.left-box.width/2
  el.scrollTop+=bounds.top+(target.y+seaMargin)*scale-box.top-box.height/2
 },[zoom,cameraTarget])
 const tool=mode in topviewItems?mode as FarmTool:null,moving=state.objects.find(o=>o.id===selected)
 const previewKind=tool??(mode==='move'?moving?.kind:undefined)
 const previewCell=mode==='move'?moveTarget:hover
 const previewSize=previewKind?objectFootprint({kind:previewKind,...placementTransform}):null
 const valid=!!previewKind&&!!previewCell&&placementValid(state,previewKind,previewCell.x,previewCell.y,mode==='move'?selected??undefined:undefined,placementTransform.rotation)
 function commit(next:TopviewState,before=state){if(next===before)return;setNotice(null);setHistory(old=>[...old.slice(-29),before]);setState(next)}
 async function plantCells(cells:LandCell[]){
  if(cells.length===1){const animal=objectAt(currentState.current,cells[0].x,cells[0].y);if(animal&&isFarmAnimal(animal.kind)){collectAnimal(animal.id);return}}
  if(cells.length===1){const plot=objectAt(currentState.current,cells[0].x,cells[0].y),job=plot&&currentState.current.simulation.cropJobs[plot.id];if(plot?.kind==='plot'&&job&&job.readyAt<=farmNow()){if(cropIsRotten(job,farmNow())){receiveProduction(plot.id,{type:'discardCrop'});return}startHarvest(cells);return}}
  const before=currentState.current,planted:TopviewObject[]=[];let next=before
  for(const cell of cells){const plot=objectAt(next,cell.x,cell.y);if(plot?.kind!=='plot')continue
   const result=simulateFarm(next,plot.id,{type:'plant',crop:selectedSeed},farmNow())
   if(result.state!==next){next=result.state;planted.push(plot)}
  }
  if(next!==before){
   if(account&&!await confirmCommand({type:'batch',commands:planted.map(plot=>({type:'simulate',id:plot.id,action:{type:'plant',crop:selectedSeed}}))}))return
   setState(next);setHistory([]);setClock(farmNow())
   const expiresAt=farmNow()+900
   setPlantingEffects(items=>[...items.filter(item=>item.expiresAt>farmNow()),...planted.slice(0,12).map(plot=>({id:++effectId.current,x:plot.x,y:plot.y,expiresAt}))].slice(-12))
  }
  setMessage(planted.length?`${farmCrops[selectedSeed].name} ${planted.length}칸을 심었어요.`:'빈 밭과 보유 종자를 확인해주세요.')
 }
 async function startHarvest(cells:LandCell[]){
  if(!warehouseAvailable(currentState.current)){setMessage('수확물을 보관할 창고를 먼저 배치해주세요.');return}
  setProductionId(null);setSelected(null)
  const before=currentState.current,jobs=[...harvestingRef.current],now=farmNow();let next=before,rejected=''
  for(const cell of cells){const plot=objectAt(before,cell.x,cell.y),crop=plot&&before.simulation.cropJobs[plot.id]
   if(plot?.kind!=='plot'||!crop||crop.readyAt>now||jobs.some(job=>job.id===plot.id))continue
   const result=simulateFarm(next,plot.id,{type:'beginHarvest'},now)
   if(result.state===next){rejected=result.message;continue}
   next=result.state;jobs.push({id:plot.id,readyAt:now+3000})
  }
  if(next!==before){if(account&&!await confirmCommand({type:'batch',commands:jobs.filter(j=>!harvestingRef.current.some(old=>old.id===j.id)).map(job=>({type:'simulate',id:job.id,action:{type:'beginHarvest'}}))}))return;setState(next);setHistory([])}
  const confirmedJobs=account?jobs.map(job=>({...job,readyAt:(currentState.current.simulation.cropJobs[job.id]?.harvestingAt??now)+3000})):jobs
  harvestingRef.current=confirmedJobs;setHarvesting(confirmedJobs);setClock(now);setMessage(rejected||(jobs.length?'낫으로 수확하고 있어요…':'다 자란 작물을 선택해주세요.'))
 }
 useEffect(()=>{
  if(!account)return
  const jobs=Object.entries(state.simulation.cropJobs).flatMap(([id,job])=>job.harvestingAt===undefined?[]:[{id:Number(id),readyAt:Math.max(job.harvestingAt+3000,harvestingRef.current.find(j=>j.id===Number(id))?.readyAt??0)}])
  harvestingRef.current=jobs;setHarvesting(jobs)
 },[account?.snapshot.revision])
 useEffect(()=>{
  if(!harvesting.length)return
  const timer=window.setTimeout(async()=>{
   const before=currentState.current,now=farmNow(),done:Omit<FarmCompletedWork,'expiresAt'>[]=[];let next=before,count=0,message=''
   for(const job of harvestingRef.current.filter(job=>job.readyAt<=now)){
    const result=simulateFarm(next,job.id,{type:'harvest'},now)
    message=result.message;if(result.state!==next){done.push({objectId:job.id,kind:'harvest',good:next.simulation.cropJobs[job.id]?.crop});next=result.state;count++}else next=simulateFarm(next,job.id,{type:'cancelHarvest'},now).state
   }
   if(next!==before){if(account&&!await confirmCommand({type:'batch',commands:harvestingRef.current.filter(job=>job.readyAt<=now&&before.simulation.cropJobs[job.id]).map(job=>({type:'simulate',id:job.id,action:{type:'harvest'}}))})){setHarvesting(jobs=>jobs.map(j=>({...j,readyAt:Math.max(j.readyAt,farmNow()+1000)})));return}setState(next);setHistory([])}
   retainCompletedWork(done)
   const received=cropKinds.filter(crop=>next.simulation.inventory[crop]>before.simulation.inventory[crop]).map(good=>({good,quantity:next.simulation.inventory[good]-before.simulation.inventory[good]}))
   if(count){if(received.length)setEffect({type:'harvest',good:received[0].good,quantity:received[0].quantity,items:received,id:++effectId.current})}
   setHarvesting(jobs=>jobs.filter(job=>job.readyAt>now));setMessage(count?'':message)

  },Math.max(0,Math.min(...harvesting.map(job=>job.readyAt))-farmNow()))
  return()=>window.clearTimeout(timer)
 },[harvesting])
 useEffect(()=>{
  if(!clearing.length)return
  const timer=window.setTimeout(async()=>{
   const now=farmNow(),before=currentState.current,done:Omit<FarmCompletedWork,'expiresAt'>[]=[];let next=before,count=0
   for(const job of clearingRef.current.filter(job=>job.readyAt<=now)){
    if(farmPlacementError(next,'plot')||!placementValid(next,'plot',job.x,job.y)||next.paths.includes(cellKey(job.x,job.y)))continue
    done.push({objectId:next.nextId,kind:'clearing'});next={...next,objects:[...next.objects,{id:next.nextId,kind:'plot',x:job.x,y:job.y}],nextId:next.nextId+1};count++
   }
   if(next!==before){if(account&&!await confirmCommand({type:'clear',cells:clearingRef.current.filter(job=>job.readyAt<=now)})){setClearing(jobs=>jobs.map(j=>({...j,readyAt:Math.max(j.readyAt,farmNow()+1000)})));return}commit(next,before)}
   retainCompletedWork(done)
   setClearing(jobs=>jobs.filter(job=>job.readyAt>now))
   setMessage(count?`개간 완료! 밭 ${count}칸이 생겼어요.`:'개간할 수 없는 칸은 건너뛰었어요.')
  },Math.max(0,Math.min(...clearing.map(job=>job.readyAt))-farmNow()))
  return()=>window.clearTimeout(timer)
 },[clearing])
 function startClearing(cells:LandCell[]){
  const before=currentState.current,jobs=[...clearingRef.current],limits=farmLimits(before)
  let count=0
  for(const cell of cells){
   if(jobs.some(job=>job.x===cell.x&&job.y===cell.y)||!placementValid(before,'plot',cell.x,cell.y)||before.paths.includes(cellKey(cell.x,cell.y)))continue
   if(limits.usedPlots+jobs.length>=limits.plots)break
   jobs.push({...cell,readyAt:farmNow()+FARM_CLEARING_MS});count++
  }
  clearingRef.current=jobs;setClearing(jobs);setHover(null)
  setMessage(count?`${count}칸을 개간하고 있어요…`:'빈 땅과 개간 가능 수량을 확인해주세요.')
 }
 function readLandCell(clientX:number,clientY:number):LandCell|null{
  const bounds=svgRef.current?.getBoundingClientRect()
  if(!bounds?.width||!bounds.height)return null
  const x=Math.floor(((clientX-bounds.left)/bounds.width*(MAP_W*TILE+seaMargin*2)-seaMargin)/TILE),y=Math.floor(((clientY-bounds.top)/bounds.height*(MAP_H*TILE+seaMargin*2)-seaMargin)/TILE)
  return x>=0&&y>=0&&x<MAP_W&&y<MAP_H?{x,y}:null
 }
 async function commitLandStroke(active:LandTool,cells:LandCell[]){
  const before=currentState.current,result=applyLandStroke(before,active,cells)
  if(result.changed.length&&account&&!await confirmCommand({type:'land',tool:active,cells}))return
  if(result.changed.length&&active==='place'){
   const expiresAt=farmNow()+600
   // One sound per gesture; bound visual bursts for long strokes on phones.
   setPlacementDust(items=>[...items.filter(item=>item.expiresAt>farmNow()),...result.changed.slice(0,12).map(cell=>({id:++effectId.current,...cell,w:1,h:1,soft:true,expiresAt}))].slice(-12))
   playFarmPlacementSound(.22)
  }
  if(result.changed.length){commit(result.state,before);setLastAdded(active==='place'?cellKey(result.changed[0].x,result.changed[0].y):null);setMessage(`${result.changed.length}칸을 ${active==='place'?'놓았어요':'회수했어요'}. 여분 ${result.state.landStock}칸${result.blocked.length?` · ${result.blocked.length}칸은 건너뛰었어요.`:''}`)}
  else if(result.blocked.length)setMessage(landBlockMessages[result.blocked[0].reason])
 }
 async function commitTileStroke(active:LandTool,cells:LandCell[]){
  const before=currentState.current,result=applyTileStroke(before,active,cells,clearingRef.current,selectedTile)
  if(result.changed.length&&account&&!await confirmCommand({type:'tile',tool:active,cells:result.changed,tile:selectedTile}))return
  if(result.changed.length){commit(result.state,before);setMessage(`타일 ${result.changed.length}개를 ${active==='place'?'깔았어요':'회수했어요'}.`)}
  else setMessage(active==='place'?'빈 땅과 보유 타일 수량을 확인해주세요.':'회수할 타일이 있는 곳을 골라주세요.')
 }
 function buyLand(quantity:number):boolean|Promise<boolean>{const before=currentState.current,next=buyLandStock(before,quantity);if(next===before)return false;const finish=()=>{setState(next);setHistory([]);setNotice(null);setMessage(`땅 ${quantity}칸을 여분으로 보관했어요.`);return true};return account?confirmCommand({type:'buyLand',quantity}).then(ok=>ok?finish():false):finish()}
 function openLandShop(){landBrush.cancel();setHelp(false);setLandBuyOpen(true)}
 function resetTrial(){if(account)return;closeSaleConfirmation();goldSpend.reset(createTrial().gold);setCompletedWork([]);finishTool();setCookbookOpen(false);setToolMenu(null);setLastPurchasedSeed('wheat');setProductionId(null);setShopOpen(false);setTilePickerOpen(false);setHarvesting([]);harvestingRef.current=[];setSeedMenu(false);setWarehouseOpen(false);setClearing([]);clearingRef.current=[];landBrush.cancel();setState(createTrial());setHistory([]);setClock(farmNow());setEffect(null);setResaleReceipt(null);setFertilizerEffects([]);choose('look');setGroup(null);setLastAdded(null)}
 useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(null),4500);return()=>window.clearTimeout(timer)},[notice])
 function cancelMove(){setMode('look');setMoveTarget(null);setHover(null)}
 async function undo(){if(clearing.length||harvesting.length||constructing.length)return;const previous=history.at(-1);if(!previous)return;if(account&&!await confirmCommand({type:'undo'}))return;goldSpend.reset(account?currentState.current.gold:previous.gold);landBrush.cancel();setState(previous);setHistory(old=>account?[]:old.slice(0,-1));setLastAdded(null);setSelected(null);setHover(null);setMoveTarget(null);setNotice(null);if(!landTool)setMode('look');setMessage('마지막 편집을 되돌렸어요.')}
 async function recover(id:number){
  const moving=currentState.current.objects.find(object=>object.id===id)
  if(!moving)return
  if(topviewItems[moving.kind].group==='건물'){storeBuilding(moving.id,true);return}
  if(state.simulation.animalPurchaseJobs[moving.id]){setMessage('준비 중인 동물이 보관함에 도착한 뒤 회수해주세요.');return}
  if(state.simulation.upgradeJobs[moving.id]){setMessage('업그레이드를 완료하거나 취소한 뒤 회수해주세요.');return}
  if(state.simulation.researchJob?.labId===moving.id){setMessage('연구가 끝난 뒤 연구소를 회수해주세요.');return}
  if(state.simulation.processingJobs[moving.id]||state.simulation.butcherJobs?.[moving.id]){setMessage('가공품을 먼저 받은 뒤 건물을 회수해주세요.');return}
  if(state.simulation.cropJobs[moving.id]||state.simulation.animalJobs[moving.id]!==undefined||(moving.kind==='mill'&&state.simulation.millJobs[moving.id])){setMessage(moving.kind==='plot'?'작물을 먼저 수확하거나 폐기한 뒤 밭을 제거해주세요.':'생산물을 먼저 수령한 뒤 회수해주세요.');return}
  const after={...state,objects:state.objects.filter(o=>o.id!==moving.id)},nextLimits=farmLimits(after)
  if(moving.kind==='warehouse'&&farmStorageUsage(state.simulation)>warehouseCapacity(after)){setMessage('생산물을 판매하거나 다른 창고를 마련한 뒤 회수해주세요.');return}
  if(nextLimits.usedPlots>nextLimits.plots||nextLimits.usedAnimals>nextLimits.animals){setMessage('관리소를 회수하기 전에 초과한 텃밭이나 동물을 먼저 회수해주세요.');return}
  if(moving.kind==='plot'){
   if(account&&!await confirmCommand({type:'recover',id}))return
   commit({...state,objects:state.objects.filter(o=>o.id!==moving.id)})
   setSelected(null);setMode('look');setMessage('밭을 제거했어요.');return
  }
  const levels=state.storedLevels?.[moving.kind]??state.stored.filter(kind=>kind===moving.kind).map(()=>1)
  const animalJobs={...state.simulation.animalJobs};delete animalJobs[moving.id]
  if(account&&!await confirmCommand({type:'recover',id}))return
  commit({...state,simulation:{...state.simulation,animalJobs},objects:state.objects.filter(o=>o.id!==moving.id),stored:[...state.stored,moving.kind],storedTransforms:{...state.storedTransforms,[moving.kind]:[...(state.storedTransforms?.[moving.kind]??state.stored.filter(kind=>kind===moving.kind).map(()=>({}))),{rotation:moving.rotation,flipped:moving.flipped}]},storedLevels:isUpgradeable(moving.kind)?{...state.storedLevels,[moving.kind]:[...levels,buildingLevel(moving)]}:state.storedLevels})
  setNotice({name:topviewItems[moving.kind].name});setSelected(null);setMode('look');setMessage('보관함에서 다시 꺼내 배치할 수 있어요.')
 }
 async function storeBuilding(id:number,fromEditor=false){
  const before=currentState.current,error=farmBuildingStorageError(before,id,clearing.length)
  if(error){setMessage(error);setProductionMessage(error);return}
  const object=before.objects.find(o=>o.id===id),result=simulateFarm(before,id,{type:'storeBuilding'},farmNow())
  if(result.state!==before&&account&&!await confirmCommand({type:'simulate',id,action:{type:'storeBuilding'}}))return
  if(result.state===before){setMessage(result.message);return}
  if(fromEditor)commit(result.state,before);else{setState(result.state);setHistory([])}
  setProductionId(null);setWarehouseOpen(false);setSelected(null);setMode('look');setMoveTarget(null);setMessage(result.message)
  if(fromEditor&&object)setNotice({name:topviewItems[object.kind].name})
 }
 async function confirmMove(target:LandCell|null=moveTarget,objectId=selected){
  const before=currentState.current,object=before.objects.find(o=>o.id===objectId)
  if(object?.constructionReadyAt){setMessage('건설이 끝난 뒤 옮길 수 있어요.');return}
  if(!object||!target||!placementValid(before,object.kind,target.x,target.y,object.id,placementTransform.rotation)){cancelMove();setSelected(null);setMessage('놓을 수 없는 곳이라 원래 자리로 돌아왔어요.');return}
  if(account&&!await confirmCommand({type:'move',id:object.id,x:target.x,y:target.y,transform:placementTransform}))return
  if(object.x!==target.x||object.y!==target.y||(object.rotation??0)!==(placementTransform.rotation??0)||!!object.flipped!==!!placementTransform.flipped)commit({...before,objects:before.objects.map(o=>o.id===object.id?{...o,...target,...placementTransform}:o)},before)
  if(topviewItems[object.kind].group==='건물'){setPlacementDust(items=>[...items,{id:++effectId.current,...target,...objectFootprint({...object,...placementTransform}),expiresAt:farmNow()+600}]);playFarmPlacementSound()}
  cancelMove();setSelected(null);setMessage(object.x===target.x&&object.y===target.y?'원래 자리에 놓았어요.':'배치를 옮겼어요.')
 }
 function choose(next:Mode){setOrientationId(null);objectDrag.cancel();setPlacementTransform({});landBrush.cancel();setMoveTarget(null);setNotice(null);setMode(next);setSelected(null);setHover(null);setMessage(next==='land'?'여분 땅을 꺼내 원하는 바다에 놓아주세요.':next==='land-recover'?'빈 땅을 선택해 여분으로 회수하세요.':'원하는 위치를 눌러 배치해 보세요.')}
 async function cellClick(x:number,y:number,keyboard=false){
  if(!keyboard&&(objectDrag.ignoresClick()||camera.ignoresClick()))return
  if(!keyboard&&landBrush.ignoresClick())return
  if(drag.current?.moved)return
  setEffect(null)
  setOrientationId(null)
  const construction=objectAt(currentState.current,x,y)
  if(construction?.constructionReadyAt){setMessage(`건설 중 · ${Math.max(0,Math.ceil((construction.constructionReadyAt-farmNow())/1000))}초 남았어요.`);return}
  if(!editing&&mode==='look'){const found=objectAt(currentState.current,x,y),sim=currentState.current.simulation,now=farmNow();if(found){
   if(sim.animalPurchaseJobs[found.id]?.readyAt<=now){claimAnimalPurchase(found.id);return}
   if(sim.butcherJobs?.[found.id]&&sim.butcherJobs[found.id].readyAt<=now){receiveProduction(found.id,{type:'collectMeat'});return}
   if(found.kind==='mill'&&sim.millJobs[found.id]&&sim.millJobs[found.id].readyAt<=now){receiveProduction(found.id,{type:'collectFlour'});return}
   if(sim.processingJobs[found.id]?.readyAt<=now){receiveProduction(found.id,{type:'collectCraft'});return}
  }}
  if(fertilizerTool){applyFertilizer(x,y,fertilizerTool);return}
  if(mode==='seed'){plantCells([{x,y}]);return}
  if(tileTool){if(keyboard)landBrush.cancel();commitTileStroke(tileTool,[{x,y}]);return}
  if(landTool){if(keyboard)landBrush.cancel();commitLandStroke(landTool,[{x,y}]);return}
  if(clearingTool){startClearing([{x,y}]);return}
  if(!editing){const found=objectAt(state,x,y);if(found){if(canFlipFarmObject(found.kind)){setOrientationId(found.id);setSelected(found.id);return}if(state.simulation.animalPurchaseJobs[found.id]?.readyAt<=farmNow()){claimAnimalPurchase(found.id);return}if(isFarmAnimal(found.kind)){collectAnimal(found.id);return}if(found.kind==='plot'&&state.simulation.cropJobs[found.id]&&cropIsRotten(state.simulation.cropJobs[found.id],farmNow())){receiveProduction(found.id,{type:'discardCrop'});return}if(found.kind==='warehouse'){setSelected(found.id);setWarehouseOpen(true);return}if(found.kind==='plot'&&state.simulation.cropJobs[found.id]?.readyAt<=farmNow()){startHarvest([{x,y}]);return}setSelected(found.id);setMessage(topviewItems[found.kind].name);if(topviewItems[found.kind].group==='건물'||(found.kind==='plot'||isFarmAnimal(found.kind))){setProductionMessage('');setProductionId(found.id)}}return}
  const found=objectAt(state,x,y)
  if(mode==='move'){confirmMove({x,y});return}
  if(found&&toolMenu==='move'){moveFromDialog(found.id);return}
  if(found&&toolMenu==='recover'){recover(found.id);return}
  if(found){setSelected(found.id);setMode('look');setGroup(null);setHover(null);return}
  if(tool){
   const placementError=farmPlacementError(state,tool,{fromStorage:group==='보관함'&&state.stored.includes(tool)})
   if(placementError){setMessage(placementError);return}
   if(isFarmAnimal(tool)&&!state.stored.includes(tool)){setMessage('가금사나 축사에서 동물을 먼저 구매해주세요.');return}
   const storedIndex=group==='보관함'?state.stored.indexOf(tool):-1,orderKind=tool==='store'||tool==='processed'?tool:null
   if(group==='보관함'&&storedIndex<0){setMessage('보관함에서 배치할 개체를 선택해주세요.');return}
   if(storedIndex<0&&state.gold<topviewItems[tool].price){setMessage('골드가 부족해요.');return}
   const footprint=objectFootprint({kind:tool,...placementTransform})
   if(clearingRef.current.some(job=>job.x>=x&&job.x<x+footprint.w&&job.y>=y&&job.y<y+footprint.h)){setMessage('개간 중인 칸에는 건물을 놓을 수 없어요.');return}
   if(!placementValid(state,tool,x,y,undefined,placementTransform.rotation)){setMessage(farmPlacementTerrain(tool)==='sea'?'모든 바닥 칸이 바다 위에 있고, 다른 물체와 겹치지 않아야 해요.':'모든 바닥 칸이 땅 위에 있고, 다른 물체와 겹치지 않아야 해요.');return}
   if(tool==='plot'){
    if(state.paths.includes(cellKey(x,y))){setMessage('타일이 없는 빈 땅을 골라주세요.');return}
    startClearing([{x,y}]);return
   }
   if(account&&!await confirmCommand(storedIndex>=0?{type:'place',kind:tool,x,y,transform:placementTransform}:{type:'batch',commands:[{type:'buy',kind:tool,quantity:1},{type:'place',kind:tool,x,y,transform:placementTransform}]}))return
   commit({...state,gold:state.gold-(storedIndex<0?topviewItems[tool].price:0),stored:state.stored.filter((_,index)=>index!==storedIndex),storedTransforms:storedIndex>=0?{...state.storedTransforms,[tool]:state.storedTransforms?.[tool]?.slice(1)}:state.storedTransforms,objects:[...state.objects,{id:state.nextId,kind:tool,x,y,...placementTransform,constructionReadyAt:topviewItems[tool].group==='건물'?farmNow()+FARM_CONSTRUCTION_MS:undefined,orderKey:orderKind?(state.storedOrderKeys?.[orderKind]?.[0]??state.nextId):undefined,level:storedIndex>=0?state.storedLevels?.[tool]?.[0]??1:1}],storedOrderKeys:storedIndex>=0&&orderKind?{...state.storedOrderKeys,[orderKind]:state.storedOrderKeys?.[orderKind]?.slice(1)}:state.storedOrderKeys,storedLevels:storedIndex>=0?{...state.storedLevels,[tool]:state.storedLevels?.[tool]?.slice(1)}:state.storedLevels,nextId:state.nextId+1});setClock(farmNow());setMessage(topviewItems[tool].group==='건물'?`${topviewItems[tool].name} 건설을 시작했어요. ${FARM_CONSTRUCTION_MS/1000}초 뒤 완성돼요.`:`${topviewItems[tool].name}을 배치했어요.`)
   if(topviewItems[tool].group==='건물')playFarmPlacementSound()
   if(group==='보관함'&&state.stored.filter(kind=>kind===tool).length>1)setPlacementTransform(state.storedTransforms?.[tool]?.[1]??{})
   if(group==='보관함'&&state.stored.filter(kind=>kind===tool).length===1){setMode('look');setHover(null)}
  }else setSelected(null)
 }
 const orientationObject=state.objects.find(object=>object.id===orientationId)
 async function orientObject(action:'rotate'|'flip',objectId=orientationId){
  if(objectId===null)return
  const before=currentState.current,next=transformFarmObject(before,objectId,action)
  if(next===before){setMessage('회전할 공간이 부족해요. 빈 곳으로 옮긴 뒤 다시 회전해주세요.');return}
  if(account&&!await confirmCommand({type:'transform',id:objectId,action}))return
  commit(next,before)
  const object=next.objects.find(item=>item.id===objectId)!
  if(mode==='move'&&selected===objectId)setPlacementTransform({rotation:object.rotation,flipped:object.flipped})
 }
 const shore=useMemo(()=>islandShorePath(state.land),[state.land])
 const allCells=Array.from({length:MAP_W*MAP_H},(_,i)=>({x:i%MAP_W,y:Math.floor(i/MAP_W)}))
 return <section className="top-farm" aria-label={account?'내 농장':'탑뷰 농장 테스트'} onKeyDown={event=>{if(event.key==='Escape')setOrientationId(null);if(event.key==='Escape'&&!shopOpen&&!tilePickerOpen&&!seedMenu&&!landBuyOpen&&!productionId){setHelp(false);objectDrag.cancel();if(landBrush.draft){landBrush.cancel();setMessage('땅 선택을 취소했어요.')}else if(mode==='move')cancelMove();else if(landTool||clearingTool||cropTool||toolMenu||editing)finishTool();else setSelected(null)}}}>
  <header className="top-farm-header">
   <div className="farm-header-main"><Link to="/aquarium" aria-label="농장 나가기"><ArrowLeft size={18}/></Link><h1>내 농장</h1><button className="top-farm-gold" aria-label={account?'보유 골드 안내':'테스트 골드 안내'} onClick={()=>setHelp(v=>!v)}><FarmGold amount={state.gold}/></button><button aria-label="농장 더보기" aria-expanded={help} onClick={()=>setHelp(v=>!v)}><MoreHorizontal size={20}/></button></div>
   <FarmCapacitySummary state={state} clearingCount={clearing.length}/>
  </header>
  {help&&<div className="top-farm-help"><strong>{account?'내 농장이에요':'체험 중인 농장이에요'}</strong><p>{account?'실제 보유 골드를 사용하며 농장은 계정에 저장돼요.':'실제 골드 사용 없음 · 새로고침 시 초기화'}</p><p>텃밭 {limits.usedPlots}/{limits.plots} · 전체 동물 {limits.totalAnimals}/{limits.animals} · 창고 {farmStorageUsage(state.simulation)}/{warehouseCapacity(state)}</p><p>도구를 쓸 때 휠 또는 두 손가락으로 확대·축소할 수 있어요.</p>{!account&&<button onClick={()=>{setHelp(false);resetTrial()}}><RotateCcw size={14}/>체험 초기화</button>}</div>}
  <div className="top-farm-viewport" data-object-move={toolMenu==='move'||mode==='move'||undefined} data-seed-cursor={seedCursorActive||undefined} data-land-tool={brushActive} ref={viewport} onClick={event=>{if(objectDrag.ignoresClick())return;if(mode==='move'&&!(event.target as Element).closest('[data-farm-cell],.top-farm-object,[data-status-bubble]'))confirmMove(null)}} onPointerDownCapture={event=>{if((event.target as Element).closest('[data-object-actions]'))return;if(!objectDrag.down(event))camera.onPointerDownCapture(event)}} onPointerMoveCapture={event=>{if(objectDrag.move(event))return;camera.onPointerMoveCapture(event);const cursor=seedCursor.current;if(cursor){cursor.style.display=seedCursorActive&&event.pointerType!=='touch'?'block':'none';cursor.style.transform=`translate(${event.clientX}px, ${event.clientY}px)`}}} onPointerUpCapture={event=>{if((event.target as Element).closest('[data-object-actions]'))return;if(!objectDrag.up(event))camera.onPointerUpCapture(event)}} onPointerCancelCapture={event=>{if(!objectDrag.abort(event))camera.onPointerCancelCapture(event)}} onPointerDown={e=>{
   if((e.target as Element).closest('[data-status-bubble]'))return
   if(brushActive){landBrush.onPointerDown(e);return}
   const el=viewport.current;if(mode==='move'||!el||e.button!==0||e.pointerType==='touch')return
   drag.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop,moved:false}
  }} onPointerMove={e=>{if(mode==='move'){setMoveTarget(readLandCell(e.clientX,e.clientY));return}if(brushActive){landBrush.onPointerMove(e);return}const d=drag.current,el=viewport.current;if(!d||!el)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>8)d.moved=true;if(d.moved){el.scrollLeft=d.left-dx;el.scrollTop=d.top-dy}}} onPointerUp={e=>{if(brushActive)landBrush.onPointerUp(e);else window.setTimeout(()=>{drag.current=null},0)}} onPointerCancel={e=>{landBrush.onPointerCancel(e);drag.current=null}} onLostPointerCapture={event=>{if(!objectDrag.abort(event))landBrush.onLostPointerCapture(event)}} onPointerLeave={event=>{if(seedCursor.current)seedCursor.current.style.display='none';if(mode==='move'&&event.pointerType!=='touch')setMoveTarget(null);if(!landBrush.draft)drag.current=null;setHover(null)}}>
   <div className="farm-map-canvas"><svg ref={svgRef} className="top-farm-map" style={{width:(MAP_W*TILE+seaMargin*2)*zoom,height:(MAP_H*TILE+seaMargin*2)*zoom}} viewBox={`${-seaMargin} ${-seaMargin} ${MAP_W*TILE+seaMargin*2} ${MAP_H*TILE+seaMargin*2}`} role="group" aria-label="사각 격자 농장 지도">
    <defs><filter id="farm-selection-outline" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="1.25" result="expanded"/><feComposite in="expanded" in2="SourceAlpha" operator="out" result="ring"/><feFlood floodColor="#fff0c5" floodOpacity=".9"/><feComposite in2="ring" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="farm-island-clip"><path d={shore} fillRule="evenodd" clipRule="evenodd"/></clipPath><pattern id="farm-water" width="96" height="80" patternUnits="userSpaceOnUse"><rect width="96" height="80" fill="#80b8bf"/><path className="top-farm-waves" d="M10 19q6 3 12 0m30 32q9 4 18 0M75 8h7M12 62h6" fill="none" stroke="#b9dfe0" strokeWidth="1.5" strokeLinecap="round"/></pattern><FarmGrassPattern/><FarmDirtPattern/><FarmTilePatterns/></defs>
    <rect x={-seaMargin} y={-seaMargin} width={MAP_W*TILE+seaMargin*2} height={MAP_H*TILE+seaMargin*2} fill="url(#farm-water)" onClick={()=>{if(mode==='look'){setSelected(null);setOrientationId(null)}}}/>
    <g pointerEvents="none" strokeLinejoin="round" strokeLinecap="round" data-island-shore="true"><path className="farm-shore-foam" d={shore} fill="none" stroke="#fff8e5" strokeWidth="24" strokeDasharray="18 190"/><path d={shore} fill="url(#farm-grass)" fillRule="evenodd" stroke="#ead2a0" strokeWidth="16"/></g>
    {allCells.map(({x,y})=>{
     const key=cellKey(x,y),owned=state.land.includes(key),seaPlacement=!!previewKind&&farmPlacementTerrain(previewKind)==='sea',buyable=mode==='land'&&state.landStock>0&&canPlaceLand(state,x,y),interactive=(cropTool||fertilizerTool||clearingTool||tileTool!==null||mode==='land-recover')&&owned||!!previewKind&&(seaPlacement?!owned:owned)||buyable
     const label=fertilizerTool?`비료 적용 ${x},${y}`:tileTool?`타일 ${x},${y} ${tileTool==='place'?'깔기':'회수'}`:cropTool?`심기 위치 ${x},${y}`:clearingTool?`개간 위치 ${x},${y}`:previewKind?`배치 위치 ${x},${y}`:`땅 ${x},${y} ${mode==='land'?'놓기':'회수'}`
     return <g key={key} data-farm-cell={key} data-farm-owned={owned} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?label:undefined} onKeyDown={event=>{if(interactive&&(event.key==='Enter'||event.key===' ')){event.preventDefault();cellClick(x,y,true)}}} onPointerEnter={()=>setHover({x,y})} onClick={()=>cellClick(x,y)}>
      <rect data-farm-tile={owned&&state.paths.includes(key)?pathTile(state,key):undefined} clipPath={owned?'url(#farm-island-clip)':undefined} shapeRendering="crispEdges" x={x*TILE} y={y*TILE} width={TILE} height={TILE} fill={owned?(state.paths.includes(key)?(pathTile(state,key)==='stone'?'url(#farm-grass)':pathTile(state,key)==='dirt'?'url(#farm-path)':`url(#farm-path-${pathTile(state,key)})`):'url(#farm-grass)'):buyable?'#b7ddd060':'transparent'} className={lastAdded===key?'top-farm-new-land':undefined} stroke={buyable?'#fff1c8':grid&&(owned||seaPlacement)?'#e4ebc447':'transparent'} strokeWidth={buyable?1.5:1}/>
      {owned&&state.paths.includes(key)&&pathTile(state,key)==='stone'&&<rect pointerEvents="none" x={x*TILE} y={y*TILE} width={TILE} height={TILE} fill="url(#farm-path-stone)"/>}
     </g>
    })}
    <path pointerEvents="none" d={shore} fill="none" stroke="#ead2a0" strokeWidth="3" strokeLinejoin="round"/>
    <FarmFenceRails objects={state.objects}/>
    {state.objects.toSorted((a,b)=>(a.y+objectFootprint(a).h)-(b.y+objectFootprint(b).h)||a.x-b.x).map(o=>{
     const item={...topviewItems[o.kind],...objectFootprint(o)},animal=item.group==='동물',building=item.group==='건물',height=objectArtHeight(o.kind,o.rotation),bottom=(o.y+item.h)*TILE,cropJob=state.simulation.cropJobs[o.id],rotten=!!cropJob&&cropIsRotten(cropJob,clock)
     const growth=cropJob?Math.max(0,Math.min(1,1-(cropJob.readyAt-clock)/(farmCrops[cropJob.crop].growSeconds*1000))):0
     return <g key={o.id} data-object-id={o.id} role="button" tabIndex={0} aria-label={`${item.name} (${o.x},${o.y})`} onClick={()=>cellClick(o.x,o.y)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cellClick(o.x,o.y,true)}}} onPointerEnter={()=>setHover({x:o.x,y:o.y})} className={`top-farm-object ${animal?'top-farm-animal':''} ${state.simulation.researchJob?.labId===o.id||state.simulation.processingJobs[o.id]?'top-farm-research-active':''}`} style={{animationDelay:`${o.id*.37}s`}}>
      {<rect data-object-footprint={building||undefined} x={o.x*TILE-(building?0:3)} y={building?o.y*TILE:Math.min(o.y*TILE,bottom-height)-(animal?12:0)} width={building?item.w*TILE:Math.max(44,item.w*TILE+6)} height={building?item.h*TILE:Math.max(44,height+(animal?12:0))} fill="transparent"/>}
      <svg data-object-art="true" pointerEvents={building&&editing?'none':undefined} filter={selected===o.id?'url(#farm-selection-outline)':undefined} x={o.x*TILE} y={bottom-height} width={item.w*TILE} height={height} overflow="visible" opacity={o.constructionReadyAt?0.25:mode==='move'&&o.id===selected?0.3:1}><TopviewArt kind={o.kind} idle={animal&&!editing} idlePhase={o.id} fenceNetwork fenceConnections={isFarmFence(o.kind)?fenceConnections(state.objects,o):undefined} rotation={o.rotation} flipped={o.flipped} crop={cropJob?.crop} progress={growth} stage={rotten?'rotten':cropJob?(cropJob.readyAt<=clock?'ready':'growing'):'empty'}/></svg>
      {o.constructionReadyAt&&<FarmConstructionEffect object={o}/>}
      {item.group==='건물'&&selected===o.id&&<text pointerEvents="none" x={(o.x+item.w/2)*TILE} y={bottom+9} textAnchor="middle" fill="#fff4d9" stroke="#627b50" strokeWidth="2.5" paintOrder="stroke" fontSize="12">{item.name}</text>}
     </g>
    })}
    {fertilizerEffects.map(item=><g key={item.id} pointerEvents="none" data-fertilizer-effect={item.supply} transform={`translate(${item.x*TILE+20} ${item.y*TILE+18})`}><g className="farm-fertilizer-burst"><circle r="17" fill={item.supply==='fertilizer'?'#a8cc7666':'#cbb7e866'} stroke={item.supply==='fertilizer'?'#648d42':'#9571b3'}/><path d="M0 9V-4M0 1Q-12 0-9-8 0-8 0 1M0-3Q1-13 11-11 12-2 0-3" fill="#729a4f" stroke="#fff7da" strokeWidth="1.2"/><text y="-24" textAnchor="middle" fontSize="9" fill="#fff9e8" stroke="#688445" strokeWidth="2" paintOrder="stroke">{item.supply==='fertilizer'?'-50%':'성장 완료'}</text></g></g>)}
    {cropTool&&landBrush.draft&&<g pointerEvents="none">{landBrush.draft.cells.filter(cell=>{const plot=objectAt(state,cell.x,cell.y);return plot?.kind==='plot'&&!state.simulation.cropJobs[plot.id]}).slice(0,state.simulation.inventory[seedGood(selectedSeed)]).map(cell=><rect key={cellKey(cell.x,cell.y)} data-crop-preview="true" x={cell.x*TILE+2} y={cell.y*TILE+2} width="36" height="36" rx="4" fill="#bbd98b66" stroke="#fff0bd" strokeWidth="2"/>)}</g>}
    {harvesting.slice(0,12).map(job=>{const plot=state.objects.find(o=>o.id===job.id);return plot&&<g key={job.id} data-harvesting={job.id}><FarmHarvestingEffect x={plot.x} y={plot.y}/></g>})}
    {clearingTool&&landBrush.draft&&<g pointerEvents="none">{landBrush.draft.cells.map(cell=><rect key={cellKey(cell.x,cell.y)} data-clearing-preview="true" x={cell.x*TILE+2} y={cell.y*TILE+2} width="36" height="36" rx="4" fill="#c7975e88" stroke="#ffe4b5" strokeWidth="2"/>)}</g>}
    {plantingEffects.map(item=><FarmPlantingEffect key={item.id} x={item.x} y={item.y}/>)}
    {placementDust.map(item=><FarmPlacementDust key={item.id} {...item}/>)}
    {clearing.map(job=><g key={cellKey(job.x,job.y)} aria-label="개간 중" data-clearing-cell={cellKey(job.x,job.y)}><FarmClearingEffect x={job.x*TILE} y={job.y*TILE}/></g>)}
    {completedWork.filter(work=>work.kind==='clearing').map(work=>{const plot=state.objects.find(object=>object.id===work.objectId);return plot&&<FarmClearingEffect key={work.objectId} x={plot.x*TILE} y={plot.y*TILE} complete/>})}
    {landPreview&&<g pointerEvents="none" aria-hidden="true">{landPreview.changed.map(cell=><rect key={cellKey(cell.x,cell.y)} data-land-preview={landTool==='place'?'place':'recover'} x={cell.x*TILE+1} y={cell.y*TILE+1} width={TILE-2} height={TILE-2} rx="3" fill={landTool==='place'?'#b5d98aaa':'#e5af72aa'} stroke={landTool==='place'?'#557e3c':'#a36a38'} strokeWidth="2"/>)}{landPreview.blocked.map(({cell,reason})=><rect key={cellKey(cell.x,cell.y)} data-land-preview="blocked" data-land-block={reason} x={cell.x*TILE+1} y={cell.y*TILE+1} width={TILE-2} height={TILE-2} rx="3" fill="#d78a7a66" stroke="#b65e4f" strokeWidth="2" strokeDasharray="4 3"/>)}</g>}
    {tilePreview&&<g pointerEvents="none" aria-hidden="true">{tilePreview.changed.map(cell=><rect key={cellKey(cell.x,cell.y)} data-tile-preview={tileTool} x={cell.x*TILE+1} y={cell.y*TILE+1} width={TILE-2} height={TILE-2} rx="3" fill={tileTool==='place'?'#d6bc87bb':'#b7dc8e99'} stroke="#fff0bd" strokeWidth="2"/>)}</g>}
    {editing&&previewKind&&previewCell&&previewSize&&<g pointerEvents="none" data-move-preview={mode==='move'||undefined}><rect data-placement-valid={valid} x={previewCell.x*TILE+1} y={previewCell.y*TILE+1} width={previewSize.w*TILE-2} height={previewSize.h*TILE-2} rx="4" fill={valid?'#b7dc8e66':'#e2a38b66'} stroke={valid?'#69934b':'#d8755b'} strokeWidth="2" strokeDasharray="5 3"/><svg x={previewCell.x*TILE} y={(previewCell.y+previewSize.h)*TILE-objectArtHeight(previewKind,placementTransform.rotation)} width={previewSize.w*TILE} height={objectArtHeight(previewKind,placementTransform.rotation)} opacity=".7"><TopviewArt kind={previewKind} {...placementTransform} fenceConnections={isFarmFence(previewKind)?fenceConnections(state.objects,{id:mode==='move'?selected??-1:-1,...previewCell}):undefined}/></svg></g>}
    {/* Draw gauges last so neighboring plots, buildings and placement previews cannot cover them. */}
    <g data-farm-status-layer="true" pointerEvents={fertilizerTool?'none':undefined}>
     {state.objects.map(o=><g key={o.id}>
      {o.constructionReadyAt&&<FarmConstructionStatus object={o} now={clock}/>}
      {isFarmAnimal(o.kind)&&<FarmAnimalStatus object={o} readyAt={state.simulation.animalJobs[o.id]} now={clock} onActivate={()=>editing?cellClick(o.x,o.y,true):collectAnimal(o.id)} revealTime={inspectedAnimal===o.id}/>}
      {state.simulation.animalPurchaseJobs[o.id]&&<FarmAnimalStatus object={o} readyAt={state.simulation.animalPurchaseJobs[o.id].readyAt} now={clock} purchase={state.simulation.animalPurchaseJobs[o.id].animal} onClaim={()=>editing?cellClick(o.x,o.y,true):claimAnimalPurchase(o.id)}/>}
      {state.simulation.upgradeJobs[o.id]&&<BuildingUpgradeEffect object={o} job={state.simulation.upgradeJobs[o.id]} now={clock} onActivate={()=>cellClick(o.x,o.y)}/>}
      <FarmJobStatus object={o} simulation={state.simulation} now={clock} completed={completedWork.find(work=>work.objectId===o.id)} onActivate={()=>cellClick(o.x,o.y,true)}/>
     </g>)}
     {harvesting.map(job=>{const plot=state.objects.find(o=>o.id===job.id);return plot&&<FarmStatusBubble key={job.id} x={plot.x*TILE+31} y={plot.y*TILE+6} compact label="수확 진행" progress={1-(job.readyAt-clock)/3000} remaining={Math.max(0,(job.readyAt-clock)/1000)}><FarmHarvestGlyph/></FarmStatusBubble>})}
     {clearing.map(job=><FarmStatusBubble key={cellKey(job.x,job.y)} x={job.x*TILE+31} y={job.y*TILE+6} compact label="개간 진행" progress={1-(job.readyAt-clock)/FARM_CLEARING_MS} remaining={Math.max(0,(job.readyAt-clock)/1000)}><FarmClearingGlyph/></FarmStatusBubble>)}
    </g>
    {orientationObject&&<FarmObjectOrientationControls viewport={viewport} map={svgRef} object={orientationObject} onRotate={()=>orientObject('rotate')} onFlip={()=>orientObject('flip')} onSell={isFarmAnimal(orientationObject.kind)?()=>sellObject(orientationObject.id):undefined} saleReason={farmObjectResaleError(state,orientationObject.id)}/>}
   </svg></div>
  </div>
  {productionObject&&!editing&&<FarmProductionDialog key={productionObject.id} object={productionObject} state={state} message={productionMessage} onAction={act} onStore={()=>storeBuilding(productionObject.id)} onSell={()=>sellObject(productionObject.id)} lastPurchasedSeed={lastPurchasedSeed} pendingPlots={clearing.length} onClose={()=>{setProductionId(null);setSelected(null)}} onMove={()=>moveFromDialog(productionObject.id)} onFlip={()=>orientObject('flip',productionObject.id)}/>}
  <ConfirmDialog open={!!saleTarget} onOpenChange={open=>{if(!open)closeSaleConfirmation()}} illustration="sale" title={saleTarget?`${topviewItems[saleTarget.kind].name} 1개를 ${topviewItems[saleTarget.kind].group==='건물'?'제거':'판매'}하시겠습니까?`:''} description={<span className="block space-y-2"><span className="block">구매가의 50%인 <FarmGold amount={saleTarget?farmResalePrice(saleTarget.kind):0}/>를 받아요.</span><span className="block">{saleTarget&&topviewItems[saleTarget.kind].group==='건물'?'제거':'판매'}하면 보유 목록에서 사라지며 되돌릴 수 없어요.</span></span>} confirmLabel={saleTarget&&topviewItems[saleTarget.kind].group==='건물'?'제거하기':'판매하기'} onConfirm={confirmSale}/>
  {effect&&<FarmActionEffect effect={effect}/>}
  {cookbookOpen&&<FarmCookbook state={state} onClose={()=>setCookbookOpen(false)} onNavigate={navigateCookbook}/>}
  {warehouseOpen&&<FarmWarehouse onMove={warehouseObject?()=>moveFromDialog(warehouseObject.id):undefined} onFlip={warehouseObject?()=>orientObject('flip',warehouseObject.id):undefined} simulation={state.simulation} state={state} object={warehouseObject} now={clock} onAction={warehouseAction} onStore={warehouseObject?()=>storeBuilding(warehouseObject.id):undefined} onClose={()=>setWarehouseOpen(false)}/>}
  <LandPurchaseDialog open={landBuyOpen} gold={state.gold} onOpenChange={setLandBuyOpen} onBuy={buyLand}/>
  <FarmSeedPicker open={seedMenu} simulation={state.simulation} onClose={()=>setSeedMenu(false)} onSelect={startPlanting}/>
  {goldSpend.effect}
  {resaleReceipt&&<FarmGoldEffect id={resaleReceipt.id} amount={resaleReceipt.gold} label={topviewItems[resaleReceipt.kind].name+' ×'+resaleReceipt.quantity+(topviewItems[resaleReceipt.kind].group==='건물'?' 제거':' 판매')}/>}
  <FarmPurchaseEffect receipt={purchaseReceipt} onDismiss={dismissPurchase}/>
  {shopOpen&&<FarmShop focusKind={shopFocus} state={state} initialTab={shopTab} onClose={()=>setShopOpen(false)} onBuy={purchaseItem} onBuyTiles={purchaseTiles}/>}
  {tilePickerOpen&&<FarmTilePicker state={state} onClose={()=>setTilePickerOpen(false)} onSelect={tile=>{setSelectedTile(tile);setTilePickerOpen(false);setGrid(true);choose('tile-place')}} onBuy={()=>openFarmShop('타일')}/>}
  <div ref={seedCursor} className="farm-seed-cursor" aria-hidden="true"><FarmGoodIcon good={seedGood(selectedSeed)}/></div>
  <aside className="top-farm-camera"><button aria-label="농장 확대" onClick={()=>{landBrush.cancel();manualCamera.current=true;setCameraTarget(null);setZoom(z=>Math.min(1.8,z+.2))}}><Plus size={17}/></button><button aria-label="농장 축소" onClick={()=>{landBrush.cancel();manualCamera.current=true;setCameraTarget(null);setZoom(z=>Math.max(.25,z-.2))}}><Minus size={17}/></button><button aria-label="섬 전체 보기" onClick={()=>{landBrush.cancel();manualCamera.current=false;setCameraTarget(null);const el=viewport.current;if(el)setZoom(Math.max(.25,Math.min(1,(el.clientWidth-32)/800,(el.clientHeight-32)/640)))}}><Scan size={16}/></button></aside>
  <div className="top-farm-bottom" data-editing={editing}>
   {(editing||feedback)&&message&&<p className="top-farm-message" role="status">{notice?<>{notice.name} 회수 완료<button onClick={undo}>되돌리기</button></>:message}</p>}

   {toolMenu==='storage'&&<FarmObjectStorage onSell={sellStored} state={state} category={storageCategory} selected={tool} onCategory={category=>{choose('look');setEditing(false);setGrid(false);setStorageCategory(category)}} onPlace={kind=>{setEditing(true);setGrid(true);choose(kind);setPlacementTransform(state.storedTransforms?.[kind]?.[0]??{});setGroup('보관함')}} onDone={finishTool}/>}
   {toolMenu==='tile'&&<FarmTileMenu tool={tileTool} count={totalTiles(state)} onPick={()=>{choose('look');setTilePickerOpen(true)}} onRecover={()=>{setGrid(true);choose('tile-recover')}} onBuy={()=>openFarmShop('타일')} onDone={finishTool}/>}
   {toolMenu==='land'&&<LandToolPanel tool={landTool} onTool={next=>{setGrid(true);choose(next==='place'?'land':'land-recover')}} onBuy={openLandShop} onDone={finishTool}/>}
   {(toolMenu==='move'||toolMenu==='recover')&&<FarmToolPanel id={toolMenu==='move'?'farm-move-menu':'farm-recover-menu'} label={toolMenu==='move'?'이동 메뉴':'회수 메뉴'} title={toolMenu==='move'?'이동하기':'회수하기'} description={toolMenu==='recover'?'회수할 건물이나 동물을 누르면 보관함에 넣어요. 밭은 제거돼요.':mode==='move'?'배치 가능한 곳에 놓거나 눌러 옮겨요.':'건물·동물·장식물을 드래그해 옮겨요.'} onDone={finishTool}/>}
    {toolMenu==='farm'&&<FarmToolPanel id="farm-work-menu" label="농사 메뉴" title="농사" description={fertilizerTool?farmSupplies[fertilizerTool].description+' · 밭 한 칸을 누르세요.':clearingTool?'빈 땅을 누르거나 드래그해 밭을 개간해요.':cropTool?`${farmCrops[selectedSeed].name} 선택 중 · 빈 밭을 누르거나 드래그해 연속으로 심어요. 빈 곳을 드래그하면 지도를 이동해요.`:'밭을 개간하고 씨앗을 심거나 비료를 사용해요.'} onDone={finishTool}>
    <button aria-label="개간하기" aria-pressed={clearingTool} onClick={()=>{const active=clearingTool;setEditing(false);setGrid(true);setSeedMenu(false);choose(active?'look':'plot');setMessage(active?'':'빈 땅을 드래그해 개간하세요.')}}><img className="farm-clearing-tool-image" src={farmClearingArt.pickaxe} alt=""/><span>개간하기</span><FarmCountBadge count={clearingCapacity} label="개간 가능" unit="칸"/></button>
    <button aria-label="씨앗 심기" aria-pressed={seedMenu||cropTool} onClick={openSeedPicker}><img className="farm-clearing-tool-image" src={farmPlantingArt} alt=""/><span>씨앗 심기</span><FarmCountBadge count={seedTotal} label="보유 종자"/></button>
    {farmSupplyKinds.map(supply=><button key={supply} className="farm-fertilizer-tool" aria-label={farmSupplies[supply].name+' 사용'} aria-pressed={fertilizerTool===supply} disabled={state.simulation.inventory[supply]<1} onClick={()=>selectFertilizer(supply)}><FarmGoodIcon good={supply}/><span>{farmSupplies[supply].name}</span><FarmCountBadge count={state.simulation.inventory[supply]} label={farmSupplies[supply].name+' 보유'}/></button>)}
   </FarmToolPanel>}
   {(editing||landTool||tileTool||clearingTool||orientationId!==null)&&<button className="farm-edit-undo" aria-label="한 단계 되돌리기" disabled={!history.length||!!account&&!account.snapshot.undo||!!landBrush.draft||!!clearing.length||!!harvesting.length||!!constructing.length} onClick={undo}><Undo2 size={16}/><span>되돌리기</span></button>}
   <FarmToolbar onCookbook={openCookbook} landStock={state.landStock} tileStock={totalTiles(state)} storageCount={state.stored.length} landActive={toolMenu==='land'} farmActive={toolMenu==='farm'} tileActive={toolMenu==='tile'} storageActive={toolMenu==='storage'} shopOpen={shopOpen} moveActive={toolMenu==='move'} recoverActive={toolMenu==='recover'}
    onLand={()=>toggleToolMenu('land')} onFarm={()=>toggleToolMenu('farm')} onTile={()=>toggleToolMenu('tile')}
    onShop={()=>{setToolMenu(null);openFarmShop()}}
    onStorage={()=>toggleToolMenu('storage')} onMove={()=>toggleToolMenu('move')} onRecover={()=>toggleToolMenu('recover')}/>
  </div>
 </section>
}
