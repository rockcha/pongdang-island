import {appArt} from '@/components/app-art'
import {LandscapeImage} from '@/components/landscape-image'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

const {gameplay:Gamepad2,ranking:Trophy}=appArt

export type GameTab = 'game'|'rank'
export function GameTabs({id,value,onChange}:{id:string;value:GameTab;onChange:(value:GameTab)=>void}) {
 return <div role="tablist" aria-label="게임 메뉴" className="segmented-control grid w-full shrink-0 grid-cols-2 gap-0 border-b border-border bg-background">
  {([{value:'game',label:'게임 플레이',icon:Gamepad2},{value:'rank',label:'랭킹',icon:Trophy}] as const).map(tab=><button key={tab.value} id={`${id}-${tab.value}-tab`} role="tab" aria-selected={value===tab.value} aria-controls={`${id}-${tab.value}-panel`} tabIndex={value===tab.value?0:-1} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const next=tab.value==='game'?'rank':'game';onChange(next);document.getElementById(`${id}-${next}-tab`)?.focus()}}} onClick={()=>onChange(tab.value)} className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-none text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value===tab.value?'bg-secondary text-primary':'text-muted-foreground hover:bg-card/60'}`}><tab.icon className="size-7" aria-hidden="true" />{tab.label}</button>)}
 </div>
}

export function GameStartOverlay({title,description,poster,children,onPaid,onPractice,paidDisabled,practiceDisabled,fee=10,extraAction,extraPanel,centerActions=false,rules=[]}:{title:string;description:string;poster:string;children?:ReactNode;onPaid:()=>void;onPractice:()=>void;paidDisabled:boolean;practiceDisabled:boolean;fee?:number;extraAction?:ReactNode;extraPanel?:ReactNode;centerActions?:boolean;rules?:string[]}) {
 const actions=(<div className={`relative shrink-0 border-border bg-background pb-[env(safe-area-inset-bottom)] ${centerActions?'overflow-hidden rounded-lg [&_button]:text-sm':'border-t'}`}><div className={extraAction?'grid grid-cols-3':'grid grid-cols-2'}><Button className="min-h-14 min-w-0 gap-1 rounded-none border-r border-border px-1 text-xs" aria-label={fee===0?'실전 (무료)':`실전 (골드 ${fee})`} disabled={paidDisabled} onClick={onPaid}>실전 <span className="inline-flex items-center gap-0.5">{fee===0?'(무료)':<>(<img src="/currency/gold-coin-starfish.png" alt="" className="size-4 object-contain"/>{fee})</>}</span></Button><Button variant="secondary" className="min-h-14 min-w-0 gap-1 rounded-none px-1 text-xs" disabled={practiceDisabled} onClick={onPractice}>연습</Button>{extraAction}</div>{extraPanel}</div>)
 return <div className="absolute inset-0 z-20 flex flex-col overflow-hidden" role="group" aria-label="게임 시작 메뉴">
  <LandscapeImage src={poster} alt="" className="absolute inset-0 size-full object-cover"/>
  <div className="pointer-events-none absolute inset-0 bg-black/65" />
  <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4"><div className="w-full max-w-64 space-y-4 text-center text-white [&_.text-muted-foreground]:text-white/80">
   <div className="space-y-2"><h3 className="text-xl font-normal">{title}</h3><p className={`${centerActions?'text-sm leading-6':'text-xs leading-5'} text-white/80`}>{description}</p></div>
   {rules.length>0&&<div className="space-y-2 border-t border-white/15 pt-4 text-left"><p className="text-xs text-white/50">핵심 규칙</p><ul className="list-disc space-y-2 pl-4 text-sm leading-6 text-white/85">{rules.map(rule=><li key={rule}>{rule}</li>)}</ul></div>}
   {children}
   {centerActions&&actions}
  </div></div>
  {!centerActions&&actions}
 </div>
}
