import {drawPracticeFloor,type ExplorationMode} from './campaign'
import {acquiredItemIds,recordAcquired} from './acquisition-history'
import {spellMechanics} from './spell-mechanics'
import {formatBasicAttack} from './attack-roll'
import {starterArmor,practiceArmor,merchantArmor,merchantArmorPrice,explorationArmor,armorStats} from './armor-catalog'
export {starterArmor} from './armor-catalog'
import {explorationWeapons,weaponEffectText,type WeaponProc} from './weapon-catalog'
import {practiceSpellLearningPrices} from './spell-catalog'
import {drawFloorMarket,type FloorMarket} from './merchant-stock'
import {healingAfterReduction} from './status-effects'
import type {ShamanStock} from './shaman-stock'
export type Gear={id:string;name:string;description:string;attack?:number;attackVariance?:number;critical?:number;reduction?:number;magicReduction?:number;maxHpBonus?:number;evasion?:number;escapeBonus?:number;image?:string;proc?:WeaponProc;lifesteal?:number;cleanseChance?:number}
export type Spell={id:string;name:string;description:string;message:string;mana:number;image?:string;learnPrice?:number}
export const starterWeapon:Gear={id:'dull-dagger',name:'무딘 단검',description:'손에 익은 오래된 단검.',attack:10,critical:5,image:'/exploration/weapons/dull-dagger.png'}
export const practiceSpells:Spell[]=[
 {id:'ember',mana:6,name:'작은 불꽃',description:'작은 불꽃으로 주변을 밝힙니다.',message:'손끝의 불꽃이 황금빛 벽화를 비춥니다.'},
 {id:'tide',mana:5,name:'물결의 보호',description:'잔잔한 물결을 몸 주위에 두릅니다.',message:'얇은 물결이 몸 주위를 천천히 맴돕니다.'},
 {id:'light',mana:5,name:'길잡이 빛',description:'빛으로 어두운 길의 흔적을 살핍니다.',message:'푸른 빛이 세 문 앞의 발자국을 밝힙니다.'},
 {id:'sand',mana:7,name:'모래의 속삭임',description:'모래에 남은 오래된 이야기를 듣습니다.',message:'모래알 사이로 알아들을 수 없는 속삭임이 들립니다.'},
].map(spell=>({...spell,image:`/exploration/magic/${spell.id}.png`,learnPrice:practiceSpellLearningPrices[spell.id as keyof typeof practiceSpellLearningPrices]}))
export type CombatState={enemyAttackBonus?:number;ambush?:boolean;loot?:import('./room-loot').RoomLoot;lootClaimed?:boolean;monsterId?:import('./monster-catalog').MonsterId;enemyHp:number;turn:number;status:'active'|'won'|'lost'|'escaped';effects?:import('./ailments').EnemyAilment[];freezeGuard?:boolean;playerBlind?:number;playerWeaken?:number;magicResistanceDown?:number;ward?:{amount:number;turns:number};lootSource?:'chest';shield?:{remaining:number;turns:number};attackBuff?:{attack:number;critical:number;turns:number}}
export const playerMaxMp=40
export function playerManaMax(state:PracticeState){return Math.max(0,playerMaxMp-(state.maxManaSacrifice??0))}
export function playerAttackStats(state:PracticeState){
 const weapon=state.weapons.find(item=>item.id===state.weaponId),combat=state.combat?.status==='active'?state.combat:undefined
 const weaken=combat?.playerWeaken??0
 return {attack:Math.max(1,(weapon?.attack??1)+(combat?.attackBuff?.attack??0)-weaken),variance:weapon?.attackVariance??0,critical:combat?.ambush?100:Math.min(100,(weapon?.critical??0)+(combat?.attackBuff?.critical??0)),weaken}
}
export type PotionKind='health'|'mana'
export const merchantPotions=[
 {id:'health-potion',kind:'health' as const,name:'체력 포션',amount:30,price:100,description:'체력 30 회복',image:'/exploration/potions/health-potion.png'},
 {id:'mana-potion',kind:'mana' as const,name:'마나 포션',amount:15,price:100,description:'마나 15 회복',image:'/exploration/potions/mana-potion.png'},
]
export type PracticeState={bossRestPending?:boolean;equipmentMerchantVisits?:number[];supplyChecks?:number[];forcedMerchant?:{floor:number;id:import('./shopkeepers').ShopkeeperId;phase:'pending'|'active'};nameStory?:{choice?:'restored'|'left';recordRead?:boolean;nameLearned?:boolean;met?:boolean;gateOpened?:boolean;guardianDefeated?:boolean;rewardClaimed?:boolean};maxManaSacrifice?:number;soulLantern?:'ready'|'spent';cursedEyeBattles?:number;pendingFloorAdvance?:number;mode?:ExplorationMode;completed?:boolean;finalBossDefeated?:boolean;acquiredIds?:string[];roomVisitKey?:string;gold:number;hp:number;mp:number;weapons:Gear[];armor:Gear[];spells:Spell[];weaponId:string;armorId:string;equippedSpells:string[];door:number|null;supplies:boolean;combat:CombatState|null;escapeBoost:number;market:FloorMarket;shamanStock?:ShamanStock|null;merchantStocks?:Partial<Record<import('./shopkeepers').ShopkeeperId,import('./shop-state').EquipmentStock>>;shamanStocks?:Partial<Record<import('./shopkeepers').ShopkeeperId,ShamanStock>>;potions:Record<PotionKind,number>;playerEffects?:import('./ailments').EnemyAilment[]}
export function newPractice(random=Math.random,mode:ExplorationMode='test'):PracticeState{return {acquiredIds:[starterWeapon.id,starterArmor.id],...(mode==='practice'?{mode}:{}),gold:mode==='practice'?100:100000,hp:100,mp:playerMaxMp,weapons:[starterWeapon],armor:[starterArmor],spells:[],weaponId:starterWeapon.id,armorId:starterArmor.id,equippedSpells:[],door:null,supplies:false,combat:null,escapeBoost:0,market:mode==='practice'?drawPracticeFloor(1,random):drawFloorMarket(1,random),potions:{health:0,mana:0}}}

