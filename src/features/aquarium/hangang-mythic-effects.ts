import {hangangCycle,hangangMythicFrame,redCheerBeatTimes} from './hangang-mythic-motion'
import effectLayouts from './hangang-effect-layouts.json'
import typeface from './hunmin-glyphs.json'

type Point=readonly [number,number]
export type HangangStroke={points:Point[];alpha:number;width:number;color:number;closed?:boolean;fill?:boolean;layer?:'back'|'front';mesh?:Point[][];glyphCenter?:Point}
export const hangangMythicIds=['hangang-immortal-turtle-ship','hangang-hunmin-spirit','hangang-ungnyeo-mother','hangang-red-cheer-incarnation','hangang-mago-creator'] as const
const ids=new Set<string>(hangangMythicIds),tau=Math.PI*2
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t)}
const cycle=(time:number,seed:number,period:number)=>((time+seed/1000000)%period+period)%period
const ring=(x:number,y:number,rx:number,ry=rx):Point[]=>Array.from({length:33},(_,i)=>[x+Math.cos(i/32*tau)*rx,y+Math.sin(i/32*tau)*ry])
export const hasHangangMythicEffect=(id:string)=>ids.has(id)
export const hunminLetterForms=typeface.glyphs
export const hunminEffectPeriod=51
// Each written phrase holds for several seconds, separated by quiet intervals.
export function hunminPhrase(time:number,seed=0){
 const phase=cycle(time,seed,hunminEffectPeriod)
 const scenes=[{start:2,end:7,letters:['ㆍ','ㅡ','ㅣ']},{start:9,end:14,letters:['가']},{start:16,end:21,letters:['나']},{start:23,end:28,letters:['다']},{start:30,end:35,letters:['ㆁ']},{start:37,end:42,letters:['ㅿ']},{start:44,end:49,letters:['ㆆ']}] as const
 const scene=scenes.find(s=>phase>=s.start&&phase<s.end)
 return scene?{letters:scene.letters,alpha:smooth(phase-scene.start)*smooth(scene.end-phase)}:null
}
export function hangangMythicPaths(id:string,time:number,seed=0,reduced=false):HangangStroke[]{
 if(!ids.has(id)||reduced)return []
 const phase=hangangCycle(time,seed),slow=cycle(time,seed,12),paths:HangangStroke[]=[]
 const box=(effectLayouts as Record<string,{left:number;top:number;width:number;height:number;hands?:number[][]}>)[id]??{left:0,top:0,width:1,height:1}
 const bodyPoint=([x,y]:readonly number[]):Point=>[(x-box.left)/box.width,(y-box.top)/box.height]
 const add=(points:Point[],alpha:number,color:number,width=.003,closed=false,fill=false)=>{
  if(alpha>.005)paths.push({points,alpha:clamp(alpha),width,color,closed,fill,layer:'front'})
 }
 const ellipse=(x:number,y:number,rx:number,ry:number,a:number,color:number,w=.003)=>add(ring(x,y,rx,ry),a,color,w,true)
 const glow=(x:number,y:number,r:number,a:number,color:number)=>{
  for(let i=0;i<6;i++){const f=1-i*.145;add(ring(x,y,r*f),a*(.025+i*.015),color,0,true,true)}
 }
 const mote=(x:number,y:number,r:number,a:number,color:number)=>{
  glow(x,y,r*3,a*.7,color);add(ring(x,y,r),a,color,0,true,true)
 }
 const magic=(hx:number,hy:number,color:number,light:number,lift:number)=>{
  const pulse=.72+Math.sin(slow*tau/12)*.18,x=hx,y=hy-lift
  glow(x,y,.1,pulse*1.2,color);glow(x,y,.05,pulse,light)
  mote(x,y,.017,pulse,color);mote(x,y,.007,pulse,light)
  // Two open, slowly drifting silk-like arcs instead of an outlined magic circle.
  for(let side=0;side<2;side++){
   const arc=Array.from({length:29},(_,i)=>{const t=i/28,a=-.6+t*Math.PI*1.15+slow*tau/12+side*Math.PI;return [x+Math.cos(a)*(.045+t*.008),y+Math.sin(a)*.024+(t-.5)*.012] as Point})
   add(arc,.14*pulse,color,.014);add(arc,.65*pulse,side?light:color,.004)
  }
  for(let i=0;i<4;i++){
   const angle=slow*tau/12+i*tau/4,r=.036+i*.009
   mote(x+Math.cos(angle)*r,y+Math.sin(angle)*r*.6,.0045,(.4+.2*Math.sin(angle+i))*pulse,i%2?light:color)
  }
 }
 if(id==='hangang-hunmin-spirit'){
  const scene=hunminPhrase(time,seed)
  if(scene&&scene.alpha>.005){
   // Stable hovering text stays readable as the hands articulate underneath it.
   const [hx,hy]=bodyPoint([.785,.475]),size=scene.letters.length>1?.125:['ㆁ','ㅿ','ㆆ'].includes(scene.letters[0])?.26:.205
   for(const [i,letter] of scene.letters.entries()){
    const glyph=typeface.glyphs[letter],x=hx+(i-(scene.letters.length-1)/2)*.115,y=hy+Math.sin(slow*tau/12)*.004
    const point=([px,py]:readonly number[],dx=0,dy=0):Point=>[x+px*size+dx,y+py*size+dy]
    for(const contour of glyph.contours)paths.push({points:contour.map(p=>point(p)),alpha:scene.alpha*.14,color:0x9eddd1,width:.009,closed:true,glyphCenter:[x,y]})
    for(const [color,alpha,dx,dy] of [[0x173d43,.58,.004,.007],[0xffe8bb,.98,0,0]]){
     const mesh=glyph.triangles.map(t=>t.map(p=>point(p,dx,dy)))
     paths.push({points:[],mesh,glyphCenter:[x,y],alpha:scene.alpha*alpha,width:0,color,fill:true,layer:'front'})
    }
   }
  }
 }else if(id==='hangang-mago-creator'){
  const frame=hangangMythicFrame(id,phase)!,[hx,hy]=box.hands?bodyPoint(box.hands[frame]):[.87,.36]
  magic(hx,hy,0x88e5d7,0xffe6b8,.055)
 }else if(id==='hangang-ungnyeo-mother'){
  const [hx,hy]=bodyPoint([.67,.46])
  magic(hx,hy,0x9bd8ac,0xffedc6,.02)
 }else if(id==='hangang-immortal-turtle-ship'){
  const strength=smooth((slow-4)/.8)*(1-smooth((slow-6)/.8))
  if(strength>.005){
   const [mx,my]=bodyPoint([.744,.603]),length=.205*strength
   glow(mx,my,.04,strength*.7,0xffbc6c)
   for(const [scale,color,alpha] of [[1,0xf47e3a,.52],[.8,0xffbd63,.78],[.51,0xffefbd,.94]]){
    const upper:Point[]=[],lower:Point[]=[]
    for(let i=0;i<=30;i++){
     const t=i/30,x=mx+t*length*scale,axis=my-t*.024+Math.sin(t*8-slow*9)*.009*t
     const width=Math.sin(t*Math.PI)**.65*.027*scale*(1+Math.sin(t*12-slow*11)*.18)
     upper.push([x,axis-width]);lower.unshift([x,axis+width*.8])
    }
    add([...upper,...lower],alpha*strength,color,0,true,true)
   }
   for(let i=0;i<3;i++){
    const t=((slow-4)*.7+i/3)%1
    mote(mx+length*t,my-.03*t+Math.sin(t*9+i)*.007,.0025,(1-t)*strength*.65,0xffd996)
   }
  }
 }else{
  // Existing red-devil beats remain tied to the physical drum-contact poses.
  const dx=.79,dy=.64
  add(Array.from({length:20},(_,i)=>{const t=i/19;return [.55+t*.07,.49+Math.sin(t*3+phase*tau/2)*.012]}),.45,0xf78b60,.004)
  for(const beat of redCheerBeatTimes){const t=(phase-beat)/.55;if(t>=0&&t<=1){ellipse(dx,dy,.035+t*.17,.025+t*.13,(1-t)*.85,0xffbe79,.006);ellipse(dx,dy,.025+t*.13,.02+t*.095,(1-t)*.7,0xef6c5f,.003)}}
  const horns=smooth((phase-5.4)/.2)*(1-smooth((phase-5.7)/.3))
  for(const side of [-1,1])add([[.63+side*.055,.36],[.63+side*.09,.31],[.63+side*.085,.26],[.63+side*.045,.315]],horns*.95,0xffc181,.005)
 }
 const map=([x,y]:Point):Point=>[box.left+x*box.width,box.top+y*box.height]
 return paths.map(p=>({...p,width:p.width*Math.min(box.width,box.height),points:p.points.map(map),...(p.mesh?{mesh:p.mesh.map(t=>t.map(map))}:{}),...(p.glyphCenter?{glyphCenter:map(p.glyphCenter)}:{})}))
}
export function drawHangangMythicCanvas(context:CanvasRenderingContext2D,id:string,time:number,seed:number,reduced:boolean,x:number,y:number,size:number,layer:'back'|'front'='front'){
 const paths=hangangMythicPaths(id,time,seed,reduced).filter(p=>(p.layer??'front')===layer)
 if(!paths.length)return
 context.save();context.translate(x,y);context.scale(size,size);context.lineCap='round';context.lineJoin='round'
 for(const path of paths){
  context.beginPath();context.globalAlpha=path.alpha;context.lineWidth=path.width;context.strokeStyle=context.fillStyle='#'+path.color.toString(16).padStart(6,'0')
  if(path.mesh){for(const t of path.mesh){context.moveTo(...t[0]);context.lineTo(...t[1]);context.lineTo(...t[2]);context.closePath()}context.fill()}
  else{path.points.forEach(([px,py],i)=>i?context.lineTo(px,py):context.moveTo(px,py));if(path.closed)context.closePath();if(path.fill)context.fill();else context.stroke()}
 }
 context.restore()
}
