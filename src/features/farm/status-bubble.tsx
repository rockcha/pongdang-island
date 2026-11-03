import {useEffect,useId,useState,type ReactNode} from 'react'
import {Hammer,Pickaxe,Scissors,FlaskConical,Wheat,ChefHat} from 'lucide-react'
import './status-bubble.css'
import {FarmDiscardIcon} from './discard-icon'
// One outline joins the circular body to its tail without an internal seam.
const bubbleOutline='M5 16.292A18 18 0 1 0 -5 16.292L0 24Z'
export function StatusGlyph({kind}:{kind:'hammer'|'pickaxe'|'harvest'|'research'|'mill'|'craft'|'trash'}){
 if(kind==='trash')return <FarmDiscardIcon x="-18" y="-19" width="36" height="36"/>
 const Icon={hammer:Hammer,pickaxe:Pickaxe,harvest:Scissors,research:FlaskConical,mill:Wheat,craft:ChefHat}[kind]
 return <g transform="translate(-9 -10)" color="#8c6a43"><Icon size={18} strokeWidth={1.7}/></g>
}
export function FarmStatusBubble({x,y,label,progress,remaining,ready=false,resting=false,warning=false,children,onActivate,revealTime=false}:{x:number;y:number;label:string;progress?:number;remaining?:number;ready?:boolean;resting?:boolean;warning?:boolean;children:ReactNode;onActivate?:()=>void;revealTime?:boolean}){
 const clip=useId().replace(/[^a-zA-Z0-9_-]/g,''),[showTime,setShowTime]=useState(false),percent=Math.max(0,Math.min(1,progress??0))
 useEffect(()=>{if(!showTime)return;const timer=window.setTimeout(()=>setShowTime(false),2600);return()=>window.clearTimeout(timer)},[showTime])
 function activate(){if(remaining!==undefined&&remaining>0)setShowTime(true);else onActivate?.()}
 const interactive=!!onActivate||remaining!==undefined
 return <g transform={`translate(${x} ${y})`} data-status-bubble={label} data-warning={warning||undefined} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?label:undefined} onClick={event=>{event.stopPropagation();activate()}} onKeyDown={event=>{if(interactive&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();activate()}}}>
  <rect x="-25" y="-26" width="50" height="56" fill="transparent"/>
  <g pointerEvents="none" className={ready?'farm-status-ready':resting?'farm-status-resting':undefined} role={progress!==undefined?'progressbar':undefined} aria-label={progress!==undefined?label:undefined} aria-valuenow={progress!==undefined?Math.round(percent*100):undefined} aria-valuemin={progress!==undefined?0:undefined} aria-valuemax={progress!==undefined?100:undefined}>
   <defs><clipPath id={clip}><path d={bubbleOutline}/></clipPath></defs>
   <path d={bubbleOutline} fill="#fff8e9"/>
   {progress!==undefined&&<g clipPath={`url(#${clip})`}><rect data-bubble-fill="true" x="-19" y={24-43*percent} width="38" height={43*percent} fill={warning?'#f5d3ac':ready?'#f2db9f':'#d6e1bb'}/></g>}
   <path d={bubbleOutline} fill="none" stroke={warning?'#c67b3e':ready?'#bd943c':'#c9ad80'} strokeWidth="1.2" strokeLinejoin="round"/>
   {(showTime||revealTime)&&remaining!==undefined&&remaining>0?<text x="0" y="3" textAnchor="middle" fill="#7e5e3d" fontSize="10" fontWeight="500">{Math.ceil(remaining)}초</text>:children}
  </g>
 </g>
}
