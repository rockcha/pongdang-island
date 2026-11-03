import type {CropKind} from './crop-catalog'

export function CropFieldArt({crop,progress}:{crop:CropKind;progress:number}){
 const mature=progress>=1,wheat=crop==='wheat',scale=.35+Math.min(1,progress)*.65
 return <g>{[11,21,30].flatMap((x,i)=>[13,26].map((y,j)=><g key={`${i}-${j}`} transform={`translate(${x} ${y}) scale(${scale})`}>
  {wheat?<><path d="M0 3V-10" stroke={mature?'#8e7339':'#65864b'} strokeWidth="1.5"/><path d="M0-1Q-7-1-5-6 0-6 0-1M0-5Q6-5 5-10 0-10 0-5M0-9Q-5-10-3-14 1-13 0-9M0-11Q4-13 2-16 0-15 0-11" fill={mature?'#edc969':'#97b56a'} stroke={mature?'#bd9149':'#6c944f'} strokeWidth=".7"/></>:<><path d="M0 2V-8" stroke="#65824b" strokeWidth="1.5"/><path d="M0-2Q-9-1-7-7-1-9 0-2M0-5Q7-11 9-5 6 0 0-5M0-6Q-4-14 1-13 6-9 0-6" fill={mature?'#70974f':'#9db96e'} stroke="#557a42" strokeWidth=".6"/>{mature&&<><ellipse cx="-3" cy="3" rx="4" ry="2.7" fill="#d4ad78" stroke="#a57d50" strokeWidth=".7"/><ellipse cx="3" cy="2" rx="3.5" ry="2.6" fill="#e0bd88" stroke="#a57d50" strokeWidth=".7"/><circle cx="-4" cy="3" r=".5" fill="#9f794e"/></>}</>}
 </g>))}</g>
}
