import {explorationWeapons,type WeaponTier} from './weapon-catalog'
import {explorationArmor} from './armor-catalog'
import type {RoomTypeId} from './room-preview'

export const merchantAppearanceChance=20
export const equipmentOfferLimit=5
export const merchantTierBands=[
 {through:10,starter:100,advanced:0,ultimate:0},
 {through:20,starter:90,advanced:10,ultimate:0},
 {through:30,starter:80,advanced:20,ultimate:0},
 {through:40,starter:70,advanced:30,ultimate:0},
 {through:50,starter:60,advanced:40,ultimate:0},
 {through:60,starter:40,advanced:50,ultimate:10},
 {through:70,starter:20,advanced:60,ultimate:20},
 {through:80,starter:0,advanced:70,ultimate:30},
 {through:90,starter:0,advanced:65,ultimate:35},
 {through:100,starter:0,advanced:55,ultimate:45},
] as const
export function merchantTierChances(floor:number){
 const level=Math.min(100,Math.max(1,Math.floor(Number.isFinite(floor)?floor:1)))
 return merchantTierBands.find(band=>level<=band.through)!
}
export type FloorMarket={shopkeeperId?:import('./shopkeepers').ShopkeeperId;floor:number;doors:RoomTypeId[];monsterIds?:(import('./monster-catalog').MonsterId|'random')[];weaponIds:string[];armorIds:string[]}
export function drawTieredOffers(items:{id:string;tier:WeaponTier}[],floor:number,random:()=>number,count=3){
 const chances=merchantTierChances(floor),selected:string[]=[]
 for(let slot=0;slot<count;slot++){
  const roll=random()*100
  const tier:WeaponTier=roll<chances.ultimate?'ultimate':roll<chances.ultimate+chances.advanced?'advanced':'starter'
  const pool=items.filter(item=>item.tier===tier&&!selected.includes(item.id))
  if(!pool.length)continue
  selected.push(pool[Math.min(pool.length-1,Math.floor(random()*pool.length))].id)
 }
 return selected
}
// Generate once on arriving at a floor. Opening or closing a shop never rerolls it.
export function drawFloorMarket(floor:number,random=Math.random):FloorMarket{
 const doors:RoomTypeId[]=['monster','monster','sphinx']
 if(floor>1&&random()*100<merchantAppearanceChance)doors[Math.min(2,Math.floor(random()*3))]='merchant-hasan'
 return {floor,doors,weaponIds:drawTieredOffers(explorationWeapons,floor,random,equipmentOfferLimit),armorIds:drawTieredOffers(explorationArmor,floor,random,equipmentOfferLimit)}
}
