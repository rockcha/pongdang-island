import type {WeaponTier} from './weapon-catalog'
import {usesCurrentBalance,type BalanceProfile} from './balance-profile'

// Learning costs are paid once per learned spell, not per cast. Random offerings
// should reference these IDs and prices rather than duplicating price tables.
export type PlannedSpell={id:string;name:string;tier:WeaponTier;kind:'damage'|'damage-status'|'debuff'|'buff'|'healing'|'cleanse';mana:number;learnPrice:number;description:string;available:true;image?:string}
export const plannedSpells:PlannedSpell[]=[
 {id:'solar-brand',name:'태양의 낙인',tier:'advanced',kind:'debuff',mana:8,learnPrice:850,description:'3턴 동안 적이 받는 직접 피해 +20% · 출혈 제외',available:true},
 {id:'golden-shell-break',name:'황금 갑각 파쇄',tier:'advanced',kind:'damage',mana:9,learnPrice:900,description:'적 보호막 전부 제거 후 피해 32',available:true},
 {id:'soul-knot',name:'영혼의 매듭',tier:'ultimate',kind:'buff',mana:16,learnPrice:2800,description:'4턴 안에 치명적인 피해를 받으면 체력 1로 한 번 생존',available:true},
 {id:'silent-seal',name:'고요한 봉인',tier:'ultimate',kind:'debuff',mana:15,learnPrice:2500,description:'2턴 동안 적은 스킬 대신 기본 공격만 사용 · 도주 등 고유 행동 유지',available:true},
 {id:'lapis-veil',name:'청금석의 장막',tier:'advanced',kind:'buff',mana:8,learnPrice:850,description:'4턴 동안 장비 마법 저항력 2배 · 기본 저항력 0이면 증가 없음',available:true},
 {id:'sandstone-skin',name:'사암의 피부',tier:'advanced',kind:'buff',mana:7,learnPrice:750,description:'3턴 동안 장비 방어력 2배 · 회피율 −10%p',available:true},
 {"id":"silver-crescent","name":"은빛 초승달","tier":"starter","kind":"damage","mana":6,"learnPrice":340,"description":"피해 18 · 보호막 8 · 소진까지 유지","available":true,"image":"/exploration/magic/silver-crescent.svg"},
 {"id":"sand-swallow-feather","name":"모래제비의 깃","tier":"starter","kind":"buff","mana":5,"learnPrice":320,"description":"공격력 +4 · 치명타 확률 +5%p · 다음 행동 2턴","available":true,"image":"/exploration/magic/sand-swallow-feather.svg"},
 {"id":"little-lotus","name":"작은 연꽃","tier":"starter","kind":"healing","mana":6,"learnPrice":380,"description":"내 상태이상 1개 해제 후 체력 12 회복","available":true,"image":"/exploration/magic/little-lotus.svg"},
 {"id":"blood-moon-drain","name":"붉은 달의 흡수","tier":"advanced","kind":"damage","mana":9,"learnPrice":850,"description":"피해 32 · 체력 10 회복","available":true,"image":"/exploration/magic/blood-moon-drain.svg"},
 {"id":"crystal-petals","name":"수정 꽃잎","tier":"advanced","kind":"buff","mana":7,"learnPrice":800,"description":"보호막 30 · 소진까지 유지 · 방어력·마저 적용 전 직접 피해 흡수","available":true,"image":"/exploration/magic/crystal-petals.svg"},
 {"id":"dune-slumber","name":"모래 잠재우기","tier":"advanced","kind":"damage-status","mana":9,"learnPrice":850,"description":"피해 20 · 확정 빙결: 행동 1회 봉쇄 · 연속 빙결 불가","available":true,"image":"/exploration/magic/dune-slumber.svg"},
 {"id":"eclipse-serpent","name":"일식의 뱀","tier":"ultimate","kind":"damage-status","mana":18,"learnPrice":2800,"description":"피해 90 · 확정 화상: 받는 치유량 80% 감소 · 3턴","available":true,"image":"/exploration/magic/eclipse-serpent.svg"},
 {"id":"phoenix-breath","name":"불사조의 숨결","tier":"ultimate","kind":"healing","mana":18,"learnPrice":2800,"description":"내 상태이상 전부 해제 후 체력 65 회복","available":true,"image":"/exploration/magic/phoenix-breath.svg"},
 {"id":"stellar-tomb-seal","name":"별무덤의 봉인","tier":"ultimate","kind":"damage-status","mana":19,"learnPrice":3000,"description":"피해 65 · 확정 약화: 공격 피해 6 감소 · 3턴 · 보호막 24 · 소진까지 유지","available":true,"image":"/exploration/magic/stellar-tomb-seal.svg"},
 {id:'sandstone-bolt',name:'사암탄',tier:'starter',kind:'damage',mana:5,learnPrice:260,description:'피해 26',available:true,image:'/exploration/magic/sandstone-bolt.svg'},
 {id:'ember-brand',name:'잿불 낙인',tier:'starter',kind:'damage-status',mana:6,learnPrice:300,description:'피해 18 · 50% 확률로 화상: 받는 치유량 40% 감소 · 2턴',available:true,image:'/exploration/magic/ember-brand.svg'},
 {id:'crimson-shards',name:'핏빛 파편',tier:'advanced',kind:'damage-status',mana:7,learnPrice:650,description:'피해 34 · 70% 확률로 출혈: 턴당 피해 3 · 3턴',available:true,image:'/exploration/magic/crimson-shards.svg'},
 {id:'binding-chain',name:'쇠약의 사슬',tier:'advanced',kind:'damage-status',mana:6,learnPrice:600,description:'피해 24 · 확정 약화: 공격 피해 4 감소 · 2턴',available:true,image:'/exploration/magic/binding-chain.svg'},
 {id:'glacial-crown',name:'빙하의 관',tier:'ultimate',kind:'damage-status',mana:17,learnPrice:2500,description:'피해 76 · 40% 확률로 빙결: 행동 1회 봉쇄',available:true,image:'/exploration/magic/glacial-crown.svg'},
 {id:'compressed-water-bolt',name:'압축 물탄',tier:'starter',kind:'damage',mana:4,learnPrice:220,description:'피해 22',available:true},
 {id:'sand-thorns',name:'모래 가시',tier:'starter',kind:'damage-status',mana:5,learnPrice:280,description:'피해 16 · 25% 확률로 실명: 빗나갈 확률 +15%p · 2턴',available:true},
 {id:'tomb-curse',name:'왕릉의 저주',tier:'advanced',kind:'debuff',mana:8,learnPrice:650,description:'확정 약화: 공격 피해 6 감소 · 3턴',available:true},
 {id:'solar-lance',name:'태양의 창',tier:'advanced',kind:'damage',mana:8,learnPrice:750,description:'피해 45',available:true},
 {id:'frost-wave',name:'서리 파동',tier:'advanced',kind:'damage-status',mana:10,learnPrice:850,description:'피해 34 · 35% 확률로 빙결: 행동 1회 봉쇄',available:true},
 {id:'oasis-breath',name:'오아시스의 숨결',tier:'advanced',kind:'healing',mana:10,learnPrice:900,description:'체력 40 회복',available:true},
 {id:'sun-god-glare',name:'태양신의 눈부심',tier:'ultimate',kind:'debuff',mana:15,learnPrice:2400,description:'확정 실명: 빗나갈 확률 +60%p · 3턴',available:true},
 {id:'sun-kings-majesty',name:'태양왕의 위엄',tier:'ultimate',kind:'buff',mana:16,learnPrice:2800,description:'공격력 +20 · 치명타 확률 +15%p · 4턴',available:true},
 {id:'judgment-of-ra',name:'라의 심판',tier:'ultimate',kind:'damage',mana:16,learnPrice:2600,description:'피해 95',available:true},
 {id:'black-sandstorm',name:'검은 모래폭풍',tier:'ultimate',kind:'damage-status',mana:18,learnPrice:3000,description:'피해 70 · 확정 실명: 빗나갈 확률 +40%p · 3턴',available:true},
].map(spell=>({...spell,tier:spell.tier as WeaponTier,kind:spell.kind as PlannedSpell['kind'],available:true as const,image:`/exploration/magic/svg-v2/${spell.id}.svg`}))

