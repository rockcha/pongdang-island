import type {Facility} from './island-model'

export function FacilityCaption({facility,width,height,selected=false}:{facility:Facility;width:number;height:number;selected?:boolean}){
 const words=facility.name.split(' '),lines:string[]=[]
 for(const word of words){
  const last=lines.length-1
  if(last>=0&&lines[last].length+word.length<8)lines[last]+=' '+word
  else lines.push(word)
 }
 const text=lines.slice(0,2),w=Math.max(34,...text.map(line=>line.length*7.2+14)),h=text.length*11+7
 return <g className="island-facility-caption" aria-hidden="true" pointerEvents="none" transform={`translate(${width/2} ${height+3})`}>
  <rect x={-w/2} width={w} height={h} rx="6" fill={selected?'#fff1cd':'#fffcf1'} fillOpacity=".96" stroke={selected?'#ab784a':'#cdbb96'} strokeWidth=".7"/>
  <text textAnchor="middle" fill="#654b35" fontSize="8.5" fontWeight="600">
   {text.map((line,i)=><tspan key={i} x="0" y={11+i*11}>{line}</tspan>)}
  </text>
 </g>
}
