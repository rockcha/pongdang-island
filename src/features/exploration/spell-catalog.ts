import type {WeaponTier} from './weapon-catalog'

// Learning costs are paid once per learned spell, not per cast. Random offerings
// should reference these IDs and prices rather than duplicating price tables.
export type PlannedSpell={id:string;name:string;tier:WeaponTier;kind:'damage'|'damage-status'|'debuff'|'buff'|'healing'|'cleanse';mana:number;learnPrice:number;description:string;available:true;image?:string}
export const plannedSpells:PlannedSpell[]=[
 {id:'sandstone-bolt',name:'사암탄',tier:'starter',kind:'damage',mana:5,learnPrice:260,description:'피해 26',available:true,image:'/exploration/magic/sandstone-bolt.svg'},
 {id:'ember-brand',name:'잿불 낙인',tier:'starter',kind:'damage-status',mana:6,learnPrice:300,description:'피해 18 · 50% 확률로 화상: 받는 치유량 40% 감소 · 2턴',available:true,image:'/exploration/magic/ember-brand.svg'},
 {id:'crimson-shards',name:'핏빛 파편',tier:'advanced',kind:'damage-status',mana:7,learnPrice:650,description:'피해 34 · 70% 확률로 출혈: 턴당 피해 3 · 3턴',available:true,image:'/exploration/magic/crimson-shards.svg'},
 {id:'binding-chain',name:'쇠약의 사슬',tier:'advanced',kind:'damage-status',mana:6,learnPrice:600,description:'피해 24 · 확정 약화: 공격 피해 4 감소 · 2턴',available:true,image:'/exploration/magic/binding-chain.svg'},
 {id:'glacial-crown',name:'빙하의 관',tier:'ultimate',kind:'damage-status',mana:17,learnPrice:2500,description:'피해 76 · 40% 확률로 빙결: 행동 1회 봉쇄',available:true,image:'/exploration/magic/glacial-crown.svg'},
 {id:'compressed-water-bolt',name:'압축 물탄',tier:'starter',kind:'damage',mana:4,learnPrice:220,description:'피해 22',available:true},
 {id:'sand-thorns',name:'모래 가시',tier:'starter',kind:'damage-status',mana:5,learnPrice:280,description:'피해 16 · 25% 확률로 실명: 빗나갈 확률 +15%p · 2턴',available:true},
 {id:'tomb-curse',name:'왕릉의 저주',tier:'advanced',kind:'debuff',mana:8,learnPrice:650,description:'확정 약화: 공격 피해 6 감소 · 3턴',available:true},
 {id:'bronze-ward',name:'청동 수호진',tier:'advanced',kind:'buff',mana:8,learnPrice:700,description:'공격 피해 25 흡수 보호막 · 최대 3턴',available:true},
 {id:'solar-lance',name:'태양의 창',tier:'advanced',kind:'damage',mana:8,learnPrice:750,description:'피해 50',available:true},
 {id:'frost-wave',name:'서리 파동',tier:'advanced',kind:'damage-status',mana:10,learnPrice:850,description:'피해 34 · 35% 확률로 빙결: 행동 1회 봉쇄',available:true},
 {id:'oasis-breath',name:'오아시스의 숨결',tier:'advanced',kind:'healing',mana:10,learnPrice:900,description:'체력 40 회복',available:true},
 {id:'purifying-spring',name:'정화의 샘',tier:'advanced',kind:'cleanse',mana:7,learnPrice:650,description:'내 상태이상 전부 해제',available:true},
 {id:'sun-god-glare',name:'태양신의 눈부심',tier:'ultimate',kind:'debuff',mana:15,learnPrice:2400,description:'확정 실명: 빗나갈 확률 +60%p · 3턴',available:true},
 {id:'sun-kings-majesty',name:'태양왕의 위엄',tier:'ultimate',kind:'buff',mana:16,learnPrice:2800,description:'공격력 +20 · 치명타 확률 +15%p · 4턴',available:true},
 {id:'judgment-of-ra',name:'라의 심판',tier:'ultimate',kind:'damage',mana:16,learnPrice:2600,description:'피해 110',available:true},
 {id:'black-sandstorm',name:'검은 모래폭풍',tier:'ultimate',kind:'damage-status',mana:18,learnPrice:3000,description:'피해 80 · 확정 실명: 빗나갈 확률 +40%p · 3턴',available:true},
].map(spell=>({...spell,tier:spell.tier as WeaponTier,kind:spell.kind as PlannedSpell['kind'],available:true as const,image:spell.image??`/exploration/magic/${spell.id}.png`}))

// Existing practice spells retain their current effects and availability.
export const practiceSpellLearningPrices={ember:250,tide:350,light:300,sand:400} as const
