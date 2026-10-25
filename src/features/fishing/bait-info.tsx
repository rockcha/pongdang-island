import {appArt} from '@/components/app-art'
import {rarities,type Rarity} from '@/lib/game/rarity'
import type {FishingBait,PreparedFishing} from './api'

const targets={fish:{icon:appArt.fish,label:'물고기'},trash:{icon:appArt.trash,label:'쓰레기'},decoration:{icon:appArt.decoration,label:'장식물'}}
export function baitTargetKinds(bait:FishingBait){
 if(bait.id==='bait_shooting_star_tail')return ['fish','trash','decoration']
 return bait.target_kinds??(bait.id==='bait_grubby_magnet'?['trash']:bait.effect_kind==='decoration'?['decoration']:bait.fish_only?['fish']:['fish','trash','decoration'])
}
export function BaitTarget({bait}:{bait:FishingBait}){
 const kinds=baitTargetKinds(bait)
 const entries=bait.id==='bait_shooting_star_tail'?[{icon:appArt.trash,label:'일반 쓰레기'},{icon:appArt.all,label:'신화 전체'}]:kinds.map(kind=>targets[kind as keyof typeof targets]??{icon:appArt.all,label:kind})
 return <span className="space-y-1"><span aria-label="포획 대상" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-foreground/80">{entries.map(({icon:Icon,label})=><span key={label} className="inline-flex items-center gap-1"><Icon className="size-4"/>{label}</span>)}</span><span className="block text-[10px] leading-5 text-muted-foreground">직접 낚시는 등급 결정 후 지도 조각 3% · 유물은 희귀 3%, 특급 5%, 신화 10%로 추첨해요. 해당 등급의 미획득 후보가 없는 분류는 기존 포획물로 돌아가요.</span></span>
}
export function BaitOddsBars({bait,compact=false}:{bait:FishingBait;compact?:boolean}){
 const grades=(Object.keys(rarities) as Rarity[]).filter(key=>bait[`${key}_bp`]>0)
 const percent=(bp:number)=>`${Number((bp/100).toFixed(2))}%`
 if(compact)return <div className="space-y-1.5">
  <div aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full bg-secondary">{grades.map(key=><span key={key} style={{width:percent(bait[`${key}_bp`]),backgroundColor:rarities[key].effectColor}}/>)}</div>
  <ul aria-label="등급 확률" className="flex flex-wrap justify-between gap-x-3 gap-y-1">{grades.map(key=><li key={key} className="flex items-center gap-1 text-[10px] tabular-nums"><span aria-hidden="true" className="size-1.5 rounded-full" style={{backgroundColor:rarities[key].effectColor}}/><span className="text-muted-foreground">{rarities[key].label}</span><span className="font-medium">{percent(bait[`${key}_bp`])}</span></li>)}</ul>
 </div>
 return <div className="space-y-3">{grades.map(key=><div key={key} className="flex items-center gap-2.5 text-xs"><span className="w-14 shrink-0 text-muted-foreground">{bait.id==='bait_shooting_star_tail'&&key==='common'?'일반 쓰레기':rarities[key].label}</span><span role="meter" aria-label={`${rarities[key].label} 등급 확률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bait[`${key}_bp`]/100} aria-valuetext={percent(bait[`${key}_bp`])} className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full" style={{width:percent(bait[`${key}_bp`]),backgroundColor:rarities[key].effectColor}}/></span><span className="w-14 shrink-0 text-right font-medium tabular-nums">{percent(bait[`${key}_bp`])}</span></div>)}</div>
}
export function fishingDisplayBait(bait:FishingBait,prepared?:PreparedFishing|null):FishingBait{
 const profile=prepared?.bait_id===bait.id?prepared.bait_profile:null
 if(!profile)return bait
 const alternating=profile.effect_kind==='alternating'
 return {...bait,common_bp:alternating?(prepared?.rarity==='common'?10000:0):profile.common_bp,
  rare_bp:alternating?(prepared?.rarity==='rare'?10000:0):profile.rare_bp,
  epic_bp:profile.epic_bp,mythic_bp:profile.mythic_bp,period:profile.period??undefined,target_kinds:profile.target_kinds}
}
