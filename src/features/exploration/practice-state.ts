export type Gear={id:string;name:string;description:string;attack?:number;critical?:number;reduction?:number;evasion?:number;escapeBonus?:number}
export type Spell={id:string;name:string;description:string;message:string;mana:number}
export const starterWeapon:Gear={id:'dull-dagger',name:'무딘 단검',description:'손에 익은 오래된 단검.',attack:12,critical:5}
export const starterArmor:Gear={id:'old-diving-suit',name:'낡은 잠수복',description:'닳았지만 몸을 가볍게 감싸는 잠수복.',reduction:1,evasion:40}
export const practiceSpells:Spell[]=[
 {id:'ember',mana:6,name:'작은 불꽃',description:'작은 불꽃으로 주변을 밝힙니다.',message:'손끝의 불꽃이 황금빛 벽화를 비춥니다.'},
 {id:'tide',mana:8,name:'물결의 보호',description:'잔잔한 물결을 몸 주위에 두릅니다.',message:'얇은 물결이 몸 주위를 천천히 맴돕니다.'},
 {id:'light',mana:5,name:'길잡이 빛',description:'빛으로 어두운 길의 흔적을 살핍니다.',message:'푸른 빛이 세 문 앞의 발자국을 밝힙니다.'},
 {id:'sand',mana:7,name:'모래의 속삭임',description:'모래에 남은 오래된 이야기를 듣습니다.',message:'모래알 사이로 알아들을 수 없는 속삭임이 들립니다.'},
]
export type CombatState={enemyHp:number;turn:number;status:'active'|'won'|'lost'|'escaped'}
export type PracticeState={gold:number;hp:number;mp:number;weapons:Gear[];armor:Gear[];spells:Spell[];weaponId:string;armorId:string;equippedSpells:string[];door:number|null;supplies:boolean;combat:CombatState|null;escapeBoost:number}
export function newPractice():PracticeState{return {gold:1000,hp:100,mp:30,weapons:[starterWeapon],armor:[starterArmor],spells:[],weaponId:starterWeapon.id,armorId:starterArmor.id,equippedSpells:[],door:null,supplies:false,combat:null,escapeBoost:0}}

export const merchantGoods=[
 {id:'merchant-dagger',name:'사막의 단검',price:350,kind:'weapon',description:'공격력 16 · 치명타 8%',gear:{id:'merchant-dagger',name:'사막의 단검',description:'상인에게 구입한 가벼운 단검.',attack:16,critical:8}},
 {id:'merchant-armor',name:'모래바람 망토',price:400,kind:'armor',description:'피격 피해 3 감소 · 회피 40%',gear:{id:'merchant-armor',name:'모래바람 망토',description:'모래바람을 막아주는 보호구.',reduction:3,evasion:40}},
 {id:'ember',name:'작은 불꽃의 두루마리',price:250,kind:'magic',description:'작은 불꽃 습득 · 소모 마나 6',gear:null},
] as const
export function purchaseBlock(state:PracticeState,id:string):string|null{
 const item=merchantGoods.find(item=>item.id===id)
 if(!item)return '판매하지 않는 물품이에요.'
 const owned=item.kind==='weapon'?state.weapons:item.kind==='armor'?state.armor:state.spells
 if(owned.some(value=>value.id===id))return '보유 중'
 if(item.kind!=='magic'&&owned.length>=3)return '보관 칸 부족'
 if(state.gold<item.price)return '골드 부족'
 return null
}
export function buyMerchantItem(state:PracticeState,id:string):PracticeState{
 if(purchaseBlock(state,id))return state
 const item=merchantGoods.find(item=>item.id===id)!
 const next={...state,gold:state.gold-item.price}
 if(item.kind==='weapon')return {...next,weapons:[...state.weapons,item.gear]}
 if(item.kind==='armor')return {...next,armor:[...state.armor,item.gear]}
 return {...next,spells:[...state.spells,practiceSpells.find(spell=>spell.id===item.id)!]}
}
export function grantPracticeSupplies(state:PracticeState):PracticeState{
 if(state.supplies)return state
 const supplies={...state,supplies:true,weapons:[starterWeapon,{id:'bronze-blade',name:'청동 단검',description:'연습용 · 날이 선 청동 단검.',attack:15,critical:3},{id:'sand-staff',escapeBonus:5,name:'모래 지팡이',description:'연습용 · 모래의 힘이 깃든 지팡이.',attack:9,critical:12}],armor:[starterArmor,{id:'linen-wrap',escapeBonus:10,name:'아마포 보호복',description:'연습용 · 여러 겹의 천으로 몸을 보호합니다.',reduction:3,evasion:20},{id:'gold-guard',name:'황금 흉갑',description:'연습용 · 무겁지만 단단한 보호구.',reduction:5,evasion:10}],spells:practiceSpells}
 const merge=<T extends {id:string}>(owned:T[],added:T[],limit:number)=>[...owned,...added.filter(item=>!owned.some(value=>value.id===item.id))].slice(0,limit)
 return {...supplies,weapons:merge(state.weapons,supplies.weapons,3),armor:merge(state.armor,supplies.armor,3),spells:merge(state.spells,practiceSpells,practiceSpells.length)}
}
export function equipGear(state:PracticeState,kind:'weapon'|'armor',id:string):PracticeState{
 if(!(kind==='weapon'?state.weapons:state.armor).some(item=>item.id===id))return state
 return {...state,[kind==='weapon'?'weaponId':'armorId']:id}
}
export function toggleSpell(state:PracticeState,id:string):PracticeState{
 if(!state.spells.some(spell=>spell.id===id))return state
 if(state.equippedSpells.includes(id))return {...state,equippedSpells:state.equippedSpells.filter(value=>value!==id)}
 return state.equippedSpells.length<2?{...state,equippedSpells:[...state.equippedSpells,id]}:state
}

export function castSpell(state:PracticeState,id:string):PracticeState{
 const spell=state.spells.find(value=>value.id===id)
 if(!spell||!state.equippedSpells.includes(id)||state.mp<spell.mana)return state
 return {...state,mp:state.mp-spell.mana}
}
