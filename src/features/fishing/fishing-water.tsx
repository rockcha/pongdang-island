import { FishingSea,FishingPlatform } from './fishing-environment'
import { collectibleUrl } from '@/features/collection/api'
import type { Species } from '@/features/collection/api'
import { useEffect, useId, useRef, useState } from 'react'
import { fishBehavior } from './tension-game'
import type { FishMood,TensionGame } from './tension-game'

const waters:Record<string,{top:string;bottom:string;light:string}>= {
 pongdang:{top:'#529dc7',bottom:'#173f6b',light:'#b9e8fa'},
 coral:{top:'#51b2ba',bottom:'#174c73',light:'#bdeee2'},
 mistmoon:{top:'#6678ad',bottom:'#232c54',light:'#d4d6fa'},
 starruins:{top:'#468ea5',bottom:'#152f50',light:'#b9dfdf'},
 dreamabyss:{top:'#403f75',bottom:'#111b36',light:'#c6b8ee'},
}
export type FishingVisual={time:number;tension:number;reel:number;ending:number}
export function FishingWater({game,visual,mood,active,reduced,regionId,pulling=false,label,outline}:{outline?:Species|null;label?:string;pulling?:boolean;game:TensionGame;visual:FishingVisual;mood:FishMood;active:boolean;reduced:boolean;regionId:string}){
 const id=useId().replaceAll(':',''),palette=waters[regionId]??waters.pongdang
 const container=useRef<HTMLDivElement>(null),[sceneHeight,setSceneHeight]=useState(380)
 useEffect(()=>{if(!container.current||typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(([entry])=>{if(entry.contentRect.width>0)setSceneHeight(Math.max(380,entry.contentRect.height/entry.contentRect.width*400))});observer.observe(container.current);return()=>observer.disconnect()},[])
 const bottom=sceneHeight-380
 const t=reduced?0:visual.time,waiting=game.phase==='waiting',won=game.phase==='won',lost=game.phase==='lost',surge=mood==='surge'&&!waiting&&!lost&&!won,warning=mood==='warning'&&!waiting
 const behavior=fishBehavior(game.time,game.seed,game.rarity)
 const end=Math.min(1,visual.ending/1.15),tension=active&&!waiting?visual.tension/100:0,bend=active&&!waiting&&!lost?Math.min(1,(surge?.65:warning?.35:.1)+(pulling?.2:0)+tension*.15):0
 const recoil=!reduced&&surge?Math.sin(t*19)*tension*2.5:0
 const lift=won?(reduced?1:1-Math.pow(1-end,3)):0
 const tip={x:197+bend*43+recoil-lift*62,y:100+bend*65-lift*65-(active&&waiting&&!reduced&&game.time<.85?Math.sin(game.time/.85*Math.PI)*50:0)}
 const baseY=361+bottom
 const rodPath=`M303 ${baseY} C${303+(tip.x-303)*.33+bend*65} ${baseY+(tip.y-baseY)*.33},${303+(tip.x-303)*.7+bend*100} ${baseY+(tip.y-baseY)*.7-bend*30},${tip.x} ${tip.y}`
 const cast=active&&waiting?Math.min(1,game.time/.85):1
 const casting=active&&waiting&&cast<1
 const bobX=190+(!reduced&&active?Math.sin(t*2)*4:0)+(surge&&!reduced?Math.sin(t*15)*3:0)
 // Far cast, impact dip, resurfacing, then a short bite dip.
 const landing=active&&waiting?Math.max(0,Math.min(1,(game.time-.85)/.85)):1
 const dip=reduced?0:active&&waiting&&game.time>=.85&&game.time<1.7?Math.sin(landing*Math.PI):active&&!waiting&&!won&&!lost&&game.time<.6?Math.sin(game.time/.6*Math.PI):0
 const approach=Math.max(0,Math.min(1,(game.progress-.18)/.7))
 const bobScale=active?.62+game.progress*.38:1
 const nearWater=Math.max(180,sceneHeight-235)
 const bobY=(active?nearWater-45+game.progress*65:nearWater)+(waiting?Math.sin(t*2)*1.4:0)+(won?-lift*138:0)
 const bx=tip.x+(bobX-tip.x)*cast,by=tip.y+(bobY-tip.y)*cast-(casting?Math.sin(cast*Math.PI)*85:0)
 const fx=205+Math.sin(t*1.5)*12+(surge&&!reduced?Math.sin(behavior.progress*Math.PI)*45:0)+(lost?end*155:0)
 const fy=nearWater-20+game.progress*65+(won?-lift*194:0),fishScale=.35+approach*.9
 const snapped=lost&&game.reason==='snap'
 const lineEnd=snapped?{x:tip.x+12*(1-end),y:tip.y-15*(1-end)}:{x:bx,y:by+dip*13}
 const impact=active&&waiting&&game.time>=.85&&game.time<1.7
 const splash=active&&!reduced&&(impact||surge||won||(!waiting&&game.time<.65))
 return <div ref={container} className="relative h-full w-full overflow-hidden" style={{background:`linear-gradient(${palette.top},${palette.bottom})`}}>
 <FishingSea regionId={regionId}/>
 <svg viewBox="0 0 400 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
  {Array.from({length:15},(_,i)=><g key={i} opacity={i%3===0?.21:.1}>
   {!reduced&&<animateTransform attributeName="transform" type="translate" values={i%2?'0 0;18 4;0 0':'0 0;-15 5;0 0'} dur={`${7+i%4}s`} repeatCount="indefinite"/>}
   <path d={`M-40 ${18+i*43}q55 -12 110 0t110 0t110 0t110 0`} fill="none" stroke={palette.light} strokeWidth={i%3===0?1.5:.8}/>
   <path d={`M${(i*67)%340} ${25+i*43}q17 -3 34 0`} fill="none" stroke={palette.light} strokeWidth="2"/>
  </g>)}
 </svg><svg viewBox={`0 0 400 ${sceneHeight}`} preserveAspectRatio="xMidYMin meet" className="relative block h-full w-full" aria-hidden="true" data-region={regionId}>
  <defs>
   <linearGradient id={id} x2="0" y2="1"><stop stopColor={palette.top}/><stop offset="1" stopColor={palette.bottom}/></linearGradient>
   <radialGradient id={`${id}-light`}><stop stopColor={palette.light} stopOpacity=".19"/><stop offset="1" stopColor={palette.light} stopOpacity="0"/></radialGradient>
   <filter id={`${id}-depth`} x="-40%" y="-50%" width="180%" height="200%"><feGaussianBlur stdDeviation={(1-approach)*2.8}/></filter>
   <filter id={`${id}-silhouette`} x="-40%" y="-50%" width="180%" height="200%"><feColorMatrix type="matrix" values="0 0 0 0 .035 0 0 0 0 .13 0 0 0 0 .2 0 0 0 1 0"/><feGaussianBlur stdDeviation={(1-approach)*2.8}/></filter>
  </defs>

  <ellipse cx="110" cy="60" rx="230" ry="240" fill={`url(#${id}-light)`}/>
  {[30,75,125,180,240,300].map((y,i)=><path key={y} d={`M-30 ${y} Q70 ${y-9+Math.sin(t*.7+i)*3} 200 ${y} T430 ${y}`} fill="none" stroke={palette.light} opacity=".1" strokeWidth="1.3"/>)}
  {regionId==='coral'&&[0,1,2].map(i=><path key={i} d={`M${i*22} 305q35-40 5-65m-5 40q-30-15-20-30m22 15q20-15 12-28`} fill="none" stroke="#e6a9aa" opacity=".13" strokeWidth="6" strokeLinecap="round"/>)}
  {regionId==='starruins'&&<g stroke={palette.light} opacity=".1" fill="none"><path d="M0 280l70-20 20 60-70 20Z M330 25l55 10-12 62-55-10Z"/><path d="M10 287l50-14 17 40-50 15Z M339 37l32 6-8 39-32-6Z"/></g>}
  {regionId==='mistmoon'&&<g fill="#e5e1ff" opacity=".065"><ellipse cx="50" cy="60" rx="150" ry="20"/><ellipse cx="350" cy="160" rx="140" ry="17"/></g>}
  {Array.from({length:12},(_,i)=><ellipse key={i} cx={(i*73+29)%400} cy={22+(i*47)%290} rx={i%3===0?5:2} ry=".8" fill={palette.light} opacity={reduced?.15:.12+Math.max(0,Math.sin(t+i))*.2}/>) }
  {active&&!waiting&&!won&&approach>0&&<g transform={`translate(${fx} ${fy}) rotate(${won?-65:warning?-35*Math.min(1,behavior.progress):surge?-15:10}) scale(${fishScale})`} fill="#092b47" filter={`url(#${id}-depth)`} opacity={approach*(lost?(1-end)*.4:.42)}>{outline?<image href={collectibleUrl(outline.thumbnail_path)} x="-36" y="-32" width="72" height="64" preserveAspectRatio="xMidYMid meet" filter={`url(#${id}-silhouette)`}/>:<><path d="M-28 0Q-16-16 8-9L27-22 23-2 29 16 8 8Q-15 17-28 0Z"/><path d="M-5-8l12-14 4 16Z"/></>}</g>}
  {surge&&!reduced&&[0,1,2].map(i=><path key={i} d={`M${fx+35+i*10} ${fy-10}q12 10 0 20`} fill="none" stroke={palette.light} opacity={.2-i*.05} strokeWidth="2"/>)}
  {active&&!waiting&&[0,1,2].map(i=>{const ripple=(t*1.1+i/3)%1;return <ellipse key={i} cx={bx} cy={by+10} rx={12+ripple*(surge?62:35)} ry={3+ripple*10} stroke={palette.light} fill="none" opacity={reduced?0:(1-ripple)*(surge?.55:.25)} strokeWidth={surge?1.8:1}/>})}
  <ellipse cx={bx} cy={by+10} rx={(surge?28:18)*bobScale} ry="5" stroke={palette.light} fill="none" opacity=".5"/>
  <ellipse cx={bx} cy={by+10} rx={(surge?40:28)*bobScale} ry="9" stroke={palette.light} fill="none" opacity=".2"/>
  <path d={`M${tip.x} ${tip.y} Q${(tip.x+lineEnd.x)/2+(!reduced&&tension>.85?Math.sin(t*38)*2:0)} ${(tip.y+lineEnd.y)/2+(1-tension)*45} ${lineEnd.x} ${lineEnd.y}`} fill="none" stroke={tension>.85?'#ffd1ba':'#e1edf2'} strokeWidth={tension>.85?1.8:1.2}/>
  {!(snapped&&end>.5)&&<g transform={`translate(${bx} ${by+dip*13}) rotate(${surge?24:dip*12}) scale(${bobScale} ${bobScale*(1-dip*.35)})`} opacity={won?1-end:1-dip*.88}><path d="M0-17v12" stroke="#fff1d4" strokeWidth="2.5"/><ellipse rx="5" ry="9" fill="#fff1d4"/><path d="M-5 0a5 9 0 0 0 10 0Z" fill="#eb886f"/></g>}
  {splash&&Array.from({length:9},(_,i)=>{const phase=(t*1.7+i*.17)%1,angle=i*Math.PI*2/9;return <ellipse key={i} cx={bx+Math.cos(angle)*(8+phase*(won?48:24))} cy={by+7-Math.sin(phase*Math.PI)*(12+i%3*8)} rx="1.7" ry="2.7" fill={palette.light} opacity={(1-phase)*.7}/>})}
  <FishingPlatform regionId={regionId} y={sceneHeight-150}/>
  <path d={rodPath} fill="none" stroke="#102b42" strokeWidth="6" strokeLinecap="round"/>
  <path d={rodPath} fill="none" stroke="#97c8d2" strokeWidth="2.3" strokeLinecap="round"/>
  <g transform={`translate(0 ${bottom-30})`}><path d="M303 392l-27-52" stroke="#76503a" strokeWidth="13" strokeLinecap="round"/>
  <path d="M299 382l-18-34" stroke="#c89c6e" strokeWidth="7" strokeLinecap="round"/>
  <g transform={`translate(282 358) rotate(${reduced?0:visual.reel})`}><circle r="12" fill="#183b53" stroke="#abc7ce" strokeWidth="2"/><path d="M-8 0H8M0-8V8" stroke="#abc7ce" strokeWidth="2"/><circle r="4" fill="#d7b388"/><circle cx="8" cy="0" r="3" fill="#d7b388"/></g>
  </g>{active&&!waiting&&game.time<.7&&<text x="200" y="72" textAnchor="middle" fill="#fff1d4" fontSize="18" fontWeight="bold" opacity={1-game.time/.7}>물었어요!</text>}

 </svg>{label&&<p role="status" className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center text-sm font-semibold text-white drop-shadow-[0_2px_3px_#174575]" style={{left:bx/400*100+'%',top:(by+27)/sceneHeight*100+'%'}}>{label}</p>}</div>
}
