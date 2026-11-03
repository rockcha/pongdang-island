export type Rarity='common'|'rare'|'epic'|'mythic'
export type Stats={hp:number;attack:number;critical:number;magic:number;defense:number;resistance:number;evasion:number}
export type StatusKind='attack-up'|'defense-up'|'resistance-up'|'evasion-up'|'damage-down'|'magic-up'|'burn'|'corrosion'|'weaken'|'vulnerable'|'blind'|'silence'|'root'|'revive'|'undying'
export type Status={kind:StatusKind;amount:number;turns:number;stacks?:number}
export type Glyph='round'|'headbutt'|'splash'|'breath'|'spiral'|'spiral-water'|'tentacle'|'shell'|'fin'|'bite'|'dash'|'wave'|'scale'|'bubble'|'sunwave'|'lotus'
export type Ability={id:string;name:string;description:string;glyph:Glyph;cooldown:number;damage?:'physical'|'magic';power?:number;targetStatus?:Status;selfStatus?:Status;heal?:number;shield?:number;cleanse?:number;penetration?:number;breakShield?:boolean;execute?:number;lifesteal?:number}
export type ProjectileSkill=Ability&{delivery:'projectile';damage:'physical'|'magic';power:number}
export type CompanionDefinition={id:string;name:string;role:string;rarity:Rarity;image:string;color:string;stats:Stats;passive:{id:'round'|'spiral'|'current'|'apricot';name:string;description:string;glyph:Glyph};basic:Ability;skills:[ProjectileSkill]}
export const trainingChances:Record<Rarity,number>={common:50,rare:30,epic:15,mythic:5}
export const trainingRarityNames:Record<Rarity,string>={common:'일반',rare:'희귀',epic:'특급',mythic:'신화'}
export const TRAINING_MAX_LEVEL=10
export const TRAINING_XP=30
export const companions:CompanionDefinition[]=[
 {id:'round-triassurus',name:'동글이 트리아수루스',role:'보호막으로 버티는 동료',rarity:'common',image:'fish/normal/round-triassurus_thumbnail.png',color:'#b38a53',stats:{hp:150,attack:20,critical:5,magic:12,defense:12,resistance:8,evasion:3},
  passive:{id:'round',name:'둥글게 버티기',description:'전투 중 처음 체력 50% 이하가 되면 최대 체력 15%의 보호막 · 전투당 1회',glyph:'round'},
  basic:{id:'round-basic',name:'통통 박치기',description:'공격력 100%의 물리 피해',glyph:'headbutt',cooldown:0,damage:'physical',power:100},
  skills:[{delivery:'projectile',id:'splash-charge',name:'물장구 탄',description:'물방울 발사 · 공격력 140% 물리 피해 · 약화 20%, 2턴',glyph:'splash',cooldown:3,damage:'physical',power:140,targetStatus:{kind:'weaken',amount:20,turns:2}}]},
 {id:'bronze-spiral-ammonite',name:'청동나선 암모나이트',role:'보호막으로 지키는 동료',rarity:'common',image:'fish/normal/bronze-spiral-ammonite_thumbnail.png',color:'#9d8958',stats:{hp:170,attack:14,critical:5,magic:22,defense:16,resistance:14,evasion:2},
  passive:{id:'spiral',name:'단단한 나선',description:'보호막이 있는 동안 받는 피해 10% 감소',glyph:'spiral'},
  basic:{id:'tentacle-tap',name:'촉수 톡톡',description:'공격력 100%의 물리 피해',glyph:'tentacle',cooldown:0,damage:'physical',power:100},
  skills:[{delivery:'projectile',id:'spiral-current',name:'나선 물살',description:'나선 물살 발사 · 마력 150% 마법 피해 · 부식 25%, 2턴 · 최대 체력 20% 보호막',glyph:'spiral-water',cooldown:3,damage:'magic',power:150,shield:20,targetStatus:{kind:'corrosion',amount:25,turns:2}}]},
 {id:'blueback-spanish-mackerel',name:'푸른등 삼치',role:'관통과 치명타의 공격수',rarity:'common',image:'fish/normal/blueback-spanish-mackerel_thumbnail.png',color:'#678eac',stats:{hp:110,attack:30,critical:15,magic:10,defense:5,resistance:5,evasion:10},
  passive:{id:'current',name:'푸른 급류',description:'기본 공격 적중 시 치명타율 +5%p, 2턴 · 최대 2중첩',glyph:'fin'},
  basic:{id:'swift-bite',name:'날쌘 물어뜯기',description:'공격력 100%의 물리 피해',glyph:'bite',cooldown:0,damage:'physical',power:100},
  skills:[{delivery:'projectile',id:'silver-dash',name:'은빛 물살칼',description:'물살칼 발사 · 공격력 160% 물리 피해 · 방어력 30% 관통',glyph:'dash',cooldown:3,damage:'physical',power:160,penetration:30}]},
 {id:'coral-apricot-chromis',name:'살구점 크로미스',role:'실명을 거는 마법 동료',rarity:'common',image:'fish/normal/coral-apricot-chromis_v1_thumbnail.png',color:'#cc8f91',stats:{hp:120,attack:14,critical:5,magic:30,defense:7,resistance:12,evasion:7},
  passive:{id:'apricot',name:'살구빛 물비늘',description:'스킬 사용 후 최대 체력 5%의 보호막',glyph:'scale'},
  basic:{id:'shimmer-bubble',name:'반짝 물방울',description:'마력 80%의 마법 피해',glyph:'bubble',cooldown:0,damage:'magic',power:80},
  skills:[{delivery:'projectile',id:'apricot-wave',name:'살구빛 파동',description:'빛의 구슬 발사 · 마력 150% 마법 피해 · 실명 20%, 2턴',glyph:'sunwave',cooldown:3,damage:'magic',power:150,targetStatus:{kind:'blind',amount:20,turns:2}}]},
]
export function companionDefinition(id:string){return companions.find(unit=>unit.id===id)!}
export function xpForLevel(level:number){return 20+10*(level-1)}
export function statsAtLevel(definition:CompanionDefinition,level:number):Stats{
 const steps=Math.max(0,Math.min(TRAINING_MAX_LEVEL,level)-1),s=definition.stats
 return {hp:Math.round(s.hp*(1+.05*steps)),attack:Math.round(s.attack*(1+.03*steps)),magic:Math.round(s.magic*(1+.03*steps)),defense:Math.round(s.defense*(1+.02*steps)),resistance:Math.round(s.resistance*(1+.02*steps)),critical:Math.min(40,Number((s.critical+.2*steps).toFixed(1))),evasion:Math.min(25,Number((s.evasion+.1*steps).toFixed(1)))}
}
export const statusNames:Record<StatusKind,string>={'attack-up':'공격강화','defense-up':'방어강화','resistance-up':'마저강화','evasion-up':'회피강화','damage-down':'피해 감소','magic-up':'마력강화',burn:'화상',corrosion:'부식',weaken:'약화',vulnerable:'취약',blind:'실명',silence:'침묵',root:'봉쇄',revive:'부활',undying:'불사'}
export const statusDescriptions:Record<StatusKind,string>={'attack-up':'공격력 증가','defense-up':'방어력 증가','resistance-up':'마법저항력 증가','evasion-up':'회피율 증가','damage-down':'받는 피해 감소','magic-up':'마력 증가',burn:'받는 치유량 감소 · 지속 피해 없음',corrosion:'물리 방어력 감소',weaken:'공격력 감소',vulnerable:'받는 피해 증가',blind:'명중률 감소',silence:'스킬 사용 불가 · 기본 공격 가능',root:'이동 불가 · 공격과 스킬 사용 가능',revive:'사망 시 지정 체력으로 한 번 부활',undying:'지속시간 동안 지정 체력 이상으로 생존'}
export const debuffs:StatusKind[]=['burn','corrosion','weaken','vulnerable','blind','silence','root']
