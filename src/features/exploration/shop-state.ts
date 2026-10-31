import {acquiredItemIds} from './acquisition-history'
import {explorationWeapons} from './weapon-catalog'
import {explorationArmor} from './armor-catalog'
import {shamanSpells,type ShamanStock} from './shaman-stock'
import type {PracticeState} from './practice-state'
import {getShopkeeper,type ShopkeeperId,type ShopkeeperProfile} from './shopkeepers'
export function beginForcedMerchant(state:PracticeState,random=Math.random):PracticeState{
 if(state.forcedMerchant?.phase!=='pending')return state
 return enterShopkeeper({...state,forcedMerchant:{...state.forcedMerchant,phase:'active'}},getShopkeeper(state.forcedMerchant.id),random)
}
export type EquipmentStock={floor:number;shopkeeperId:ShopkeeperId;weaponIds:string[];armorIds:string[]}
export function drawUniqueOffers<T extends {id:string}>(items:readonly T[],random=Math.random){
 const pool=[...items],ids:string[]=[]
 while(ids.length<3&&pool.length){const index=Math.min(pool.length-1,Math.floor(random()*pool.length));ids.push(pool.splice(index,1)[0].id)}
 return ids
}
export function enterShopkeeper(state:PracticeState,profile:ShopkeeperProfile,random=Math.random):PracticeState{
 const floor=state.market.floor,acquired=acquiredItemIds(state)
 if(profile.kind==='equipment'){
  const saved=state.merchantStocks?.[profile.id]
  const stock:EquipmentStock=saved?.floor===floor?saved:{floor,shopkeeperId:profile.id,weaponIds:drawUniqueOffers(explorationWeapons.filter(item=>item.tier===profile.tier&&!acquired.has(item.id)),random),armorIds:profile.sellsArmor?drawUniqueOffers(explorationArmor.filter(item=>item.tier===profile.tier&&!acquired.has(item.id)),random):[]}
  return {...state,equipmentMerchantVisits:[...new Set([...(state.equipmentMerchantVisits??[]),floor])],market:{...state.market,...stock},merchantStocks:{...state.merchantStocks,[profile.id]:stock}}
 }
 const saved=state.shamanStocks?.[profile.id]
 const stock:ShamanStock=saved?.floor===floor?saved:{floor,shopkeeperId:profile.id,spellIds:drawUniqueOffers(shamanSpells.filter(item=>item.tier===profile.tier&&!acquired.has(item.id)),random)}
 return {...state,shamanStock:stock,shamanStocks:{...state.shamanStocks,[profile.id]:stock}}
}
