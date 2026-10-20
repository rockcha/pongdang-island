import {ArrowRight,BookOpen,ChevronDown,Fish,Info,MapPin,Repeat2,Shell,Trash2} from 'lucide-react'
import type {FishingBait} from './api'
import {rarities,type Rarity} from '@/lib/game/rarity'

export const baitPercent=(bp:number)=>`${Number((bp/100).toFixed(2))}%`

export function BaitEffectDetails({bait}:{bait:FishingBait}){
 const chance=bait.successChanceBp??bait.success_chance_bp??bait.baseSuccessChanceBp
 const grades=(Object.keys(rarities) as Rarity[]).filter(key=>bait[`${key}_bp`]>0)
 const discovery=bait.id==='bait_first_greeting',trash=bait.id==='bait_grubby_magnet',decoration=bait.effect_kind==='decoration'
 const next=bait.nextRarity
 const special=decoration?{icon:Shell,title:'장식물만 인양',text:'성공하면 장식물만 만나요.'}
  :trash?{icon:Trash2,title:'쓰레기만 포획',text:'성공하면 쓰레기만 건져요. 물고기는 나오지 않아요.'}
  :discovery?{icon:BookOpen,title:'새로운 발견',text:'성공하면 아직 발견하지 못한 개체를 만나요.'}
  :bait.id==='bait_sea_memory'?{icon:MapPin,title:'이 해역 토착종 우대',text:'등급이 정해진 뒤, 토착종 선택 가중치가 높아져요.'}:null
 const bonus=bait.successChanceBp!==undefined&&bait.baseSuccessChanceBp!==undefined?Math.max(0,bait.successChanceBp-bait.baseSuccessChanceBp):0
 return <section aria-label="미끼 효과" className="overflow-hidden rounded-2xl bg-secondary/40">
  <div className="p-4">
   <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">낚시 성공률</span><strong className="text-3xl font-semibold tracking-tight tabular-nums text-primary">{chance===undefined?'—':baitPercent(chance)}</strong></div>
   {chance!==undefined&&<><div role="progressbar" aria-label="낚시 성공률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={chance/100} className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,chance/100))}%`}}/></div><div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground"><span>성공 {baitPercent(chance)}</span><span>실패 {baitPercent(10000-chance)}</span></div></>}
  </div>

  {bait.alternating?<div className="mx-4 border-t border-primary/10 py-4">
   <h3 className="flex items-center gap-1.5 text-xs text-primary"><Repeat2 aria-hidden="true" className="size-3.5"/>사용할 때마다 등급 교대</h3>
   <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">{(['common','rare'] as const).map((grade,i)=><div key={grade} className="contents">{i===1&&<ArrowRight aria-hidden="true" className="size-4 text-primary/50"/>}<div aria-label={`${rarities[grade].label} 전용${next===grade?' · 다음 차례':''}`} className={`rounded-xl border px-2 py-2.5 text-center ${next===grade?'border-primary/50 bg-primary/10':'border-primary/10 bg-background/60'}`}><span className={`block text-[10px] ${next===grade?'text-primary':'text-muted-foreground'}`}>{next===grade?'다음 차례':next?'그다음':'교대'}</span><strong className="mt-1 block text-sm font-semibold text-foreground">{rarities[grade].label} 전용</strong><span className="mt-1 block text-[10px] text-muted-foreground">성공 시 100%</span></div></div>)}</div>
   <p className="mt-2.5 text-[11px] leading-5 text-muted-foreground">일반과 희귀가 번갈아 나와요. 실패해도 다음 차례로 넘어가요.</p>
  </div>:special?<div className="mx-4 border-t border-primary/10 py-4"><h3 className="flex items-center gap-1.5 text-xs text-primary"><special.icon aria-hidden="true" className="size-3.5"/>{special.title}</h3><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{special.text}</p></div>:null}

  {!bait.alternating&&!decoration&&!trash&&!discovery&&grades.length>0&&<div className="mx-4 border-t border-primary/10 py-4">
   <h3 className="text-xs text-muted-foreground">잡혔을 때 등급</h3>
   <div className="mt-3 grid gap-1.5" style={{gridTemplateColumns:`repeat(${grades.length},minmax(0,1fr))`}}>{grades.map(key=><div key={key} className="min-w-0 rounded-xl bg-background/80 px-1 py-2.5 text-center"><span className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><span aria-hidden="true" className="size-1.5 rounded-full" style={{backgroundColor:rarities[key].effectColor}}/>{rarities[key].label}</span><strong className="mt-1 block text-sm font-semibold tabular-nums text-foreground">{baitPercent(bait[`${key}_bp`])}</strong></div>)}</div>
   {bait.fish_only&&<p className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Fish aria-hidden="true" className="size-3"/>물고기 전용 · 쓰레기·장식물 제외</p>}
  </div>}

  <div className="border-t border-primary/10 px-4 py-3">
   <p className="text-[10px] leading-5 text-muted-foreground">직접 낚시는 게이지 조작 성공도 필요해요.</p>
   <details className="group mt-1"><summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-1 rounded text-[10px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"><Info aria-hidden="true" className="size-3"/>자세히 알아보기<ChevronDown aria-hidden="true" className="size-3 transition-transform group-open:rotate-180"/></summary><div className="space-y-1 pb-1 text-[11px] leading-5 text-muted-foreground">
    <p>성공률은 포획 판정 확률이에요. 직접 낚시에서 조작에 실패하거나 취소하면 잡지 못해요.</p>
    {bait.fish_only&&<p>물고기만 포획해요. 성공률은 고정이며 낚싯대·통발 성공률 보너스는 적용되지 않아요.</p>}
    {bonus>0&&<p>현재 성공률에 낚싯대 보너스 +{baitPercent(bonus)}p가 반영됐어요.</p>}
    {bait.alternating&&<><p>재접속하거나 미끼를 바꿔도 다음 순서는 유지돼요.</p><p>통발은 회수 시 각 추첨마다 순서가 진행돼요. 실패한 추첨도 포함해요.</p>{!next&&<p>다음 차례를 불러오는 중이에요.</p>}</>}
    {discovery&&<p>모두 발견했다면 직접 낚시에서는 미끼를 소모하지 않아요. 등급은 남은 미발견 개체에 따라 달라져요.</p>}
    {trash&&<p>추첨한 등급의 쓰레기가 없으면 다른 등급의 쓰레기가 선택될 수 있어요.</p>}
    {!bait.alternating&&!decoration&&!trash&&!discovery&&<p>등급별 확률은 포획에 성공한 경우를 기준으로 표시해요.</p>}
   </div></details>
  </div>
 </section>
}
