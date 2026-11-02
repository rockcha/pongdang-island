import {hangangCycle,hangangMythicFrame,redCheerBeatTimes} from './hangang-mythic-motion'
import effectLayouts from './hangang-effect-layouts.json'
type Point=readonly [number,number]
export type HangangStroke={points:Point[];alpha:number;width:number;color:number;closed?:boolean;fill?:boolean;layer?:'back'|'front'}
export const hangangMythicIds=['hangang-immortal-turtle-ship','hangang-hunmin-spirit','hangang-ungnyeo-mother','hangang-red-cheer-incarnation','hangang-mago-creator'] as const
const ids=new Set<string>(hangangMythicIds),tau=Math.PI*2
export const hasHangangMythicEffect=(id:string)=>ids.has(id)
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t)}
const ring=(x:number,y:number,rx:number,ry=rx):Point[]=>Array.from({length:25},(_,i)=>[x+Math.cos(i/24*tau)*rx,y+Math.sin(i/24*tau)*ry])
// Explicit geometric strokes keep historical Hangul readable without font dependencies.
export const hunminLetterForms:Record<string,Point[][]>={
 'ㆍ':[ring(0,0,.075)],'ㅡ':[[[-.42,0],[.42,0]]],'ㅣ':[[[0,-.48],[0,.48]]],
 'ㄱ':[[[-.4,-.4],[.35,-.4],[.35,.4]]],'ㄴ':[[[-.35,-.4],[-.35,.4],[.4,.4]]],
 'ㄷ':[[[.38,-.4],[-.35,-.4],[-.35,.4],[.38,.4]]],
 '가':[[[-.44,-.4],[.04,-.4],[.04,.35]],[[.28,-.48],[.28,.48]],[[.28,0],[.49,0]]],
 '나':[[[-.44,-.4],[-.44,.35],[.04,.35]],[[.28,-.48],[.28,.48]],[[.28,0],[.49,0]]],
 '다':[[[.04,-.4],[-.44,-.4],[-.44,.35],[.04,.35]],[[.28,-.48],[.28,.48]],[[.28,0],[.49,0]]],
 'ㆁ':[ring(0,0,.34),[[0,-.53],[0,-.34]]],
 'ㅿ':[[[0,-.44],[-.43,.35],[.43,.35],[0,-.44]]],
 'ㆆ':[ring(0,0,.34),[[-.42,-.51],[.42,-.51]]],
}
const hunminHands:Point[]=[[.757,.495],[.77,.53],[.777,.47],[.785,.474],[.743,.548],[.77,.56],[.77,.55],[.77,.55]]
export function hangangMythicPaths(id:string,time:number,seed=0,reduced=false):HangangStroke[]{
 if(!ids.has(id)||reduced)return []
 const phase=hangangCycle(time,seed),awake=Math.sin(clamp((phase-4)/2)*Math.PI),paths:HangangStroke[]=[]
 const box=(effectLayouts as Record<string,{left:number;top:number;width:number;height:number;hands?:number[][]}>)[id]??{left:0,top:0,width:1,height:1}
 const bodyPoint=([x,y]:readonly number[]):Point=>[(x-box.left)/box.width,(y-box.top)/box.height]
 const add=(points:Point[],alpha:number,color:number,width=.003,closed=false,fill=false,layer:'back'|'front'='front')=>{
  if(alpha>.005)paths.push({points,alpha:clamp(alpha),width,color,closed,fill,layer})
 }
 const ellipse=(x:number,y:number,rx:number,ry:number,a:number,color:number,w=.003,layer:'back'|'front'='front')=>add(ring(x,y,rx,ry),a,color,w,true,false,layer)
 const star=(x:number,y:number,r:number,a:number,color=0xffe5ac)=>add(Array.from({length:9},(_,i)=>{const t=i/8*tau-Math.PI/2,s=i%2?r*.28:r;return [x+Math.cos(t)*s,y+Math.sin(t)*s] as Point}),a,color,.002,true,true)
 const glyph=(letter:string,x:number,y:number,size:number,a:number,progress=1)=>{
  const pens=hunminLetterForms[letter]
  for(let i=0;i<pens.length;i++){
   const reveal=clamp(progress*pens.length-i);if(reveal<=0)continue
   const pen=pens[i],end=Math.max(2,Math.ceil(pen.length*reveal)),points=pen.slice(0,end).map(([px,py])=>[x+px*size,y+py*size] as Point)
   add(points,a*.42,0x65d6c5,.022);add(points,a,0x172e2a,.016);add(points,a,0xffd88d,.008)
  }
 }
 if(id==='hangang-hunmin-spirit'){
  const frame=phase<4?[0,1,2,3,2,1][Math.floor(phase*3)%6]:4+Math.min(3,Math.floor((phase-4)*2))
  const [handX,hy]=bodyPoint(hunminHands[frame]),hx=handX-.055,book=bodyPoint([.49,.72])
  if(phase<1.5){
   for(const [i,letter] of ['ㆍ','ㅡ','ㅣ'].entries())glyph(letter,hx+(i-1)*.065,hy-.08-Math.sin(phase*2+i)*.012,.075,.94,smooth((phase-i*.18)/.5))
  }else if(phase<3.6){
   const step=Math.min(2,Math.floor((phase-1.5)/.7)),t=(phase-1.5)%.7
   glyph(t<.28?['ㄱ','ㄴ','ㄷ'][step]:['가','나','다'][step],hx,hy-.105,.145,.98,t<.28?smooth(t/.2):smooth((t-.28)/.24))
   star(hx+.09,hy-.03,.009,.5)
  }else if(phase<5.35){
   const pull=smooth((phase-3.6)/.6)
   for(const [i,letter] of ['ㆁ','ㅿ','ㆆ','ㆍ'].entries()){
    const x=hx+(i%2?1:-1)*.07,y=hy-.12+Math.floor(i/2)*.09
    glyph(letter,book[0]+(x-book[0])*pull,book[1]+(y-book[1])*pull,.095,.98)
   }
   ellipse(hx,hy-.065,.14,.105,.22+awake*.35,0x9ee2c8,.003)
  }else{
   const t=smooth((phase-5.35)/.65),x=hx+(book[0]-hx)*t,y=hy-.085+(book[1]-hy+.085)*t
   glyph('ㆁ',x,y,.14*(1-t*.65),(1-t)*.98);ellipse(x,y,.075*(1-t),.075*(1-t),(1-t)*.6,0xffd88d,.005)
  }
 }else if(id==='hangang-mago-creator'){
  const frame=hangangMythicFrame(id,phase)!,[hx,hy]=box.hands?bodyPoint(box.hands[frame]):[.87,.36]
  const gather=phase<3?.22*smooth(phase/.35):phase<4?.22*(1-smooth(phase-3)):phase<4.7?smooth((phase-4)/.7):phase<5.25?1:1-smooth((phase-5.25)/.75),baseY=hy-.012
  if(gather>.01){
   const ridge:Point[]=[[hx-.16,baseY],[hx-.11,baseY-.1*gather],[hx-.065,baseY-.04*gather],[hx+.007,baseY-.23*gather],[hx+.065,baseY-.075*gather],[hx+.105,baseY-.145*gather],[hx+.16,baseY]]
   add(ridge,.94,0x243f3b,.004,true,true);add(ridge,.95,0xf1dca9,.0035)
   add(Array.from({length:24},(_,i)=>{const t=i/23;return [hx+.02+Math.sin(t*7+phase*.8)*.025,baseY-.17*gather+t*.165*gather]}),.95,0x83ddd0,.01)
  }
  for(let i=0;i<5;i++){
   const a=phase*tau/6+i*tau/5,r=.035+(1-gather)*.04
   ellipse(hx+Math.cos(a)*r,hy-.03+Math.sin(a)*r*.5,.0035,.0035,.45*(1-gather),i%2?0x9fc8b5:0xd8b77f,.004)
  }
  if(phase>=4){
   const reveal=smooth((phase-4)/.8),fade=1-smooth((phase-5.25)/.75)
   const landscape:Point[]=[[-.03,.55],[.05,.27],[.18,.39],[.3,.13],[.44,.3],[.54,.08],[.73,.3],[.92,.18],[1.12,.58]]
   const ridge=landscape.slice(0,Math.max(2,Math.ceil(landscape.length*reveal)))
   add(ridge,.48*fade,0x1a3938,.012,false,false,'back');add(ridge.map(([x,y])=>[x,y+.008]),.34*fade,0xd8d5ac,.003,false,false,'back')
   if(phase>4.65){const t=smooth((phase-4.65)/.8);star(hx+(.6-hx)*t,hy-.04+(.15-hy+.04)*t,.022,.95*fade)}
  }
 }else if(id==='hangang-immortal-turtle-ship'){
  for(let side=0;side<2;side++)add(Array.from({length:30},(_,i)=>{const t=i/29;return [.05+t*.85,.94+side*.025+Math.sin(t*10-phase*tau/3+side)*.02]}),.35+awake*.4,side?0x66b3ec:0xe67169,.006)
  if(awake>0){
   const shield:Point[]=[[.5,-.12],[1,.18],[.92,.87],[.5,1.18],[.08,.87],[0,.18],[.5,-.12]]
   add(shield,awake*.2,0x315d72,.004,true,true,'back');add(shield,awake*.85,0xf4d798,.008,true,false,'back')
   add(shield.map(([x,y])=>[.5+(x-.5)*.86,.47+(y-.47)*.86]),awake*.6,0xa9e9e1,.003,true,false,'back')
   add([[.92,.5],[1.02,.46],[.97,.53],[1.09,.5],[1.01,.57]],awake*.95,0xffe0a0,.007)
  }
 }else if(id==='hangang-ungnyeo-mother'){
  const [hx,hy]=bodyPoint([.69,.43])
  for(let i=0;i<5;i++){
   const t=(phase/6+i/5)%1,x=hx-.04+Math.sin(i*2.3+t*2)*.045,y=hy+.035-t*.12,a=Math.sin(t*Math.PI)*(.35+awake*.5)
   add([[x-.008,y],[x,y-.018],[x+.01,y],[x,y+.009],[x-.008,y]],a,0x9fc69a,.002,true,true);star(x+.01,y+.018,.0035,a)
  }
  if(awake>0){
   const bear:Point[]=[[.1,.44],[.05,.25],[.12,.13],[.15,-.03],[.24,-.06],[.3,.06],[.49,.06],[.56,-.06],[.65,-.03],[.69,.14],[.76,.26],[.72,.44],[.61,.53],[.22,.53],[.1,.44]]
   add(bear,awake*.7,0xf8dba1,.0035,false,false,'back');for(const [x,y] of bear.slice(0,-1))star(x,y,.004,awake*.85)
   for(const x of [.45,.54,.62]){
    const y=.77,h=.065*awake;add([[x,y],[x,y-h]],awake*.9,0xb5d59e,.003)
    add([[x,y-h*.55],[x-.017,y-h*.8],[x-.018,y-h*.4],[x,y-h*.55],[x+.017,y-h],[x+.019,y-h*.55],[x,y-h*.55]],awake*.9,0x9fc69a,.002,true,true)
   }
  }
 }else{
  const dx=.79,dy=.64
  add(Array.from({length:20},(_,i)=>{const t=i/19;return [.55+t*.07,.49+Math.sin(t*3+phase*tau/2)*.012]}),.45,0xf78b60,.004)
  for(const beat of redCheerBeatTimes){const t=(phase-beat)/.55;if(t>=0&&t<=1){ellipse(dx,dy,.035+t*.17,.025+t*.13,(1-t)*.85,0xffbe79,.006);ellipse(dx,dy,.025+t*.13,.02+t*.095,(1-t)*.7,0xef6c5f,.003)}}
  const horns=smooth((phase-5.4)/.2)*(1-smooth((phase-5.7)/.3))
  for(const side of [-1,1])add([[.63+side*.055,.36],[.63+side*.09,.31],[.63+side*.085,.26],[.63+side*.045,.315]],horns*.95,0xffc181,.005,false,false,'back')
 }
 return paths.map(p=>({...p,width:p.width*Math.min(box.width,box.height),points:p.points.map(([x,y])=>[box.left+x*box.width,box.top+y*box.height] as Point)}))
}
export function drawHangangMythicCanvas(context:CanvasRenderingContext2D,id:string,time:number,seed:number,reduced:boolean,x:number,y:number,size:number,layer:'back'|'front'='front'){
 const paths=hangangMythicPaths(id,time,seed,reduced).filter(p=>(p.layer??'front')===layer)
 if(!paths.length)return
 context.save();context.translate(x,y);context.scale(size,size);context.lineCap='square';context.lineJoin='miter'
 for(const path of paths){context.beginPath();path.points.forEach(([px,py],i)=>i?context.lineTo(px,py):context.moveTo(px,py));if(path.closed)context.closePath();context.globalAlpha=path.alpha;context.lineWidth=path.width;context.strokeStyle=context.fillStyle='#'+path.color.toString(16).padStart(6,'0');if(path.fill)context.fill();else context.stroke()}
 context.restore()
}
