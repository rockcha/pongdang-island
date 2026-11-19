type Point={x:number;y:number}
export type RodCurve=readonly [Point,Point,Point,Point]

export function pointOnRodCurve([base,lower,upper,tip]:RodCurve,t:number):Point{
 const u=1-t
 const coordinate=(axis:keyof Point)=>u**3*base[axis]+3*u*u*t*lower[axis]+3*u*t*t*upper[axis]+t**3*tip[axis]
 return {x:coordinate('x'),y:coordinate('y')}
}

export function RodLineGuides({curve,accent}:{curve:RodCurve;accent:string}){
 const [base,lower,upper,tip]=curve
 return <g data-rod-line-guides="" aria-hidden="true">
  {[.13,.35,.59,.81].map((t,index)=>{
   const u=1-t
   const point=pointOnRodCurve(curve,t)
   const tangent=(axis:keyof Point)=>u*u*(lower[axis]-base[axis])+2*u*t*(upper[axis]-lower[axis])+t*t*(tip[axis]-upper[axis])
   const angle=Math.atan2(tangent('y'),tangent('x'))*180/Math.PI
   return <g key={t} transform={`translate(${point.x} ${point.y}) rotate(${angle}) scale(${1-index*.13})`}>
    <path d="M-3.4 0h6.8M0 0v-3.7" stroke="#392733" strokeWidth="2.7" strokeLinecap="round"/>
    <ellipse cy="-5.5" rx="2.15" ry="2.65" fill="none" stroke="#392733" strokeWidth="2.7"/>
    <path d="M-3.4-.65h6.8M0-1v-2" stroke={accent} strokeWidth="1.05" strokeLinecap="round"/>
    <ellipse cy="-5.5" rx="2.15" ry="2.65" fill="none" stroke={accent} strokeWidth="1.05"/>
   </g>
  })}
 </g>
}
