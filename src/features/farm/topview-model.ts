import {initialFarmSimulation,type FarmSimulation} from './farm-simulation'
export type FarmTool='office'|'store'|'barn'|'livestock'|'coop'|'lab'|'mill'|'processed'|'chicken'|'cow'|'sheep'|'plot'|'tree'|'flowers'|'fence'|'bench'|'pond'
export const topviewItems:Record<FarmTool,{name:string;w:number;h:number;group:'건물'|'동물'|'꾸미기';price:number}>={
 office:{name:'농지 관리소',w:2,h:2,group:'건물',price:1000},store:{name:'농산물 상점',w:2,h:2,group:'건물',price:500},barn:{name:'외양간',w:2,h:2,group:'건물',price:1000},
 livestock:{name:'축산 관리소',w:2,h:2,group:'건물',price:800},coop:{name:'닭장',w:2,h:2,group:'건물',price:500},lab:{name:'종자 연구소',w:2,h:2,group:'건물',price:700},mill:{name:'제분소',w:2,h:2,group:'건물',price:700},processed:{name:'가공품 상점',w:2,h:2,group:'건물',price:500},
 chicken:{name:'닭',w:1,h:1,group:'동물',price:300},cow:{name:'젖소',w:2,h:1,group:'동물',price:800},sheep:{name:'양',w:1,h:1,group:'동물',price:600},
 plot:{name:'밭',w:1,h:1,group:'꾸미기',price:10},tree:{name:'나무',w:2,h:2,group:'꾸미기',price:100},flowers:{name:'꽃밭',w:1,h:1,group:'꾸미기',price:40},fence:{name:'울타리',w:1,h:1,group:'꾸미기',price:40},bench:{name:'벤치',w:2,h:1,group:'꾸미기',price:80},pond:{name:'작은 연못',w:3,h:2,group:'꾸미기',price:200},
}
export type TopviewObject={id:number;kind:FarmTool;x:number;y:number}
export type TopviewState={gold:number;land:string[];objects:TopviewObject[];paths:string[];nextId:number;stored:FarmTool[];simulation:FarmSimulation}
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
 return {gold:15000,simulation:initialFarmSimulation(),stored:[],land:Array.from({length:16*12},(_,i)=>cellKey(i%16+4,Math.floor(i/16)+4)),paths:Array.from({length:16},(_,i)=>cellKey(i+4,11)),nextId:23,objects:[
 {id:1,kind:'office',x:6,y:5},{id:2,kind:'store',x:11,y:5},{id:3,kind:'barn',x:15,y:5},
 {id:4,kind:'cow',x:16,y:9},{id:5,kind:'chicken',x:14,y:10},
 {id:7,kind:'tree',x:4,y:4},{id:8,kind:'tree',x:4,y:13},{id:9,kind:'pond',x:16,y:13},
 {id:10,kind:'plot',x:9,y:13},{id:11,kind:'plot',x:10,y:13},{id:12,kind:'plot',x:11,y:13},
 {id:13,kind:'plot',x:9,y:14},
 {id:16,kind:'flowers',x:7,y:10},{id:17,kind:'bench',x:13,y:14},
 {id:18,kind:'coop',x:10,y:8},{id:19,kind:'livestock',x:8,y:8},{id:20,kind:'lab',x:12,y:8},{id:21,kind:'mill',x:6,y:12},{id:22,kind:'processed',x:12,y:12},
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
export function buyTestLand(state:TopviewState,x:number,y:number):TopviewState{
 return state.gold>=TEST_LAND_PRICE&&adjacentLand(state,x,y)?{...state,gold:state.gold-TEST_LAND_PRICE,land:[...state.land,cellKey(x,y)]}:state
}
