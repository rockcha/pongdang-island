import {ArrowRight,BookOpen,Fish,MapPin,Repeat2,Shell,Trash2} from 'lucide-react'
import type {FishingBait} from './api'
import {rarities,type Rarity} from '@/lib/game/rarity'
import {baitWaitFlavor} from './bait-wait-flavor'
import {BaitOddsBars} from './bait-info'

export const baitPercent=(bp:number)=>`${Number((bp/100).toFixed(2))}%`

export function BaitEffectDetails({bait,compact=false}:{bait:FishingBait;compact?:boolean}){
 if(bait.mechanicsVersion===2)return <section aria-label="미끼 효과" className="min-w-0 space-y-3">
  <p className="text-xs leading-6 text-foreground/80">{baitWaitFlavor(bait.id)}</p>
  <div className="rounded-xl border border-border/60 px-3 py-3">
   <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-medium">등급 확률</h3>{bait.period&&<span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">현재 {bait.period==='night'?'밤':'낮'} 기준</span>}{bait.alternating&&<span className="text-[10px] text-primary">다음 {bait.nextRarity==='rare'?'희귀':'일반'}</span>}</div>
   <BaitOddsBars bait={bait}/>
   {bait.alternating&&<p className="mt-3 text-[10px] leading-5 text-muted-foreground">사용할 때마다 일반·희귀가 교대하며, 다음 순서는 유지돼요.</p>}
   {bait.id==='bait_first_greeting'&&<p className="mt-3 text-[10px] leading-5 text-muted-foreground">남은 미발견 개체에 따라 실제 등급 비율이 달라질 수 있어요. 모두 발견했다면 미끼를 소모하지 않아요.</p>}
   {bait.id==='bait_grubby_magnet'&&<p className="mt-3 text-[10px] leading-5 text-muted-foreground">해당 등급에 쓰레기가 없으면 다른 등급의 쓰레기를 만나요.</p>}
  </div>
 </section>
 const chance=bait.successChanceBp??bait.success_chance_bp??bait.baseSuccessChanceBp
 const grades=(Object.keys(rarities) as Rarity[]).filter(key=>bait[`${key}_bp`]>0)
 const discovery=bait.id==='bait_first_greeting',trash=bait.id==='bait_grubby_magnet',decoration=bait.effect_kind==='decoration'
 const next=bait.nextRarity
 const tail=bait.id==='bait_shooting_star_tail'
 const special=decoration?{icon:Shell,title:'장식물만 인양',text:'등급을 먼저 추첨한 뒤 해당 등급의 장식물을 인양해요.'}
  :trash?{icon:Trash2,title:'쓰레기만 포획',text:'성공하면 쓰레기만 건져요. 물고기는 나오지 않아요.'}
  :discovery?{icon:BookOpen,title:'새로운 발견',text:'성공하면 아직 발견하지 못한 개체를 만나요.'}
  :bait.id==='bait_sea_memory'?{icon:MapPin,title:'이 해역 토착종 우대',text:'등급이 정해진 뒤, 토착종 선택 가중치가 높아져요.'}
  :bait.id==='bait_snowflake_salt'?{icon:MapPin,title:'공통종만 포획',text:'희귀·특급에 집중해 공통종 물고기·쓰레기·장식물을 만나요. 토착종·외지종은 제외해요.'}
  :tail?{icon:Trash2,title:'쓰레기 속 신화의 기회',text:`성공 시 일반 쓰레기 ${baitPercent(bait.common_bp)} · 신화 등급 개체 ${baitPercent(bait.mythic_bp)}예요. 신화는 물고기·쓰레기·장식물 중에서 포획해요.`}:null
 const bonus=bait.successChanceBp!==undefined&&bait.baseSuccessChanceBp!==undefined?Math.max(0,bait.successChanceBp-bait.baseSuccessChanceBp):0
 return <section aria-label="미끼 효과" className={compact?"min-w-0 space-y-3":"min-w-0 space-y-5 py-1"}>
  {compact&&bait.description&&<p className="rounded-xl border border-primary/10 bg-secondary/30 px-3 py-2.5 text-xs leading-6 text-foreground/80">{bait.description}</p>}
  {!compact&&<div>
   <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">낚시 성공률</span><strong className="text-xl font-semibold tabular-nums text-primary">{chance===undefined?'—':baitPercent(chance)}</strong></div>
  </div>}

  {bait.alternating?compact?<p className="text-xs leading-5 text-muted-foreground">일반 · 희귀가 번갈아 나와요.{next&&<span className="ml-1 text-primary">다음: {next==='rare'?'희귀':'일반'} 전용</span>}</p>:<div>
   <h3 className="flex items-center gap-1.5 text-xs text-primary"><Repeat2 aria-hidden="true" className="size-3.5"/>사용할 때마다 등급 교대</h3>
   <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">{(['common','rare'] as const).map((grade,i)=><div key={grade} className="contents">{i===1&&<ArrowRight aria-hidden="true" className="size-4 text-primary/50"/>}<div aria-label={`${rarities[grade].label} 전용${next===grade?' · 다음 차례':''}`} className={`rounded-xl border px-2 py-2.5 text-center ${next===grade?'border-primary/50 bg-primary/10':'border-primary/10 bg-background/60'}`}><span className={`block text-[10px] ${next===grade?'text-primary':'text-muted-foreground'}`}>{next===grade?'다음 차례':next?'그다음':'교대'}</span><strong className="mt-1 block text-sm font-semibold text-foreground">{rarities[grade].label} 전용</strong><span className="mt-1 block text-[10px] text-muted-foreground">성공 시 100%</span></div></div>)}</div>
   <p className="mt-2.5 text-[11px] leading-5 text-muted-foreground">일반과 희귀가 번갈아 나와요. 실패해도 다음 차례로 넘어가요.</p>
  </div>:!compact&&special?<div><h3 className="flex items-center gap-1.5 text-xs text-primary"><special.icon aria-hidden="true" className="size-3.5"/>{special.title}</h3><p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{special.text}</p></div>:null}

  {!bait.alternating&&!trash&&!discovery&&grades.length>0&&<div>
   <h3 className="text-xs text-muted-foreground">성공 시 등급 확률</h3>
   <div className={compact?"mt-2 grid grid-cols-2 gap-x-5 gap-y-2":"mt-3 grid divide-x divide-border/60"} style={compact?undefined:{gridTemplateColumns:`repeat(${grades.length},minmax(0,1fr))`}}>{grades.map(key=><div key={key} className={compact?"flex min-w-0 items-center justify-between gap-2":"min-w-0 px-1 text-center"}><span className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><span aria-hidden="true" className="size-1.5 rounded-full" style={{backgroundColor:rarities[key].effectColor}}/>{tail&&key==='common'?'일반 쓰레기':tail&&key==='mythic'?'신화 등급':rarities[key].label}</span><strong className={compact?"text-xs font-medium tabular-nums text-foreground":"mt-1 block text-base font-medium tabular-nums text-foreground"}>{baitPercent(bait[`${key}_bp`])}</strong></div>)}</div>
   {bait.fish_only&&!compact&&<p className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Fish aria-hidden="true" className="size-3"/>물고기 전용 · 쓰레기·장식물 제외</p>}
  </div>}

  {compact&&(special||bait.fish_only)&&<p className="text-xs leading-5 text-muted-foreground">{special?.text??'물고기만 포획해요. 쓰레기·장식물은 제외해요.'}</p>}
  <div className={compact?"":"border-t border-border/60 pt-2"}>
   {!compact&&<p className="text-[10px] leading-5 text-muted-foreground">직접 낚시는 게이지 조작 성공도 필요해요.</p>}
   <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-3"><div className="space-y-2 text-[11px] leading-5 text-muted-foreground">
    <p>성공률은 포획 판정 확률이에요. 직접 낚시에서 조작에 실패하거나 취소하면 잡지 못해요.</p>
    {bait.fish_only&&<p>물고기만 포획해요. 성공률은 고정이며 낚싯대·통발 성공률 보너스는 적용되지 않아요.</p>}
    {bonus>0&&<p>현재 성공률에 낚싯대 보너스 +{baitPercent(bonus)}p가 반영됐어요.</p>}
    {bait.alternating&&<><p>재접속하거나 미끼를 바꿔도 다음 순서는 유지돼요.</p><p>통발은 회수 시 각 추첨마다 순서가 진행돼요. 실패한 추첨도 포함해요.</p>{!next&&<p>다음 차례를 불러오는 중이에요.</p>}</>}
    {discovery&&<p>모두 발견했다면 직접 낚시에서는 미끼를 소모하지 않아요. 등급은 남은 미발견 개체에 따라 달라져요.</p>}
    {trash&&<p>추첨한 등급의 쓰레기가 없으면 다른 등급의 쓰레기가 선택될 수 있어요.</p>}
    {!bait.alternating&&!trash&&!discovery&&<p>등급별 확률은 포획에 성공한 경우를 기준으로 표시해요.</p>}
   </div></div>
  </div>
 </section>
}
