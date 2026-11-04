import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {Link} from 'react-router'
import {ArrowLeft,Check,Coins,Pickaxe,Sprout,Plus,Minus,RotateCcw,Undo2,MoreHorizontal,Scan} from 'lucide-react'
import {FarmToolbar} from './farm-toolbar'
import {FarmSeedPicker} from './seed-picker'
import {farmPlotImages} from './plot-art-assets'
import {FarmGrassPattern} from './grass-pattern'
import {islandShorePath} from './island-shore'
import {FarmObjectMenu} from './object-menu'
import {TopviewArt} from './topview-art'
import {FarmProductionDialog} from './production-dialog'
import {CROP_FRESH_MS,farmLimits,farmPlacementError,farmBuildingStorageError,simulateFarm,cropIsRotten,type FarmSimAction,type FarmEffect} from './farm-simulation'
import {FarmActionEffect} from './action-effect'
import {FarmGoodIcon} from './farm-good-icon'
import {adjacentLand,cellKey,initialTopview,MAP_H,MAP_W,objectAt,objectArtHeight,placementValid,TILE,topviewItems,type FarmTool,type TopviewState} from './topview-model'
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
import {FarmJobStatus} from './job-status'
import {FarmStatusBubble,StatusGlyph} from './status-bubble'
import {storedFarmGoods} from './farm-simulation'
import {activeBuildings,buildingLevel,isUpgradeable,warehouseAvailable,warehouseCapacity} from './building-upgrades'
import {BuildingUpgradeEffect} from './building-upgrade-effect'
import './topview-farm.css'
import './farm-layout.css'
import './building-upgrade.css'
import './farm-lifecycle.css'
import './farm-ux.css'
import './compact-dialog.css'
import './farm-tool-menu.css'
import './farm-stock.css'