export const merchantGoods=[
 ...explorationWeapons.map(gear=>({id:gear.id,name:gear.name,price:gear.price,kind:'weapon' as const,tier:gear.tier,description:`공격력 ${formatBasicAttack(gear.attack,gear.attackVariance)} · 치명타 ${gear.critical}% · ${weaponEffectText(gear)}`,gear})),
 {id:'merchant-dagger',name:'사막의 단검',price:500,kind:'weapon',description:'공격력 16 · 치명타 8%',gear:{id:'merchant-dagger',name:'사막의 단검',description:'상인에게 구입한 가벼운 단검.',attack:16,critical:8}},
 {id:merchantArmor.id,name:merchantArmor.name,price:merchantArmorPrice,kind:'armor',description:armorStats(merchantArmor),gear:merchantArmor},
 ...explorationArmor.map(gear=>({id:gear.id,name:gear.name,price:gear.price,kind:'armor' as const,tier:gear.tier,description:armorStats(gear),gear})),
 {id:'ember',name:'작은 불꽃의 두루마리',price:practiceSpellLearningPrices.ember,kind:'magic',description:'작은 불꽃 습득 · 소모 마나 6',gear:null},
 ...merchantPotions.map(potion=>({...potion,kind:'potion' as const,potionKind:potion.kind,gear:null})),
] as const
export function floorMerchantGoods(state:PracticeState){
 const ids=[...state.market.weaponIds,...state.market.armorIds,...merchantPotions.map(item=>item.id)]
 const acquired=acquiredItemIds(state)
 return ids.flatMap(id=>merchantGoods.filter(item=>item.id===id&&(item.kind==='potion'||!acquired.has(item.id))))
}
export function purchaseBlock(state:PracticeState,id:string,quantity=1,replaceId?:string):string|null{
 if(!Number.isSafeInteger(quantity)||quantity<1)return '수량 확인'
 if(state.combat?.status==='active')return '전투 중에는 구매할 수 없어요.'
 const item=floorMerchantGoods(state).find(item=>item.id===id)
 if(!item)return '판매하지 않는 물품이에요.'
 if(item.kind==='potion')return !Number.isSafeInteger(item.price*quantity)?'수량 확인':state.gold<item.price*quantity?'골드 부족':null
 if(quantity!==1)return '장비는 1개씩 구매해요.'
 const owned=item.kind==='weapon'?state.weapons:item.kind==='armor'?state.armor:state.spells
 if(owned.some(value=>value.id===id))return '보유 중'
 if(replaceId&&!owned.some(value=>value.id===replaceId))return '교체할 장비를 확인해주세요.'
 if(item.kind!=='magic'&&owned.length>=3&&!replaceId)return '보관 칸 부족'
 if(state.gold<item.price)return '골드 부족'
 return null
}
export function buyMerchantItem(state:PracticeState,id:string,quantity=1,replaceId?:string):PracticeState{
 if(purchaseBlock(state,id,quantity,replaceId))return state
 const item=merchantGoods.find(item=>item.id===id)!
 const next={...state,gold:state.gold-item.price*quantity,...(item.kind!=='potion'?{acquiredIds:recordAcquired(state,item.id)}:{})}
 if(item.kind==='potion')return {...next,potions:{...state.potions,[item.potionKind]:state.potions[item.potionKind]+quantity}}
 if(item.kind==='weapon')return {...next,weapons:[...state.weapons.filter(gear=>gear.id!==replaceId),item.gear],weaponId:replaceId===state.weaponId?item.id:state.weaponId}
 if(item.kind==='armor'){const equipped={...next,armor:[...state.armor.filter(gear=>gear.id!==replaceId),item.gear],armorId:replaceId===state.armorId?item.id:state.armorId};return {...equipped,hp:Math.min(equipped.hp,playerMaxHp(equipped))}}
 return {...next,spells:[...state.spells,practiceSpells.find(spell=>spell.id===item.id)!]}
}
export function discardGear(state:PracticeState,kind:'weapon'|'armor',id:string):PracticeState{
 const items=kind==='weapon'?state.weapons:state.armor
 if(items.length<=1||(kind==='weapon'?state.weaponId:state.armorId)===id||!items.some(item=>item.id===id))return state
 const acquiredIds=recordAcquired(state,id)
 return kind==='weapon'?{...state,acquiredIds,weapons:items.filter(item=>item.id!==id)}:{...state,acquiredIds,armor:items.filter(item=>item.id!==id)}
}
export function grantPracticeSupplies(state:PracticeState):PracticeState{
 if(state.mode==='practice'||state.supplies)return state
 const supplies={...state,supplies:true,weapons:[starterWeapon,{id:'bronze-blade',name:'청동 단검',description:'연습용 · 날이 선 청동 단검.',attack:15,critical:3},{id:'sand-staff',escapeBonus:5,name:'모래 지팡이',description:'연습용 · 모래의 힘이 깃든 지팡이.',attack:9,critical:12}],armor:practiceArmor,spells:practiceSpells}
 const merge=<T extends {id:string}>(owned:T[],added:T[],limit:number)=>[...owned,...added.filter(item=>!owned.some(value=>value.id===item.id))].slice(0,limit)
 const next={...supplies,weapons:merge(state.weapons,supplies.weapons,3),armor:merge(state.armor,supplies.armor,3),spells:merge(state.spells,practiceSpells,practiceSpells.length)}
 return {...next,acquiredIds:recordAcquired(next,...acquiredItemIds(state))}
}
export function equipGear(state:PracticeState,kind:'weapon'|'armor',id:string,allowCombat=false):PracticeState{
 if(state.combat?.status==='active'&&!allowCombat)return state
 if(!(kind==='weapon'?state.weapons:state.armor).some(item=>item.id===id))return state
 const next={...state,[kind==='weapon'?'weaponId':'armorId']:id}
 return kind==='armor'?{...next,hp:Math.min(state.hp,playerMaxHp(next))}:next
}
export function toggleSpell(state:PracticeState,id:string):PracticeState{
 if(!state.spells.some(spell=>spell.id===id))return state
 if(state.equippedSpells.includes(id))return {...state,equippedSpells:state.equippedSpells.filter(value=>value!==id)}
 return state.equippedSpells.length<2?{...state,equippedSpells:[...state.equippedSpells,id]}:state
}

