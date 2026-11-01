export type AilmentKind='bleed'|'freeze'|'burn'|'weaken'|'blind'
export type EnemyAilment={kind:AilmentKind;amount:number;turns:number}
export const ailmentDefinitions={
 bleed:{name:'출혈',rule:'대상의 행동 종료마다 지속 피해를 줍니다. 방어력으로 줄일 수 없으며 전투가 끝나면 해제됩니다.'},
 freeze:{name:'빙결',rule:'남은 횟수만큼 행동 불가'},
 burn:{name:'화상',rule:'받는 치유량 감소'},
 weaken:{name:'약화',rule:'공격 피해 감소'},
 blind:{name:'실명',rule:'공격이 빗나갈 확률 증가'},
} as const
export function ailmentDescription({kind,amount,turns}:EnemyAilment){
 const detail=kind==='bleed'?`턴당 피해 ${amount}`:kind==='freeze'?'행동 불가':kind==='burn'?`치유량 ${amount}% 감소`:kind==='weaken'?`공격 피해 ${amount} 감소`:`빗나갈 확률 +${amount}%p`
 return `${ailmentDefinitions[kind].name} · ${detail} · ${turns}${kind==='freeze'?'회':'턴'} 남음`
}