type Mode='look'|'land'|'land-recover'|'move'|'tile-place'|'tile-recover'|'seed'|FarmTool
type ToolMenu='land'|'farm'|'tile'|'storage'
const seaMargin=TILE*2
export function TopviewFarm(){
 useEffect(()=>{for(const path of Object.values(farmPlotImages)){if(path){const image=new Image();image.src=path}}},[])
 const [state,setState]=useState(initialTopview),[mode,setMode]=useState<Mode>('look'),[group,setGroup]=useState<'보관함'|null>(null)
 const [editing,setEditing]=useState(false),[history,setHistory]=useState<TopviewState[]>([])
 const [landBuyOpen,setLandBuyOpen]=useState(false)
 const [toolMenu,setToolMenu]=useState<ToolMenu|null>(null)
 const seedCursor=useRef<HTMLDivElement>(null)
 const [storageCategory,setStorageCategory]=useState<StorageCategory>('건물')
 const [shopOpen,setShopOpen]=useState(false),[shopTab,setShopTab]=useState<FarmShopTab>('건물'),[tilePickerOpen,setTilePickerOpen]=useState(false)
 const [inspectedAnimal,setInspectedAnimal]=useState<number|null>(null)
 useEffect(()=>{if(inspectedAnimal===null)return;const timer=window.setTimeout(()=>setInspectedAnimal(null),2600);return()=>window.clearTimeout(timer)},[inspectedAnimal])
 const [clearing,setClearing]=useState<{x:number;y:number;readyAt:number}[]>([])
 const [lastPurchasedSeed,setLastPurchasedSeed]=useState<CropKind>('wheat')
 const [selectedSeed,setSelectedSeed]=useState<CropKind>('wheat'),[seedMenu,setSeedMenu]=useState(false),[warehouseOpen,setWarehouseOpen]=useState(false)
 const [harvesting,setHarvesting]=useState<{id:number;readyAt:number}[]>([])
 const harvestingRef=useRef(harvesting);harvestingRef.current=harvesting
 const clearingRef=useRef(clearing);clearingRef.current=clearing
 const currentState=useRef(state);currentState.current=state
 const [productionId,setProductionId]=useState<number|null>(null),[productionMessage,setProductionMessage]=useState(''),[clock,setClock]=useState(Date.now)
 const [effect,setEffect]=useState<(FarmEffect&{id:number})|null>(null),effectId=useRef(0)
 const svgRef=useRef<SVGSVGElement>(null)
 const [moveTarget,setMoveTarget]=useState<{x:number;y:number}|null>(null),[notice,setNotice]=useState<{name:string}|null>(null)
 const [lastAdded,setLastAdded]=useState<string|null>(null)
 const [selected,setSelected]=useState<number|null>(null),[hover,setHover]=useState<{x:number;y:number}|null>(null)
 const [zoom,setZoom]=useState(()=>window.innerWidth<600?1.05:1.15),[grid,setGrid]=useState(false),[message,setMessage]=useState(''),[help,setHelp]=useState(false)
 const [feedback,setFeedback]=useState(false)
 useEffect(()=>{if(!message)return;setFeedback(true);const timer=window.setTimeout(()=>setFeedback(false),2600);return()=>window.clearTimeout(timer)},[message])
 const viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number;moved:boolean}|null>(null)
 const manualCamera=useRef(true),[cameraTarget,setCameraTarget]=useState<{x:number;y:number}|null>(null)
 const landTool:LandTool|null=mode==='land'?'place':mode==='land-recover'?'recover':null
 const tileTool:LandTool|null=mode==='tile-place'?'place':mode==='tile-recover'?'recover':null
 const clearingTool=mode==='plot'
 const cropTool=mode==='seed',availableLandTool=landTool==='place'&&!state.landStock?null:landTool,availableTileTool=tileTool==='place'&&!state.tileStock?null:tileTool,brushActive=!!availableLandTool||!!availableTileTool||clearingTool||cropTool
 const landBrush=useLandBrush({tool:landBuyOpen||seedMenu||warehouseOpen||shopOpen||tilePickerOpen?null:clearingTool||cropTool?'place':availableTileTool??availableLandTool,readCell:readLandCell,onCommit:(active,cells)=>clearingTool?startClearing(cells):cropTool?plantCells(cells):tileTool?commitTileStroke(active,cells):commitLandStroke(active,cells)})
 const camera=useFarmCamera({viewport,svg:svgRef,zoom,setZoom,brushActive:brushActive||mode==='move',manual:()=>{manualCamera.current=true;setCameraTarget(null)},cancelTool:()=>{landBrush.cancel();drag.current=null}})
 const landPreview=useMemo(()=>landBrush.draft&&landTool?applyLandStroke(state,landBrush.draft.tool,landBrush.draft.cells):null,[state,landBrush.draft,landTool])
 const tilePreview=useMemo(()=>landBrush.draft&&tileTool?applyTileStroke(state,landBrush.draft.tool,landBrush.draft.cells,clearing):null,[state,landBrush.draft,tileTool,clearing])
 const limits=farmLimits(state),productionObject=state.objects.find(o=>o.id===productionId)
 const clearingCapacity=Math.max(0,Math.min(limits.plots-limits.usedPlots-clearing.length,Math.floor(state.gold/topviewItems.plot.price)-clearing.length))
 const seedTotal=cropKinds.reduce((total,crop)=>total+state.simulation.inventory[seedGood(crop)],0)
 const seedCursorActive=cropTool&&!seedMenu&&state.simulation.inventory[seedGood(selectedSeed)]>0
 useEffect(()=>{if(!seedCursorActive&&seedCursor.current)seedCursor.current.style.display='none'},[seedCursorActive])
 const running=[...clearing.map(job=>job.readyAt),...harvesting.map(job=>job.readyAt),state.simulation.researchJob?.readyAt,...Object.values(state.simulation.millJobs).map(job=>job.readyAt),...Object.values(state.simulation.animalPurchaseJobs).map(j=>j.readyAt),...Object.values(state.simulation.upgradeJobs).map(j=>j.readyAt),...Object.values(state.simulation.processingJobs).map(j=>j.readyAt),...Object.values(state.simulation.cropJobs).map(j=>j.readyAt+CROP_FRESH_MS),...Object.values(state.simulation.animalJobs)].some(t=>t&&t>clock)
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setClock(Date.now()),100);return()=>window.clearInterval(timer)},[running])
 useEffect(()=>{if(!effect)return;const timer=window.setTimeout(()=>setEffect(null),1800);return()=>window.clearTimeout(timer)},[effect])
 useEffect(()=>{
  const before=currentState.current;let next=before
  for(const [id,job] of Object.entries(before.simulation.upgradeJobs))if(job.readyAt<=clock)next=simulateFarm(next,Number(id),{type:'completeUpgrade'},clock).state
  if(next!==before){currentState.current=next;setState(next);setHistory([]);setMessage('업그레이드 완료! 건물을 다시 사용할 수 있어요.')}
 },[state,clock])
 useEffect(()=>{
  const before=currentState.current,job=before.simulation.researchJob
  if(!job||job.readyAt>clock)return
  const result=simulateFarm(before,job.labId,{type:'completeResearch'},clock)
  if(result.state===before)return
  setState(result.state);currentState.current=result.state;setHistory([])
  if(productionId===job.labId)setProductionMessage(result.message)
  if(result.effect)setEffect({...result.effect,id:++effectId.current})
 },[state,clock,productionId])
 function act(action:FarmSimAction){
  if(!productionObject)return
  if(action.type==='collectFlour'||action.type==='collectCraft'||action.type==='completeAnimalPurchase'||action.type==='discardCrop'){receiveProduction(productionObject.id,action);return}
  if(action.type==='harvest'){setProductionId(null);startHarvest([{x:productionObject.x,y:productionObject.y}]);return}
  const result=simulateFarm(state,productionObject.id,action,Date.now())
  setProductionMessage(result.message)
  if(result.state!==state){
   if(action.type==='seed'){const purchased=cropKinds.find(c=>seedGood(c)===action.good);if(purchased)setLastPurchasedSeed(purchased)}
   if(['plant','mill','craft','research','animal','startAnimal','feed'].includes(action.type)){setProductionId(null);setSelected(null);setProductionMessage('');}
  }
  if(result.state!==state){setState(result.state);currentState.current=result.state;setHistory([]);setClock(Date.now());if(result.effect)setEffect({...result.effect,id:++effectId.current})}
  if(result.place){setProductionId(null);setEditing(true);setGrid(true);choose(result.place);setGroup('보관함');setMessage(result.message)}
 }
 function receiveProduction(id:number,action:FarmSimAction){
  const before=currentState.current,result=simulateFarm(before,id,action,Date.now())
  if(result.state===before){setMessage(result.message);setProductionMessage(result.message);return}
  setState(result.state);currentState.current=result.state;setHistory([]);setClock(Date.now());setProductionId(null);setProductionMessage('');setMessage('');setNotice(null)
  if(result.effect)setEffect({...result.effect,id:++effectId.current})
 }
 function collectAnimal(id:number){
  const before=currentState.current,readyAt=before.simulation.animalJobs[id],now=Date.now()
  if(readyAt!==undefined&&readyAt>now){setInspectedAnimal(id);return}
  setInspectedAnimal(null)
  const result=simulateFarm(before,id,{type:readyAt===undefined?'startAnimal':'collectAnimal'},now)
  if(result.state!==before){setState(result.state);currentState.current=result.state;setHistory([]);setClock(Date.now());if(result.effect)setEffect({...result.effect,id:++effectId.current})}
  setMessage(result.state!==before&&result.effect?'':result.message)
 }
 function claimAnimalPurchase(id:number){
  receiveProduction(id,{type:'completeAnimalPurchase'})
 }
 function warehouseAction(action:FarmSimAction){
  const object=warehouseObject;if(!object)return
  const result=simulateFarm(currentState.current,object.id,action,Date.now())
  if(result.state!==currentState.current){setState(result.state);currentState.current=result.state;setHistory([]);setClock(Date.now())}
  setMessage(result.message)
 }
 const warehouseObject=(state.objects.find(o=>o.id===selected&&o.kind==='warehouse')??activeBuildings(state,'warehouse')[0]??state.objects.find(o=>o.kind==='warehouse'))
 function navigateBuilding(kind:FarmTool){
  const found=currentState.current.objects.find(o=>o.kind===kind)
  if(!found){setProductionMessage('편집하기에서 해당 건물을 먼저 배치해주세요.');setMessage('편집하기에서 해당 건물을 먼저 배치해주세요.');return}
  setWarehouseOpen(false);setProductionMessage('');setSelected(found.id);setProductionId(found.id);setSeedMenu(false);choose('look');setCameraTarget({x:(found.x+1)*TILE,y:(found.y+1)*TILE})
 }
 function startPlanting(crop:CropKind){setProductionId(null);setWarehouseOpen(false);setSeedMenu(false);setEditing(false);setGroup(null);setToolMenu('farm');choose('seed');setSelectedSeed(crop);setMessage('빈 밭을 누르거나 드래그해서 심어주세요.')}
 function toggleToolMenu(next:ToolMenu){finishTool();setProductionId(null);setWarehouseOpen(false);setToolMenu(toolMenu===next?null:next)}
 function finishTool(){choose('look');setToolMenu(null);setSeedMenu(false);setTilePickerOpen(false);setEditing(false);setGrid(false);setGroup(null);setMessage('')}
 function openFarmShop(tab:FarmShopTab='건물'){choose('look');setEditing(false);setGrid(false);setSeedMenu(false);setTilePickerOpen(false);setProductionId(null);setWarehouseOpen(false);setGroup(null);setShopTab(tab);setShopOpen(true)}
 function purchaseItem(kind:FarmTool){const before=currentState.current,next=buyFarmItem(before,kind);if(next===before)return '보유 한도와 골드를 확인해주세요.';setState(next);currentState.current=next;setHistory([]);return `${topviewItems[kind].name}을 보관함에 넣었어요.`}
 function purchaseTiles(quantity:number){const before=currentState.current,next=buyFarmTiles(before,quantity);if(next===before)return '수량과 남은 골드를 확인해주세요.';setState(next);currentState.current=next;setHistory([]);return `흙길 ${quantity}개를 구매했어요.`}
 function openSeedPicker(){landBrush.cancel();choose('look');setEditing(false);setGroup(null);setToolMenu('farm');setSeedMenu(true)}
 function moveFromDialog(id:number){drag.current=null;setProductionId(null);setWarehouseOpen(false);setEditing(true);setGrid(true);setGroup(null);setSelected(id);setMode('move');setMoveTarget(null);setMessage('원하는 곳을 누르면 이동해요. 놓을 수 없는 곳은 원래 자리로 돌아가요.')}
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
  const target=cameraTarget??{x:11*TILE,y:10*TILE}
  el.scrollLeft+=bounds.left+(target.x+seaMargin)*scale-box.left-box.width/2
  el.scrollTop+=bounds.top+(target.y+seaMargin)*scale-box.top-box.height/2
 },[zoom,cameraTarget])
 const tool=mode in topviewItems?mode as FarmTool:null,moving=state.objects.find(o=>o.id===selected)
 const previewKind=tool??(mode==='move'?moving?.kind:undefined)
 const previewCell=mode==='move'?moveTarget:hover
 const valid=!!previewKind&&!!previewCell&&placementValid(state,previewKind,previewCell.x,previewCell.y,mode==='move'?selected??undefined:undefined)
 function commit(next:TopviewState,before=state){if(next===before)return;setNotice(null);setHistory(old=>[...old.slice(-29),before]);setState(next);currentState.current=next}
 function plantCells(cells:LandCell[]){
  if(cells.length===1){const animal=objectAt(currentState.current,cells[0].x,cells[0].y);if(animal&&['cow','chicken'].includes(animal.kind)){collectAnimal(animal.id);return}}
  if(cells.length===1){const plot=objectAt(currentState.current,cells[0].x,cells[0].y),job=plot&&currentState.current.simulation.cropJobs[plot.id];if(plot?.kind==='plot'&&job&&job.readyAt<=Date.now()){if(cropIsRotten(job,Date.now())){receiveProduction(plot.id,{type:'discardCrop'});return}startHarvest(cells);return}}
  const before=currentState.current;let next=before,count=0
  for(const cell of cells){const plot=objectAt(next,cell.x,cell.y);if(plot?.kind!=='plot')continue
   const result=simulateFarm(next,plot.id,{type:'plant',crop:selectedSeed},Date.now())
   if(result.state!==next){next=result.state;count++}
  }
  if(next!==before){setState(next);currentState.current=next;setHistory([]);setClock(Date.now());}
  setMessage(count?`${farmCrops[selectedSeed].name} ${count}칸을 심었어요.`:'빈 밭과 보유 종자를 확인해주세요.')
 }
 function startHarvest(cells:LandCell[]){
  if(!warehouseAvailable(currentState.current)){setMessage('창고 업그레이드 중에는 수확물을 보관할 수 없어요. 완료되거나 취소한 뒤 수확해주세요.');return}
  setProductionId(null);setSelected(null)
  const before=currentState.current,jobs=[...harvestingRef.current],now=Date.now();let next=before,rejected=''
  for(const cell of cells){const plot=objectAt(before,cell.x,cell.y),crop=plot&&before.simulation.cropJobs[plot.id]
   if(plot?.kind!=='plot'||!crop||crop.readyAt>now||jobs.some(job=>job.id===plot.id))continue
   const result=simulateFarm(next,plot.id,{type:'beginHarvest'},now)
   if(result.state===next){rejected=result.message;continue}
   next=result.state;jobs.push({id:plot.id,readyAt:now+3000})
  }
  if(next!==before){setState(next);currentState.current=next;setHistory([])}
  harvestingRef.current=jobs;setHarvesting(jobs);setClock(now);setMessage(rejected||(jobs.length?'낫으로 수확하고 있어요…':'다 자란 작물을 선택해주세요.'))
 }
 useEffect(()=>{
  if(!harvesting.length)return
  const timer=window.setTimeout(()=>{
   const before=currentState.current,now=Date.now();let next=before,count=0,message=''
   for(const job of harvestingRef.current.filter(job=>job.readyAt<=now)){
    const result=simulateFarm(next,job.id,{type:'harvest'},now)
    message=result.message;if(result.state!==next){next=result.state;count++}else next=simulateFarm(next,job.id,{type:'cancelHarvest'},now).state
   }
   if(next!==before){setState(next);currentState.current=next;setHistory([])}
   const received=cropKinds.filter(crop=>next.simulation.inventory[crop]>before.simulation.inventory[crop]).map(good=>({good,quantity:next.simulation.inventory[good]-before.simulation.inventory[good]}))
   if(count){if(received.length)setEffect({type:'harvest',good:received[0].good,quantity:received[0].quantity,items:received,id:++effectId.current})}
   setHarvesting(jobs=>jobs.filter(job=>job.readyAt>now));setMessage(count?'':message)

  },Math.max(0,Math.min(...harvesting.map(job=>job.readyAt))-Date.now()))
  return()=>window.clearTimeout(timer)
 },[harvesting])
 useEffect(()=>{
  if(!clearing.length)return
  const timer=window.setTimeout(()=>{
   const now=Date.now(),before=currentState.current;let next=before,count=0
   for(const job of clearingRef.current.filter(job=>job.readyAt<=now)){
    if(farmPlacementError(next,'plot')||!placementValid(next,'plot',job.x,job.y)||next.paths.includes(cellKey(job.x,job.y))||next.gold<topviewItems.plot.price)continue
    next={...next,gold:next.gold-topviewItems.plot.price,objects:[...next.objects,{id:next.nextId,kind:'plot',x:job.x,y:job.y}],nextId:next.nextId+1};count++
   }
   if(next!==before)commit(next,before)
   setClearing(jobs=>jobs.filter(job=>job.readyAt>now))
   setMessage(count?`개간 완료! 밭 ${count}칸이 생겼어요.`:'개간할 수 없는 칸은 건너뛰었어요.')
  },Math.max(0,Math.min(...clearing.map(job=>job.readyAt))-Date.now()))
  return()=>window.clearTimeout(timer)
 },[clearing])
 function startClearing(cells:LandCell[]){
  const before=currentState.current,jobs=[...clearingRef.current],limits=farmLimits(before)
  let count=0
  for(const cell of cells){
   if(jobs.some(job=>job.x===cell.x&&job.y===cell.y)||!placementValid(before,'plot',cell.x,cell.y)||before.paths.includes(cellKey(cell.x,cell.y)))continue
   if(limits.usedPlots+jobs.length>=limits.plots||before.gold<(jobs.length+1)*topviewItems.plot.price)break
   jobs.push({...cell,readyAt:Date.now()+3000});count++
  }
  clearingRef.current=jobs;setClearing(jobs);setHover(null)
  setMessage(count?`${count}칸을 개간하고 있어요…`:'빈 땅과 개간 가능 수량·골드를 확인해주세요.')
 }
 function readLandCell(clientX:number,clientY:number):LandCell|null{
  const bounds=svgRef.current?.getBoundingClientRect()
  if(!bounds?.width||!bounds.height)return null
  const x=Math.floor(((clientX-bounds.left)/bounds.width*(MAP_W*TILE+seaMargin*2)-seaMargin)/TILE),y=Math.floor(((clientY-bounds.top)/bounds.height*(MAP_H*TILE+seaMargin*2)-seaMargin)/TILE)
  return x>=0&&y>=0&&x<MAP_W&&y<MAP_H?{x,y}:null
 }
 function commitLandStroke(active:LandTool,cells:LandCell[]){
  const before=currentState.current,result=applyLandStroke(before,active,cells)
  if(result.changed.length){commit(result.state,before);setLastAdded(active==='place'?cellKey(result.changed[0].x,result.changed[0].y):null);setMessage(`${result.changed.length}칸을 ${active==='place'?'놓았어요':'회수했어요'}. 여분 ${result.state.landStock}칸${result.blocked.length?` · ${result.blocked.length}칸은 건너뛰었어요.`:''}`)}
  else if(result.blocked.length)setMessage(landBlockMessages[result.blocked[0].reason])
 }
 function commitTileStroke(active:LandTool,cells:LandCell[]){
  const before=currentState.current,result=applyTileStroke(before,active,cells,clearingRef.current)
  if(result.changed.length){commit(result.state,before);setMessage(`타일 ${result.changed.length}개를 ${active==='place'?'깔았어요':'회수했어요'}.`)}
  else setMessage(active==='place'?'빈 땅과 보유 타일 수량을 확인해주세요.':'회수할 타일이 있는 곳을 골라주세요.')
 }
 function buyLand(quantity:number){const before=currentState.current,next=buyLandStock(before,quantity);if(next===before)return false;setState(next);setHistory([]);setNotice(null);setMessage(`땅 ${quantity}칸을 여분으로 보관했어요.`);return true}
 function openLandShop(){landBrush.cancel();setHelp(false);setLandBuyOpen(true)}
 function toggleEditing(){landBrush.cancel();const next=!editing;setEditing(next);setToolMenu(null);setSeedMenu(false);setMoveTarget(null);setNotice(null);setMode('look');setGroup(null);setSelected(null);setHover(null);setGrid(next);setLastAdded(null);setHistory([]);setMessage('')}
 function resetTrial(){setToolMenu(null);setLastPurchasedSeed('wheat');setProductionId(null);setShopOpen(false);setTilePickerOpen(false);setHarvesting([]);harvestingRef.current=[];setSeedMenu(false);setWarehouseOpen(false);setClearing([]);clearingRef.current=[];landBrush.cancel();setState(initialTopview());setHistory([]);setClock(Date.now());setEffect(null);choose('look');setGroup(null);setLastAdded(null)}
 useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(null),4500);return()=>window.clearTimeout(timer)},[notice])
 function cancelMove(){setMode('look');setMoveTarget(null);setHover(null)}
 function undo(){if(clearing.length||harvesting.length)return;const previous=history.at(-1);if(!previous)return;landBrush.cancel();setState(previous);setHistory(old=>old.slice(0,-1));setLastAdded(null);setSelected(null);setHover(null);setMoveTarget(null);setNotice(null);if(!landTool)setMode('look');setMessage('마지막 편집을 되돌렸어요.')}
 function recover(){
  if(!moving)return
  if(topviewItems[moving.kind].group==='건물'){storeBuilding(moving.id,true);return}
  if(state.simulation.animalPurchaseJobs[moving.id]){setMessage('준비 중인 동물이 보관함에 도착한 뒤 회수해주세요.');return}
  if(state.simulation.upgradeJobs[moving.id]){setMessage('업그레이드를 완료하거나 취소한 뒤 회수해주세요.');return}
  if(state.simulation.researchJob?.labId===moving.id){setMessage('연구가 끝난 뒤 연구소를 회수해주세요.');return}
  if(state.simulation.processingJobs[moving.id]){setMessage('가공품을 먼저 받은 뒤 건물을 회수해주세요.');return}
  if(state.simulation.cropJobs[moving.id]||state.simulation.animalJobs[moving.id]<=Date.now()||(moving.kind==='mill'&&state.simulation.millJobs[moving.id])){setMessage(moving.kind==='plot'?'작물을 먼저 수확하거나 폐기한 뒤 밭을 제거해주세요.':'생산물을 먼저 수령한 뒤 회수해주세요.');return}
  const after={...state,objects:state.objects.filter(o=>o.id!==moving.id)},nextLimits=farmLimits(after)
  if(moving.kind==='warehouse'&&storedFarmGoods(state.simulation.inventory).length>warehouseCapacity(after)){setMessage('생산물을 판매하거나 다른 창고를 마련한 뒤 회수해주세요.');return}
  if(nextLimits.usedPlots>nextLimits.plots||nextLimits.usedAnimals>nextLimits.animals){setMessage('관리소를 회수하기 전에 초과한 텃밭이나 동물을 먼저 회수해주세요.');return}
  if(moving.kind==='plot'){
   commit({...state,objects:state.objects.filter(o=>o.id!==moving.id)})
   setSelected(null);setMode('look');setMessage('밭을 제거했어요.');return
  }
  const levels=state.storedLevels?.[moving.kind]??state.stored.filter(kind=>kind===moving.kind).map(()=>1)
  const animalJobs={...state.simulation.animalJobs};delete animalJobs[moving.id]
  commit({...state,simulation:{...state.simulation,animalJobs},objects:state.objects.filter(o=>o.id!==moving.id),stored:[...state.stored,moving.kind],storedLevels:isUpgradeable(moving.kind)?{...state.storedLevels,[moving.kind]:[...levels,buildingLevel(moving)]}:state.storedLevels})
  setNotice({name:topviewItems[moving.kind].name});setSelected(null);setMode('look');setMessage('보관함에서 다시 꺼내 배치할 수 있어요.')
 }
 function storeBuilding(id:number,fromEditor=false){
  const before=currentState.current,error=farmBuildingStorageError(before,id,clearing.length)
  if(error){setMessage(error);setProductionMessage(error);return}
  const object=before.objects.find(o=>o.id===id),result=simulateFarm(before,id,{type:'storeBuilding'},Date.now())
  if(result.state===before){setMessage(result.message);return}
  if(fromEditor)commit(result.state,before);else{setState(result.state);currentState.current=result.state;setHistory([])}
  setProductionId(null);setWarehouseOpen(false);setSelected(null);setMode('look');setMoveTarget(null);setMessage(result.message)
  if(fromEditor&&object)setNotice({name:topviewItems[object.kind].name})
 }
 function confirmMove(target:LandCell|null=moveTarget){
  const before=currentState.current,object=before.objects.find(o=>o.id===selected)
  if(!object||!target||!placementValid(before,object.kind,target.x,target.y,object.id)){cancelMove();setSelected(null);setMessage('놓을 수 없는 곳이라 원래 자리로 돌아왔어요.');return}
  if(object.x!==target.x||object.y!==target.y)commit({...before,objects:before.objects.map(o=>o.id===object.id?{...o,...target}:o)},before)
  cancelMove();setSelected(null);setMessage('배치를 옮겼어요.')
 }
 function choose(next:Mode){landBrush.cancel();setMoveTarget(null);setNotice(null);setMode(next);setSelected(null);setHover(null);setMessage(next==='land'?'여분 땅을 꺼내 섬과 이어서 놓아주세요.':next==='land-recover'?'빈 땅을 선택해 여분으로 회수하세요.':'원하는 위치를 눌러 배치해 보세요.')}
 function cellClick(x:number,y:number,keyboard=false){
  if(!keyboard&&camera.ignoresClick())return
  if(!keyboard&&landBrush.ignoresClick())return
  if(drag.current?.moved)return
  setEffect(null)
  if(!editing&&mode==='look'){const found=objectAt(currentState.current,x,y),sim=currentState.current.simulation,now=Date.now();if(found){
   if(sim.animalPurchaseJobs[found.id]?.readyAt<=now){claimAnimalPurchase(found.id);return}
   if(found.kind==='mill'&&sim.millJobs[found.id]&&sim.millJobs[found.id].readyAt<=now){receiveProduction(found.id,{type:'collectFlour'});return}
   if(sim.processingJobs[found.id]?.readyAt<=now){receiveProduction(found.id,{type:'collectCraft'});return}
  }}
  if(mode==='seed'){plantCells([{x,y}]);return}
  if(tileTool){if(keyboard)landBrush.cancel();commitTileStroke(tileTool,[{x,y}]);return}
  if(landTool){if(keyboard)landBrush.cancel();commitLandStroke(landTool,[{x,y}]);return}
  if(clearingTool){startClearing([{x,y}]);return}
  if(!editing){const found=objectAt(state,x,y);if(found){if(state.simulation.animalPurchaseJobs[found.id]?.readyAt<=Date.now()){claimAnimalPurchase(found.id);return}if(['cow','chicken'].includes(found.kind)){collectAnimal(found.id);return}if(found.kind==='plot'&&state.simulation.cropJobs[found.id]&&cropIsRotten(state.simulation.cropJobs[found.id],Date.now())){receiveProduction(found.id,{type:'discardCrop'});return}if(found.kind==='warehouse'){setSelected(found.id);setWarehouseOpen(true);return}if(found.kind==='plot'&&state.simulation.cropJobs[found.id]?.readyAt<=Date.now()){startHarvest([{x,y}]);return}setSelected(found.id);setMessage(topviewItems[found.kind].name);if(topviewItems[found.kind].group==='건물'||['plot','cow','chicken'].includes(found.kind)){setProductionMessage('');setProductionId(found.id)}}return}
  const found=objectAt(state,x,y)
  if(mode==='move'){confirmMove({x,y});return}
  if(found){setSelected(found.id);setMode('look');setGroup(null);setHover(null);return}
  if(tool){
   const placementError=farmPlacementError(state,tool,{fromStorage:group==='보관함'&&state.stored.includes(tool)})
   if(placementError){setMessage(placementError);return}
   if(['cow','chicken'].includes(tool)&&!state.stored.includes(tool)){setMessage('닭장이나 외양간에서 동물을 먼저 구매해주세요.');return}
   const storedIndex=group==='보관함'?state.stored.indexOf(tool):-1,orderKind=tool==='store'||tool==='processed'?tool:null
   if(group==='보관함'&&storedIndex<0){setMessage('보관함에서 배치할 개체를 선택해주세요.');return}
   if(storedIndex<0&&state.gold<topviewItems[tool].price){setMessage('테스트 골드가 부족해요.');return}
   if(!placementValid(state,tool,x,y)){setMessage('모든 바닥 칸이 땅 위에 있고, 다른 물체와 겹치지 않아야 해요.');return}
   if(tool==='plot'){
    if(state.paths.includes(cellKey(x,y))){setMessage('흙길이 없는 빈 땅을 골라주세요.');return}
    startClearing([{x,y}]);return
   }
   commit({...state,gold:state.gold-(storedIndex<0?topviewItems[tool].price:0),stored:state.stored.filter((_,index)=>index!==storedIndex),objects:[...state.objects,{id:state.nextId,kind:tool,x,y,orderKey:orderKind?(state.storedOrderKeys?.[orderKind]?.[0]??state.nextId):undefined,level:storedIndex>=0?state.storedLevels?.[tool]?.[0]??1:1}],storedOrderKeys:storedIndex>=0&&orderKind?{...state.storedOrderKeys,[orderKind]:state.storedOrderKeys?.[orderKind]?.slice(1)}:state.storedOrderKeys,storedLevels:storedIndex>=0?{...state.storedLevels,[tool]:state.storedLevels?.[tool]?.slice(1)}:state.storedLevels,nextId:state.nextId+1});setMessage(`${topviewItems[tool].name}을 배치했어요.`)
   if(group==='보관함'&&state.stored.filter(kind=>kind===tool).length===1){setMode('look');setHover(null)}
  }else setSelected(null)
 }
 const shore=useMemo(()=>islandShorePath(state.land),[state.land])
 const allCells=Array.from({length:MAP_W*MAP_H},(_,i)=>({x:i%MAP_W,y:Math.floor(i/MAP_W)}))
 return <section className="top-farm" aria-label="탑뷰 농장 테스트" onKeyDown={event=>{if(event.key==='Escape'&&!shopOpen&&!tilePickerOpen&&!seedMenu&&!landBuyOpen&&!productionId){setHelp(false);if(landBrush.draft){landBrush.cancel();setMessage('땅 선택을 취소했어요.')}else if(landTool||clearingTool||cropTool||toolMenu){choose('look');setToolMenu(null)}else if(mode==='move')cancelMove();else setSelected(null)}}}>
  <header className="top-farm-header"><Link to="/aquarium" aria-label="농장 나가기"><ArrowLeft size={18}/></Link><h1>내 농장</h1><button className="top-farm-gold" aria-label="테스트 골드 안내" onClick={()=>setHelp(v=>!v)}><Coins size={15}/>{state.gold.toLocaleString()}</button><button aria-label="한 단계 되돌리기" disabled={!history.length||!!landBrush.draft||!!clearing.length||!!harvesting.length} onClick={undo}><Undo2 size={18}/></button><button aria-label="농장 더보기" aria-expanded={help} onClick={()=>setHelp(v=>!v)}><MoreHorizontal size={20}/></button><FarmCapacitySummary state={state} clearingCount={clearing.length}/></header>
  {help&&<div className="top-farm-help"><strong>체험 중인 농장이에요</strong><p>실제 골드 사용 없음 · 새로고침 시 초기화</p><p>텃밭 {limits.usedPlots}/{limits.plots} · 전체 동물 {limits.totalAnimals}/{limits.animals} · 창고 {storedFarmGoods(state.simulation.inventory).length}/{warehouseCapacity(state)}</p><p>도구를 쓸 때 휠 또는 두 손가락으로 확대·축소할 수 있어요.</p><button onClick={()=>{setHelp(false);resetTrial()}}><RotateCcw size={14}/>체험 초기화</button></div>}
  <div className="top-farm-viewport" data-seed-cursor={seedCursorActive||undefined} data-land-tool={brushActive} ref={viewport} onClick={event=>{if(mode==='move'&&!(event.target as Element).closest('[data-farm-cell],.top-farm-object,[data-status-bubble]'))confirmMove(null)}} onPointerDownCapture={camera.onPointerDownCapture} onPointerMoveCapture={event=>{camera.onPointerMoveCapture(event);const cursor=seedCursor.current;if(cursor){cursor.style.display=seedCursorActive&&event.pointerType!=='touch'?'block':'none';cursor.style.transform=`translate(${event.clientX}px, ${event.clientY}px)`}}} onPointerUpCapture={camera.onPointerUpCapture} onPointerCancelCapture={camera.onPointerCancelCapture} onPointerDown={e=>{
   if((e.target as Element).closest('[data-status-bubble]'))return
   if(brushActive){landBrush.onPointerDown(e);return}
   const el=viewport.current;if(mode==='move'||!el||e.button!==0||e.pointerType==='touch')return
   drag.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop,moved:false}
  }} onPointerMove={e=>{if(mode==='move'){setMoveTarget(readLandCell(e.clientX,e.clientY));return}if(brushActive){landBrush.onPointerMove(e);return}const d=drag.current,el=viewport.current;if(!d||!el)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>8)d.moved=true;if(d.moved){el.scrollLeft=d.left-dx;el.scrollTop=d.top-dy}}} onPointerUp={e=>{if(brushActive)landBrush.onPointerUp(e);else window.setTimeout(()=>{drag.current=null},0)}} onPointerCancel={e=>{landBrush.onPointerCancel(e);drag.current=null}} onLostPointerCapture={landBrush.onLostPointerCapture} onPointerLeave={()=>{if(seedCursor.current)seedCursor.current.style.display='none';if(mode==='move')setMoveTarget(null);if(!landBrush.draft)drag.current=null;setHover(null)}}>
   <div className="farm-map-canvas"><svg ref={svgRef} className="top-farm-map" style={{width:(MAP_W*TILE+seaMargin*2)*zoom,height:(MAP_H*TILE+seaMargin*2)*zoom}} viewBox={`${-seaMargin} ${-seaMargin} ${MAP_W*TILE+seaMargin*2} ${MAP_H*TILE+seaMargin*2}`} role="group" aria-label="사각 격자 농장 지도">
    <defs><filter id="farm-selection-outline" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="1.25" result="expanded"/><feComposite in="expanded" in2="SourceAlpha" operator="out" result="ring"/><feFlood floodColor="#fff0c5" floodOpacity=".9"/><feComposite in2="ring" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="farm-island-clip"><path d={shore} fillRule="evenodd" clipRule="evenodd"/></clipPath><pattern id="farm-water" width="96" height="80" patternUnits="userSpaceOnUse"><rect width="96" height="80" fill="#80b8bf"/><path className="top-farm-waves" d="M10 19q6 3 12 0m30 32q9 4 18 0M75 8h7M12 62h6" fill="none" stroke="#b9dfe0" strokeWidth="1.5" strokeLinecap="round"/></pattern><FarmGrassPattern/><pattern id="farm-path" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#d6bc87"/><path d="M7 14h3m14 16h2m4-24h2" stroke="#b99d6c" strokeWidth="1.5"/></pattern></defs>
    <rect x={-seaMargin} y={-seaMargin} width={MAP_W*TILE+seaMargin*2} height={MAP_H*TILE+seaMargin*2} fill="url(#farm-water)" onClick={()=>{if(mode==='look')setSelected(null)}}/>
    <g pointerEvents="none" strokeLinejoin="round" strokeLinecap="round" data-island-shore="true"><path className="farm-shore-foam" d={shore} fill="none" stroke="#fff8e5" strokeWidth="24" strokeDasharray="18 190"/><path d={shore} fill="url(#farm-grass)" fillRule="evenodd" stroke="#ead2a0" strokeWidth="16"/></g>
    {allCells.map(({x,y})=>{
     const key=cellKey(x,y),owned=state.land.includes(key),buyable=mode==='land'&&state.landStock>0&&adjacentLand(state,x,y),interactive=(cropTool||clearingTool||tileTool!==null||mode==='move'||mode==='land-recover')&&owned||buyable
     const label=tileTool?`타일 ${x},${y} ${tileTool==='place'?'깔기':'회수'}`:cropTool?`심기 위치 ${x},${y}`:clearingTool?`개간 위치 ${x},${y}`:mode==='move'?`배치 위치 ${x},${y}`:`땅 ${x},${y} ${mode==='land'?'놓기':'회수'}`
     return <g key={key} data-farm-cell={key} data-farm-owned={owned} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?label:undefined} onKeyDown={event=>{if(interactive&&(event.key==='Enter'||event.key===' ')){event.preventDefault();cellClick(x,y,true)}}} onPointerEnter={()=>setHover({x,y})} onClick={()=>cellClick(x,y)}>
      <rect data-farm-tile={owned&&state.paths.includes(key)?'dirt':undefined} clipPath={owned?'url(#farm-island-clip)':undefined} shapeRendering="crispEdges" x={x*TILE} y={y*TILE} width={TILE} height={TILE} fill={owned?(state.paths.includes(key)?'url(#farm-path)':'url(#farm-grass)'):buyable?'#b7ddd060':'transparent'} className={lastAdded===key?'top-farm-new-land':undefined} stroke={buyable?'#fff1c8':grid&&owned?'#e4ebc447':'transparent'} strokeWidth={buyable?1.5:1}/>
      {buyable&&<g pointerEvents="none" aria-hidden="true"><path d={`M${x*TILE+15} ${y*TILE+20}h10m-5-5v10`} stroke="#fff8d4" strokeWidth="2"/></g>}
     </g>
    })}
    <path pointerEvents="none" d={shore} fill="none" stroke="#ead2a0" strokeWidth="3" strokeLinejoin="round"/>
    {state.objects.toSorted((a,b)=>(a.y+topviewItems[a.kind].h)-(b.y+topviewItems[b.kind].h)||a.x-b.x).map(o=>{
     const item=topviewItems[o.kind],animal=item.group==='동물',height=objectArtHeight(o.kind),bottom=(o.y+item.h)*TILE,cropJob=state.simulation.cropJobs[o.id],rotten=!!cropJob&&cropIsRotten(cropJob,clock)
     const growth=cropJob?Math.max(0,Math.min(1,1-(cropJob.readyAt-clock)/(farmCrops[cropJob.crop].growSeconds*1000))):0
     return <g key={o.id} role="button" tabIndex={0} aria-label={`${item.name} (${o.x},${o.y})`} onClick={()=>cellClick(o.x,o.y)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cellClick(o.x,o.y,true)}}} onPointerEnter={()=>setHover({x:o.x,y:o.y})} className={`top-farm-object ${animal?'top-farm-animal':''} ${state.simulation.researchJob?.labId===o.id||state.simulation.processingJobs[o.id]?'top-farm-research-active':''}`} style={{animationDelay:`${o.id*.37}s`}}>
      {<rect x={o.x*TILE-3} y={Math.min(o.y*TILE,bottom-height)-(animal?12:0)} width={Math.max(44,item.w*TILE+6)} height={Math.max(44,height+(animal?12:0))} fill="transparent"/>}
      <svg data-object-art="true" filter={selected===o.id?'url(#farm-selection-outline)':undefined} x={o.x*TILE} y={bottom-height} width={item.w*TILE} height={height} overflow="visible" opacity={mode==='move'&&o.id===selected?0.3:1}><TopviewArt kind={o.kind} crop={cropJob?.crop} progress={growth} stage={rotten?'rotten':cropJob?(cropJob.readyAt<=clock?'ready':'growing'):'empty'}/></svg>
      {['cow','chicken'].includes(o.kind)&&<FarmAnimalStatus object={o} readyAt={state.simulation.animalJobs[o.id]} now={clock} onActivate={()=>editing?cellClick(o.x,o.y,true):collectAnimal(o.id)} revealTime={inspectedAnimal===o.id}/>}
      {state.simulation.animalPurchaseJobs[o.id]&&<FarmAnimalStatus object={o} readyAt={state.simulation.animalPurchaseJobs[o.id].readyAt} now={clock} purchase={state.simulation.animalPurchaseJobs[o.id].animal} onClaim={()=>editing?cellClick(o.x,o.y,true):claimAnimalPurchase(o.id)}/>}
      {state.simulation.upgradeJobs[o.id]&&<BuildingUpgradeEffect object={o} job={state.simulation.upgradeJobs[o.id]} now={clock}/>}
      <FarmJobStatus object={o} simulation={state.simulation} now={clock} onActivate={()=>cellClick(o.x,o.y,true)}/>
      {item.group==='건물'&&selected===o.id&&<text x={(o.x+item.w/2)*TILE} y={bottom+9} textAnchor="middle" fill="#fff4d9" stroke="#627b50" strokeWidth="2.5" paintOrder="stroke" fontSize="12">{item.name}</text>}
     </g>
    })}
    {cropTool&&landBrush.draft&&<g pointerEvents="none">{landBrush.draft.cells.filter(cell=>{const plot=objectAt(state,cell.x,cell.y);return plot?.kind==='plot'&&!state.simulation.cropJobs[plot.id]}).map(cell=><rect key={cellKey(cell.x,cell.y)} data-crop-preview="true" x={cell.x*TILE+2} y={cell.y*TILE+2} width="36" height="36" rx="4" fill="#bbd98b66" stroke="#fff0bd" strokeWidth="2"/>)}</g>}
    {harvesting.map(job=>{const plot=state.objects.find(o=>o.id===job.id);return plot&&<g key={job.id} data-harvesting={job.id} transform={`translate(${plot.x*TILE} ${plot.y*TILE})`}>
     <g className="farm-harvest-scythe"><path d="M12 33 24 10" stroke="#805536" strokeWidth="3.5" strokeLinecap="round"/><path d="M23 10Q9-1 2 17 12 8 23 15Z" fill="#e0e6d4" stroke="#6d8074" strokeWidth="1.2"/></g>
     <g className="farm-clearing-dust" fill="#eac873"><path d="m8 23 2-4 1 4 4 1-4 1-1 4-2-4-3-1Z"/><circle cx="29" cy="28" r="2"/></g>
     <FarmStatusBubble x={20} y={-18} label="수확 진행" progress={1-(job.readyAt-clock)/3000} remaining={Math.max(0,(job.readyAt-clock)/1000)}><StatusGlyph kind="harvest"/></FarmStatusBubble>
    </g>})}
    {clearingTool&&landBrush.draft&&<g pointerEvents="none">{landBrush.draft.cells.map(cell=><rect key={cellKey(cell.x,cell.y)} data-clearing-preview="true" x={cell.x*TILE+2} y={cell.y*TILE+2} width="36" height="36" rx="4" fill="#c7975e88" stroke="#ffe4b5" strokeWidth="2"/>)}</g>}
    {clearing.map(job=><g key={cellKey(job.x,job.y)} aria-label="개간 중" data-clearing-cell={cellKey(job.x,job.y)} transform={`translate(${job.x*TILE} ${job.y*TILE})`}>
     <rect x="2" y="3" width="36" height="34" rx="6" fill="#ac8057" opacity=".7" stroke="#f5dfaa" strokeWidth="2"/>
     <g className="farm-clearing-dust" fill="#e8ce9f"><circle cx="10" cy="29" r="3"/><circle cx="28" cy="26" r="2"/><circle cx="21" cy="32" r="2.5"/></g>
     <g className="farm-clearing-pickaxe"><path d="m14 29 14-18" stroke="#62442e" strokeWidth="5" strokeLinecap="round"/><path d="M14 8Q27 3 35 22L25 13Z" fill="#b9c9c6" stroke="#596c68" strokeWidth="1.5"/></g>
     <FarmStatusBubble x={20} y={-18} label="개간 진행" progress={1-(job.readyAt-clock)/3000} remaining={Math.max(0,(job.readyAt-clock)/1000)}><StatusGlyph kind="pickaxe"/></FarmStatusBubble>
    </g>)}
    {landPreview&&<g pointerEvents="none" aria-hidden="true">{landPreview.changed.map(cell=><rect key={cellKey(cell.x,cell.y)} data-land-preview={landTool==='place'?'place':'recover'} x={cell.x*TILE+1} y={cell.y*TILE+1} width={TILE-2} height={TILE-2} rx="3" fill={landTool==='place'?'#b5d98aaa':'#e5af72aa'} stroke={landTool==='place'?'#557e3c':'#a36a38'} strokeWidth="2"/>)}{landPreview.blocked.map(({cell,reason})=><rect key={cellKey(cell.x,cell.y)} data-land-preview="blocked" data-land-block={reason} x={cell.x*TILE+1} y={cell.y*TILE+1} width={TILE-2} height={TILE-2} rx="3" fill="#d78a7a66" stroke="#b65e4f" strokeWidth="2" strokeDasharray="4 3"/>)}</g>}
    {tilePreview&&<g pointerEvents="none" aria-hidden="true">{tilePreview.changed.map(cell=><rect key={cellKey(cell.x,cell.y)} data-tile-preview={tileTool} x={cell.x*TILE+1} y={cell.y*TILE+1} width={TILE-2} height={TILE-2} rx="3" fill={tileTool==='place'?'#d6bc87bb':'#b7dc8e99'} stroke="#fff0bd" strokeWidth="2"/>)}</g>}
    {editing&&previewKind&&previewCell&&<g pointerEvents="none" data-move-preview={mode==='move'||undefined}><rect data-placement-valid={valid} x={previewCell.x*TILE+1} y={previewCell.y*TILE+1} width={topviewItems[previewKind].w*TILE-2} height={topviewItems[previewKind].h*TILE-2} rx="4" fill={valid?'#b7dc8e66':'#e2a38b66'} stroke={valid?'#69934b':'#d8755b'} strokeWidth="2" strokeDasharray="5 3"/>{mode==='move'&&<svg x={previewCell.x*TILE} y={(previewCell.y+topviewItems[previewKind].h)*TILE-objectArtHeight(previewKind)} width={topviewItems[previewKind].w*TILE} height={objectArtHeight(previewKind)} opacity=".7"><TopviewArt kind={previewKind}/></svg>}</g>}
   </svg></div>
  </div>
  {productionObject&&!editing&&<FarmProductionDialog key={productionObject.id} object={productionObject} state={state} message={productionMessage} onAction={act} onStore={()=>storeBuilding(productionObject.id)} lastPurchasedSeed={lastPurchasedSeed} pendingPlots={clearing.length} onClose={()=>{setProductionId(null);setSelected(null)}} onNavigate={navigateBuilding} onPlant={startPlanting} onMove={()=>moveFromDialog(productionObject.id)} onResearch={()=>{const lab=state.objects.find(o=>o.kind==='lab');if(lab){setProductionId(lab.id);setSelected(lab.id);setProductionMessage('')}else setProductionMessage('편집에서 종자 연구소를 먼저 배치해주세요.')}}/>}
  {effect&&<FarmActionEffect effect={effect}/>}
  {warehouseOpen&&<FarmWarehouse onNavigate={navigateBuilding} onMove={warehouseObject?()=>moveFromDialog(warehouseObject.id):undefined} simulation={state.simulation} state={state} object={warehouseObject} now={clock} onAction={warehouseAction} onStore={warehouseObject?()=>storeBuilding(warehouseObject.id):undefined} onClose={()=>setWarehouseOpen(false)}/>}
  <LandPurchaseDialog open={landBuyOpen} gold={state.gold} onOpenChange={setLandBuyOpen} onBuy={buyLand}/>
  <FarmSeedPicker open={seedMenu} simulation={state.simulation} onClose={()=>setSeedMenu(false)} onSelect={startPlanting} onShop={()=>navigateBuilding('seedShop')}/>
  {shopOpen&&<FarmShop state={state} initialTab={shopTab} onClose={()=>setShopOpen(false)} onBuy={purchaseItem} onBuyTiles={purchaseTiles}/>}
  {tilePickerOpen&&<FarmTilePicker count={state.tileStock} onClose={()=>setTilePickerOpen(false)} onSelect={()=>{setTilePickerOpen(false);setGrid(true);choose('tile-place')}} onBuy={()=>openFarmShop('타일')}/>}
  <div ref={seedCursor} className="farm-seed-cursor" aria-hidden="true"><FarmGoodIcon good={seedGood(selectedSeed)}/></div>
  {editing&&moving&&mode==='look'&&<FarmObjectMenu object={moving} svgRef={svgRef} viewportRef={viewport} moving={false} valid={valid} onMove={()=>{setMode('move');setGroup(null);setMoveTarget({x:moving.x,y:moving.y});setHover(null);drag.current=null;setMessage('원하는 곳을 누르면 이동해요. 놓을 수 없는 곳은 원래 자리로 돌아가요.')}} onRecover={recover} onConfirm={confirmMove} onCancel={cancelMove} onClose={()=>setSelected(null)}/>}
  <aside className="top-farm-camera"><button aria-label="농장 확대" onClick={()=>{landBrush.cancel();manualCamera.current=true;setCameraTarget(null);setZoom(z=>Math.min(1.8,z+.2))}}><Plus size={17}/></button><button aria-label="농장 축소" onClick={()=>{landBrush.cancel();manualCamera.current=true;setCameraTarget(null);setZoom(z=>Math.max(.25,z-.2))}}><Minus size={17}/></button><button aria-label="섬 전체 보기" onClick={()=>{landBrush.cancel();manualCamera.current=false;setCameraTarget(null);const el=viewport.current;if(el)setZoom(Math.max(.25,Math.min(1,(el.clientWidth-32)/800,(el.clientHeight-32)/640)))}}><Scan size={16}/></button></aside>
  <div className="top-farm-bottom" data-editing={editing}>
   {(editing||feedback)&&message&&<p className="top-farm-message" role="status">{notice?<>{notice.name} 회수 완료<button onClick={undo}>되돌리기</button></>:message}</p>}

   {toolMenu==='storage'&&<FarmObjectStorage state={state} category={storageCategory} selected={tool} onCategory={category=>{choose('look');setEditing(false);setGrid(false);setStorageCategory(category)}} onPlace={kind=>{setEditing(true);setGrid(true);choose(kind);setGroup('보관함')}} onDone={finishTool}/>}
   {toolMenu==='tile'&&<FarmTileMenu tool={tileTool} count={state.tileStock} onPick={()=>{choose('look');setTilePickerOpen(true)}} onRecover={()=>{setGrid(true);choose('tile-recover')}} onBuy={()=>openFarmShop('타일')} onDone={finishTool}/>}
   {toolMenu==='land'&&<LandToolPanel tool={landTool} onTool={next=>{setGrid(true);choose(next==='place'?'land':'land-recover')}} onBuy={openLandShop} onDone={finishTool}/>}
   {toolMenu==='farm'&&<section id="farm-work-menu" className="farm-tool-menu" aria-label="농사 메뉴">
    <button aria-label="개간하기" aria-pressed={clearingTool} onClick={()=>{const active=clearingTool;setEditing(false);setGrid(true);setSeedMenu(false);choose(active?'look':'plot');setMessage(active?'':'빈 땅을 드래그해 개간하세요.')}}><Pickaxe size={17}/><span>개간하기</span><FarmCountBadge count={clearingCapacity} label="개간 가능" unit="칸"/></button>
    <button aria-label="씨앗 심기" aria-pressed={seedMenu||cropTool} onClick={openSeedPicker}><Sprout size={17}/><span>씨앗 심기</span><FarmCountBadge count={seedTotal} label="보유 종자"/></button>
    <button className="farm-tool-done" onClick={finishTool}><Check size={16}/><span>완료</span></button>
   </section>}
   <FarmToolbar landStock={state.landStock} tileStock={state.tileStock} storageCount={state.stored.length} landActive={toolMenu==='land'} farmActive={toolMenu==='farm'} tileActive={toolMenu==='tile'} storageActive={toolMenu==='storage'} shopOpen={shopOpen} editing={editing}
    onLand={()=>toggleToolMenu('land')} onFarm={()=>toggleToolMenu('farm')} onTile={()=>toggleToolMenu('tile')}
    onShop={()=>{setToolMenu(null);openFarmShop()}}
    onStorage={()=>toggleToolMenu('storage')} onEdit={toggleEditing}/>
  </div>
 </section>
}
