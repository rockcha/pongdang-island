import {Clock1,Clock3,Clock6,Clock9,Clock12,Hourglass} from 'lucide-react'
import {rarities,type Rarity} from '@/lib/game/rarity'
import type {FishingBait,PreparedFishing} from './api'
import {baitDurationLevel} from './bait-wait-flavor'

const waits={
 '낮음':{icon:Clock1,color:'border-emerald-200/70 bg-emerald-50 text-emerald-700'},
 '약간 낮음':{icon:Clock3,color:'border-emerald-200/70 bg-emerald-50 text-emerald-700'},
 '보통':{icon:Clock6,color:'border-sky-200/70 bg-sky-50 text-sky-700'},
 '약간 높음':{icon:Clock9,color:'border-amber-200/70 bg-amber-50 text-amber-800'},
 '높음':{icon:Clock12,color:'border-orange-200/70 bg-orange-50 text-orange-800'},
 '매우 높음':{icon:Hourglass,color:'border-violet-200/70 bg-violet-50 text-violet-700'},
}
export function BaitWaitTag({bait,iconOnly=false}:{bait:Pick<FishingBait,'id'|'period'>;iconOnly?:boolean}){
 const label=baitDurationLevel(bait.id,bait.period),style=waits[label as keyof typeof waits]??waits['보통'],Icon=style.icon
 return <span aria-label={`기다림 ${label}`} title={`기다림: ${label}`} className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-4 ${style.color}`}><Icon aria-hidden="true" className="size-3"/>{!iconOnly&&label}</span>
}
export function baitTargetText(bait:FishingBait){
 if(bait.id==='bait_shooting_star_tail')return '일반 쓰레기 · 신화 전체'
 const names:Record<string,string>={fish:'물고기',trash:'쓰레기',decoration:'장식물'}
 const kinds=bait.target_kinds??(bait.id==='bait_grubby_magnet'?['trash']:bait.effect_kind==='decoration'?['decoration']:bait.fish_only?['fish']:['fish','trash'])
 return kinds.map(kind=>names[kind]??kind).join(' · ')
}
export function BaitTarget({bait}:{bait:FishingBait}){
 return <p className="text-[11px] leading-5 text-muted-foreground"><span>대상: </span><span className="text-foreground/80">{baitTargetText(bait)}</span></p>
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