export function castSpell(state:PracticeState,id:string):PracticeState{
 const spell=state.spells.find(value=>value.id===id)
 if(!spell||!state.equippedSpells.includes(id)||state.mp<spell.mana)return state
 const power=spellMechanics[id]
 return {...state,mp:state.mp-spell.mana,...(power?.healing?{hp:Math.min(playerMaxHp(state),state.hp+healingAfterReduction(power.healing,state.playerEffects??[]))}:{}),...(power?.cleanse?{playerEffects:[]}:{} )}
}

export function playerMaxHp(state:PracticeState){return 100+Math.max(0,state.armor.find(gear=>gear.id===state.armorId)?.maxHpBonus??0)}
export type IncomingAttack='physical'|'magic'
// Evasion belongs only to physical basic attacks. Spells always use magic defense.
export function incomingDamage(state:PracticeState,amount:number,type:IncomingAttack,guard=0,magicResistanceDown=state.combat?.magicResistanceDown??0){
 const armor=state.armor.find(gear=>gear.id===state.armorId)
 const reduction=type==='physical'?armor?.reduction:(armor?.magicReduction??0)-magicResistanceDown
 const armored=Math.max(1,amount-(reduction??0))
 return Math.max(0,armored-guard)
}
export function basicAttackEvasion(state:PracticeState,type:IncomingAttack){return type==='physical'?Math.min(100,Math.max(0,state.armor.find(gear=>gear.id===state.armorId)?.evasion??0)):0}
export function potionBlock(state:PracticeState,kind:PotionKind,duringCombat=false):string|null{
 if(state.combat?.status==='active'&&!duringCombat)return '전투 행동에서 사용해요.'
 if(state.hp<=0)return '지금은 사용할 수 없어요.'
 if(state.potions[kind]<=0)return '보유한 포션이 없어요.'
 if(kind==='health'&&state.hp>=playerMaxHp(state))return '체력이 가득해요.'
 if(kind==='mana'&&state.mp>=playerManaMax(state))return '마나가 가득해요.'
 return null
}
export function usePotion(state:PracticeState,kind:PotionKind,duringCombat=false):PracticeState{
 if(potionBlock(state,kind,duringCombat))return state
 const amount=merchantPotions.find(item=>item.kind===kind)!.amount
 return {...state,potions:{...state.potions,[kind]:state.potions[kind]-1},...(kind==='health'?{hp:Math.min(playerMaxHp(state),state.hp+healingAfterReduction(amount,state.playerEffects??[]))}:{mp:Math.min(playerManaMax(state),state.mp+amount)})}
}
