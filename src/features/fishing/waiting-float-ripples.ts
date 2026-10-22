// Seed each quiet burst once per cycle; frame rate never changes its timing.
export function waitingFloatRipples(seed:number,time:number){
 if(!Number.isFinite(time)||time<0)return []
 const cycle=Math.floor(time/6.5)
 const roll=(salt:number)=>{const n=Math.sin(seed*1.37+cycle*91.7+salt*73.1)*43758.5453;return n-Math.floor(n)}
 const age=time-cycle*6.5-(.8+roll(1)*2.6)
 return [0,1].flatMap(index=>{
  const progress=(age-index*.45)/2.1
  if(progress<=0||progress>=1)return []
  const radius=8+progress*(17+roll(2)*9)
  return [{key:cycle*2+index,rx:radius,ry:radius*.28,opacity:Math.sin(progress*Math.PI)*(.11+roll(3)*.05),dx:(roll(4)-.5)*3}]
 })
}
