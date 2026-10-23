import {useId} from 'react'
import {Popover} from '@base-ui/react/popover'
import {cn} from '@/lib/utils'

export const levelInsignias=[
 {name:'첫 물결',color:'#ab7952',deep:'#795038',light:'#f6e6cf'},
 {name:'작은 항해',color:'#9baab5',deep:'#5f7584',light:'#edf2f5'},
 {name:'바람의 벗',color:'#77a477',deep:'#436d4c',light:'#e5f0d8'},
 {name:'파도의 길잡이',color:'#58a69c',deep:'#316e70',light:'#d9f2e9'},
 {name:'수평선의 눈',color:'#6d9ed0',deep:'#466b9f',light:'#e0efff'},
 {name:'심해의 속삭임',color:'#a18bc5',deep:'#735299',light:'#eee2fa'},
 {name:'별빛의 인도자',color:'#cb8589',deep:'#9a4f62',light:'#fce3e4'},
 {name:'대양의 수호자',color:'#d6ae5d',deep:'#967039',light:'#fff1c4'},
 {name:'해류의 지배자',color:'#a6bac4',deep:'#657f98',light:'#eef8ff'},
 {name:'바다가 기억하는 자',color:'#d4b46d',deep:'#8a6c40',light:'#fff5d6'},
] as const

export function levelInsigniaTier(level:number){
 return Number.isFinite(level)&&level>=1?Math.min(9,Math.floor((level-1)/10)):null
}

/** Shared vector crests remain legible at avatar size; silhouette and motif mark each rank. */
function RankMotif({tier}:{tier:number}){
 switch(tier){
  case 0:return <path d="M16 26c3-5 5 5 8 0s5 5 8 0M18 30c2-3 4 3 6 0s4 3 6 0"/>
  case 1:return <><path d="M24 16v13h-7l3-3M24 17l8 10h-8M16 30h17l-4 5h-9l-4-5Z"/><path d="M19 37h10"/></>
  case 2:return <><path d="M15 23h14c6 0 5-7 1-7-2 0-3 1-3 3M16 27h16c5 0 5 7 1 7-2 0-3-1-3-3M18 31h6"/><path d="m17 18 4 1-4 1"/></>
  case 3:return <><path d="M15 31c5 1 4-12 13-12 4 0 6 3 4 6-3-3-7-1-6 2 1 4 4 6 8 4M15 35c3-3 5 3 9 0s6 3 9 0"/></>
  case 4:return <><path d="M14 25s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="24" cy="25" r="3"/><path d="M16 35h16M24 13v2"/></>
  case 5:return <><path d="M17 31c-4-9 1-16 7-16s11 7 7 16M17 31l3-5 4 6 4-6 3 5M24 17v10M20 19l2 6M28 19l-2 6M18 36c2-2 4 2 6 0s4 2 6 0"/></>
  case 6:return <><path d="m24 15 3 7 7 2-7 3-3 8-3-8-7-3 7-2 3-7Z"/><path d="M24 20v9M19 24h10M17 35l2-2M31 17l2-2"/></>
  case 7:return <><path d="M24 16v17M20 19h8M17 26c-2 7 3 10 7 10s9-3 7-10M16 26l1 5 4-2M32 26l-1 5-4-2"/><circle cx="24" cy="15" r="2"/></>
  case 8:return <><path d="M24 34V17M19 22v-5l-3 3M29 22v-5l3 3M19 19v6c0 3 2 4 5 4s5-1 5-4v-6M21 19l3-5 3 5M17 35c2-2 4 2 7 0s5 2 7 0"/></>
  default:return <><path d="m24 15 3 6 6 1-4 5 1 7-6-3-6 3 1-7-4-5 6-1 3-6Z"/><path d="M15 37c3-4 6 2 9 0s6-4 9 0M24 20v7M21 24h6"/></>
 }
}

