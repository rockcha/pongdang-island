import {hasRodImages} from './rod-image-assets'
import {FloatingRodGauge} from './rod-gauge'
import {hasRodSkin,RodSkinFloat,RodSkinFrame,RodSkinRotor,RodSkinGrip,RodSkinShaft,rodShaftOutlineWidth} from './rod-skin-art'
import type {FishingRod} from './fishing-rods'
import { FishingSea,FishingPlatform } from './fishing-environment'
import { collectibleUrl } from '@/features/collection/api'
import type { Species } from '@/features/collection/api'
import { useLayoutEffect, useId, useRef, useState } from 'react'
import { fishBehavior, fishForce, fishStrength } from './tension-game'
import type { FishMood,TensionGame } from './tension-game'

const waters:Record<string,{top:string;bottom:string;light:string}>= {
 primal:{top:'#469f99',bottom:'#245f60',light:'#c6e2cb'},
 siren:{top:'#3bb9b0',bottom:'#164d63',light:'#f4e7c9'},
 mukhyang:{top:'#d5ded5',bottom:'#788f8b',light:'#f7eedb'},
 scrapisle:{top:'#75a58c',bottom:'#244c43',light:'#eed4a1'},
 cloudferry:{top:'#68bfb5',bottom:'#245d64',light:'#fff1ce'},
 whitenight:{top:'#70c1d5',bottom:'#174d70',light:'#eaf9ff'},
 bluegrove:{top:'#38b5cd',bottom:'#154c91',light:'#c5f4ed'},
 pongdang:{top:'#529dc7',bottom:'#173f6b',light:'#b9e8fa'},
 coral:{top:'#51b2ba',bottom:'#174c73',light:'#bdeee2'},
 mistmoon:{top:'#6678ad',bottom:'#232c54',light:'#d4d6fa'},
 starruins:{top:'#468ea5',bottom:'#152f50',light:'#b9dfdf'},
 dreamabyss:{top:'#403f75',bottom:'#111b36',light:'#c6b8ee'},
}
export type FishingVisual={time:number;tension:number;reel:number;ending:number}
export function FishingWater({game,visual,mood,active,reduced,regionId,rod,pulling=false,label,outline,baitImage,showGauge=false,sceneryOverlay=false}:{sceneryOverlay?:boolean;showGauge?:boolean;baitImage?:string;rod?:FishingRod;regionName?:string;outline?:Species|null;label?:string;pulling?:boolean;game:TensionGame;visual:FishingVisual;mood:FishMood;active:boolean;reduced:boolean;regionId:string}){
 const id=useId().replaceAll(':',''),palette=waters[regionId]??waters.pongdang
 const container=useRef<HTMLDivElement>(null),[sceneHeight,setSceneHeight]=useState(380)
 useLayoutEffect(()=>{
  const element=container.current
  if(!element)return
  const measure=()=>{const {width,height}=element.getBoundingClientRect();if(width>0)setSceneHeight(Math.max(380,height/width*400))}
  measure()
  if(typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect()
 },[])
 const bottom=sceneHeight-380
 const canBite=game.failureAt===undefined
 const t=reduced?0:visual.time,waiting=game.phase==='waiting',won=game.phase==='won',lost=game.phase==='lost',surge=active&&canBite&&mood==='surge'&&!waiting&&!lost&&!won,warning=active&&canBite&&mood==='warning'&&!waiting&&!lost&&!won
 const tug=surge?Math.min(1,fishForce(game.time,game.seed,game.rarity)/(fishStrength[game.rarity].surge*.48)):0
 const motionTug=reduced?0:tug
 const behavior=fishBehavior(game.time,game.seed,game.rarity)
 const end=Math.min(1,visual.ending/1.15),tension=active&&!waiting?visual.tension/100:0
 const fighting=active&&canBite&&!waiting&&!lost&&!won&&behavior.index>=0
 const bend=fighting?Math.min(1,(surge?.2+tug*.45:warning?.35:.1)+(pulling?.2:0)+tension*.15):0
 const recoil=Math.sin(t*19)*motionTug*3.5
 const lift=won?(reduced?1:1-Math.pow(1-end,3)):0
 const tip={x:263+bend*28+recoil-lift*62,y:112+bend*56-lift*65-(active&&waiting&&!reduced&&game.time<.85?Math.sin(game.time/.85*Math.PI)*50:0)}
 const baseY=329+bottom
 const rodPath=`M303 ${baseY} C${303+(tip.x-303)*.33+bend*65} ${baseY+(tip.y-baseY)*.33},${303+(tip.x-303)*.7+bend*100} ${baseY+(tip.y-baseY)*.7-bend*30},${tip.x} ${tip.y}`
 const cast=active&&waiting?Math.min(1,game.time/.85):1
 const casting=active&&waiting&&cast<1
 const bobX=200+(!reduced&&active?Math.sin(t*2)*4:0)+Math.sin(t*15)*motionTug*4
 // Far cast, impact dip, resurfacing, then a short bite dip.
 const resurfacing=Math.max(0,Math.min(1,(game.time-1.65)/1))
 const landingDip=game.time<.85?0:game.time<1.05?(game.time-.85)/.2:1-resurfacing*resurfacing*(3-2*resurfacing)
 const dip=reduced?0:active&&waiting?landingDip:active&&canBite&&!waiting&&!won&&!lost&&game.time<.6?Math.sin(game.time/.6*Math.PI):0
 const scouting=canBite&&!waiting&&!won&&!lost&&behavior.index===-1
 const escapeProgress=canBite?0:Math.max(0,Math.min(1,(game.time-((game.failureAt??3)-.6)+(lost?visual.ending:0))/.9))
 const approach=waiting?0:!canBite?.35:scouting?.12+behavior.progress*.38:Math.max(.5,Math.min(1,(game.progress-.12)/.75))
 const shadowOpacity=!canBite?.22*Math.min(1,game.time/.6)*(1-escapeProgress):scouting?(reduced?.16:(.07+.13*(.5+.5*Math.sin(t*3.2))))*Math.min(1,behavior.progress*5):approach*(lost?(1-end)*.4:.6)
 const bobScale=active?.62+game.progress*.38:1
 const platformHeight=Math.max(160,Math.min(220,sceneHeight*.32))
 const platformY=sceneHeight-platformHeight+10
 const nearWater=Math.min(sceneHeight*(sceneryOverlay?.58:.42),platformY-(sceneryOverlay?70:117))
 const bobY=nearWater+(active?(game.progress-.5)*28:0)+(waiting?Math.sin(t*2)*1.4:0)+motionTug*5+(won?-lift*138:0)
 const bx=tip.x+(bobX-tip.x)*cast,by=tip.y+(bobY-tip.y)*cast-(casting?Math.sin(cast*Math.PI)*85:0)
 const fx=200+Math.sin(t*1.5)*12+(scouting?(game.seed%2?1:-1)*(1-behavior.progress)*85:0)+Math.sin(behavior.progress*Math.PI)*motionTug*30+(!canBite?(reduced?0:escapeProgress*180):lost?end*155:0)
 const fy=nearWater+12+game.progress*20+(won?-lift*194:0),fishScale=.48+approach*1.2
 const snapped=lost&&game.reason==='snap'
 const lineEnd=snapped?{x:tip.x+12*(1-end),y:tip.y-15*(1-end)}:{x:bx,y:by+dip*13}
 const impact=active&&waiting&&game.time>=.85&&game.time<1.65
 const waterContact=active&&(impact||surge||(canBite&&!waiting&&!won&&!lost&&game.time<.8))
 const splash=!reduced&&waterContact
 const reducedSplash=reduced&&active&&(waterContact||(won&&visual.ending<.95))
 const landingSplash=active&&won&&!reduced&&visual.ending<.95
 const splashProgress=Math.max(0,Math.min(1,visual.ending/.95))
 return <div ref={container} className="relative h-full w-full overflow-hidden" style={sceneryOverlay?undefined:{background:`linear-gradient(${palette.top},${palette.bottom})`}}>
 {!sceneryOverlay&&<FishingSea regionId={regionId}/>}
 {!sceneryOverlay&&<svg viewBox="0 0 400 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
  {Array.from({length:15},(_,i)=><g key={i} opacity={i%3===0?.21:.1}>
   {!reduced&&<animateTransform attributeName="transform" type="translate" values={i%2?'0 0;18 4;0 0':'0 0;-15 5;0 0'} dur={`${7+i%4}s`} repeatCount="indefinite"/>}
   <path d={`M-40 ${18+i*43}q55 -12 110 0t110 0t110 0t110 0`} fill="none" stroke={palette.light} strokeWidth={i%3===0?1.5:.8}/>
   <path d={`M${(i*67)%340} ${25+i*43}q17 -3 34 0`} fill="none" stroke={palette.light} strokeWidth="2"/>
  </g>)}
 </svg>}<svg viewBox={`0 0 400 ${sceneHeight}`} preserveAspectRatio="xMidYMin meet" className="relative block h-full w-full" aria-hidden="true" data-region={regionId}>
  <defs>
   <linearGradient id={id} x2="0" y2="1"><stop stopColor={palette.top}/><stop offset="1" stopColor={palette.bottom}/></linearGradient>
   <radialGradient id={`${id}-light`}><stop stopColor={palette.light} stopOpacity=".19"/><stop offset="1" stopColor={palette.light} stopOpacity="0"/></radialGradient>
   <filter id={`${id}-depth`} x="-40%" y="-50%" width="180%" height="200%"><feGaussianBlur stdDeviation={(1-approach)*2.8}/></filter>
   <filter id={`${id}-silhouette`} x="-40%" y="-50%" width="180%" height="200%"><feColorMatrix type="matrix" values="0 0 0 0 .035 0 0 0 0 .13 0 0 0 0 .2 0 0 0 1 0"/><feGaussianBlur stdDeviation={(1-approach)*2.8}/></filter>
  </defs>

  {!sceneryOverlay&&<>
  <ellipse cx="110" cy="60" rx="230" ry="240" fill={`url(#${id}-light)`}/>
  {[30,75,125,180,240,300].map((y,i)=><path key={y} d={`M-30 ${y} Q70 ${y-9+Math.sin(t*.7+i)*3} 200 ${y} T430 ${y}`} fill="none" stroke={palette.light} opacity=".1" strokeWidth="1.3"/>)}
  {regionId==='starruins'&&<g stroke={palette.light} opacity=".1" fill="none"><path d="M0 280l70-20 20 60-70 20Z M330 25l55 10-12 62-55-10Z"/><path d="M10 287l50-14 17 40-50 15Z M339 37l32 6-8 39-32-6Z"/></g>}
  {regionId==='mistmoon'&&<g fill="#e5e1ff" opacity=".065"><ellipse cx="50" cy="60" rx="150" ry="20"/><ellipse cx="350" cy="160" rx="140" ry="17"/></g>}
  {Array.from({length:12},(_,i)=><ellipse key={i} cx={(i*73+29)%400} cy={22+(i*47)%290} rx={i%3===0?5:2} ry=".8" fill={palette.light} opacity={reduced?.15:.12+Math.max(0,Math.sin(t+i))*.2}/>) }
  </>}
  {active&&!waiting&&!won&&approach>0&&<g data-fishing-shadow="true" transform={`translate(${fx} ${fy}) rotate(${won?-65:warning?-35*Math.min(1,behavior.progress):surge?-15:10}) scale(${lost||escapeProgress>0?-fishScale:fishScale} ${fishScale})`} fill="#092b47" filter={`url(#${id}-depth)`} opacity={shadowOpacity}>{outline?<image href={collectibleUrl(outline.thumbnail_path)} x="-36" y="-32" width="72" height="64" preserveAspectRatio="xMidYMid meet" filter={`url(#${id}-silhouette)`}/>:<><path d="M-28 0Q-16-16 8-9L27-22 23-2 29 16 8 8Q-15 17-28 0Z"/><path d="M-5-8l12-14 4 16Z"/></>}</g>}
  {landingSplash&&<g data-fishing-catch-splash="true" transform={`translate(200 ${nearWater+32})`} pointerEvents="none">
   {[0,1,2].map(i=>{const spread=Math.max(0,(splashProgress-i*.12)/(1-i*.12));return <ellipse key={i} rx={18+spread*(78-i*10)} ry={5+spread*18} fill="none" stroke={i===0?'#efffff':palette.light} strokeWidth={2.5-i*.5} opacity={(1-spread)*.8}/>})}
   <path d={`M-42 3 Q-32 ${-Math.sin(splashProgress*Math.PI)*35} -20 -2 Q-12 ${-Math.sin(splashProgress*Math.PI)*57} 0 -4 Q12 ${-Math.sin(splashProgress*Math.PI)*50} 22 -1 Q33 ${-Math.sin(splashProgress*Math.PI)*30} 44 3 Q0 18 -42 3Z`} fill={palette.light} fillOpacity={(1-splashProgress)*.45} stroke="#e2faff" strokeOpacity={(1-splashProgress)*.7} strokeWidth="1.5"/>
   {Array.from({length:14},(_,i)=>{const side=i%2?1:-1;return <ellipse key={i} cx={side*(8+splashProgress*(25+i%7*9))} cy={-Math.sin(splashProgress*Math.PI)*(28+i%5*12)+splashProgress*splashProgress*16} rx={1.8+i%3*.6} ry={3+i%3} fill={i%3===0?'#f5ffff':palette.light} opacity={(1-splashProgress)*.9} transform={`rotate(${side*splashProgress*25} ${side*(8+splashProgress*(25+i%7*9))} ${-Math.sin(splashProgress*Math.PI)*(28+i%5*12)+splashProgress*splashProgress*16})`}/>})}
  </g>}
  {surge&&!reduced&&[0,1,2].map(i=><path key={i} d={`M${fx+35+i*10} ${fy-10}q12 10 0 20`} fill="none" stroke={palette.light} opacity={.2-i*.05} strokeWidth="2"/>)}
  {surge&&!reduced&&<g data-fishing-resistance="true" pointerEvents="none">
   <ellipse cx={bx} cy={by+10} rx={36+tug*30} ry={12+tug*8} fill={palette.light} opacity={tug*.09}/>
   {[0,1,2,3].map(i=>{const phase=(t*1.5+i/4)%1;return <ellipse key={i} cx={bx} cy={by+10} rx={18+phase*(45+tug*35)} ry={5+phase*(12+tug*8)} fill="none" stroke="#e0f6ff" strokeWidth={1+tug*1.5} opacity={(1-phase)*tug*.65}/>})}
   {[-1,1].map(side=><path key={side} d={`M${bx+side*(24+tug*8)} ${by-20}q${side*12} -12 ${side*20} -30 M${bx+side*38} ${by-8}l${side*23} -12`} fill="none" stroke={palette.light} strokeWidth="2" strokeLinecap="round" opacity={tug*.55}/>)}
  </g>}
  {active&&!waiting&&!won&&[0,1,2].map(i=>{const ripple=(t*1.1+i/3)%1;return <ellipse key={i} cx={bx} cy={by+10} rx={12+ripple*(surge?62:35)} ry={3+ripple*10} stroke={palette.light} fill="none" opacity={reduced?0:(1-ripple)*(surge?.55:.25)} strokeWidth={surge?1.8:1}/>})}
  <ellipse cx={bx} cy={by+10} rx={(surge?28:18)*bobScale} ry="5" stroke={palette.light} fill="none" opacity={.5*(won?1-lift:1)}/>
  <ellipse cx={bx} cy={by+10} rx={(surge?40:28)*bobScale} ry="9" stroke={palette.light} fill="none" opacity={.2*(won?1-lift:1)}/>
  {/* SVG paint order keeps the gauge behind the line, float and rod. Anchor to calm water, not bobbing motion. */}
  {showGauge&&<FloatingRodGauge x={96} y={Math.max(30,nearWater-48)} rod={rod} tension={visual.tension} idle={!(active&&canBite&&!waiting&&!won&&!lost)}/>}
  <path data-fishing-line="true" d={`M${tip.x} ${tip.y} Q${(tip.x+lineEnd.x)/2+(!reduced&&tension>.85?Math.sin(t*38)*2:0)} ${(tip.y+lineEnd.y)/2+(1-tension)*45*(1-tug*.8)} ${lineEnd.x} ${lineEnd.y}`} fill="none" stroke={tension>.85?'#ffd1ba':rod?.id==='mukhyang'?'#5d716b':'#e1edf2'} strokeWidth={1.2+tug*.8}/>
  {!(snapped&&end>.5)&&<g data-fishing-float="true" transform={`translate(${bx} ${by+dip*13}) rotate(${surge?24:dip*12}) scale(${bobScale} ${bobScale*(1-dip*.35)})`} opacity={won?1-end:1-dip*.88}>{(hasRodSkin(rod?.id)||hasRodImages(rod?.id))?<RodSkinFloat id={rod!.id}/>:<><path d="M0-17v12" stroke="#fff1d4" strokeWidth="2.5"/><ellipse rx="5" ry="9" fill="#fff1d4"/><path d="M-5 0a5 9 0 0 0 10 0Z" fill="#eb886f"/></>}</g>}
  {baitImage&&casting&&!reduced&&<g data-fishing-cast-bait="true" transform={`translate(${bx} ${by}) rotate(${Math.sin(cast*Math.PI)*12})`} pointerEvents="none"><path d="M0 9v14" fill="none" stroke="#e1edf2" strokeWidth="1"/><image href={baitImage} x="-16" y="21" width="32" height="32" preserveAspectRatio="xMidYMid meet"/></g>}
  {(splash||reducedSplash)&&<g data-fishing-water-impact="true" data-reduced-motion={reduced} transform={`translate(${bx} ${by+10})`} pointerEvents="none">
   <ellipse rx="28" ry="8" fill="#e6fbff" fillOpacity=".08" stroke="#efffff" strokeWidth="2" opacity=".85"/>
   <ellipse rx="44" ry="13" fill="none" stroke="#e6fbff" strokeWidth="1.5" opacity=".5"/>
  </g>}
  {splash&&Array.from({length:9},(_,i)=>{const phase=(t*1.7+i*.17)%1,angle=i*Math.PI*2/9;return <ellipse key={i} cx={bx+Math.cos(angle)*(8+phase*(won?48:24+motionTug*22))} cy={by+7-Math.sin(phase*Math.PI)*(12+i%3*8+motionTug*12)} rx="2.3" ry="3.7" fill="#efffff" opacity={(1-phase)*.9}/>})}
  {!sceneryOverlay&&<FishingPlatform regionId={regionId} y={platformY} platformHeight={platformHeight}/>}
  <path d={rodPath} fill="none" stroke="#102b42" strokeWidth={rodShaftOutlineWidth(rod?.id)} strokeLinecap="round"/>
  <path d={rodPath} fill="none" data-equipped-rod={rod?.id??"basic"} stroke={rod&&rod.id!=="basic"?rod.color:"#97c8d2"} strokeWidth="2.3" strokeLinecap="round"/>
  {hasRodSkin(rod?.id)&&<RodSkinShaft id={rod!.id} path={rodPath}/>}
  <g transform={`translate(0 ${bottom-62})`}><path d="M303 392l-27-52" stroke={rod?.color??"#76503a"} strokeWidth="13" strokeLinecap="round"/>
  {rod?.id==='mukhyang'&&<g transform={`translate(${tip.x} ${tip.y})`}><path d="M-3 6Q-8-1 0-15Q7-3 3 6Z" fill="#293b35"/><path d="M0-13V4" stroke="#8eaaa0" strokeWidth=".7"/></g>}
  <path d="M299 382l-18-34" stroke={rod&&rod.id!=="basic"?rod.accent:"#c89c6e"} strokeWidth="7" strokeLinecap="round"/>
  {(hasRodSkin(rod?.id)||hasRodImages(rod?.id))?<><g transform="translate(283 344)"><RodSkinGrip id={rod!.id}/></g><g transform="translate(282 358) scale(.4)"><RodSkinFrame id={rod!.id}/><g transform={`rotate(${reduced?0:visual.reel})`}><RodSkinRotor id={rod!.id}/></g></g></>:<>  <g transform={`translate(282 358) rotate(${reduced?0:visual.reel})`}><circle r="12" fill={rod&&rod.id!=="basic"?rod.color:"#183b53"} stroke={rod&&rod.id!=="basic"?rod.accent:"#abc7ce"} strokeWidth="2"/><path d="M-8 0H8M0-8V8" stroke="#abc7ce" strokeWidth="2"/><circle r="4" fill={rod?.accent??"#d7b388"}/><circle cx="8" cy="0" r="3" fill="#d7b388"/></g></>}
  </g>{active&&canBite&&!waiting&&game.time<.7&&<text x="200" y="72" textAnchor="middle" fill="#fff1d4" fontSize="18" fontWeight="bold" opacity={1-game.time/.7}>물었어요!</text>}

 </svg>{label&&<p role="status" className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center text-sm font-semibold text-white drop-shadow-[0_2px_3px_#174575]" style={{left:bx/400*100+'%',top:(by+27)/sceneHeight*100+'%'}}>{label}</p>}</div>
}
