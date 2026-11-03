// A larger seamless repeat avoids placing the same grass mark on every tile.
const tufts=[{x:23,y:29,r:-12},{x:98,y:18,r:8},{x:184,y:42,r:-6},{x:55,y:91,r:12},{x:142,y:107,r:-9},{x:218,y:124,r:5},{x:17,y:161,r:7},{x:89,y:179,r:-8},{x:177,y:169,r:10}]
export function FarmGrassPattern(){
 return <pattern id="farm-grass" width="240" height="200" patternUnits="userSpaceOnUse">
  <rect width="240" height="200" fill="#91ac70"/>
  <ellipse cx="71" cy="44" rx="48" ry="25" fill="#b8cb8d" opacity=".12"/>
  <ellipse cx="180" cy="146" rx="41" ry="29" fill="#74975c" opacity=".08"/>
  <ellipse cx="53" cy="153" rx="29" ry="18" fill="#b8cb8d" opacity=".09"/>
  {tufts.map(({x,y,r},i)=><g key={i} transform={`translate(${x} ${y}) rotate(${r})`} opacity={i%3===0?.7:.46}>
   <path d="M0 5Q-4 3-4 0Q0 1 1 5Q0 0 3-2Q5 2 3 5Q6 1 8 2Q8 5 3 6Z" fill={i%2?'#78995d':'#b3c98c'}/>
   <path d="M1 5Q2 3 2 1" fill="none" stroke={i%2?'#6f9257':'#c0d39b'} strokeWidth=".7" strokeLinecap="round"/>
  </g>)}
  <g fill="#bed098" opacity=".35"><ellipse cx="130" cy="60" rx="1.6" ry=".8"/><ellipse cx="202" cy="83" rx="1.2" ry=".7"/><ellipse cx="111" cy="145" rx="1.5" ry=".8"/></g>
 </pattern>
}
