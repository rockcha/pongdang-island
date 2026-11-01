type Point=readonly [number,number]
export type HangangStroke={points:Point[];alpha:number;width:number;color:number;closed?:boolean;fill?:boolean}
export const hangangMythicIds=['hangang-immortal-turtle-ship','hangang-hunmin-spirit','hangang-ungnyeo-mother','hangang-red-cheer-incarnation'] as const
const ids=new Set<string>(hangangMythicIds),tau=Math.PI*2
export const hasHangangMythicEffect=(id:string)=>ids.has(id)
// Hand-drawn Hangul strokes keep the letters readable in both Canvas and Phaser,
// independent of installed fonts. Each nested path is a separate pen stroke.
const hangul:Point[][][]=[
 [[[0,-.9],[0,-.75]],[[-.35,-.65],[.35,-.65]],[[-.25,-.48],[-.15,-.6],[.15,-.6],[.25,-.48],[.15,-.35],[-.15,-.35],[-.25,-.48]],[[-.5,-.1],[.5,-.1]],[[0,-.1],[0,.2]],[[-.35,.35],[-.35,.75],[.4,.75]]],
 [[[-.45,-.65],[.1,-.65],[.1,-.1],[-.45,-.1],[-.45,-.65]],[[.45,-.75],[.45,.1]],[[-.3,.35],[-.3,.75],[.4,.75]]],
 [[[-.5,-.65],[.15,-.65]],[[-.15,-.65],[-.15,-.4],[-.45,-.05]],[[-.15,-.4],[.2,-.05]],[[.5,-.75],[.5,.05]],[[.25,-.35],[.5,-.35]],[[-.25,.4],[-.05,.25],[.25,.35],[.35,.55],[.2,.75],[-.1,.75],[-.3,.55],[-.25,.4]]],
 [[[-.15,-.8],[.15,-.8],[.35,-.6],[.2,-.35],[-.1,-.3],[-.35,-.55],[-.15,-.8]],[[-.5,-.05],[.5,-.05]],[[-.35,.3],[.35,.3],[.35,.8],[-.35,.8],[-.35,.3]]],
]
export function hangangMythicPaths(id:string,time:number,seed=0,reduced=false):HangangStroke[]{
 if(!ids.has(id)||reduced)return []
 const phase=((time+seed/1000000)%6+6)%6,awake=Math.max(0,Math.sin((phase-4)/2*Math.PI)),paths:HangangStroke[]=[]
 const add=(points:Point[],alpha:number,color:number,width=.0025,closed=false,fill=false)=>{if(alpha>.005)paths.push({points,alpha,width,color,closed,fill})}
 const ellipse=(x:number,y:number,rx:number,ry:number,alpha:number,color:number,width=.0025)=>add(Array.from({length:33},(_,i)=>[x+Math.cos(i/32*tau)*rx,y+Math.sin(i/32*tau)*ry]),alpha,color,width,true)
 if(id==='hangang-immortal-turtle-ship'){
  // The two taegeuk currents follow the hull; the prow emits a bounded signal.
  for(let side=0;side<2;side++){
   const color=side?0x5ba7f2:0xe16a64
   add(Array.from({length:28},(_,i)=>{const t=i/27;return [.19+t*.61,.67+side*.018+Math.sin(t*9-phase*2+side)*.014]}),.2+awake*.4,color,.0035)
  }
  if(awake>0){
   add([[.72,.46],[.79,.435],[.76,.47],[.84,.46],[.78,.49]],awake*.8,0xf5d69a,.004)
   for(let i=0;i<3;i++)ellipse(.48,.56,.13+i*.034,.055+i*.014,awake*(.32-i*.07),0xa3d7ed)
  }
 }else if(id==='hangang-hunmin-spirit'){
  // 훈·민·정·음 orbit the opened book as four independent, legible symbols.
  for(let i=0;i<4;i++){
   const angle=-Math.PI*.85+i*Math.PI*.55+Math.sin(phase*.7)*.12
   const x=.5+Math.cos(angle)*(.18+awake*.035),y=.42+Math.sin(angle)*.12
   const size=.025+awake*.006
   for(const pen of hangul[i])add(pen.map(([px,py])=>[x+px*size,y+py*size]),.3+awake*.6,i%2?0x8ce5dd:0xffe3a2,.0025)
  }
  add([[.37,.66],[.5,.69],[.63,.66]],.22+awake*.6,0xffe3a2,.003)
 }else if(id==='hangang-ungnyeo-mother'){
  // Mugwort leaves, warm seeds and a small bear constellation, not fire or text.
  for(let i=0;i<5;i++){
   const t=(phase/6+i/5)%1,x=.37+Math.sin(i*2.3+t*2)*.09,y=.73-t*.37,a=Math.sin(t*Math.PI)*(.18+awake*.55)
   add([[x-.012,y],[x,y-.025],[x+.013,y],[x,y+.014],[x-.012,y]],a,0xa8cdaa,.002,true)
   add([[x,y+.016],[x,y-.018]],a,0xffe7bb,.0015)
  }
  if(awake>0){
   const bear:Point[]=[[.5,.28],[.53,.245],[.56,.27],[.62,.27],[.65,.245],[.68,.29],[.665,.345],[.59,.37],[.52,.345],[.5,.28]]
   add(bear,awake*.45,0xffdf9e,.002)
   for(const [x,y] of bear.slice(0,7))ellipse(x,y,.003,.003,awake*.7,0xffdf9e)
  }
 }else{
  // Drum beats become expanding sound rings; compact red ribbons echo the cheer.
  for(let i=0;i<3;i++){
   const t=(phase/1.5+i/3)%1
   ellipse(.54,.55,.07+t*.14,.035+t*.08,(1-t)*(.12+awake*.45),i%2?0xffd28c:0xf37667,.0025)
  }
  for(let i=0;i<3;i++)add(Array.from({length:18},(_,n)=>{const t=n/17;return [.32+i*.17+Math.sin(t*8-phase*3+i)*t*.017,.66-t*(.18+awake*.08)]}),.2+awake*.5,i===1?0xffd28c:0xed625b,.003)
 }
 return paths
}
export function drawHangangMythicCanvas(context:CanvasRenderingContext2D,id:string,time:number,seed:number,reduced:boolean,x:number,y:number,size:number){
 const paths=hangangMythicPaths(id,time,seed,reduced)
 if(!paths.length)return
 context.save();context.translate(x,y);context.scale(size,size);context.lineCap='round';context.lineJoin='round'
 for(const path of paths){context.beginPath();path.points.forEach(([px,py],i)=>i?context.lineTo(px,py):context.moveTo(px,py));if(path.closed)context.closePath();context.globalAlpha=path.alpha;context.lineWidth=path.width;context.strokeStyle=context.fillStyle='#'+path.color.toString(16).padStart(6,'0');if(path.fill)context.fill();else context.stroke()}
 context.restore()
}
