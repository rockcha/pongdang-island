import type {FishingBait} from './api'
import {fishingBaitEffect} from './bait-effects'
import {rarities,type Rarity} from '@/lib/game/rarity'

export const baitPercent=(bp:number)=>`${Number((bp/100).toFixed(2))}%`

export function BaitEffectDetails({bait}:{bait:FishingBait}){
 const chance=bait.successChanceBp??bait.success_chance_bp??bait.baseSuccessChanceBp
 const grades=(Object.keys(rarities) as Rarity[]).filter(key=>bait[`${key}_bp`]>0)
 return <section aria-label="미끼 효과" className="space-y-3 rounded-xl bg-secondary/40 p-4">
  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">낚시 성공률</span><strong className="font-semibold tabular-nums text-primary">{chance===undefined?'확인 중':baitPercent(chance)}</strong></div>
  <p className="text-sm leading-6 text-primary">{fishingBaitEffect(bait.id,bait.effect_description)}</p>
  {bait.alternating?<div className="flex items-center justify-between border-t border-primary/10 pt-3 text-xs"><span className="text-muted-foreground">다음 사용 순서</span><strong className="font-medium text-primary">{bait.nextRarity==='rare'?'희귀':'일반'} 물고기 100%</strong></div>:bait.effect_kind!=='decoration'&&grades.length>0&&<div className="border-t border-primary/10 pt-3"><p className="mb-2 text-[11px] text-muted-foreground">성공했을 때의 등급 확률</p><div className="flex flex-wrap gap-2">{grades.map(key=><span key={key} className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs"><span aria-hidden="true" className="size-1.5 rounded-full" style={{backgroundColor:rarities[key].effectColor}}/>{rarities[key].label} <strong className="font-medium tabular-nums">{baitPercent(bait[`${key}_bp`])}</strong></span>)}</div></div>}
  {bait.fish_only&&<p className="text-[11px] leading-5 text-muted-foreground">물고기 전용 · 쓰레기·장식물 제외<br/>성공률 고정 · 낚싯대·통발 성공률 보너스 미적용</p>}
  <p className="text-[11px] leading-5 text-muted-foreground">직접 낚시에서는 성공 판정 후에도 게이지 조작을 마쳐야 잡을 수 있어요.</p>
 </section>
}
