import type {Facility} from './island-model'
/** Draw in the real footprint so neighboring bridge pieces share the same deck width. */
export function WaterwayDecoration({f,rotation=0}:{f:Facility;rotation?:number}){
 const horizontal=rotation%180===90,w=(horizontal?f.h:f.w)*32,h=(horizontal?f.w:f.h)*32
 if(f.kind==='bridge'){
  const reverse=rotation===180||rotation===270
  const length=horizontal?w:h,planks=Math.max(4,Math.round(length/8))
  const rail=(offset:number)=><g>{horizontal?<><rect x="0" y={offset} width={w} height="3" rx="1.5" fill={reverse?'#b28b61':'#cba97a'} stroke="#97764f" strokeWidth=".7"/>{[2,w-5].map(x=><rect key={x} x={x} y={offset-5} width="3" height="11" rx="1" fill="#b58c5c" stroke="#93734c" strokeWidth=".7"/>)}</>:<><rect x={offset} y="-5" width="3" height={h+3} rx="1.5" fill={reverse?'#b28b61':'#cba97a'} stroke="#97764f" strokeWidth=".7"/>{[0,h-9].map(y=><rect key={y} x={offset-.5} y={y-4} width="4" height="12" rx="1" fill="#b58c5c" stroke="#93734c" strokeWidth=".7"/>)}</>}</g>
  return <g data-art-direction={rotation} data-waterway="bridge"><rect x={horizontal?0:4} y={horizontal?5:0} width={horizontal?w:24} height={horizontal?23:h} rx="2" fill="#557f78" opacity=".15"/>
   <rect x={horizontal?0:3} y={horizontal?3:0} width={horizontal?w:26} height={horizontal?26:h} rx="2" fill="#a57e54"/>
   {Array.from({length:planks},(_,i)=><g key={i}><rect x={horizontal?i*length/planks+.5:4} y={horizontal?4:i*length/planks+.5} width={horizontal?length/planks-1:24} height={horizontal?24:length/planks-1} rx=".8" fill={i%2?'#d8b787':'#cfaa78'} stroke="#b18c60" strokeWidth=".6"/><path d={horizontal?`M${i*length/planks+2} 10v11`:`M10 ${i*length/planks+3}h11`} stroke="#bb9669" strokeWidth=".65" opacity=".6"/></g>)}
   {rail(1)}{rail(28)}<circle cx={reverse?w-6:6} cy={horizontal?5:3} r="1" fill="#f2dbad"/>
  </g>
 }
 if(f.kind==='stepping-stones')return <g data-waterway="stones"><path d="M3 26q6 3 11 0m6-18q5 2 9 0" fill="none" stroke="#daeee3" strokeWidth="1" opacity=".65"/>{[{x:8,y:23,rx:7,ry:4},{x:21,y:14,rx:7,ry:4},{x:11,y:5,rx:6,ry:3.5}].map((p,i)=><g key={i}><ellipse cx={p.x} cy={p.y+2} rx={p.rx+1} ry={p.ry} fill="#668c88" opacity=".2"/><ellipse cx={p.x} cy={p.y+1} rx={p.rx} ry={p.ry} fill="#9d9d8d"/><ellipse cx={p.x} cy={p.y-1} rx={p.rx} ry={p.ry} fill="#c7c6b1" stroke="#a3a48e" strokeWidth=".7"/><path d={`M${p.x-3} ${p.y-2}h4`} stroke="#e6dfc5" strokeWidth=".8"/></g>)}</g>
 return <g data-waterway="reeds"><ellipse cx="16" cy="27" rx="13" ry="4" fill="#829b74" opacity=".2"/><path d="M8 28Q5 14 7 1M14 28Q13 10 15-7M19 28Q22 9 24-3M25 29Q28 18 28 9" fill="none" stroke="#839564" strokeWidth="1.5" strokeLinecap="round"/>{[{x:7,y:0},{x:15,y:-7},{x:24,y:-3}].map((p,i)=><rect key={i} x={p.x-1.5} y={p.y} width="3" height="9" rx="1.5" fill={i%2?'#ad8a59':'#b99b68'}/>)}<path d="M14 27Q2 24 3 15q8 1 11 12m4-2q4-12 12-11-3 9-12 11m-4 3Q8 8 4 6q-1 15 10 22" fill="#a2b77e" stroke="#859d68" strokeWidth=".6"/></g>
}
