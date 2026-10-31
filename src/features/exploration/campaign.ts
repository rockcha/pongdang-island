import {supplyCheckFloors} from './merchant-pity'
﻿import type {RoomTypeId} from './room-preview'
import type {FloorMarket} from './merchant-stock'
import type {MonsterId} from './monster-catalog'
import type {WeaponTier} from './weapon-catalog'

export type ExplorationMode='test'|'practice'
export const practiceFinalFloor=50
export const practiceFinalBossId='golden-pharaoh' as const
export const practiceFinalBossRoom='boss-pharaoh' as const
export const practiceMerchantChance=.25
export const campaignEventWeights=[
 {through:5,scales:0,rest:30,lore:30,investigate:25,chest:15,sphinx:0,thief:0,curse:0,giant:0,guardian:0},
 {through:10,scales:5,rest:25,lore:15,investigate:25,chest:15,sphinx:10,thief:5,curse:0,giant:0,guardian:0},
 {through:20,scales:5,rest:10,lore:5,investigate:25,chest:15,sphinx:10,thief:5,curse:5,giant:5,guardian:15},
 {through:30,scales:5,rest:8,lore:5,investigate:22,chest:15,sphinx:10,thief:5,curse:5,giant:5,guardian:20},
 {through:40,scales:5,rest:10,lore:5,investigate:25,chest:10,sphinx:10,thief:5,curse:5,giant:5,guardian:20},
 {through:50,scales:5,rest:8,lore:5,investigate:22,chest:10,sphinx:10,thief:5,curse:5,giant:5,guardian:25},
] as const
const pick=<T,>(items:readonly T[],random:()=>number)=>items[Math.min(items.length-1,Math.floor(random()*items.length))]
function weighted<T>(items:readonly {value:T;weight:number}[],random:()=>number):T{
 const total=items.reduce((sum,item)=>sum+item.weight,0)
 let roll=random()*total
 for(const item of items){roll-=item.weight;if(roll<0)return item.value}
 return items[items.length-1].value
}
export function drawFloorMonster(floor:number,random=Math.random,intermediate=false):MonsterId{
 if(intermediate){const ids:MonsterId[]=['sand-wraith'];if(floor>=16)ids.push('tomb-hook-guard');if(floor>=21)ids.push('tomb-lantern-jellyfish');return pick(ids,random)}
 const pool:{value:MonsterId;weight:number}[]=floor<=5?[
  {value:'jar-wisp',weight:40},{value:'talisman-lizard',weight:35},{value:'sand-scorpion',weight:25},
 ]:floor<=10?[
  {value:'sand-scorpion',weight:25},{value:'jar-wisp',weight:15},{value:'talisman-lizard',weight:15},{value:'saw-claw-crab',weight:25},{value:'bandage-mummy',weight:20},
 ]:[
  {value:'sand-scorpion',weight:20},{value:'jar-wisp',weight:10},{value:'talisman-lizard',weight:10},{value:'saw-claw-crab',weight:25},{value:'bandage-mummy',weight:25},
 ]
 if(floor>=9)pool.push({value:'lapis-cobra',weight:floor>=21?25:10})
 return weighted(pool,random)
}
export function drawInvestigationMonster(floor:number,random=Math.random):MonsterId{
 return drawFloorMonster(floor,random,floor>=11&&random()<(floor>=21?.35:.2))
}
export function drawRewardTier(floor:number,random=Math.random):WeaponTier{
 if(floor>30)return random()<(floor<=40?.2:.4)?'ultimate':'advanced'
 const advanced=floor<=10?0:floor<=15?.1:floor<=20?.25:floor<=25?.4:.6
 return random()<advanced?'advanced':'starter'
}
export function campaignChestGold(floor:number,random=Math.random){const [min,max]=floor<=10?[150,250]:floor<=20?[250,400]:floor<=30?[350,550]:floor<=40?[450,650]:[550,800];return min+Math.floor(random()*(max-min+1))}
function roomFamily(id:RoomTypeId){return id.startsWith('rest-')?'rest':id.startsWith('investigate-')?'investigate':id.startsWith('merchant-')||id.startsWith('magic-')?'merchant':id==='warning-wall'?'lore':(id==='sleeping-giant'||id==='sealed-scarab')?'giant':id}
function eventRoom(floor:number,excluded:RoomTypeId[],random:()=>number):RoomTypeId{
 const band=campaignEventWeights.find(item=>floor<=item.through)??campaignEventWeights[campaignEventWeights.length-1]
 const candidates:{value:string;weight:number}[]=Object.entries(band).filter(([key,weight])=>key!=='through'&&weight>0&&!excluded.some(id=>roomFamily(id)===key)).map(([value,weight])=>({value,weight}))
 const choiceRooms:RoomTypeId[]=[]
 if(floor>=6)choiceRooms.push('deep-well')
 if(floor>=7&&floor<=17)choiceRooms.push('forbidden-trade')
 if(floor>=7&&floor<=45)choiceRooms.push('soul-lantern')
 if(floor>=11&&floor<=45)choiceRooms.push('cursed-gem-eye')
 if(canUseTeleport(floor))choiceRooms.push('broken-teleport')
 for(const value of choiceRooms)if(!excluded.includes(value))candidates.push({value,weight:5})
 const family=weighted(candidates,random)
 if(family==='giant')return pick(['sleeping-giant','sealed-scarab'] as const,random)
 if(family==='rest')return pick(['rest-oasis','rest-camp','rest-garden'] as const,random)
 if(family==='investigate')return pick(['investigate-guards','investigate-wall','investigate-alchemy'] as const,random)
 return ({lore:'warning-wall',giant:'sleeping-giant'} as Record<string,RoomTypeId>)[family]??family as RoomTypeId
}
function merchantRoom(floor:number,random:()=>number):RoomTypeId{
 const ids:RoomTypeId[]=['merchant-hasan','magic-nadim','merchant-karim','magic-sahira','merchant-zahir','magic-nefera']
 const weights=floor<=10?[60,40,0,0,0,0]:floor<=15?[40,30,20,10,0,0]:floor<=20?[20,20,40,20,0,0]:floor<=30?[10,10,50,30,0,0]:floor<=40?[0,0,45,35,12,8]:[0,0,30,30,25,15]
 return weighted(ids.map((value,index)=>({value,weight:weights[index]})),random)
}
export const fixedPracticeRooms:Partial<Record<number,RoomTypeId>>={3:'merchant-hasan',6:'erased-name',22:'erased-name-record',34:'nameless-guardian',8:'magic-nadim',18:'merchant-karim',19:'rest-oasis',20:'boss-anubis',28:'magic-sahira',29:'rest-garden',30:'boss-anubis',38:'merchant-zahir',39:'rest-camp',40:'boss-anubis',48:'magic-nefera',49:'rest-oasis',50:'boss-pharaoh'}
export function canUseTeleport(floor:number){return floor>=7&&floor+3<=practiceFinalFloor&&![floor,floor+1,floor+2].some(level=>fixedPracticeRooms[level]||supplyCheckFloors.some(check=>check===level))}
export function drawPracticeFloor(floor:number,random=Math.random):FloorMarket{
 const level=Math.max(1,Math.min(practiceFinalFloor,Math.floor(floor)))
 const fixed=fixedPracticeRooms
 const extras:RoomTypeId[]=fixed[level]?[fixed[level]!]:[]
 if(level>1&&!extras.some(id=>roomFamily(id)==='merchant')&&random()<practiceMerchantChance)extras.push(merchantRoom(level,random))
 while(extras.length<2)extras.push(eventRoom(level,extras,random))
 const doors:RoomTypeId[]=['monster',...extras]
 for(let index=doors.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[doors[index],doors[other]]=[doors[other],doors[index]]}
 return {floor:level,doors,weaponIds:[],armorIds:[],monsterIds:doors.map(type=>type==='monster'?drawFloorMonster(level,random):type==='guardian'?drawFloorMonster(level,random,true):'random')}
}
export function campaignDoorClue(type:RoomTypeId){
 const family=roomFamily(type)
 const clues:Record<string,{name:string;hint:string}>={
  monster:{name:'기척이 느껴지는 문',hint:'안쪽에서 발소리와 무언가 움직이는 소리가 들린다.'},
  guardian:{name:'수호자의 문',hint:'무거운 발소리와 마력의 울림이 전해진다.'},
  rest:{name:'고요한 문',hint:'맑은 물소리와 따뜻한 공기가 새어 나온다.'},
  lore:{name:'글귀가 새겨진 문',hint:'먼지 쌓인 돌벽에 오래된 기록이 남아 있다.'},
  investigate:{name:'흔적이 남은 문',hint:'버려진 물건과 오래된 흔적이 보인다.'},
  scales:{name:'저울의 문',hint:'빈 저울이 남는 장비와 거래를 기다리고 있다.'},
  merchant:{name:'불빛이 새는 문',hint:'등불 아래에서 누군가 물건을 정리하는 소리가 들린다.'},
  chest:{name:'봉인이 새겨진 문',hint:'닫힌 궤짝에서 희미한 금속 빛이 새어 나온다.'},
  sphinx:{name:'수수께끼의 문',hint:'낮고 또렷한 목소리가 그대의 답을 기다린다.'},
  thief:{name:'좁은 골목의 문',hint:'작은 발소리가 모퉁이 뒤로 숨는다.'},
  curse:{name:'검은 문양의 문',hint:'검은 제단과 차가운 기운이 느껴진다.'},
  giant:{name:'거인의 문',hint:'커다란 돌의 몸이 미동도 없이 잠들어 있다.'},
  'boss-pharaoh':{name:'황금왕의 문',hint:'왕릉의 마지막 왕이 기다린다. 들어가면 도망칠 수 없다.'},
  'boss-anubis':{name:'아누비스의 문',hint:'문지기가 길을 막고 있다. 들어가면 도망칠 수 없다.'},
 }
 return clues[family]??clues.monster
}
