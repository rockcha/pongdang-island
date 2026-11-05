import {useEffect,useState,type ReactNode} from 'react'
import {Hammer,Pickaxe,Scissors,FlaskConical,Wheat,ChefHat} from 'lucide-react'
import './status-bubble.css'
import {FarmDiscardIcon} from './discard-icon'
import {formatFarmRemaining} from './work-status'
// One outline joins the circular body to its tail without an internal seam.
const bubbleOutline='M5 16.292A18 18 0 1 0 -5 16.292L0 24Z'
export function FarmSleepGlyph(){
 return <g className="farm-sleep-letters" fill="#a48a6c" fontFamily="Georgia, serif" fontWeight="500" aria-hidden="true"><text className="farm-sleep-letter" x="-9" y="9" fontSize="8">z</text><text className="farm-sleep-letter farm-sleep-second" x="-2" y="2" fontSize="10">z</text><text className="farm-sleep-letter farm-sleep-third" x="5" y="-5" fontSize="12">Z</text></g>
}
export function StatusGlyph({kind}:{kind:'hammer'|'pickaxe'|'harvest'|'research'|'mill'|'craft'|'trash'}){
 if(kind==='trash')return <FarmDiscardIcon x="-18" y="-19" width="36" height="36"/>
 const Icon={hammer:Hammer,pickaxe:Pickaxe,harvest:Scissors,research:FlaskConical,mill:Wheat,craft:ChefHat}[kind]
 return <g transform="translate(-9 -10)" color="#8c6a43"><Icon size={18} strokeWidth={1.7}/></g>
}
export function FarmStatusBubble({x,y,label,progressLabel,progress,remaining,ready=false,resting=false,warning=false,children,onActivate,revealTime=false,compact=false}:{x:number;y:number;label:string;progressLabel?:string;progress?:number;remaining?:number;ready?:boolean;resting?:boolean;warning?:boolean;children:ReactNode;onActivate?:()=>void;revealTime?:boolean;compact?:boolean}){
 const [showTime,setShowTime]=useState(false),percent=ready?1:Math.max(0,Math.min(1,progress??0)),radius=compact?11:18,gauge=progress!==undefined,time=(showTime||revealTime)&&remaining!==undefined&&remaining>0?formatFarmRemaining(remaining):null,tooltipWidth=time?Math.max(40,time.length*6+16):0
 useEffect(()=>{if(!showTime)return;const timer=window.setTimeout(()=>setShowTime(false),2600);return()=>window.clearTimeout(timer)},[showTime])
 function activate(){if(remaining!==undefined&&remaining>0)setShowTime(true);else onActivate?.()}
 const interactive=!!onActivate||remaining!==undefined
 return <g transform={`translate(${x} ${y})`} data-status-bubble={label} data-warning={warning||undefined} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?label:undefined} onClick={event=>{event.stopPropagation();activate()}} onKeyDown={event=>{if(interactive&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();activate()}}}>
  <rect x={compact?-18:-25} y={compact?-18:-26} width={compact?36:50} height={compact?36:56} fill="transparent"/>
  <g pointerEvents="none" className={`${gauge?'farm-progress-gauge ':''}${ready?'farm-status-ready':resting?'farm-status-resting':''}`} role={gauge?'progressbar':undefined} aria-label={gauge?progressLabel??label:undefined} aria-valuenow={gauge?Math.round(percent*100):undefined} aria-valuemin={gauge?0:undefined} aria-valuemax={gauge?100:undefined}>
   {gauge?<>
    <circle r={radius+2} fill="#fff8e9" stroke="#d9c7aa" strokeWidth=".8"/>
    <circle r={radius} fill="none" stroke="#e9dfcd" strokeWidth="2.4"/>
    <circle data-gauge-fill="true" className="farm-gauge-fill" r={radius} fill="none" stroke={warning?'#cc9a58':ready?'#bf9a50':'#9caa77'} strokeWidth="2.4" strokeLinecap="round" pathLength="100" strokeDasharray={`${percent*100} 100`} transform="rotate(-90)"/>
    {ready&&<circle className="farm-gauge-complete" r={radius+3} fill="none" stroke="#d4b470" strokeWidth="1.5"/>}
    <g transform={compact?'scale(.55)':'scale(.9)'}>{children}</g>
   </>:<g transform={compact?'scale(.65)':undefined}><path d={bubbleOutline} fill="#fff8e9" stroke={warning?'#c67b3e':'#c9ad80'} strokeWidth="1.2" strokeLinejoin="round"/>{children}</g>}
  </g>
  {time&&<g className="farm-work-time" pointerEvents="none" role="status"><rect x={-tooltipWidth/2} y={-radius-27} width={tooltipWidth} height="20" rx="8" fill="#fff8e9" stroke="#d9c7aa" strokeWidth=".8"/><text x="0" y={-radius-13} textAnchor="middle" fill="#7e5e3d" fontSize="10">{time}</text></g>}
 </g>
}