export function LevelInsignia({level,className='size-5'}:{level:number;className?:string}){
 const id=useId(),tier=levelInsigniaTier(level)
 if(tier===null)return null
 const palette=levelInsignias[tier]
 const shape=tier<2?'M24 7a17 17 0 1 1 0 34 17 17 0 0 1 0-34Z':tier<5?'M24 5 38 12v12c0 9-7 14-14 18-7-4-14-9-14-18V12L24 5Z':'M24 5 38 11l-1 15c-1 8-7 13-13 16-6-3-12-8-13-16l-1-15L24 5Z'
 return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={`${className} shrink-0`} data-level-insignia={tier+1}>
  <title>{palette.name} 휘장 · Lv.{tier*10+1}–{(tier+1)*10}</title>
  <defs><linearGradient id={`${id}-metal`} x1="10" y1="5" x2="36" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor={palette.light}/><stop offset=".45" stopColor={palette.color}/><stop offset="1" stopColor={palette.deep}/></linearGradient><linearGradient id={`${id}-face`} x1="18" y1="10" x2="28" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor={palette.light}/><stop offset="1" stopColor={palette.color}/></linearGradient></defs>
  {tier>=2&&<g fill={palette.deep} stroke={palette.light} strokeWidth=".7"><path d="m16 32-4 12 7-3 5 3 2-10-10-2ZM32 32l4 12-7-3-5 3-2-10 10-2Z"/></g>}
  {tier>=5&&<g stroke={palette.deep} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 37C5 32 3 23 7 15M35 37c8-5 10-14 6-22"/><path d="m7 20-4-3m3 10-4-2m7 7-5-1m37-11 4-3m-3 10 4-2m-7 7 5-1"/></g>}
  {tier>=7&&<g fill={palette.light} stroke={palette.deep} strokeWidth="1"><path d="m12 17-10-6 2 12 8 6M36 17l10-6-2 12-8 6"/><path d="m3 16 8 6m34-6-8 6"/></g>}
  <path d={shape} fill={`url(#${id}-metal)`} stroke={palette.deep} strokeWidth="1.5" strokeLinejoin="round"/>
  <path d={shape} transform="translate(4.8 4.8) scale(.8)" fill={`url(#${id}-face)`} stroke={palette.light} strokeWidth="1.5"/>
  {tier>=4&&<path d={shape} transform="translate(2.4 2.4) scale(.9)" stroke={palette.light} strokeWidth=".7"/>}
  {tier>=8&&<path d="m16 11-2-7 6 3 4-6 4 6 6-3-2 7H16Z" fill={palette.light} stroke={palette.deep} strokeWidth="1.2" strokeLinejoin="round"/>}
  <g stroke={palette.deep} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><RankMotif tier={tier}/></g>
  {tier===9&&<g fill="#fff5d6" stroke={palette.deep} strokeWidth=".8"><path d="m6 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM42 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/><circle cx="24" cy="7" r="1.5"/></g>}
 </svg>
}

export function LevelTag({level,loading=false,className='',ariaLabel}:{level?:number;loading?:boolean;className?:string;ariaLabel?:string}){
 const valid=level!==undefined&&levelInsigniaTier(level)!==null
 if(!valid)return <span aria-label={ariaLabel??(loading?'레벨 확인 중':'레벨 확인 실패')} className={`inline-flex size-8 shrink-0 items-center justify-center text-xs text-muted-foreground ${className}`}>{loading?'…':'—'}</span>
 const tier=levelInsigniaTier(level)!,insignia=levelInsignias[tier]
 return <Popover.Root>
  <Popover.Trigger aria-label={ariaLabel??`레벨 ${level}`} className={cn('inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-primary/7 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-primary/7',className)}>
   <LevelInsignia level={level} className="size-6"/>
  </Popover.Trigger>
  <Popover.Portal><Popover.Positioner side="top" sideOffset={6} collisionPadding={12} className="z-[100]">
   <Popover.Popup className="flex min-w-44 max-w-64 items-center gap-3 rounded-2xl border border-primary/15 bg-popover px-4 py-3 text-left text-popover-foreground shadow-lg outline-none">
    <LevelInsignia level={level} className="size-11"/>
    <div className="min-w-0">
     <Popover.Title className="text-base font-medium tabular-nums text-primary">Lv.{level}</Popover.Title>
     <Popover.Description className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{insignia.name} · {tier*10+1}–{(tier+1)*10}</Popover.Description>
    </div>
   </Popover.Popup>
  </Popover.Positioner></Popover.Portal>
 </Popover.Root>
}

export function LevelInsigniaGallery({level}:{level:number}){
 const current=levelInsigniaTier(level)
 return <details className="mt-3 border-t border-primary/10 pt-2 text-[11px] text-muted-foreground"><summary className="cursor-pointer py-1">레벨 휘장 보기</summary><ol className="mt-3 grid grid-cols-5 gap-x-1 gap-y-3">{levelInsignias.map((insignia,tier)=><li key={insignia.name} aria-current={current===tier?'step':undefined} className={`flex flex-col items-center gap-1 rounded-lg py-2 ${current===tier?'bg-primary/7 text-primary':''}`}><LevelInsignia level={tier*10+1} className="size-10"/><span className="tabular-nums">{tier*10+1}–{(tier+1)*10}</span><span className="text-[10px]">{insignia.name}</span></li>)}</ol></details>
}
