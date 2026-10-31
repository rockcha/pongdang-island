import type {CSSProperties} from 'react'

export function ShamanSandMagic(){
 return <svg className="shaman-sand-magic" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <g className="sand-atom">
   {[0,60,120].map((angle,index)=><g key={angle} transform={`rotate(${angle} 50 50)`} style={{'--sand-period':`${3.8+index*.7}s`,'--sand-delay':`${-index*1.1}s`} as CSSProperties}>
    <ellipse className="sand-orbit-track" cx="50" cy="50" rx="39" ry="15"/>
    <circle className="sand-orbit-grain" r="2"/>
    <circle className="sand-orbit-grain is-trailing" r="1.1"/>
   </g>)}
  </g>
  <circle className="sand-core-halo" cx="50" cy="50" r="7"/>
  <path className="sand-core-spiral" d="M50 50c-2-2 1-5 4-3 5 3 1 10-5 9-10-2-9-16 1-19 15-4 23 16 10 26"/>
 </svg>
}
