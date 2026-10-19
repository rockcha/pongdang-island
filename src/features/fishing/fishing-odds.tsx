import {ChevronRight} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog'
import {rarities,type Rarity} from '@/lib/game/rarity'
import {fishingBaitEffect} from './bait-effects'
import type {FishingBait} from './api'
import type {FishingRod} from './fishing-rods'

export function FishingOdds({bait,successChanceBp,rod,baseChanceBp=3500}:{bait?:FishingBait;successChanceBp?:number;rod?:FishingRod;baseChanceBp?:number}){
 const chance=bait?.successChanceBp??bait?.baseSuccessChanceBp??(bait?.id==='bait'?successChanceBp:undefined)
 const keys=Object.keys(rarities) as Rarity[]
 const total=bait?keys.reduce((sum,key)=>sum+bait[`${key}_bp`],0):0
 const percent=(value:number)=>`${Number(value.toFixed(2))}%`
 const bonus=bait?.successChanceBp!==undefined&&bait.baseSuccessChanceBp!==undefined?Math.max(0,bait.successChanceBp-bait.baseSuccessChanceBp):undefined
 const baseRarity:Record<Rarity,number>={common:77,rare:20,epic:2.7,mythic:.3}
 const difference=(value:number)=>`${value>0?'+':''}${Number(value.toFixed(2))}%p`
 return <Dialog>
  <DialogTrigger render={<Button variant="ghost" className="min-h-11 w-full justify-between rounded-none border-b border-border/70 bg-background px-4 text-xs text-muted-foreground"/>}><span className="flex items-center gap-2"><appArt.rod className="size-6"/>확률은 어떻게 될까요?</span><ChevronRight aria-hidden="true" className="size-4"/></DialogTrigger>
  <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm flex-col gap-0 overflow-hidden rounded-2xl p-0">
   <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5 pr-12"><DialogTitle className="flex items-center gap-2 text-base font-normal"><appArt.rod className="size-7"/>낚시 확률 안내</DialogTitle><DialogDescription className="text-xs leading-5">미끼·낚싯대·해역에 따라 만나는 친구가 달라져요.</DialogDescription></DialogHeader>
   <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 text-xs leading-6">
    <section aria-label="현재 장비 적용 효과" className="space-y-2 rounded-xl border border-primary/15 bg-secondary/25 p-3">
     <div className="flex items-center gap-2"><appArt.bait className="size-7 shrink-0"/><span className="min-w-0 flex-1">{bait?.name??'미끼 선택 전'}</span>{bait?.baseSuccessChanceBp!==undefined&&<span className="shrink-0 rounded bg-background px-2 text-[11px] tabular-nums text-primary">성공률 {difference((bait.baseSuccessChanceBp-baseChanceBp)/100)}</span>}</div>
     <div className="flex items-center gap-2 border-t border-primary/10 pt-2"><appArt.rod className="size-7 shrink-0"/><div className="min-w-0 flex-1"><p>{rod?.name??'낚싯대 확인 중'}</p>{rod&&<p className="text-[10px] leading-5 text-muted-foreground">{rod.effect}</p>}</div>{bonus!==undefined&&<span className="shrink-0 rounded bg-background px-2 text-[11px] tabular-nums text-primary">성공률 {difference(bonus/100)}</span>}</div>
     {rod?.region&&<p className="text-[10px] leading-5 text-primary">토착종 선택 가중치 상승 적용 · 등급 확률은 유지</p>}
    </section>
    <section aria-label="낚시 성공 확률"><div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/40 p-3 text-center"><div><p className="text-[10px] text-muted-foreground">기본 성공률 · 지렁이</p><p className="text-xl tabular-nums text-primary">{percent(baseChanceBp/100)}</p></div><div className="border-l"><p className="text-[10px] text-muted-foreground">현재 적용 성공률</p><p className="text-xl tabular-nums text-primary">{chance===undefined?'—':percent(chance/100)}</p></div></div><p className="mt-2 text-[11px] text-muted-foreground">성공 판정에 통과해도 낚시 게이지 조작을 마쳐야 잡을 수 있어요.</p></section>
    <section aria-label="등급별 확률"><h2 className="mb-2 text-sm">성공 시 등급 확률</h2><p className="mb-2 text-[10px] text-muted-foreground">오른쪽 변화량은 기본 지렁이 대비예요. %p는 퍼센트포인트를 뜻해요.</p><p className="mb-2 text-[11px] text-muted-foreground">{bait?.name??'미끼 정보를 확인하는 중…'} 기준</p>{total>0?<ul className="space-y-2">{keys.map(key=><li key={key} className="flex items-center gap-2"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{backgroundColor:rarities[key].effectColor}}/><span className="w-8">{rarities[key].label}</span><span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full" style={{width:percent(bait![`${key}_bp`]/total*100),backgroundColor:rarities[key].effectColor}}/></span><span className="w-14 shrink-0 text-right tabular-nums">{percent(bait![`${key}_bp`]/total*100)}</span><span aria-label={`${rarities[key].label} 기본 대비 변화`} className={`w-16 shrink-0 text-right text-[10px] tabular-nums ${bait![`${key}_bp`]/total*100>baseRarity[key]?'font-medium text-primary':'text-muted-foreground'}`}>{difference(bait![`${key}_bp`]/total*100-baseRarity[key])}</span></li>)}</ul>:<p className="rounded-lg bg-secondary/30 p-3 text-muted-foreground">{bait?.effect_kind==='decoration'?'장식물 전용 미끼예요. 물고기 등급 확률은 적용되지 않아요.':'확률 정보를 불러오는 중이에요.'}</p>}{bait&&bait.id!=='bait'&&<p className="mt-2 text-[10px] leading-5 text-muted-foreground">기본 지렁이: 일반 77% · 희귀 20% · 특급 2.7% · 신화 0.3%</p>}</section>
    <section className="space-y-3 border-t pt-4" aria-label="확률에 영향을 주는 요소"><h2 className="text-sm">확률에 영향을 주는 것들</h2><div className="flex gap-2"><appArt.bait className="mt-1 size-6"/><div><p>미끼{bait&&<span className="ml-2 text-muted-foreground">{bait.name}</span>}</p><p className="text-[11px] leading-5 text-muted-foreground">{bait?fishingBaitEffect(bait.id,bait.effect_description):'미끼마다 성공률과 등급별 확률, 포획 대상이 달라져요.'}</p></div></div><div className="flex gap-2"><appArt.rod className="mt-1 size-6"/><div><p>낚싯대{rod&&<span className="ml-2 text-muted-foreground">{rod.name}</span>}</p><p className="text-[11px] leading-5 text-muted-foreground">낚싯대에 따라 성공률을 높이거나 특정 해역의 주 서식지 개체를 만나기 쉽게 해줘요. 등급별 확률은 미끼 기준이에요.</p>{bonus!==undefined&&<p className="text-[11px] text-primary">현재 낚싯대 성공률 보너스 +{percent(bonus/100)}p</p>}</div></div></section>
    <section className="rounded-xl bg-secondary/40 p-3"><h2 className="mb-1 flex items-center gap-2 text-sm"><appArt.map className="size-6"/>토착 생물은 고향 바다에서</h2><p className="text-[11px] leading-6 text-muted-foreground">토착 생물은 다른 해역에서는 만나기 매우 어려워요. 본래 서식지에서는 해당 토착종의 <strong className="font-medium text-primary">발견 확률이 상승</strong>해 훨씬 만나기 쉬워져요.</p><p className="mt-1 text-[10px] leading-5 text-muted-foreground">등급 결정 후 기본 비율은 토착종 60% · 공통종 35% · 다른 해역 토착종 5%예요. 후보가 없는 그룹은 제외하고 비율을 다시 나눠요. 낚싯대·특수 미끼의 토착종 보너스가 있으면 추가 보정돼요.</p></section>
   </div>
  </DialogContent>
 </Dialog>
}
