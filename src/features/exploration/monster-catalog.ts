import {practiceEnemyGrowth,finalBossBalance} from './campaign-balance'
import {basicAttackRange,monsterAttackVariance} from './attack-roll'
export type MonsterId='sand-scorpion'|'bandage-mummy'|'lapis-cobra'|'sand-wraith'|'tomb-lantern-jellyfish'|'obsidian-anubis'|'jar-wisp'|'talisman-lizard'|'saw-claw-crab'|'tomb-hook-guard'|'ancient-giant'|'treasure-scarab'|'golden-pharaoh'|'nameless-royal-warden'
export type MonsterMove={id:string;name:string;damage:number;description:string;effect?:'blind'|'mana-drain'|'lifesteal'|'magic-break'|'weaken';image:string;bleed?:{chance:number;amount:number;turns:number}}
export type Monster={id:MonsterId;name:string;tier:'normal'|'intermediate'|'boss';maxHp:number;attack:number;critical:number;defense:number;magicResistance:number;gold:number;image:string;basic:MonsterMove;magic:MonsterMove[];arrival:string}
const move=(id:string,name:string,damage:number,description:string,effect?:MonsterMove['effect']):MonsterMove=>({id,name,damage,description,effect,image:`/exploration/monster-skills/${id}.svg`})
export const explorationMonsters:Monster[]=[
 {id:'sand-scorpion',name:'모래 전갈',tier:'normal',maxHp:38,attack:7,critical:5,defense:1,magicResistance:1,gold:120,image:new URL('./assets/sand-scorpion.png',import.meta.url).href,basic:move('tail-sting','꼬리침 찌르기',7,'날카로운 꼬리침으로 찌릅니다.'),magic:[],arrival:'모래를 헤치고 모래 전갈이 꼬리침을 치켜든다.'},
 {id:'bandage-mummy',name:'붕대 미라',tier:'normal',maxHp:55,attack:9,critical:5,defense:3,magicResistance:0,gold:140,image:'/exploration/monsters/bandage-mummy-upright.png',basic:move('linen-fist','붕대 주먹',9,'붕대로 감싼 단단한 주먹을 휘두릅니다.'),magic:[],arrival:'느릿한 발소리와 함께 붕대 미라가 주먹을 들어 올린다.'},
 {id:'lapis-cobra',name:'청금석 코브라',tier:'normal',maxHp:20,attack:11,critical:45,defense:1,magicResistance:3,gold:140,image:'/exploration/monsters/lapis-cobra.png',basic:move('lapis-fang','청금석 송곳니',11,'푸른 송곳니로 재빠르게 물어뜯습니다.'),magic:[],arrival:'푸른 비늘이 빛난다. 청금석 코브라가 몸을 곧추세운다.'},
 {id:'sand-wraith',name:'모래망령',tier:'intermediate',maxHp:65,attack:13,critical:10,defense:3,magicResistance:7,gold:200,image:'/exploration/monsters/sand-wraith.png',basic:move('sand-claw','모래 할퀴기',13,'모래로 빚은 손톱으로 할퀴어 공격합니다.'),magic:[move('blinding-sand','눈먼 모래바람',10,'모래바람으로 공격하고, 다음 기본 공격 1회의 명중률을 30% 낮춥니다. 중첩되지 않습니다.','blind')],arrival:'낡은 천 사이로 모래가 모여들며 모래망령이 모습을 드러낸다.'},
 {id:'tomb-lantern-jellyfish',name:'왕릉의 등불해파리',tier:'intermediate',maxHp:65,attack:12,critical:5,defense:2,magicResistance:9,gold:200,image:'/exploration/monsters/tomb-lantern-jellyfish.png',basic:move('lantern-tendril','등불 촉수',12,'길게 늘어진 촉수를 채찍처럼 휘두릅니다.'),magic:[move('soul-discharge','혼불 방전',18,'푸른 혼불을 방출하고 1턴 동안 플레이어 마법 저항력을 10 감소시킵니다. 저항력은 음수가 될 수 있으며, 재적용 시 중첩 없이 1턴으로 갱신합니다.','magic-break')],arrival:'왕릉의 등불해파리가 푸른 등불을 밝히며 떠오른다.'},
 {id:'obsidian-anubis',name:'흑요석 아누비스병',tier:'boss',maxHp:100,attack:14,critical:10,defense:4,magicResistance:4,gold:240,image:'/exploration/monsters/obsidian-anubis.png',basic:move('guardian-spear','수호자의 창',14,'흑요석 창을 힘껏 내질러 공격합니다.'),magic:[move('tomb-seal','왕릉의 봉인',12,'왕릉의 문양으로 마력을 봉인합니다. 플레이어 마나 4 감소 (최소 0).','mana-drain'),move('soul-harvest','영혼 수확',14,'영혼을 거두어 실제로 입힌 피해의 50%만큼 체력을 회복합니다. 회복량은 내림하며 최대 체력을 넘지 않아요.','lifesteal')],arrival:'흑요석 아누비스병이 창을 세워 왕릉의 길목을 막아선다.'},
 {id:'jar-wisp',name:'항아리 위습',tier:'normal',maxHp:28,attack:5,critical:5,defense:1,magicResistance:2,gold:110,image:'/exploration/monsters/jar-wisp.png',basic:move('jar-bump','항아리 박치기',5,'작은 항아리 몸통으로 부딪칩니다.'),magic:[move('ember-bolt','잔불탄',8,'항아리 안에서 작은 불씨를 날립니다.')],arrival:'낡은 항아리 안에서 작은 불꽃이 피어난다. 항아리 위습이다.'},
 {id:'talisman-lizard',name:'부적 도마뱀',tier:'normal',maxHp:33,attack:6,critical:5,defense:2,magicResistance:1,gold:120,image:'/exploration/monsters/talisman-lizard.png',basic:move('tail-swipe','꼬리치기',6,'긴 꼬리를 휘둘러 공격합니다.'),magic:[move('apprentice-curse','서툰 저주',5,'작은 부적으로 저주를 걸어 플레이어의 다음 기본 공격력 2 감소. 기본 공격 시도 1회에 소모되며 중첩되지 않습니다.','weaken')],arrival:'목에 작은 부적을 건 도마뱀이 바닥을 기어 나와 길을 막는다.'},
 {id:'saw-claw-crab',name:'톱니집게게',tier:'normal',maxHp:25,attack:7,critical:5,defense:3,magicResistance:0,gold:130,image:'/exploration/monsters/saw-claw-crab.png',basic:{...move('saw-pinch','톱니 집게',7,'톱니 모양 집게로 움켜쥡니다. 적중 시 25% 확률로 출혈: 행동 종료마다 피해 2, 2턴. 중첩되지 않습니다.'),bleed:{chance:25,amount:2,turns:2}},magic:[],arrival:'모래 아래에서 톱니집게게가 나타나 거친 집게를 벌린다.'},
 {id:'tomb-hook-guard',name:'왕릉의 갈고리병',tier:'intermediate',maxHp:70,attack:13,critical:10,defense:3,magicResistance:3,gold:200,image:'/exploration/monsters/tomb-hook-guard.png',basic:move('hook-slash','갈고리 베기',13,'청동 갈고리를 크게 휘둘러 공격합니다.'),magic:[{...move('crimson-chain','붉은 사슬',14,'붉게 빛나는 사슬로 공격합니다. 출혈: 행동 종료마다 피해 3, 3턴. 중첩되지 않습니다.'),bleed:{chance:100,amount:3,turns:3}}],arrival:'사슬 끌리는 소리와 함께 왕릉의 갈고리병이 길목을 막는다.'},
 {id:'ancient-giant',name:'고대거인',tier:'intermediate',maxHp:115,attack:15,critical:5,defense:5,magicResistance:3,gold:300,image:'/exploration/rooms/ancient-giant.png',basic:move('stone-crush','석주먹 강타',15,'묵직한 돌주먹으로 내려칩니다.'),magic:[move('earth-rumble','대지의 울림',14,'대지의 마력을 울려 공격하고 다음 기본 공격력을 2 낮춥니다.','weaken')],arrival:'고대거인이 잠에서 깨어난다. 돌의 몸에서 모래가 쏟아져 내린다.'},
 {id:'treasure-scarab',name:'보물갑충',tier:'intermediate',maxHp:100,attack:14,critical:10,defense:5,magicResistance:4,gold:280,image:'/exploration/monsters/treasure-scarab.png',basic:move('treasure-pincer','황금 집게',14,'단단한 황금 집게로 공격합니다.'),magic:[move('sealed-flash','봉인의 섬광',12,'봉인의 빛으로 공격하고 다음 기본 공격 1회의 명중률을 30% 낮춥니다.','blind')],arrival:'봉인이 갈라지자 보물갑충이 황금 날개를 펼치고 몸을 일으킨다.'},
 {id:'golden-pharaoh',name:'황금왕 라세프',tier:'boss',maxHp:finalBossBalance.hp,attack:finalBossBalance.attack,critical:12,defense:finalBossBalance.defense,magicResistance:finalBossBalance.magicResistance,gold:1000,image:'/exploration/rooms/golden-pharaoh.png',basic:move('royal-scepter','왕권의 홀',finalBossBalance.attack,'태양 문양의 홀을 휘둘러 내려칩니다.'),magic:[move('solar-judgment','태양 심판',finalBossBalance.solarDamage,'작열하는 태양빛으로 공격하고 1턴 동안 플레이어 마법 저항력을 10 감소시킵니다. 재적용 시 중첩 없이 1턴으로 갱신합니다.','magic-break'),{...move('golden-chains','황금 사슬',finalBossBalance.chainDamage,'황금 사슬로 공격합니다. 출혈: 행동 종료마다 피해 4, 3턴. 중첩되지 않습니다.'),bleed:{chance:100,amount:4,turns:3}}],arrival:'왕릉의 마지막 왕이 황금의 홀을 든다. 황금왕 라세프가 눈을 뜬다.'},
 {id:'nameless-royal-warden',name:'이름 없는 왕실 수문장',tier:'boss',maxHp:120,attack:16,critical:8,defense:5,magicResistance:5,gold:0,image:'/exploration/npcs/nameless-royal-warden.png',basic:move('warden-greatsword','수문장의 대검',16,'무거운 양손 대검을 크게 휘둘러 길을 가로막습니다.'),magic:[move('forgotten-edict','망각의 칙령',14,'지워진 왕명을 되뇌어 공격하고 플레이어의 다음 기본 공격력을 2 낮춥니다. 기본 공격 시도 1회에 소모되며 중첩되지 않습니다.','weaken')],arrival:'이름을 잃은 왕실 수문장이 거대한 대검을 뽑아 든다. 침입자를 막아서는 석문에는 퇴로가 없다.'},
]
export const sandScorpion=explorationMonsters[0]
export function getMonster(id?:MonsterId){return explorationMonsters.find(monster=>monster.id===id)??sandScorpion}
export const regularMonsters=explorationMonsters.filter(monster=>monster.tier!=='boss'&&monster.id!=='ancient-giant'&&monster.id!=='treasure-scarab')
export function drawMonster(random=Math.random){return regularMonsters[Math.min(regularMonsters.length-1,Math.floor(random()*regularMonsters.length))]}
export function monsterMoveDescription(monster:Monster,kind:string){
 const skill=kind==='basic'?monster.basic:monster.magic.find(move=>move.id===kind)
 const range=basicAttackRange(monster.attack,monsterAttackVariance)
 if(!skill)return '이 몬스터는 마법을 사용하지 않고 매 턴 기본 공격을 사용합니다.'
 return `${skill.description} ${kind==='basic'?`물리 피해 ${range.min}~${range.max} (기준 ${monster.attack} ±${monsterAttackVariance}) · 치명타 ${monster.critical}% (피해 2배) · 방어력과 회피 적용`:`마법 피해 ${skill.damage} · 마법 저항력 적용 · 회피와 치명타 없음`} · ${monster.magic.length===2?'사용 확률 1/3 (약 33%)':monster.magic.length===1?'사용 확률 50%':'사용 확률 100%'} · 마나 소모 없음`
}

