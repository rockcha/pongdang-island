import {appArt} from '@/components/app-art'
import {rarities,type Rarity} from '@/lib/game/rarity'
import type {FishingBait,PreparedFishing} from './api'

const targets={fish:{icon:appArt.fish,label:'물고기'},trash:{icon:appArt.trash,label:'쓰레기'},decoration:{icon:appArt.decoration,label:'장식물'}}
export const isPetFishingBait=(bait:FishingBait):bait is FishingBait & {pet_bp:number}=>Number.isFinite(bait.pet_bp)&&(bait.pet_bp??0)>0
export function baitTargetKinds(bait:FishingBait){
 if(bait.id==='bait_shooting_star_tail')return ['fish','trash','decoration']
 return bait.target_kinds??(bait.id==='bait_grubby_magnet'?['trash']:bait.effect_kind==='decoration'?['decoration']:bait.fish_only?['fish']:['fish','trash','decoration'])
}
export function BaitTarget({bait}:{bait:FishingBait}){
 if(bait.pet_bp)return <span aria-label="포획 대상" className="text-[11px] text-primary">펫 · 물고기 · 쓰레기 · 장식물</span>
 const kinds=baitTargetKinds(bait)
 const entries=bait.id==='bait_shooting_star_tail'?[{icon:appArt.trash,label:'일반 쓰레기'},{icon:appArt.all,label:'신화 전체'}]:kinds.map(kind=>targets[kind as keyof typeof targets]??{icon:appArt.all,label:kind})
 return <span aria-label="포획 대상" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-foreground/80">{entries.map(({icon:Icon,label})=><span key={label} className="inline-flex items-center gap-1"><Icon className="size-4"/>{label}</span>)}</span>
}
export function BaitOddsBars({bait,compact=false}:{bait:FishingBait;compact?:boolean}){
 if(isPetFishingBait(bait))return <div className="space-y-3">
  {[{label:'펫',bp:bait.pet_bp,color:'#db8fa9'},...(['common','rare','epic','mythic'] as Rarity[]).map(key=>({label:rarities[key].label,bp:bait[`${key}_bp`],color:rarities[key].effectColor}))].filter(g=>g.bp>0).map(g=><div key={g.label} className="flex items-center gap-2.5 text-xs"><span className="w-10 shrink-0 text-muted-foreground">{g.label}</span><span role="meter" aria-label={`${g.label} 등급 확률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.bp/100} className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full" style={{width:`${g.bp/100}%`,backgroundColor:g.color}}/></span><span className="w-12 shrink-0 text-right font-medium tabular-nums">{g.bp/100}%</span></div>)}
  <p className="text-[10px] leading-5 text-muted-foreground">전 해역에서 같은 확률 · 펫 14종은 동일한 확률로 만나요. 낚시 조작에 성공해야 획득해요.</p>
 </div>
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
 return {...bait,pet_bp:profile.pet_bp??bait.pet_bp,common_bp:alternating?(prepared?.rarity==='common'?10000:0):profile.common_bp,
  rare_bp:alternating?(prepared?.rarity==='rare'?10000:0):profile.rare_bp,
  epic_bp:profile.epic_bp,mythic_bp:profile.mythic_bp,period:profile.period??undefined,target_kinds:profile.target_kinds}
}
