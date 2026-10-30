export type Gear={id:string;name:string;description:string;attack?:number;critical?:number;reduction?:number;evasion?:number}
export type Spell={id:string;name:string;description:string;message:string}
export const starterWeapon:Gear={id:'dull-dagger',name:'무딘 단검',description:'손에 익은 오래된 단검.',attack:12,critical:5}
export const starterArmor:Gear={id:'old-diving-suit',name:'낡은 잠수복',description:'닳았지만 몸을 가볍게 감싸는 잠수복.',reduction:1,evasion:40}
export const practiceSpells:Spell[]=[
 {id:'ember',name:'작은 불꽃',description:'작은 불꽃으로 주변을 밝힙니다.',message:'손끝의 불꽃이 황금빛 벽화를 비춥니다.'},
 {id:'tide',name:'물결의 보호',description:'잔잔한 물결을 몸 주위에 두릅니다.',message:'얇은 물결이 몸 주위를 천천히 맴돕니다.'},
 {id:'light',name:'길잡이 빛',description:'빛으로 어두운 길의 흔적을 살핍니다.',message:'푸른 빛이 세 문 앞의 발자국을 밝힙니다.'},
 {id:'sand',name:'모래의 속삭임',description:'모래에 남은 오래된 이야기를 듣습니다.',message:'모래알 사이로 알아들을 수 없는 속삭임이 들립니다.'},
]
export type PracticeState={hp:number;weapons:Gear[];armor:Gear[];spells:Spell[];weaponId:string;armorId:string;equippedSpells:string[];door:number|null;supplies:boolean}
export function newPractice():PracticeState{return {hp:100,weapons:[starterWeapon],armor:[starterArmor],spells:[],weaponId:starterWeapon.id,armorId:starterArmor.id,equippedSpells:[],door:null,supplies:false}}
export function grantPracticeSupplies(state:PracticeState):PracticeState{
 if(state.supplies)return state
 return {...state,supplies:true,weapons:[starterWeapon,{id:'bronze-blade',name:'청동 단검',description:'연습용 · 날이 선 청동 단검.',attack:15,critical:3},{id:'sand-staff',name:'모래 지팡이',description:'연습용 · 모래의 힘이 깃든 지팡이.',attack:9,critical:12}],armor:[starterArmor,{id:'linen-wrap',name:'아마포 보호복',description:'연습용 · 여러 겹의 천으로 몸을 보호합니다.',reduction:3,evasion:20},{id:'gold-guard',name:'황금 흉갑',description:'연습용 · 무겁지만 단단한 보호구.',reduction:5,evasion:10}],spells:practiceSpells}
}
export function equipGear(state:PracticeState,kind:'weapon'|'armor',id:string):PracticeState{
 if(!(kind==='weapon'?state.weapons:state.armor).some(item=>item.id===id))return state
 return {...state,[kind==='weapon'?'weaponId':'armorId']:id}
}
export function toggleSpell(state:PracticeState,id:string):PracticeState{
 if(!state.spells.some(spell=>spell.id===id))return state
 if(state.equippedSpells.includes(id))return {...state,equippedSpells:state.equippedSpells.filter(value=>value!==id)}
 return state.equippedSpells.length<3?{...state,equippedSpells:[...state.equippedSpells,id]}:state
}
