import {farmWorkshopItems,type ProcessingBuilding} from './workshop-catalog'
import {isFarmFence} from './fence-kinds'
import {initialFarmSimulation,type FarmSimulation} from './farm-simulation'
import type {FarmTile} from './tile-catalog'
import {farmAnimals} from './animal-catalog'
export type FarmTerrain='land'|'sea'
export type FarmTool='starClamFountain'|'waterwheel'|'agriShop'|'butcher'|'warehouse'|'livestockOffice'|'office'|'seedShop'|'store'|'barn'|'coop'|'lab'|'mill'|'processed'|'chicken'|'cow'|'duck'|'sheep'|'plot'|'flowers'|'fence'|'fenceWhite'|'fenceDark'|'bench'|'pongiTube'|'pongiTubeRed'|'duckBoat'|'woodBridge1'|'woodBridge2'|'woodBridge3'|'rabbitTopiary'|'mushroomLamp'|'sealFloat'|'waterLilies'|'pongiMailbox'|'teacupCat'|'bearPicnic'|'chickSandbox'|'strawScarecrow'|'hayBales'|'toolRack'|ProcessingBuilding
export const topviewItems:Record<FarmTool,{name:string;w:number;h:number;group:'건물'|'동물'|'꾸미기';price:number;purchaseLimit?:number;terrain?:FarmTerrain}>={
 starClamFountain:{name:'별빛 조개 분수',w:2,h:2,group:'꾸미기',terrain:'land',price:3500},
 waterwheel:{name:'퐁이 물레방아',w:2,h:2,group:'건물',price:5000,purchaseLimit:Infinity},
 agriShop:{name:'농업용품점',w:2,h:1,group:'건물',price:1500,purchaseLimit:Infinity},
 butcher:{name:'정육점',w:2,h:1,group:'건물',price:3000,purchaseLimit:Infinity},
 pongiMailbox:{name:'퐁이 우편함',w:1,h:1,group:'꾸미기',terrain:'land',price:400},
 teacupCat:{name:'찻잔 고양이',w:1,h:1,group:'꾸미기',terrain:'land',price:600},
 bearPicnic:{name:'곰돌이 피크닉',w:2,h:1,group:'꾸미기',terrain:'land',price:1000},
 chickSandbox:{name:'병아리 모래놀이터',w:1,h:1,group:'꾸미기',terrain:'land',price:500},
 strawScarecrow:{name:'밀짚모자 허수아비',w:1,h:1,group:'꾸미기',terrain:'land',price:300},
 hayBales:{name:'건초 더미',w:1,h:1,group:'꾸미기',terrain:'land',price:150},
 toolRack:{name:'농기구 거치대',w:1,h:1,group:'꾸미기',terrain:'land',price:300},
 fenceWhite:{name:'흰 울타리',w:1,h:1,group:'꾸미기',terrain:'land',price:150},
 fenceDark:{name:'짙은 원목 울타리',w:1,h:1,group:'꾸미기',terrain:'land',price:150},
 pongiTube:{name:'민트 튜브 탄 퐁이',w:1,h:1,group:'꾸미기',terrain:'sea',price:500},
 pongiTubeRed:{name:'빨간 튜브 탄 퐁이',w:1,h:1,group:'꾸미기',terrain:'sea',price:500},
 rabbitTopiary:{name:'토끼 토피어리',w:1,h:1,group:'꾸미기',terrain:'land',price:450},
 mushroomLamp:{name:'버섯 조명',w:1,h:1,group:'꾸미기',terrain:'land',price:350},
 sealFloat:{name:'아기 물범 튜브',w:1,h:1,group:'꾸미기',terrain:'sea',price:650},
 waterLilies:{name:'수련 꽃송이',w:1,h:1,group:'꾸미기',terrain:'sea',price:250},
 duckBoat:{name:'오리배',w:1,h:1,group:'꾸미기',terrain:'sea',price:900},
 woodBridge1:{name:'나무다리 1×1',w:1,h:1,group:'꾸미기',terrain:'sea',price:200},
 woodBridge2:{name:'나무다리 1×2',w:1,h:2,group:'꾸미기',terrain:'sea',price:400},
 woodBridge3:{name:'나무다리 1×3',w:1,h:3,group:'꾸미기',terrain:'sea',price:600},
 ...farmWorkshopItems,
 livestockOffice:{name:'퐁이 돌봄터',w:1,h:1,group:'건물',price:5000,purchaseLimit:Infinity},
 warehouse:{name:'창고',w:2,h:1,group:'건물',price:0,purchaseLimit:1},
 office:{name:'퐁이 개간터',w:1,h:1,group:'건물',price:5000,purchaseLimit:Infinity},seedShop:{name:'종자 상점',w:2,h:1,group:'건물',price:0,purchaseLimit:1},store:{name:'요리 납품소',w:2,h:1,group:'건물',price:0,purchaseLimit:1},barn:{name:'축사',w:2,h:1,group:'건물',price:2500,purchaseLimit:Infinity},
 coop:{name:'가금사',w:2,h:1,group:'건물',price:2000,purchaseLimit:Infinity},lab:{name:'종자 연구소',w:2,h:1,group:'건물',price:1500,purchaseLimit:Infinity},mill:{name:'제분소',w:2,h:1,group:'건물',price:2000,purchaseLimit:Infinity},processed:{name:'가공품 판매소',w:2,h:1,group:'건물',price:100,purchaseLimit:Infinity},
 chicken:{name:farmAnimals.chicken.name,w:1,h:1,group:'동물',price:farmAnimals.chicken.price},cow:{name:farmAnimals.cow.name,w:2,h:1,group:'동물',price:farmAnimals.cow.price},duck:{name:farmAnimals.duck.name,w:1,h:1,group:'동물',price:farmAnimals.duck.price},sheep:{name:farmAnimals.sheep.name,w:1,h:1,group:'동물',price:farmAnimals.sheep.price},
 plot:{name:'밭',w:1,h:1,group:'꾸미기',price:10},flowers:{name:'꽃밭',w:1,h:1,group:'꾸미기',terrain:'land',price:100},fence:{name:'울타리',w:1,h:1,group:'꾸미기',terrain:'land',price:100},bench:{name:'벤치',w:1,h:1,group:'꾸미기',terrain:'land',price:300},
}
export const farmPlacementTerrain=(kind:FarmTool):FarmTerrain=>topviewItems[kind].terrain??'land'
export type FarmRotation=0|90|180|270
export type FarmObjectTransform={rotation?:FarmRotation;flipped?:boolean}
export type TopviewObject={id:number;kind:FarmTool;x:number;y:number;level?:number;orderKey?:number;constructionReadyAt?:number}&FarmObjectTransform
export type TopviewState={gold:number;landStock:number;tileStock:number;tileStocks?:Partial<Record<FarmTile,number>>;pathTiles?:Record<string,FarmTile>;land:string[];objects:TopviewObject[];paths:string[];nextId:number;stored:FarmTool[];storedTransforms?:Partial<Record<FarmTool,FarmObjectTransform[]>>;storedLevels?:Partial<Record<FarmTool,number[]>>;storedOrderKeys?:Partial<Record<'store'|'processed',(number|null)[]>>;simulation:FarmSimulation}
export const MAP_W=24,MAP_H=20,TILE=40,TEST_LAND_PRICE=50
export const canRotateFarmObject=(kind:FarmTool)=>kind==='woodBridge1'||kind==='woodBridge2'||kind==='woodBridge3'
export const canFlipFarmObject=(kind:FarmTool)=>kind!=='plot'&&!isFarmFence(kind)&&(topviewItems[kind].group==='동물'||topviewItems[kind].group==='꾸미기')
export const canFlipFarmArt=(kind:FarmTool)=>topviewItems[kind].group==='건물'||canFlipFarmObject(kind)
export function objectFootprint(object:{kind:FarmTool}&FarmObjectTransform){const item=topviewItems[object.kind];return canRotateFarmObject(object.kind)&&(object.rotation??0)%180===90?{w:item.h,h:item.w}:{w:item.w,h:item.h}}
// Buildings occupy the lower row of their two-row artwork. Coordinates anchor the footprint.
export function objectArtHeight(kind:FarmTool,rotation:FarmRotation=0){return topviewItems[kind].group==='건물'?2*TILE:objectFootprint({kind,rotation}).h*TILE+(topviewItems[kind].group==='동물'?8:0)}
export const cellKey=(x:number,y:number)=>`${x},${y}`
export function coastline(land:string[]){
 const owned=new Set(land)
 return land.flatMap(key=>{
  const [x,y]=key.split(',').map(Number),left=x*TILE,top=y*TILE,right=left+TILE,bottom=top+TILE
  return [
   {neighbor:cellKey(x,y-1),path:`M${left} ${top}H${right}`,dx:0,dy:-1},
   {neighbor:cellKey(x+1,y),path:`M${right} ${top}V${bottom}`,dx:1,dy:0},
   {neighbor:cellKey(x,y+1),path:`M${left} ${bottom}H${right}`,dx:0,dy:1},
   {neighbor:cellKey(x-1,y),path:`M${left} ${top}V${bottom}`,dx:-1,dy:0},
  ].filter(edge=>!owned.has(edge.neighbor)).map((edge,index)=>({...edge,id:`${key}:${index}`}))
 })
}
export function initialTopview():TopviewState{
 return {gold:15000,landStock:0,tileStock:0,simulation:initialFarmSimulation(),stored:[],land:Array.from({length:16*12},(_,i)=>cellKey(i%16+4,Math.floor(i/16)+4)),paths:Array.from({length:16},(_,i)=>cellKey(i+4,11)),nextId:31,objects:[

 {id:1,kind:'office',x:6,y:6},{id:27,kind:'livestockOffice',x:4,y:9},
 {id:26,kind:'warehouse',x:18,y:6},{id:28,kind:'kitchen',x:14,y:6},

 {id:10,kind:'plot',x:9,y:13},{id:11,kind:'plot',x:10,y:13},{id:12,kind:'plot',x:11,y:13},
 {id:13,kind:'plot',x:9,y:14},
 {id:16,kind:'flowers',x:7,y:10},{id:17,kind:'bench',x:6,y:15},
 {id:23,kind:'seedShop',x:8,y:6},{id:2,kind:'store',x:11,y:6},
  ]}
}
export function adjacentLand(state:TopviewState,x:number,y:number){return x>=0&&y>=0&&x<MAP_W&&y<MAP_H&&!state.land.includes(cellKey(x,y))&&!objectAt(state,x,y)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>state.land.includes(cellKey(x+dx,y+dy)))}
export function objectAt(state:TopviewState,x:number,y:number){return state.objects.find(o=>{const d=objectFootprint(o);return x>=o.x&&y>=o.y&&x<o.x+d.w&&y<o.y+d.h})}
export function placementValid(state:TopviewState,kind:FarmTool,x:number,y:number,skip?:number,rotation?:FarmRotation){
 const d=objectFootprint({kind,rotation:rotation??state.objects.find(o=>o.id===skip)?.rotation}),terrain=farmPlacementTerrain(kind),others={...state,objects:state.objects.filter(o=>o.id!==skip)}
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+d.w>MAP_W||y+d.h>MAP_H)return false
 for(let dy=0;dy<d.h;dy++)for(let dx=0;dx<d.w;dx++){
  const land=state.land.includes(cellKey(x+dx,y+dy))
  if(terrain==='land'?!land:land)return false
  const item=objectAt(others,x+dx,y+dy)
  if(item)return false
 }
 return true
}
