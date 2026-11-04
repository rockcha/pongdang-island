import {initialFarmSimulation,type FarmSimulation} from './farm-simulation'
export type FarmTool='warehouse'|'office'|'seedShop'|'store'|'barn'|'coop'|'lab'|'mill'|'processed'|'dairy'|'bakery'|'chicken'|'cow'|'sheep'|'plot'|'tree'|'flowers'|'fence'|'bench'|'pond'
export const topviewItems:Record<FarmTool,{name:string;w:number;h:number;group:'건물'|'동물'|'꾸미기';price:number;purchaseLimit?:number}>={
 warehouse:{name:'창고',w:2,h:2,group:'건물',price:50},
 office:{name:'농지 관리소',w:2,h:2,group:'건물',price:1000},seedShop:{name:'종자 상점',w:2,h:2,group:'건물',price:100},store:{name:'농작물 판매소',w:2,h:2,group:'건물',price:100,purchaseLimit:Infinity},barn:{name:'외양간',w:2,h:2,group:'건물',price:1000,purchaseLimit:Infinity},
 coop:{name:'닭장',w:2,h:2,group:'건물',price:500,purchaseLimit:Infinity},lab:{name:'종자 연구소',w:2,h:2,group:'건물',price:200},mill:{name:'제분소',w:2,h:2,group:'건물',price:700,purchaseLimit:Infinity},processed:{name:'가공품 판매소',w:2,h:2,group:'건물',price:100,purchaseLimit:Infinity},dairy:{name:'유제품 공방',w:2,h:2,group:'건물',price:200},bakery:{name:'작은 빵집',w:2,h:2,group:'건물',price:250,purchaseLimit:Infinity},
 chicken:{name:'닭',w:1,h:1,group:'동물',price:300},cow:{name:'젖소',w:2,h:1,group:'동물',price:800},sheep:{name:'양',w:1,h:1,group:'동물',price:600},
 plot:{name:'밭',w:1,h:1,group:'꾸미기',price:10},tree:{name:'나무',w:2,h:2,group:'꾸미기',price:100},flowers:{name:'꽃밭',w:1,h:1,group:'꾸미기',price:40},fence:{name:'울타리',w:1,h:1,group:'꾸미기',price:40},bench:{name:'벤치',w:2,h:1,group:'꾸미기',price:80},pond:{name:'작은 연못',w:3,h:2,group:'꾸미기',price:200},
}
export type TopviewObject={id:number;kind:FarmTool;x:number;y:number;level?:number;orderKey?:number}
export type TopviewState={gold:number;landStock:number;tileStock:number;land:string[];objects:TopviewObject[];paths:string[];nextId:number;stored:FarmTool[];storedLevels?:Partial<Record<FarmTool,number[]>>;storedOrderKeys?:Partial<Record<'store'|'processed',(number|null)[]>>;simulation:FarmSimulation}
export const MAP_W=24,MAP_H=20,TILE=40,TEST_LAND_PRICE=50
export function objectArtHeight(kind:FarmTool){const item=topviewItems[kind];return item.h*TILE+(item.group==='동물'?8:kind==='tree'?45:0)}
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
 return {gold:15000,landStock:0,tileStock:0,simulation:initialFarmSimulation(),stored:[],land:Array.from({length:16*12},(_,i)=>cellKey(i%16+4,Math.floor(i/16)+4)),paths:Array.from({length:16},(_,i)=>cellKey(i+4,11)),nextId:27,objects:[
 {id:26,kind:'warehouse',x:18,y:5},
 {id:1,kind:'office',x:6,y:5},{id:2,kind:'store',x:11,y:5},{id:3,kind:'barn',x:15,y:5},
 {id:4,kind:'cow',x:16,y:9},{id:5,kind:'chicken',x:14,y:10},
 {id:7,kind:'tree',x:4,y:4},{id:8,kind:'tree',x:4,y:13},{id:9,kind:'pond',x:16,y:13},
 {id:10,kind:'plot',x:9,y:13},{id:11,kind:'plot',x:10,y:13},{id:12,kind:'plot',x:11,y:13},
 {id:13,kind:'plot',x:9,y:14},
 {id:16,kind:'flowers',x:7,y:10},{id:17,kind:'bench',x:6,y:15},
 {id:18,kind:'coop',x:10,y:8},{id:20,kind:'lab',x:12,y:8},{id:21,kind:'mill',x:6,y:12},{id:22,kind:'processed',x:12,y:12},{id:23,kind:'seedShop',x:8,y:5},
 {id:24,kind:'dairy',x:14,y:12},{id:25,kind:'bakery',x:18,y:8},
 ]}
}
export function adjacentLand(state:TopviewState,x:number,y:number){return x>=0&&y>=0&&x<MAP_W&&y<MAP_H&&!state.land.includes(cellKey(x,y))&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>state.land.includes(cellKey(x+dx,y+dy)))}
export function objectAt(state:TopviewState,x:number,y:number){return state.objects.find(o=>{const d=topviewItems[o.kind];return x>=o.x&&y>=o.y&&x<o.x+d.w&&y<o.y+d.h})}
export function placementValid(state:TopviewState,kind:FarmTool,x:number,y:number,skip?:number){
 const d=topviewItems[kind]
 for(let dy=0;dy<d.h;dy++)for(let dx=0;dx<d.w;dx++){
  if(!state.land.includes(cellKey(x+dx,y+dy)))return false
  const item=objectAt({...state,objects:state.objects.filter(o=>o.id!==skip)},x+dx,y+dy)
  if(item)return false
 }
 return true
}
