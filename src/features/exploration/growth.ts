import type {PracticeState} from './practice-state'

export const growthStats=[
 {id:'health',name:'체력',effect:'최대 체력 +5',amount:5,description:'현재 체력도 5 회복합니다.'},
 {id:'mana',name:'마나',effect:'최대 마나 +3',amount:3,description:'현재 마나도 3 회복합니다.'},
 {id:'attack',name:'근력',effect:'기본 공격력 +1',amount:1,description:'기본 공격을 강화합니다.'},
 {id:'magic',name:'마력',effect:'공격 마법 피해 +1',amount:1,description:'직접 피해만 강화하며, 회복·보호막·상태이상은 유지합니다.'},
 {id:'evasion',name:'회피',effect:'물리 회피율 +4%p',amount:4,description:'물리 기본 공격에만 적용합니다.'},
] as const
export type GrowthStat=typeof growthStats[number]['id']
export type ExplorationGrowth={version:1;previewPoints?:number;allocations:Record<GrowthStat,number>}
export function newGrowth():ExplorationGrowth{return {version:1,allocations:{health:0,mana:0,attack:0,magic:0,evasion:0}}}
export function earnedGrowthPoints(floor:number){return Math.max(1,Math.min(7,Math.floor((floor-1)/10)))}
export function growthBonus(state:Pick<PracticeState,'growth'>,stat:GrowthStat){return (state.growth?.allocations[stat]??0)*growthStats.find(item=>item.id===stat)!.amount}
export function availableGrowthPoints(state:PracticeState){return state.growth?Math.max(0,earnedGrowthPoints(state.market.floor)+(state.growth.previewPoints??0)-Object.values(state.growth.allocations).reduce((sum,n)=>sum+n,0)):0}
export function allocateGrowth(state:PracticeState,stat:GrowthStat):PracticeState{
 if(!state.growth||!growthStats.some(item=>item.id===stat)||availableGrowthPoints(state)<1||state.completed||state.hp<=0||state.combat||state.door!==null)return state
 return {...state,growth:{...state.growth,allocations:{...state.growth.allocations,[stat]:state.growth.allocations[stat]+1}},hp:state.hp+(stat==='health'?5:0),mp:state.mp+(stat==='mana'?3:0)}
}
export function directSpellDamage(state:Pick<PracticeState,'growth'>,damage:number|undefined){return damage?damage+growthBonus(state,'magic'):0}