export function getFloorMonster(id:MonsterId|undefined,floor:number,practice:boolean):Monster{
 const monster=getMonster(id)
 if(!practice)return monster
 // This one-off story fight is below the 30F Anubis and keeps its advanced relic reward.
 if(monster.id==='nameless-royal-warden')return monster
 if(monster.id==='golden-pharaoh')return {...monster,maxHp:finalBossBalance.hp,attack:finalBossBalance.attack,defense:finalBossBalance.defense,magicResistance:finalBossBalance.magicResistance,magic:monster.magic.map((move,index)=>({...move,damage:index===0?finalBossBalance.solarDamage:finalBossBalance.chainDamage}))}
 if(monster.tier==='boss'){
  const attack=monster.attack+(floor>=40?6:floor>=30?3:0)
  const scaled=floor>=40?{maxHp:170,defense:6,magicResistance:6,magic:monster.magic.map((move,index)=>({...move,damage:index===0?17:19}))}:floor>=30?{maxHp:135,defense:5,magicResistance:5,magic:monster.magic.map((move,index)=>({...move,damage:index===0?14:16}))}:{maxHp:100,defense:4,magicResistance:4}
  return {...monster,...scaled,attack,basic:{...monster.basic,damage:attack}}
 }
 const band=Math.max(0,Math.min(4,Math.floor((floor-1)/10)))
 const hp=monster.tier==='normal'?practiceEnemyGrowth.normalHpPerBand:practiceEnemyGrowth.intermediateHpPerBand,attack=monster.tier==='normal'?practiceEnemyGrowth.normalAttackPerBand:practiceEnemyGrowth.intermediateAttackPerBand
 return {...monster,gold:Math.round(monster.gold*(1+band*practiceEnemyGrowth.goldPerBand)),maxHp:Math.round(monster.maxHp*(1+band*hp)),attack:monster.attack+band*attack,magic:monster.magic.map(move=>({...move,damage:move.damage+band*practiceEnemyGrowth.magicPerBand}))}
}