// Existing practice spells retain their current effects and availability.
export const practiceSpellLearningPrices={ember:250,tide:350,light:300,sand:400} as const

export type SpellTier=WeaponTier|'adept'
export const spellTierNames:Record<SpellTier,string>={starter:'일반',advanced:'중급',adept:'중상급',ultimate:'고급'}
export type BalancedSpell=Omit<PlannedSpell,'tier'>&{tier:SpellTier}
export const adeptSpells:BalancedSpell[]=[
 {id:'gold-dust-lance',name:'사금의 창',tier:'adept',kind:'damage',mana:11,learnPrice:1400,description:'피해 58',available:true},
 {id:'frost-chain',name:'서리 사슬',tier:'adept',kind:'damage-status',mana:12,learnPrice:1500,description:'피해 48 · 35% 확률로 빙결: 행동 1회 봉쇄 · 연속 빙결 불가',available:true},
 {id:'twilight-drain',name:'황혼의 흡수',tier:'adept',kind:'damage',mana:12,learnPrice:1500,description:'피해 44 · 체력 12 회복',available:true},
 {id:'lapis-bulwark',name:'청금석 방벽',tier:'adept',kind:'buff',mana:11,learnPrice:1200,description:'보호막 42 · 소진까지 유지 · 방어력·마저 적용 전 직접 피해 흡수',available:true},
 {id:'blooming-lotus',name:'만개한 연꽃',tier:'adept',kind:'healing',mana:13,learnPrice:1600,description:'내 상태이상 1개 해제 후 체력 48 회복',available:true},
].map(spell=>({...spell,tier:'adept',kind:spell.kind as PlannedSpell['kind'],available:true,image:`/exploration/magic/svg-v2/${spell.id}.svg`}))

/** Receipts keep their paid mana cost. Only offers for new runs use revised costs. */
export function getPlannedSpells(state?:BalanceProfile):BalancedSpell[]{
 return usesCurrentBalance(state)?[...plannedSpells.map(spell=>spell.tier==='ultimate'?{...spell,mana:spell.mana+2}:spell),...adeptSpells]:plannedSpells
}
export function spellShopTier(tier:WeaponTier,state:BalanceProfile&{market:{floor:number}}):SpellTier{
 return usesCurrentBalance(state)&&tier==='ultimate'&&state.market.floor<51?'adept':tier
}
