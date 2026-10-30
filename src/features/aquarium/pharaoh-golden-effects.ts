type Point=readonly [number,number]
export type GoldenStroke={points:Point[];alpha:number;width:number;color:number;closed?:boolean;fill?:boolean}
const ids=new Set(['pharaoh-obelisk-colossus','pharaoh-gold-wing-horus','pharaoh-gatekeeper-anubis','pharaoh-solar-scarab'])
export const hasPharaohAwakening=(id:string)=>ids.has(id)
const tau=Math.PI*2,gold=0xffd15b,ivory=0xffefb0
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
export function pharaohAwakeningPhase(time:number,seed=0){return ((time+seed/1000000)%6+6)%6}
export function pharaohAwakeningLight(time:number,seed=0,reduced=false){
 if(reduced)return 0
 const phase=pharaohAwakeningPhase(time,seed)
 return smooth(4,4.65,phase)*(1-smooth(5.35,6,phase))
}
// Small vector engravings avoid missing hieroglyph fonts and extra textures.
const glyphs:readonly (readonly Point[])[]=[
 [[0,-1],[-.4,-.8],[-.4,-.4],[0,-.2],[.4,-.4],[.4,-.8],[0,-1],[0,1],[0,0],[-.7,0],[.7,0]],
 [[-.9,0],[-.4,-.5],[.4,-.5],[.9,0],[.4,.5],[-.4,.5],[-.9,0],[0,0],[0,.1]],
 [[-.7,-1],[.7,-1],[.7,-.6],[-.5,-.6],[-.5,-.1],[.5,-.1],[.5,.4],[-.5,.4],[-.5,1],[.7,1]],
 [[-.7,.9],[0,-.9],[.7,.9],[-.7,.9],[0,.3],[.7,.9]],
 [[0,-1],[0,1],[-.6,.5],[0,1],[.6,.5]],
]
export function pharaohGoldenPaths(id:string,time:number,seed=0,reduced=false):GoldenStroke[]{
 if(!hasPharaohAwakening(id))return []
 const phase=reduced?0:pharaohAwakeningPhase(time,seed),power=pharaohAwakeningLight(time,seed,reduced),paths:GoldenStroke[]=[]
 const stroke=(points:Point[],alpha:number,width=.0022,color=gold,closed=false,fill=false)=>{if(alpha>.002)paths.push({points,alpha,width,color,closed,fill})}
 const ellipse=(x:number,y:number,rx:number,ry:number,rotation:number,alpha:number,width=.0022,fill=false)=>{
  const c=Math.cos(rotation),s=Math.sin(rotation)
  stroke(Array.from({length:33},(_,i)=>{const a=i/32*tau,px=Math.cos(a)*rx,py=Math.sin(a)*ry;return [x+px*c-py*s,y+px*s+py*c] as Point}),alpha,width,fill?ivory:gold,true,fill)
 }
 const symbol=(index:number,x:number,y:number,size:number,angle:number,alpha:number)=>{
  const c=Math.cos(angle),s=Math.sin(angle)
  stroke(glyphs[index%glyphs.length].map(([px,py])=>[x+(px*c-py*s)*size,y+(px*s+py*c)*size]),alpha,.0025,ivory)
 }
 if(id==='pharaoh-obelisk-colossus'){
  // Engraved seams remain near the body. The atom exists only during awakening.
  stroke([[.589,.455],[.595,.49],[.588,.525],[.595,.565]],.13+power*.65)
  stroke([[.525,.47],[.49,.455],[.45,.463]],.12+power*.5)
  const x=.405,y=.427,r=.074*(.35+.65*power)
  if(power>0){
   for(let i=0;i<3;i++){
    const angle=i*Math.PI/3+(phase-4)*.75,minor=r*(.23+.14*Math.sin((phase-4)*2+i))
    ellipse(x,y,r,minor,angle,power*.18,.006)
    ellipse(x,y,r,minor,angle,power*.95)
    const orbit=(phase-4)*3+i*tau/3,px=Math.cos(orbit)*r,py=Math.sin(orbit)*minor
    ellipse(x+px*Math.cos(angle)-py*Math.sin(angle),y+px*Math.sin(angle)+py*Math.cos(angle),.0045,.0045,0,power,.001,true)
   }
   ellipse(x,y,.009,.009,0,power,.001,true)
  }
 }else if(id==='pharaoh-gold-wing-horus'){
  stroke([[.598,.51],[.607,.54],[.596,.558]],.1+power*.55)
  if(power>0){
   const x=.625,y=.33
   ellipse(x,y,.087,.026,0,power*.5)
   for(let i=0;i<5;i++){
    const a=i/5*tau+(phase-4)*.48,appear=smooth(4+i*.075,4.4+i*.075,phase)
    symbol(i,x+Math.cos(a)*.087,y+Math.sin(a)*.026,.012,Math.sin(a)*.15,power*appear*(.72+.28*(Math.sin(a)+1)/2))
   }
  }
 }else if(id==='pharaoh-gatekeeper-anubis'){
  stroke([[.592,.492],[.59,.535],[.585,.573]],.1+power*.45)
  if(power>0){
   const x=.69,y=.435
   for(let i=0;i<5;i++){
    const a=-Math.PI*.9+i*Math.PI*.21+(phase-4)*.1
    symbol(i,x+Math.cos(a)*.086,y+Math.sin(a)*.075,.012,0,power*smooth(4+i*.06,4.4+i*.06,phase))
   }
   // Both pans light together while the source pose brings the balance level.
   stroke([[.412,.607],[.436,.615],[.46,.607]],power*.9,.003)
   stroke([[.479,.607],[.503,.615],[.527,.607]],power*.9,.003)
  }
 }else{
  // The former scarab slot now holds the golden mask. Keep soul light attached
  // to both eyes; a bounded pair of ribbons replaces the old rotating sun.
  const blue=0x5abaff,ice=0xd5f4ff
  stroke([[.58,.49],[.618,.479],[.655,.494]],.08+power*.55)
  for(const [eyeX,eyeY] of [[.597,.524],[.653,.54]]){
   const ribbon=(u:number):Point=>[eyeX-u*(.17+power*.05),eyeY-u*.07+Math.sin(u*7-phase*tau/3)*u*.018]
   const points=Array.from({length:25},(_,i)=>ribbon(i/24))
   stroke(points,.1+power*.22,.009,blue)
   stroke(points,.16+power*.58,.002,ice)
   for(let i=0;i<3;i++){
    const u=((phase/6+i/3)%1),[x,y]=ribbon(u),a=(.08+power*.6)*Math.sin(u*Math.PI)
    stroke([[x+.005,y+.004],[x,y],[x-.007,y+.004],[x,y],[x-.001,y-.008]],a,.0018,ice)
   }
  }
 }
 return paths
}
export function drawPharaohGoldenCanvas(context:CanvasRenderingContext2D,id:string,time:number,seed:number,reduced:boolean,x:number,y:number,size:number){
 const paths=pharaohGoldenPaths(id,time,seed,reduced)
 if(!paths.length)return
 context.save();context.translate(x,y);context.scale(size,size);context.lineCap='round';context.lineJoin='round'
 for(const path of paths){
  context.beginPath();path.points.forEach(([px,py],i)=>i?context.lineTo(px,py):context.moveTo(px,py));if(path.closed)context.closePath()
  context.globalAlpha=path.alpha;context.lineWidth=path.width;context.strokeStyle=context.fillStyle='#'+path.color.toString(16).padStart(6,'0')
  if(path.fill)context.fill();else context.stroke()
 }
 context.restore()
}
