import type {FishingRod} from './fishing-rods'

import {RodGaugeCharm} from './rod-gauge-charm'

const themes:Record<string,{ink:string;light:string;pattern:string}>={
 basic:{ink:'#3e3024',light:'#e4c79d',pattern:'linear-gradient(115deg,#c69a5720,transparent)'},
 bronze:{ink:'#293b3e',light:'#d7b388',pattern:'linear-gradient(115deg,#b58b4520,transparent)'},
 pongdang:{ink:'#403125',light:'#e8bd80',pattern:'repeating-linear-gradient(110deg,transparent 0 28px,#d6aa6b08 29px 30px)'},
 coral:{ink:'#47303c',light:'#f2aaa9',pattern:'radial-gradient(ellipse at 15% 110%,#f3b8b830,transparent 65%)'},
 bluegrove:{ink:'#183e52',light:'#83dcd7',pattern:'repeating-linear-gradient(170deg,transparent 0 20px,#83dcd709 21px 22px)'},
 mistmoon:{ink:'#30334d',light:'#c6b9ee',pattern:'radial-gradient(ellipse at 85% 0%,#e6dcff25,transparent 60%)'},
 lunea:{ink:'#40344f',light:'#eee1be',pattern:'radial-gradient(ellipse at 85% 0%,#fff1c92b,transparent 60%)'},
 whitenight:{ink:'#243f51',light:'#c2ecff',pattern:'linear-gradient(135deg,#eaf9ff20,transparent 45%,#78bcd610)'},
 starruins:{ink:'#293e42',light:'#e3d2a4',pattern:'repeating-linear-gradient(45deg,transparent 0 30px,#e3d2a409 31px 32px)'},
 primal:{ink:'#333c2b',light:'#e8b45c',pattern:'radial-gradient(ellipse at 15% 100%,#e8b45c20,transparent 70%)'},
 dreamabyss:{ink:'#302644',light:'#b6a5ee',pattern:'linear-gradient(125deg,#9ae4f21c,transparent 45%,#b69ae424)'},
 cloudferry:{ink:'#33483d',light:'#e1d6a5',pattern:'radial-gradient(ellipse at 75% 110%,#fff1ce25,transparent 60%)'},
 scrapisle:{ink:'#293e35',light:'#b7cd99',pattern:'repeating-linear-gradient(135deg,transparent 0 24px,#d7aa710a 25px 26px)'},
 mukhyang:{ink:'#293b37',light:'#d9e1c9',pattern:'linear-gradient(165deg,#e9e2cd14,transparent 40%,#111e181c)'},
 siren:{ink:'#24433f',light:'#8de0d2',pattern:'linear-gradient(155deg,transparent 25%,#ead9ab18 26%,transparent 28%,transparent 65%,#ead9ab10 66%,transparent 69%)'},
 calm:{ink:'#274247',light:'#a1ded5',pattern:'linear-gradient(170deg,#c1eadb15,transparent)'},
 swift:{ink:'#26364f',light:'#e8c981',pattern:'linear-gradient(125deg,#d9b66f25,transparent 65%)'},
 nyamnyam:{ink:'#34472e',light:'#f2c29b',pattern:'linear-gradient(125deg,#e2c28a25,transparent 65%)'},
}

// Native SVG avoids foreignObject rendering issues in mobile browsers.
export function FloatingRodGauge({rod,tension,idle,x,y}:{rod?:FishingRod;tension:number;idle:boolean;x:number;y:number}){
 const id=rod?.id??'basic',theme=themes[id]??themes.basic
 const value=Math.max(0,Math.min(100,tension)),danger=!idle&&(value>85||value<20)
 return <g data-fishing-gauge-layer="true" data-rod-gauge={id} transform={`translate(${x} ${y})`} pointerEvents="none" aria-hidden="true">
  <rect width="208" height="22" rx="11" fill={theme.ink} fillOpacity=".65"/>
  <g transform="translate(8 8)">
   <rect width="192" height="6" rx="3" fill="black" fillOpacity=".2"/>
   <rect x="38.4" width="124.8" height="6" fill="white" fillOpacity=".1"/>
   <rect width={192*value/100} height="6" rx="3" fill={danger?'#f3a779':theme.light}/>
   <path d="M38.4 0v6 M163.2 0v6" stroke="white" strokeOpacity=".25"/>
  </g>
  <RodGaugeCharm rodId={id} x={195} y={-1} width={24} height={24}/>
 </g>
}

export function RodGauge({rod,tension,inline=false,floating=false,status}:{rod?:FishingRod;tension:number;inline?:boolean;floating?:boolean;status?:string}){
 const id=rod?.id??'basic',theme=themes[id]??themes.basic
 const value=Math.max(0,Math.min(100,tension)),danger=!status&&(value>85||value<20)
 return <div data-rod-gauge={id} className={floating?'pointer-events-none w-full rounded-full p-2':inline?'relative order-first w-full shrink-0 px-4 pt-3 pb-2 backdrop-blur-md':'rod-gauge-frame pointer-events-none absolute inset-x-4 bottom-[calc(11rem+env(safe-area-inset-bottom))] z-20 rounded-xl px-4 py-3 backdrop-blur-md'} style={{backgroundColor:theme.ink+(floating?'a6':'df'),backgroundImage:theme.pattern}} aria-hidden="true">
  {!floating&&status!=='낚시 준비'&&status!=='입질을 기다려요'&&<div className="mb-2 flex items-center justify-end gap-3 text-[11px] leading-4">
   <span className={danger?'text-orange-200':'text-white/85'}>{status??(danger?'위험':'안정')}{!status&&<span className="ml-2 tabular-nums text-white/60">{Math.round(value)}%</span>}</span>
  </div>}
  <div className="relative">
  <div className={`relative ${floating?'h-1.5':'h-2'} overflow-hidden rounded-full bg-black/20`}>
   <span className="absolute inset-y-0 left-[20%] w-[65%] bg-white/10"/>
   <span className="absolute inset-y-0 left-0 rounded-full" style={{width:value+'%',background:danger?'#f3a779':`linear-gradient(90deg,${rod?.color??'#c69857'},${theme.light})`}}/>
   <span className="absolute inset-y-0 left-[20%] w-px bg-white/25"/><span className="absolute inset-y-0 left-[85%] w-px bg-white/25"/>
  </div>
  <RodGaugeCharm rodId={id} className="pointer-events-none absolute top-1/2 -right-2 size-6 -translate-y-1/2"/>
  </div>
 </div>
}
