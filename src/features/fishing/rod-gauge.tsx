import type {FishingRod} from './fishing-rods'

function FrameOrnament({theme}:{theme:string}){
 switch(theme){
  case 'pongdang':return <path d="m50-14 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/>
  case 'coral':return <g fill="none" strokeWidth="3" strokeLinecap="round"><path d="M50 3v-16m0 10-7-6m7 10 8-8m-15-2v-5m15 7v-5"/><circle cx="50" cy="109" r="4" fill="currentColor" stroke="none"/></g>
  case 'bluegrove':return <g><path d="m50-15 7 8-7 10-7-10Z"/><path d="M29 103q10-7 21 0t21 0" fill="none" strokeWidth="2"/></g>
  case 'mistmoon':return <path d="M55-15a10 10 0 1 0 5 17 10 10 0 0 1-5-17Z"/>
  case 'lunea':return <g><path d="M55-15a10 10 0 1 0 5 17 10 10 0 0 1-5-17Z"/><circle cx="50" cy="108" r="4"/><circle cx="41" cy="106" r="2"/><circle cx="59" cy="106" r="2"/></g>
  case 'starruins':return <g><path d="m50-15 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"/><path d="m43 105 7 6 7-6" fill="none" strokeWidth="2"/></g>
  case 'dreamabyss':return <g><path d="m50-16 6 9-2 10h-8l-2-10Z"/><path d="m35 103 4 7 6-4m10 0 6 4 4-7" fill="none" strokeWidth="2"/></g>
  case 'primal':return <g><path d="m50-14 7 5-2 11H45l-2-11Z"/><path d="m15 12 7 6m-16 4 8 5m64-9 7-6m1 15 8-5" fill="none" strokeWidth="3" strokeLinecap="round"/></g>
  case 'whitenight':return <g fill="none" strokeWidth="2" strokeLinecap="round"><path d="M50-16V3M42-12l16 11m-16 0 16-11M47-13l3 3 3-3M47 0l3-3 3 3"/><path d="m36 103 7 5 7-3 7 3 7-5"/></g>
  case 'cloudferry':return <g><path d="M38-2a5 5 0 0 1 2-9 7 7 0 0 1 13-1 5 5 0 0 1 8 6 4 4 0 0 1-3 4Z"/><path d="m12 13 6 5m64 0 6-5m-53 91 5 4m20 0 5-4" fill="none" strokeWidth="2"/></g>
  case 'scrapisle':return <g><path d="m45-13 10 0 5 8-5 8H45l-5-8Z"/><circle cx="50" cy="-5" r="3" fill="#405c55" stroke="none"/>{[[-1,50],[101,50],[50,103]].map(([x,y])=><g key={x+':'+y}><circle cx={x} cy={y} r="3"/><path d={`m${x-1.5} ${y}h3`} fill="none" stroke="#405c55"/></g>)}</g>
  case 'bronze':return <g><circle cx="50" cy="-4" r="5"/><path d="m46-4h8M50-8v8" fill="none" stroke="#705137" strokeWidth="1.5"/></g>
  case 'calm':return <g fill="none" strokeWidth="2" strokeLinecap="round"><path d="M37-5q6-6 13 0t13 0M42 105q8-6 16 0"/></g>
  default:return <g fill="none" strokeWidth="2" strokeLinecap="round"><path d="m16 12 6 5m56 0 6-5M45 103h10"/></g>
 }
}

export function RodGauge({rod,tension}:{rod?:FishingRod;tension:number}){
 const theme=rod?.id??'basic',value=Math.max(0,Math.min(100,tension))
 const danger=value>85||value<20
 const color=rod?.color??'#c69857',accent=rod?.accent??'#e7d6b6'
 return <div data-rod-gauge={theme} className="rod-gauge-frame pointer-events-none absolute inset-x-4 bottom-[calc(11rem+env(safe-area-inset-bottom))] z-20 rounded-lg border-2 bg-slate-950/90 px-3 pb-3 pt-2 text-white shadow-lg sm:bottom-[calc(12rem+env(safe-area-inset-bottom))]" style={{borderColor:color,color:accent,boxShadow:'0 4px 16px #071b3540,inset 0 0 0 1px '+accent+'55'}} aria-hidden="true">
  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
   <span className="flex items-center gap-1.5"><svg viewBox="32 -20 36 28" className="h-5 w-6 overflow-visible" fill="currentColor" stroke={color} strokeWidth="1.3" strokeLinejoin="round"><FrameOrnament theme={theme}/></svg><span className="text-white/75">장력</span></span>
   <span className={'flex items-center gap-2 font-medium '+(danger?'text-orange-200':'text-emerald-100')}><span>{danger?'위험':'안정'}</span><span className="min-w-9 text-right text-sm tabular-nums">{Math.round(value)}%</span></span>
  </div>
  <div className="relative h-3.5 overflow-hidden rounded border border-white/15 bg-white/10">
   <span className="absolute inset-y-0 left-0 w-1/5 bg-orange-300/15"/><span className="absolute inset-y-0 right-0 w-[15%] bg-orange-300/15"/>
   <span className="absolute inset-y-0 left-0 rounded-sm" style={{width:value+'%',background:danger?'linear-gradient(90deg,#edaf79,#ff9c7a)':'linear-gradient(90deg,#70c4b1,#b9f5df)'}}/>
   <span className="absolute inset-y-0 left-[20%] border-l border-slate-950/35"/><span className="absolute inset-y-0 left-[85%] border-l border-slate-950/35"/>
  </div>
 </div>
}
