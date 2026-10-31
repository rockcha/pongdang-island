import {acquiredItemIds,recordAcquired} from './acquisition-history'
import {explorationWeapons,type WeaponTier} from './weapon-catalog'
import {explorationArmor} from './armor-catalog'
import {merchantGoods,merchantPotions,playerMaxHp,type Gear,type PotionKind,type PracticeState} from './practice-state'
export type RoomLoot={kind:'weapon'|'armor';id:string;name:string;image?:string;gear:Gear;price:number}|{kind:'potion';id:string;name:string;image?:string;potionKind:PotionKind;price:number}
const pick=<T,>(items:readonly T[],random:()=>number)=>items[Math.min(items.length-1,Math.floor(random()*items.length))]
export function drawRoomLoot(state:PracticeState,tier:WeaponTier='starter',random=Math.random):RoomLoot{
 const owned=acquiredItemIds(state)
 const pool:RoomLoot[]=[...explorationWeapons.filter(item=>item.tier===tier&&!owned.has(item.id)).map(gear=>({kind:'weapon' as const,id:gear.id,name:gear.name,image:gear.image,price:gear.price,gear})),...explorationArmor.filter(item=>item.tier===tier&&!owned.has(item.id)).map(gear=>({kind:'armor' as const,id:gear.id,name:gear.name,image:gear.image,price:gear.price,gear}))]
 if(pool.length)return pick(pool,random)
 const potion=pick(merchantPotions,random);return {kind:'potion',id:potion.id,name:potion.name,image:potion.image,potionKind:potion.kind,price:potion.price}
}
export function receiveRoomLoot(state:PracticeState,loot:RoomLoot,replaceId?:string):PracticeState{
 if(loot.kind==='potion')return {...state,potions:{...state.potions,[loot.potionKind]:state.potions[loot.potionKind]+1}}
 const key=loot.kind==='weapon'?'weapons':'armor',inventory=state[key]
 if(acquiredItemIds(state).has(loot.id))return state
 if(inventory.length>=3&&(!replaceId||!inventory.some(item=>item.id===replaceId)))return state
 const next={...state,acquiredIds:recordAcquired(state,loot.id),[key]:[...inventory.filter(item=>item.id!==replaceId),loot.gear]}
 if(loot.kind==='weapon'&&replaceId===state.weaponId)next.weaponId=loot.id
 if(loot.kind==='armor'&&replaceId===state.armorId){next.armorId=loot.id;next.hp=Math.min(next.hp,playerMaxHp(next))}
 return next
}
export function gearSalePrice(gear:Gear){
 const price=merchantGoods.find(item=>item.gear?.id===gear.id)?.price??(gear.attack!==undefined?100:80)
 return Math.max(1,Math.floor(price*.4))
}
export function gearSaleBlock(state:PracticeState,kind:'weapon'|'armor',id:string){
 const inventory=kind==='weapon'?state.weapons:state.armor
 if(state.combat)return '전투 중에는 판매할 수 없어요.'
 if(!inventory.some(item=>item.id===id))return '보유하지 않은 장비'
 if(inventory.length<=1)return '마지막 장비는 판매할 수 없어요'
 if((kind==='weapon'?state.weaponId:state.armorId)===id)return '장착 중 · 먼저 다른 장비를 선택하세요'
 return null
}
export function sellRoomGear(state:PracticeState,kind:'weapon'|'armor',id:string){
 if(gearSaleBlock(state,kind,id))return state
 const key=kind==='weapon'?'weapons':'armor',gear=state[key].find(item=>item.id===id)!
 return {...state,acquiredIds:recordAcquired(state),gold:state.gold+gearSalePrice(gear),[key]:state[key].filter(item=>item.id!==id)}
}

export function refreshRoomLoot(state:PracticeState,loot:RoomLoot,random=Math.random):RoomLoot{
 if(loot.kind==='potion'||!acquiredItemIds(state).has(loot.id))return loot
 const tier=explorationWeapons.find(item=>item.id===loot.id)?.tier??explorationArmor.find(item=>item.id===loot.id)?.tier??'starter'
 return drawRoomLoot(state,tier,random)
}

export function drawInvestigationLoot(state:PracticeState,tier:WeaponTier='starter',random=Math.random):RoomLoot{
 const roll=random()
 if(roll<.6)return drawRoomLoot(state,tier,()=>roll/.6)
 const potion=merchantPotions.find(item=>item.kind===(roll<.8?'health':'mana'))!
 return {kind:'potion',id:potion.id,name:potion.name,image:potion.image,potionKind:potion.kind,price:potion.price}
}
export function lootDiscoveryText(loot:RoomLoot,random=Math.random){
 const lines=loot.kind==='weapon'?[
  '먼지를 털어내자 온전한 무기가 드러났다.',
  '손에 쥐기 좋은 무기를 찾아냈다. 아직 쓸 만하다.',
  '묻혀 있던 무기를 조심스럽게 꺼냈다.',
 ]:loot.kind==='armor'?[
  '남겨진 짐 속에서 튼튼한 보호구를 찾아냈다.',
  '모래를 털어내니 몸을 지켜 줄 장비가 모습을 드러냈다.',
  '살펴보니 아직 멀쩡한 방어구다. 챙겨 두자.',
 ]:loot.kind==='potion'&&loot.potionKind==='health'?[
  '붉은 약병을 발견했다. 다친 몸을 회복할 때 쓰면 좋겠다.',
  '깨지지 않은 체력 포션이 남아 있다. 봉인도 멀쩡하다.',
  '작은 약병 안에서 붉은 액체가 찰랑인다. 체력 포션이다.',
 ]:[
  '푸른빛이 도는 약병을 발견했다. 마력을 보충할 수 있겠다.',
  '먼지 속에 마나 포션이 남아 있다. 조심스럽게 챙기자.',
  '봉인된 약병 속에서 푸른 액체가 빛난다. 마나 포션이다.',
 ]
 return pick(lines,random)+' '+loot.name+(loot.kind==='potion'?' 1개':'')+' 발견!'
}
export function lootAcquiredText(loot:RoomLoot){
 return loot.kind==='potion'?loot.name+' 1개를 포션 주머니에 넣었다.':(loot.kind==='weapon'?'무기':'방어구')+' '+loot.name+'을 보관함에 넣었다.'
}
