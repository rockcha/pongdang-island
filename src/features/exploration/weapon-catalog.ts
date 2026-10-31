import type {Gear} from './practice-state'
import type {AilmentKind} from './ailments'

export type WeaponProc={kind:AilmentKind;chance:number;amount:number;turns:number}
export type WeaponTier='starter'|'advanced'|'ultimate'
export const weaponTierNames:Record<WeaponTier,string>={starter:'일반',advanced:'중급',ultimate:'고급'}
export type CatalogWeapon=Gear&{attack:number;critical:number;image:string;price:number;role:string;tier:WeaponTier;merchantAvailable?:boolean}
// IDs remain stable when a weapon's name or silhouette changes, preserving ownership and combat references.
const art=(id:string)=>`/exploration/weapons/${id}.png`
export const starterWeapons:(CatalogWeapon&{price:number})[]=[
 {id:'serrated-bronze-sword',name:'톱날 청동검',attack:13,critical:4,tier:'starter',price:330,merchantAvailable:true,role:'톱날검 · 출혈',description:'촘촘한 청동 톱니로 상처를 벌리는 검. 공격력보다 적중 후 이어지는 출혈이 강점이다.',image:art('serrated-bronze-sword'),proc:{kind:'bleed',chance:15,amount:2,turns:2}},
 {id:'frost-tip-spear',name:'서리촉 창',attack:13,critical:3,tier:'starter',price:360,merchantAvailable:true,role:'빙촉창 · 빙결',description:'작은 얼음 촉을 단 곧은 창. 고른 찌르기 사이에 빙결을 노려 반격할 틈을 줄인다.',image:art('frost-tip-spear'),proc:{kind:'freeze',chance:10,amount:1,turns:1}},
 {id:'ember-scimitar',name:'잿불 부지깽이',attack:14,critical:4,tier:'starter',price:320,merchantAvailable:true,role:'화로 도구 · 치유 억제',description:'화로에서 꺼낸 갈고리 끝에 잿불이 남아 있다. 묵직하게 찍으며 화상으로 적이 받는 치유를 방해한다.',image:art('ember-scimitar'),proc:{kind:'burn',chance:25,amount:40,turns:3}},
 {id:'sandstone-maul',name:'사암 철퇴',attack:13,attackVariance:3,critical:3,tier:'starter',price:330,merchantAvailable:true,role:'돌철퇴 · 약화',description:'네모난 사암 머리로 공격 기세를 꺾는다. 무게가 실리는 정도에 따라 피해 편차가 있고, 약화가 터지면 반격 피해를 줄인다.',image:art('sandstone-maul'),proc:{kind:'weaken',chance:20,amount:2,turns:2}},
 {id:'sandwind-dagger',name:'모래바람 철선',attack:13,critical:5,tier:'starter',price:340,merchantAvailable:true,role:'철제 부채 · 실명',description:'날을 세운 쇠 부챗살로 베고 모래를 흩뿌린다. 큰 한 방보다 실명으로 적의 헛손질을 유도하는 무기다.',image:art('sandwind-dagger'),proc:{kind:'blind',chance:20,amount:20,turns:2}},
 {id:'tomb-bronze-sword',name:'왕릉의 청동검',attack:14,critical:3,tier:'starter',price:300,merchantAvailable:true,role:'병사의 검 · 고정 피해',description:'왕릉 병사가 쓰던 넓은 청동검. 급소를 노리는 재주보다 편차 없는 묵직한 베기에 충실하다.',image:art('tomb-bronze-sword')},
 {id:'golden-edge-scimitar',name:'황금날 투척환',attack:13,critical:10,tier:'starter',price:300,merchantAvailable:true,role:'투척환 · 균형형',description:'가운데가 빈 금빛 고리의 바깥날로 벤다. 고른 공격력과 적당한 치명타를 갖춘 원형 무기다.',image:art('golden-edge-scimitar')},
 {id:'obsidian-rapier',name:'흑요석 송곳',attack:12,critical:20,tier:'starter',price:300,merchantAvailable:true,role:'주먹 송곳 · 치명타',description:'너클 손잡이에 가늘고 단단한 흑요석 촉을 박았다. 기본 위력은 낮지만 작은 급소를 찌르는 치명타에 특화됐다.',image:art('obsidian-rapier')},
 {id:'reforged-bronze-sword',name:'재련 청동검',attack:17,critical:6,tier:'starter',price:520,merchantAvailable:true,role:'재련검 · 높은 고정 피해',description:'평범한 청동검을 여러 번 두드려 날과 중심을 바로잡았다. 수수한 외형에 비해 편차 없는 공격력이 높아 일반 장비 중 값이 비싸다.',image:art('reforged-bronze-sword')},
 {id:'falcon-beak-dagger',name:'매의 부리 단검',attack:15,critical:28,tier:'starter',price:560,merchantAvailable:true,role:'갈고리 단검 · 높은 치명타',description:'매의 부리처럼 굽은 얇은 날로 작은 빈틈을 건다. 비싼 일반 무기지만 높은 치명타 확률로 오래 쓸 만하다.',image:art('falcon-beak-dagger')},
]
const starterToolWeapons:CatalogWeapon[]=[
 {id:'small-pickaxe',name:'작은 곡괭이',tier:'starter',attack:13,attackVariance:3,critical:2,price:240,role:'곡괭이 · 피해 편차',description:'광부가 쓰던 뾰족한 철제 곡괭이. 찍히는 각도에 따라 위력이 들쭉날쭉하고 치명타에는 기대기 어렵다.',image:art('small-pickaxe')},
 {id:'woodcutters-handaxe',name:'벌목용 손도끼',tier:'starter',attack:14,critical:0,price:280,role:'손도끼 · 고정 피해',description:'짧은 자루와 넓은 날에 힘이 곧게 실린다. 치명타 없이 매번 일정한 위력을 내는 실용적인 벌목 도구다.',image:art('woodcutters-handaxe')},
 {id:'worn-harpoon',name:'낡은 작살',tier:'starter',attack:13,attackVariance:3,critical:3,price:250,role:'작살 · 피해 편차',description:'물고기가 빠지지 않도록 갈고리를 낸 오래된 작살. 길게 찌르지만 힘이 실리는 정도에 따라 피해가 달라진다.',image:art('worn-harpoon')},
 {id:'iron-shovel',name:'철제 삽',tier:'starter',attack:13,critical:0,price:220,role:'삽 · 고정 피해',description:'두꺼운 삽날로 넓게 내려친다. 급소를 노리는 대신 치명타도 피해 편차도 없는 단순한 타격 도구다.',image:art('iron-shovel')},
 {id:'sturdy-club',name:'튼튼한 몽둥이',tier:'starter',attack:13,critical:1,price:230,role:'나무 곤봉 · 단순 타격',description:'옹이가 단단한 나뭇가지를 깎아 만든 곤봉. 특별한 효과 없이 일정한 타격을 내는 소박한 무기다.',image:art('sturdy-club')},
 {id:'stone-mallet',name:'돌망치',tier:'starter',attack:14,critical:0,price:280,role:'돌망치 · 고정 피해',description:'자루에 큰 돌을 단단히 묶어 무게로 내리찍는다. 치명타가 없는 대신 일반 도구 중 기본 위력이 높은 편이다.',image:art('stone-mallet')},
 {id:'sharp-kitchen-knife',name:'잘 드는 부엌칼',tier:'starter',attack:12,critical:10,price:240,role:'부엌칼 · 급소 찌르기',description:'짧고 얇은 주방 칼날이 아직 잘 든다. 무거운 도구보다 위력은 낮지만 빈틈에 찔러 넣기 좋다.',image:art('sharp-kitchen-knife')},
 {id:'rusty-prybar',name:'녹슨 쇠지렛대',tier:'starter',attack:13,attackVariance:3,critical:1,price:230,role:'쇠지렛대 · 피해 편차',description:'굽은 끝으로 걸고 철봉 몸통으로 후려친다. 녹슨 무게중심 탓에 피해 편차가 있고 치명타는 드물다.',image:art('rusty-prybar')},
 {id:'broken-oar',name:'부러진 노',tier:'starter',attack:13,attackVariance:3,critical:0,price:220,role:'부러진 노 · 피해 편차',description:'물에 불었던 넓은 나무판을 크게 휘두른다. 치명타 없이, 제대로 맞은 정도에 따라 위력이 달라진다.',image:art('broken-oar')},
 {id:'fishing-hook-weapon',name:'낚시용 갈고리',tier:'starter',attack:12,critical:12,price:250,role:'낚시 갈고리 · 급소 공략',description:'손잡이를 감은 커다란 낚시 갈고리. 묵직한 타격보다 휘어진 촉으로 빈틈을 거는 치명타가 강점이다.',image:art('fishing-hook-weapon')},
]
const advancedWeapons:CatalogWeapon[]=[
 {id:'red-fang-sword',name:'붉은 송곳니 갈고리',tier:'advanced',attack:19,attackVariance:3,critical:10,price:800,role:'가시 갈고리 · 출혈',description:'안쪽으로 휜 붉은 갈고리의 가시가 상처를 남긴다. 걸어 당기는 각도에 따라 위력이 달라지고 출혈로 압박한다.',image:art('red-fang-sword'),proc:{kind:'bleed',chance:30,amount:3,turns:3}},
 {id:'glacier-guardian-spear',name:'빙하의 수호삼지창',tier:'advanced',attack:19,critical:8,price:850,role:'얼음 삼지창 · 빙결',description:'세 갈래 얼음 촉으로 틈을 좁히는 수호자의 창. 일정한 찌르기와 빙결로 적의 행동을 끊는 데 특화됐다.',image:art('glacier-guardian-spear'),proc:{kind:'freeze',chance:22,amount:1,turns:1}},
 {id:'sunfire-scimitar',name:'태양불꽃 향로추',tier:'advanced',attack:20,attackVariance:3,critical:10,price:780,role:'향로 사슬추 · 치유 억제',description:'불씨가 든 청동 향로를 사슬 끝에 매달았다. 휘두른 궤적에 따라 피해가 달라지며 화상으로 적이 받는 치유를 크게 줄인다.',image:art('sunfire-scimitar'),proc:{kind:'burn',chance:45,amount:70,turns:3}},
 {id:'tomb-breaker-maul',name:'왕릉 파쇄사슬',tier:'advanced',attack:19,attackVariance:3,critical:12,price:820,role:'파쇄 사슬추 · 약화',description:'석문을 깨던 각진 무게추를 굵은 사슬에 이었다. 넓게 휘둘러 적의 기세를 꺾고 약화로 반격 피해를 줄인다.',image:art('tomb-breaker-maul'),proc:{kind:'weaken',chance:40,amount:3,turns:3}},
 {id:'desert-mirage-twinblades',name:'사막신기루 쌍검',tier:'advanced',attack:18,attackVariance:3,critical:16,price:850,role:'쌍검 · 실명',description:'엇갈린 물결 모양의 두 날이 시선을 흩뜨린다. 피해 편차와 실명을 지닌 무기이며, 두 날의 움직임은 한 번의 공격으로 판정한다.',image:art('desert-mirage-twinblades'),proc:{kind:'blind',chance:40,amount:30,turns:3}},
 {id:'desert-steel-longsword',name:'사막강철 장검',tier:'advanced',attack:21,critical:4,price:700,role:'강철 장검 · 높은 고정 피해',description:'두꺼운 강철 날에 무게를 모은 정직한 장검. 치명타보다 중급 무기 중 높은 고정 공격력으로 승부한다.',image:art('desert-steel-longsword')},
 {id:'gold-dust-scimitar',name:'사금날 쌍월도',tier:'advanced',attack:20,critical:10,price:700,role:'양날 월도 · 균형형',description:'자루 양끝의 초승달 날을 번갈아 돌려 벤다. 고른 위력과 치명타의 균형이 좋으며 공격 판정은 한 번이다.',image:art('gold-dust-scimitar')},
 {id:'black-iron-rapier',name:'흑철 세검',tier:'advanced',attack:19,critical:15,price:700,role:'세검 · 정밀 찌르기',description:'가늘고 곧은 흑철 끝에 힘을 모은다. 장검보다 기본 위력을 덜어내고 치명타 확률을 높인 정밀한 찌르기 무기다.',image:art('black-iron-rapier')},
 {id:'dune-battleaxe',name:'사막의 전투도끼',tier:'advanced',attack:21,critical:4,price:700,role:'전투도끼 · 높은 고정 피해',description:'넓은 도끼날과 짧은 지렛대 구조로 무게를 싣는다. 중급 장검처럼 높은 고정 공격력에 집중한 도끼다.',image:art('dune-battleaxe')},
 {id:'bronze-warhammer',name:'청동 전투망치',tier:'advanced',attack:20,critical:10,price:700,role:'전투망치 · 균형형',description:'네모난 청동 머리의 평평한 면과 모서리를 함께 쓴다. 고정 공격력과 적당한 치명타를 고루 갖춘 망치다.',image:art('bronze-warhammer')},
 {id:'ruin-hunter-crossbow',name:'유적 사냥꾼의 쇠뇌',tier:'advanced',attack:19,critical:15,price:700,role:'쇠뇌 · 정밀 조준',description:'장력을 일정하게 잡은 쇠뇌로 빈틈을 조준한다. 공격력보다 치명타에 조금 더 무게를 둔 한 발의 무기다.',image:art('ruin-hunter-crossbow')},
]
const ultimateWeapons:CatalogWeapon[]=[
 {id:'anubis-crimson-judgment',name:'아누비스의 붉은 심판',tier:'ultimate',attack:25,attackVariance:3,critical:18,price:2500,role:'처형도끼 · 강한 출혈',description:'자칼 문양 아래 넓게 벌어진 검붉은 도끼날. 무거운 한 번의 베기에 피해 편차가 있고, 깊고 긴 출혈을 남긴다.',image:art('anubis-crimson-judgment'),proc:{kind:'bleed',chance:55,amount:5,turns:4}},
 {id:'eternal-winter-kingspear',name:'영원한 겨울의 왕홀',tier:'ultimate',attack:25,critical:12,price:2600,role:'얼음 왕홀 · 빙결',description:'왕관 모양의 단단한 얼음 머리로 내리치는 전투 왕홀. 편차 없는 타격에 높은 빙결 확률을 더해 적의 행동을 끊는다.',image:art('eternal-winter-kingspear'),proc:{kind:'freeze',chance:35,amount:1,turns:1}},
 {id:'ra-twilight-scimitar',name:'라의 황혼 윤도',tier:'ultimate',attack:26,critical:16,price:2400,role:'태양 윤도 · 강한 치유 억제',description:'황혼빛 칼날 여섯 장이 검은 태양 둘레를 감싼다. 일정한 베기와 강한 화상으로 적이 받는 치유를 거의 막아낸다.',image:art('ra-twilight-scimitar'),proc:{kind:'burn',chance:65,amount:90,turns:4}},
 {id:'fallen-dynasty-maul',name:'무너진 왕조의 철퇴',tier:'ultimate',attack:25,attackVariance:3,critical:14,price:2600,role:'왕관 철퇴 · 강한 약화',description:'몰락한 왕관을 검은 돌 머리에 씌운 거대 철퇴. 피해 편차가 있는 타격 뒤에 강한 약화로 적의 공격 기세를 무너뜨린다.',image:art('fallen-dynasty-maul'),proc:{kind:'weaken',chance:55,amount:4,turns:3}},
 {id:'set-hidden-fang',name:'세트의 보이지 않는 송곳니',tier:'ultimate',attack:24,critical:25,price:2600,role:'사슬 송곳 · 실명',description:'가느다란 사슬에 이은 검은 송곳니가 시선을 교란한다. 높은 치명타와 실명으로 적의 빈틈을 오래 노리는 무기다.',image:art('set-hidden-fang'),proc:{kind:'blind',chance:55,amount:40,turns:3}},
 {id:'royal-noon-greatsword',name:'왕의 정오 대검',tier:'ultimate',attack:30,critical:10,price:2200,role:'대검 · 최고 기본 공격력',description:'넓고 두꺼운 왕의 대검에 모든 무게를 실었다. 특수효과 없이 가장 높은 고정 기본 공격력으로 밀어붙인다.',image:art('royal-noon-greatsword')},
 {id:'golden-scales-longsword',name:'황금천칭 전투봉',tier:'ultimate',attack:28,critical:18,price:2200,role:'양끝 전투봉 · 균형형',description:'양끝의 금빛 타격추를 천칭처럼 정확히 맞췄다. 높은 고정 공격력과 치명타를 고루 갖춘 왕실의 전투봉이다.',image:art('golden-scales-longsword')},
 {id:'blackmoon-rapier',name:'흑월의 장궁',tier:'ultimate',attack:25,critical:32,price:2200,role:'장궁 · 최고 치명타',description:'검은 초승달을 닮은 활대와 팽팽한 시위. 고급 순수 공격 무기 중 기본 위력을 낮춘 대신 가장 높은 치명타 확률로 급소를 노린다.',image:art('blackmoon-rapier')},
]
const sustainWeapons:CatalogWeapon[]=[
 {id:'crimson-leather-dagger',name:'붉은 가죽 단검',tier:'starter',attack:12,critical:3,lifesteal:15,price:350,role:'가죽 단검 · 피흡',description:'짧은 날과 붉은 가죽 손잡이에 생기 흡수의 흔적이 남아 있다. 공격력을 낮춘 대신 적에게 입힌 피해 일부로 체력을 되찾는다.',image:art('crimson-leather-dagger')},
 {id:'red-sap-handaxe',name:'붉은 수액 손도끼',tier:'starter',attack:13,critical:0,lifesteal:10,price:340,role:'수액 손도끼 · 고정 피흡',description:'날과 자루의 붉은 수액이 생기를 돌려준다. 치명타 없는 일정한 타격과 소량의 피흡을 갖춘 생존용 도끼다.',image:art('red-sap-handaxe')},
 {id:'bloodstone-battleaxe',name:'혈옥 전투도끼',tier:'advanced',attack:19,critical:5,lifesteal:18,price:850,role:'혈옥 도끼 · 피흡',description:'도끼날 아래 박힌 혈옥이 상처에서 생기를 끌어온다. 고른 타격에 피흡을 더해 체력을 아끼는 전투도끼다.',image:art('bloodstone-battleaxe')},
 {id:'crimson-sap-warclub',name:'진홍 수액 전투봉',tier:'advanced',attack:18,attackVariance:3,critical:10,lifesteal:22,price:900,role:'수액 전투봉 · 높은 피흡',description:'두꺼운 수액 띠를 감은 전투봉. 피해 편차와 낮은 기본 위력을 감수하는 대신 중급 무기 중 피흡 비율이 높다.',image:art('crimson-sap-warclub')},
 {id:'dawn-purification-mace',name:'새벽의 정화봉',tier:'advanced',attack:20,critical:3,cleanseChance:35,price:800,role:'결정 타격봉 · 자기 정화',description:'청동 머리 안의 새벽빛 결정이 타격할 때 반응한다. 치명타보다 일정한 공격력과 사용자의 상태이상 정화에 초점을 맞췄다.',image:art('dawn-purification-mace')},
 {id:'osiris-lifereaper',name:'오시리스의 생명낫',tier:'ultimate',attack:24,attackVariance:3,critical:8,lifesteal:25,price:2800,role:'생명낫 · 최고 피흡',description:'길게 휜 낫날의 녹빛 홈이 빼앗은 생기를 흘려보낸다. 피해 편차가 있는 베기와 가장 높은 피흡 비율로 긴 전투를 버틴다.',image:art('osiris-lifereaper')},
]
export const explorationWeapons:CatalogWeapon[]=[...starterWeapons,...starterToolWeapons,...advancedWeapons,...ultimateWeapons,...sustainWeapons].map(weapon=>({...weapon,merchantAvailable:true}))

export function hasWeaponEffect(gear:Gear){return !!(gear.proc||gear.lifesteal||gear.cleanseChance)}

export function weaponEffectText(gear:Gear){
 if(gear.lifesteal)return `피흡 ${gear.lifesteal}% · 일반 공격으로 실제 입힌 피해에 비례해 체력 회복 (치명타 포함)`
 if(gear.cleanseChance)return `일반 공격 적중 시 ${gear.cleanseChance}% 확률로 내 상태이상 1개 해제`
 const p=gear.proc
 if(!p)return '특수효과 없음'
 const detail=p.kind==='bleed'?`출혈 · 턴당 피해 ${p.amount} · ${p.turns}턴`:p.kind==='freeze'?`빙결 · 행동 ${p.turns}회 봉쇄`:p.kind==='burn'?`화상 · 치유량 ${p.amount}% 감소 · ${p.turns}턴`:p.kind==='weaken'?`약화 · 공격 피해 ${p.amount} 감소 · ${p.turns}턴`:`실명 · 빗나갈 확률 +${p.amount}%p · ${p.turns}턴`
 return `적중 시 ${p.chance}% 확률로 ${detail}`
}
