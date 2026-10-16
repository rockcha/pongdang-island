import type { ReactNode } from 'react'
import { Gamepad2, GraduationCap, Play, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoldIcon } from '@/features/gold/gold-provider'

export type GameTab = 'game'|'rank'
export function GameTabs({id,value,onChange}:{id:string;value:GameTab;onChange:(value:GameTab)=>void}) {
 return <div role="tablist" aria-label="게임 메뉴" className="grid shrink-0 grid-cols-2 gap-1 rounded-lg border border-border/70 bg-secondary/50 p-1">
  {([{value:'game',label:'게임 플레이',icon:Gamepad2},{value:'rank',label:'랭킹',icon:Trophy}] as const).map(tab=><button key={tab.value} id={`${id}-${tab.value}-tab`} role="tab" aria-selected={value===tab.value} aria-controls={`${id}-${tab.value}-panel`} tabIndex={value===tab.value?0:-1} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const next=tab.value==='game'?'rank':'game';onChange(next);document.getElementById(`${id}-${next}-tab`)?.focus()}}} onClick={()=>onChange(tab.value)} className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value===tab.value?'bg-card text-primary shadow-sm':'text-muted-foreground hover:bg-card/60'}`}><tab.icon className="size-4" aria-hidden="true" />{tab.label}</button>)}
 </div>
}

export function GameStartOverlay({title,description,poster,children,onPaid,onPractice,paidDisabled,practiceDisabled,fee=10}:{title:string;description:string;poster:string;children?:ReactNode;onPaid:()=>void;onPractice:()=>void;paidDisabled:boolean;practiceDisabled:boolean;fee?:number}) {
 return <div className="absolute inset-0 z-20 overflow-hidden rounded-lg" role="group" aria-label="게임 시작 메뉴">
  <img src={poster} alt="" className="absolute inset-0 size-full object-cover" />
  <div className="absolute inset-0 bg-background/75" />
  <div className="relative flex h-full items-center justify-center p-4"><div className="w-full max-w-64 space-y-4 text-center">
   <div className="space-y-2"><h3 className="text-xl font-normal">{title}</h3><p className="text-xs leading-5 text-muted-foreground">{description}</p></div>
   {children}
   <div className="space-y-2"><Button className="min-h-10 w-full gap-1.5" disabled={paidDisabled} onClick={onPaid}><Play className="size-4" />실전 시작 <span className="inline-flex items-center gap-0.5">(<GoldIcon className="size-4" />{fee}골드)</span></Button><Button variant="outline" className="min-h-10 w-full gap-1.5" disabled={practiceDisabled} onClick={onPractice}><GraduationCap className="size-4" />연습 시작</Button></div>
  </div></div>
 </div>
}
