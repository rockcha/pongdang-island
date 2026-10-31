import type {Gear} from './practice-state'
import type {WeaponTier} from './weapon-catalog'

export type Armor=Gear & {tier:WeaponTier;role:string;reduction:number;magicReduction:number;maxHpBonus:number;evasion:number;price:number;image:string}
export const explorationArmor:Armor[]=[
 {"id":"desert-traveler-coat","name":"사막 여행자의 외투","tier":"starter","reduction":2,"magicReduction":2,"maxHpBonus":10,"evasion":5,"price":320,"description":"모래바람 속에서도 가볍게 걸을 수 있는 균형 잡힌 외투.","image":"/exploration/armor/desert-traveler-coat.png","role":"균형형"},
 {"id":"bronze-scale-armor","name":"청동 비늘갑옷","tier":"starter","reduction":4,"magicReduction":0,"maxHpBonus":10,"evasion":0,"price":350,"description":"청동 비늘을 촘촘히 엮어 칼날과 집게를 막는 갑옷.","image":"/exploration/armor/bronze-scale-armor.png","role":"물리 방어형"},
 {"id":"apprentice-priest-robe","name":"견습 사제의 로브","tier":"starter","reduction":0,"magicReduction":4,"maxHpBonus":10,"evasion":5,"price":350,"description":"마력의 충격을 흘려보내는 견습 사제의 예복.","image":"/exploration/armor/apprentice-priest-robe.png","role":"마법 방어형"},
 {"id":"padded-explorer-outfit","name":"두툼한 탐험복","tier":"starter","reduction":1,"magicReduction":1,"maxHpBonus":25,"evasion":0,"price":360,"description":"두툼한 안감으로 긴 탐험을 버티는 보호복.","image":"/exploration/armor/padded-explorer-outfit.png","role":"체력형"},
 {"id":"sandstep-cloak","name":"모래걸음 망토","tier":"starter","reduction":1,"magicReduction":1,"maxHpBonus":5,"evasion":15,"price":380,"description":"발걸음을 가볍게 만드는 얇은 사막 망토.","image":"/exploration/armor/sandstep-cloak.png","role":"회피형"},
 {"id":"tomb-guardian-armor","name":"왕릉 수호자의 갑옷","tier":"advanced","reduction":3,"magicReduction":3,"maxHpBonus":20,"evasion":8,"price":800,"description":"왕릉의 수호자가 입던 균형 잡힌 중갑.","image":"/exploration/armor/tomb-guardian-armor.png","role":"균형형"},
 {"id":"sandstone-plate-armor","name":"사암 판금갑옷","tier":"advanced","reduction":5,"magicReduction":0,"maxHpBonus":20,"evasion":0,"price":850,"description":"두꺼운 판금이 물리 공격을 단단히 받아낸다.","image":"/exploration/armor/sandstone-plate-armor.png","role":"물리 방어형"},
 {"id":"oasis-ritual-robe","name":"오아시스 의식복","tier":"advanced","reduction":1,"magicReduction":5,"maxHpBonus":20,"evasion":8,"price":850,"description":"오아시스의 축복으로 마법의 충격을 흘려보낸다.","image":"/exploration/armor/oasis-ritual-robe.png","role":"마법 방어형"},
 {"id":"caravan-life-coat","name":"대상단의 생명 외투","tier":"advanced","reduction":2,"magicReduction":2,"maxHpBonus":35,"evasion":0,"price":850,"description":"긴 여정에서 생존을 돕는 대상단의 외투.","image":"/exploration/armor/caravan-life-coat.png","role":"체력형"},
 {"id":"mirage-tracker-armor","name":"신기루 추적자의 경갑","tier":"advanced","reduction":2,"magicReduction":2,"maxHpBonus":15,"evasion":20,"price":900,"description":"흐릿한 잔상처럼 적의 기본 공격을 피하는 경갑.","image":"/exploration/armor/mirage-tracker-armor.png","role":"회피형"},
 {"id":"golden-scales-aegis","name":"황금 천칭의 성갑","tier":"ultimate","reduction":6,"magicReduction":6,"maxHpBonus":35,"evasion":10,"price":2300,"description":"천칭처럼 물리와 마법의 위협을 고르게 막는 성갑.","image":"/exploration/armor/golden-scales-aegis.png","role":"균형형"},
 {"id":"sun-king-warplate","name":"태양왕의 전쟁갑주","tier":"ultimate","reduction":9,"magicReduction":3,"maxHpBonus":30,"evasion":0,"price":2400,"description":"태양왕의 권위를 새긴 두꺼운 전쟁갑주.","image":"/exploration/armor/sun-king-warplate.png","role":"물리 방어형"},
 {"id":"starlight-priest-vestment","name":"별빛 사제의 성의","tier":"ultimate","reduction":3,"magicReduction":9,"maxHpBonus":30,"evasion":10,"price":2400,"description":"별빛의 결계가 마법의 위협을 감싸는 성의.","image":"/exploration/armor/starlight-priest-vestment.png","role":"마법 방어형"},
 {"id":"immortal-royal-robe","name":"불멸자의 왕포","tier":"ultimate","reduction":4,"magicReduction":4,"maxHpBonus":65,"evasion":0,"price":2500,"description":"불멸을 꿈꾼 왕의 생명력이 깃든 왕포.","image":"/exploration/armor/immortal-royal-robe.png","role":"체력형"},
 {"id":"nightwind-shadow-garb","name":"밤바람의 무영복","tier":"ultimate","reduction":4,"magicReduction":4,"maxHpBonus":25,"evasion":30,"price":2600,"description":"밤바람처럼 몸을 감춰 기본 공격을 흘려보내는 무영복.","image":"/exploration/armor/nightwind-shadow-garb.png","role":"회피형"}
]
export const starterArmor:Gear={id:'old-diving-suit',name:'낡은 잠수복',description:'닳았지만 몸을 가볍게 감싸는 잠수복.',reduction:1,magicReduction:0,maxHpBonus:0,evasion:5,image:'/exploration/armor/old-diving-suit.png'}
export const practiceArmor:Gear[]=[starterArmor,
 {id:'linen-wrap',escapeBonus:10,name:'아마포 보호복',description:'연습용 · 여러 겹의 천으로 몸을 보호합니다.',reduction:2,magicReduction:1,maxHpBonus:5,evasion:10,image:'/exploration/armor/linen-wrap.png'},
 {id:'gold-guard',name:'황금 흉갑',description:'연습용 · 무겁지만 단단한 보호구.',reduction:4,magicReduction:0,maxHpBonus:10,evasion:0,image:'/exploration/armor/gold-guard.png'},
]
export const merchantArmor:Gear={id:'merchant-armor',name:'모래바람 망토',description:'모래바람을 막아주는 보호구.',reduction:2,magicReduction:2,maxHpBonus:5,evasion:12,image:'/exploration/armor/merchant-armor.png'}
export const merchantArmorPrice=400
export type ArmorEntry={gear:Gear;source:'starter'|'practice'|'merchant'|'catalog';tier:WeaponTier;role:string;price?:number}
export const armorCatalog:ArmorEntry[]=[
 {gear:starterArmor,source:'starter',tier:'starter',role:'기본 장비'},
 ...practiceArmor.slice(1).map(gear=>({gear,source:'practice' as const,tier:'starter' as const,role:'연습 장비'})),
 {gear:merchantArmor,source:'merchant',tier:'starter',role:'회피형',price:merchantArmorPrice},
 ...explorationArmor.map(gear=>({gear,source:'merchant' as const,tier:gear.tier,role:gear.role,price:gear.price})),
]
export function armorStats(gear:Gear){return `방어력 ${gear.reduction??0} · 마법 저항력 ${gear.magicReduction??0} · 최대 체력 +${gear.maxHpBonus??0} · 회피율 ${gear.evasion??0}%`+(gear.escapeBonus?` · 도망 +${gear.escapeBonus}%p`:'')}
