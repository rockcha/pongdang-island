export const BOARD={width:360,height:520,paddleY:486,paddleWidth:82,ballRadius:6} as const
export const BRICK={width:42,height:20,columns:6,gapX:4,gapY:5,left:44} as const
const BALL_SPEED_MULTIPLIER=1.5
export type Brick={id:number;x:number;y:number;hp:number;maxHp:number}
export type BrickImpact={brickId:number;x:number;y:number;hp:number;destroyed:boolean;source:'ball'|'torpedo'|'wave'}
export const ITEM_KINDS=['item','wide','shield','split','magnet','wave','heart'] as const
export const HAZARD_KINDS=['shark','urchin','ink','seaweed','puffer','sticky','shrink'] as const
export type DropKind=typeof ITEM_KINDS[number]|typeof HAZARD_KINDS[number]
export const isItem=(kind:DropKind)=>ITEM_KINDS.some(item=>item===kind)
export type Drop={id:number;kind:DropKind;x:number;y:number;warning:number;vx?:number;vy?:number;rotation?:number;age?:number}
export function pufferRadius(age:number){return 12+3*(1-Math.cos(age*Math.PI*2/1.2))}
export function pufferFrame(age:number){return Math.floor((age%1.2)/0.3)%4}
export function itemDrop(roll:number):typeof ITEM_KINDS[number]{const normalSlots=(ITEM_KINDS.length-1)*2,slot=Math.max(0,Math.min(normalSlots,Math.floor(roll*(normalSlots+1))));return slot<normalSlots?ITEM_KINDS[Math.floor(slot/2)]:'heart'}
export type Ball={x:number;y:number;vx:number;vy:number;held?:boolean;offset?:number}
export function hazardTouches(drop:Drop,paddleX:number,paddleY:number,paddleWidth:number){
 const dx=Math.max(0,Math.abs(drop.x-paddleX)-Math.max(12,paddleWidth/2-5)),dy=Math.max(0,Math.abs(drop.y-paddleY)-4)
 if(drop.kind==='shark')return (dx/9)**2+(dy/17)**2<=1
 const radius=drop.kind==='puffer'?pufferRadius(drop.age??0)*0.72:drop.kind==='urchin'?9:8
 return dx*dx+dy*dy<=radius*radius
}
export type Shot={id:number;x:number;y:number}
export type DropFeedback={kind:'item'|'hazard';message:string}
export type BrickPhase='ready'|'playing'|'round-clear'|'over'|'banked'
export type BrickScore={phase:BrickPhase;round:number;lives:number;secured:number;pending:number;remaining:number;testMode?:boolean;held?:boolean}
export function brickDrop(roll:number):Drop['kind']|null{return roll<0.25?'shark':roll<0.4?'item':null}

/** Local practice only. No wallet, score submission, or monetary reward calls. */
export class BrickPractice {
 phase:BrickPhase='ready'
 round=1;lives=3;secured=0;pending=0;paddleX=180;invulnerable=0
 testMode=false
 balls:Ball[]=[{x:180,y:450,vx:0,vy:0}]
 get ball(){return this.balls[0]}
 set ball(value:Ball){this.balls=[value]}
 wideSeconds=0;shrinkSeconds=0;fastSeconds=0;inkSeconds=0;stickySeconds=0;shield=false;splitArmed=false
 magnetArmed=false;waveArmed=false
 inkPatches:{x:number;y:number;radius:number}[]=[]
 get paddleWidth(){return this.shrinkSeconds>0?54:this.wideSeconds>0?124:BOARD.paddleWidth}
 bricks:Brick[]=[];drops:Drop[]=[];shots:Shot[]=[]
 height:number=BOARD.height
 get paddleY(){return this.height-(BOARD.height-BOARD.paddleY)}
 private impacts:BrickImpact[]=[]
 private waves:{x:number;y:number}[]=[]
 private feedback:DropFeedback[]=[]
 private serial=0
 private random:()=>number
 constructor(random:()=>number=Math.random){this.random=random;this.buildRound()}
 score():BrickScore{return {phase:this.phase,round:this.round,lives:this.lives,secured:this.secured,pending:this.pending,remaining:this.bricks.length,testMode:this.testMode,held:this.balls.some(b=>b.held)}}
 resize(height:number){
  const previous=this.height;this.height=Math.max(280,height)
  for(const brick of this.bricks){brick.x=BRICK.left+(brick.id%BRICK.columns)*(BRICK.width+BRICK.gapX);brick.y=this.brickTop()+Math.floor(brick.id/BRICK.columns)*(BRICK.height+BRICK.gapY)}
  if(this.phase==='ready')this.resetBall()
  else{for(const ball of this.balls)ball.y*=this.height/previous;for(const drop of this.drops)drop.y*=this.height/previous;for(const shot of this.shots)shot.y*=this.height/previous}
  for(const patch of this.inkPatches)patch.y*=this.height/previous
  this.move(this.paddleX)
 }
 drainImpacts(){const events=this.impacts;this.impacts=[];return events}
 drainWaves(){const events=this.waves;this.waves=[];return events}
 drainFeedback(){const events=this.feedback;this.feedback=[];return events}
 spawnTestDrop(kind:Drop['kind']){
  if(this.phase!=='ready'&&this.phase!=='playing')return
  this.testMode=true
  if(this.drops.length>=30)return
  this.launch()
  this.spawnDrop(kind,this.paddleX,Math.max(32,this.paddleY-150))
 }
 private spawnDrop(kind:DropKind,x:number,y:number){
  const count=kind==='urchin'?3:kind==='puffer'?2:1
  if(this.drops.length+count>30)return
  for(let i=0;i<count;i++)this.drops.push({id:++this.serial,kind,x,y,age:0,warning:kind==='shark'?0.45:0,...(kind==='urchin'?{vx:(i-1)*95+(this.random()-0.5)*65,vy:-110-this.random()*90,rotation:i*Math.PI*2/3}:kind==='puffer'?{vx:i===0?-90:90,vy:185}:{})})
 }
 move(x:number){this.paddleX=Math.max(this.paddleWidth/2+8,Math.min(BOARD.width-this.paddleWidth/2-8,x));if(this.phase==='ready')this.ball.x=this.paddleX;for(const b of this.balls)if(b.held){b.offset=Math.max(-this.paddleWidth/2+6,Math.min(this.paddleWidth/2-6,b.offset??0));b.x=this.paddleX+b.offset;b.y=this.paddleY-12}}
 moveInput(x:number,seconds:number){const max=420*0.5*Math.max(0,Math.min(0.1,seconds));this.move(this.stickySeconds>0?this.paddleX+Math.max(-max,Math.min(max,x-this.paddleX)):x)}
 launch(){
  const boost=this.fastSeconds>0?1.5:1
  if(this.phase==='playing'){for(const b of this.balls)if(b.held){const angle=(b.offset??0)/(this.paddleWidth/2)*0.8,speed=(this.speed()+35)*BALL_SPEED_MULTIPLIER*boost;b.held=false;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed}return}
  if(this.phase!=='ready')return;this.phase='playing';this.ball.vx=105*BALL_SPEED_MULTIPLIER*boost*(this.random()<0.5?-1:1);this.ball.vy=-this.speed()*BALL_SPEED_MULTIPLIER*boost
 }
 nextRound(){if(this.phase!=='round-clear')return;this.round++;this.buildRound()}
 bank(){if(this.phase==='round-clear')this.phase='banked'}
 private speed(){return Math.min(330,225+(this.round-1)*15)}
 private buildRound(){
  this.bricks=Array.from({length:30},(_,id)=>{const row=Math.floor(id/6),col=id%6,hp=1+(row+col+this.round-1)%4;return {id,x:BRICK.left+col*(BRICK.width+BRICK.gapX),y:this.brickTop()+row*(BRICK.height+BRICK.gapY),hp,maxHp:hp}})
  this.impacts=[]
  this.waves=[]
  this.feedback=[]
  this.clearEffects();this.invulnerable=0;this.drops=[];this.shots=[];this.pending=0;this.phase='ready';this.resetBall()
 }
 private brickTop(){return Math.max(34,Math.min(78,48+(this.height-230)*0.27)-BRICK.height*1.5)}
 private resetBall(){this.ball={x:this.paddleX,y:this.paddleY-16,vx:0,vy:0}}
 private clearEffects(){this.wideSeconds=0;this.shrinkSeconds=0;this.fastSeconds=0;this.inkSeconds=0;this.stickySeconds=0;this.inkPatches=[];this.shield=false;this.splitArmed=false;this.magnetArmed=false;this.waveArmed=false}
 damage(missedBall=false){
  if(this.phase!=='playing'||this.invulnerable>0)return false
  if(this.testMode){this.invulnerable=1.1;if(missedBall){this.resetBall();this.phase='ready';this.launch()}return true}
  this.lives--;this.clearEffects();this.drops=[];this.shots=[];this.invulnerable=1.1
  if(this.lives<=0){this.phase='over';this.pending=0}else{this.phase='ready';this.resetBall()}
  return true
 }
 hitBrick(id:number,source:BrickImpact['source']='ball'){
  if(this.phase!=='playing')return
  const brick=this.bricks.find(b=>b.id===id);if(!brick)return
  brick.hp--
  this.impacts.push({brickId:id,x:brick.x+BRICK.width/2,y:brick.y+BRICK.height/2,hp:brick.hp,destroyed:brick.hp===0,source})
  if(this.impacts.length>64)this.impacts.shift()
  if(brick.hp>0)return
  this.bricks=this.bricks.filter(b=>b.id!==id);this.pending++
  if(!this.bricks.length){this.secured+=this.pending;this.pending=0;this.phase='round-clear';this.drops=[];this.shots=[];this.clearEffects();return}
  const category=brickDrop(this.random())
  if(category){const kind=category==='item'?itemDrop(this.random()):HAZARD_KINDS[Math.min(HAZARD_KINDS.length-1,Math.floor(this.random()*HAZARD_KINDS.length))];this.spawnDrop(kind,brick.x+BRICK.width/2,brick.y+BRICK.height/2)}
 }
 private fire(){for(const side of [-1,1])this.shots.push({id:++this.serial,x:this.paddleX+side*(this.paddleWidth/2-9),y:this.paddleY-14})}
 private collect(drop:Drop){
  if(isItem(drop.kind)){
   let message='어뢰 발사!'
   if(drop.kind==='item')this.fire()
   if(drop.kind==='wide'){this.shrinkSeconds=0;this.wideSeconds=8;this.move(this.paddleX);message='널판지가 길어졌어요!'}
   if(drop.kind==='shield'){this.shield=true;message='물방울 보호막!'}
   if(drop.kind==='heart'){message=this.testMode?'하트는 무한이에요!':this.lives>=3?'하트가 가득해요!':'하트 +1!';if(!this.testMode)this.lives=Math.min(3,this.lives+1)}
   if(drop.kind==='magnet'){const held=this.balls.some(b=>b.held);if(!held)this.magnetArmed=true;message=held?'이미 공을 붙잡고 있어요!':'다음 공을 붙잡아요!'}
   if(drop.kind==='wave'){this.waveArmed=true;message='파도 탄환 장전!'}
   if(drop.kind==='split'){
    if(this.balls.length<2)this.splitArmed=true
    message=this.balls.length<2?'다음 벽돌에 맞으면 분열!':'이미 공이 2개예요!'
   }
   this.feedback.push({kind:'item',message});return
  }
  if(this.invulnerable>0)return
  if(this.shield){this.shield=false;this.invulnerable=0.6;this.feedback.push({kind:'item',message:'보호막이 막아줬어요!'});return}
  if(drop.kind==='shark'){if(this.damage())this.feedback.push({kind:'hazard',message:'상어에게 물렸어요 ㅠ'});return}
  let message='성게에 콕! 점수 −3'
  if(drop.kind==='urchin'){this.pending=Math.max(0,this.pending-3);this.invulnerable=0.6}
  if(drop.kind==='puffer'){this.pending=Math.max(0,this.pending-1);this.invulnerable=0.6;message='아앗 따가워'}
  if(drop.kind==='sticky'){this.stickySeconds=6;message='끈적끈적! 움직임이 느려요'}
  if(drop.kind==='shrink'){this.wideSeconds=0;this.shrinkSeconds=6;message='널판지가 줄었어요!'}
  if(drop.kind==='ink'){
   this.inkSeconds=6;message='먹물 때문에 안 보여요!'
   this.inkPatches=Array.from({length:2},(_,i)=>({x:70+this.random()*220,y:80+(this.height-180)*(0.2+i*0.38),radius:38+this.random()*12}))
  }
  if(drop.kind==='seaweed'){
   if(this.fastSeconds<=0)for(const b of this.balls){b.vx*=1.5;b.vy*=1.5}
   this.fastSeconds=6;message='공이 너무 빨라요!'
  }
  this.feedback.push({kind:'hazard',message})
 }
 private splitOnHit(ball:Ball,side:boolean){
  if(!this.splitArmed||this.balls.length>=2||this.phase!=='playing')return
  this.splitArmed=false
  let angle=0.6,c=Math.cos(angle),s=Math.sin(angle)
  const reflectsBack=side?(ball.vx*c-ball.vy*s)*ball.vx<0:(ball.vx*s+ball.vy*c)*ball.vy<0
  if(reflectsBack){angle=-angle;c=Math.cos(angle);s=Math.sin(angle)}
  this.balls.push({x:ball.x,y:ball.y,vx:ball.vx*c-ball.vy*s,vy:ball.vx*s+ball.vy*c})
  this.feedback.push({kind:'item',message:'진주 분열!'})
 }
 step(seconds:number){
  // Small physics steps prevent tunnelling through bricks or the paddle at low FPS.
  let remaining=Math.min(0.1,Math.max(0,seconds))
  while(remaining>0){const dt=Math.min(remaining,1/120);remaining-=dt;this.tick(dt)}
 }
 private tick(dt:number){
  this.invulnerable=Math.max(0,this.invulnerable-dt)
  if(this.phase!=='playing')return
  this.wideSeconds=Math.max(0,this.wideSeconds-dt);this.shrinkSeconds=Math.max(0,this.shrinkSeconds-dt);this.move(this.paddleX)
  this.inkSeconds=Math.max(0,this.inkSeconds-dt)
  this.stickySeconds=Math.max(0,this.stickySeconds-dt)
  if(this.fastSeconds>0){this.fastSeconds=Math.max(0,this.fastSeconds-dt);if(this.fastSeconds===0)for(const b of this.balls){b.vx/=1.5;b.vy/=1.5}}
  for(const b of [...this.balls]){
  if(b.held)continue
  const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt
  if(b.x<14){b.x=14;b.vx=Math.abs(b.vx)}else if(b.x>346){b.x=346;b.vx=-Math.abs(b.vx)}
  if(b.y<20){b.y=20;b.vy=Math.abs(b.vy)}
  if(b.vy>0&&oldY<=this.paddleY-11&&b.y>=this.paddleY-11&&Math.abs(b.x-this.paddleX)<this.paddleWidth/2+5){
   if(this.magnetArmed){this.magnetArmed=false;b.held=true;b.offset=Math.max(-this.paddleWidth/2+6,Math.min(this.paddleWidth/2-6,b.x-this.paddleX));b.x=this.paddleX+b.offset;b.y=this.paddleY-12;b.vx=0;b.vy=0;this.feedback.push({kind:'item',message:'공을 붙잡았어요!'});continue}
   const angle=Math.max(-1,Math.min(1,(b.x-this.paddleX)/(this.paddleWidth/2)))*1.03
   const speed=(this.speed()+35)*BALL_SPEED_MULTIPLIER*(this.fastSeconds>0?1.5:1);b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=this.paddleY-12
  }
  if(b.y>this.height+8){if(this.balls.length>1){this.balls=this.balls.filter(ball=>ball!==b);continue}this.invulnerable=0;this.damage(true);return}
  for(const brick of this.bricks){
   if(b.x+6<brick.x||b.x-6>brick.x+BRICK.width||b.y+6<brick.y||b.y-6>brick.y+BRICK.height)continue
   const side=oldX+6<=brick.x||oldX-6>=brick.x+BRICK.width
   if(side){b.vx=-b.vx;b.x=oldX}else{b.vy=-b.vy;b.y=oldY}
   const wave=this.waveArmed,neighbors=wave?this.bricks.filter(other=>other.id!==brick.id&&Math.abs(other.x-brick.x)<=BRICK.width+BRICK.gapX+0.1&&Math.abs(other.y-brick.y)<=BRICK.height+BRICK.gapY+0.1):[]
   if(wave){this.waveArmed=false;this.waves.push({x:brick.x+BRICK.width/2,y:brick.y+BRICK.height/2});this.feedback.push({kind:'item',message:'파도 나간다!'})}
   this.hitBrick(brick.id)
   for(const neighbor of neighbors)this.hitBrick(neighbor.id,'wave')
   this.splitOnHit(b,side);break
  }
  if(this.phase!=='playing')return
  }
  if(this.phase!=='playing')return
  for(const shot of [...this.shots]){
   shot.y-=520*dt
   const hit=this.bricks.find(brick=>Math.abs(shot.x-(brick.x+BRICK.width/2))<=BRICK.width/2+3&&shot.y>=brick.y-5&&shot.y<=brick.y+BRICK.height+5)
   if(hit){this.shots=this.shots.filter(s=>s.id!==shot.id);this.hitBrick(hit.id,'torpedo')}
   if(this.phase!=='playing')return
  }
  this.shots=this.shots.filter(s=>s.y>-20)
  for(const drop of [...this.drops]){
   if(drop.warning>0){drop.warning=Math.max(0,drop.warning-dt);continue}
   drop.age=(drop.age??0)+dt
   if(drop.kind==='urchin'){
    drop.vy=(drop.vy??-130)+260*dt;drop.x+=(drop.vx??0)*dt;drop.y+=drop.vy*dt;drop.rotation=(drop.rotation??0)+dt*5
    if(drop.x<20){drop.x=20;drop.vx=Math.abs(drop.vx??0)}else if(drop.x>340){drop.x=340;drop.vx=-Math.abs(drop.vx??0)}
   }else if(drop.kind==='puffer'){
    drop.x+=(drop.vx??0)*dt;drop.y+=(drop.vy??185)*dt
    const radius=pufferRadius(drop.age)
    if(drop.x<8+radius){drop.x=8+radius;drop.vx=Math.abs(drop.vx??90)}else if(drop.x>BOARD.width-8-radius){drop.x=BOARD.width-8-radius;drop.vx=-Math.abs(drop.vx??90)}
   }else drop.y+=(drop.kind==='shark'?440:145)*dt
   const hit=isItem(drop.kind)?Math.abs(drop.y-this.paddleY)<20&&Math.abs(drop.x-this.paddleX)<this.paddleWidth/2+10:hazardTouches(drop,this.paddleX,this.paddleY,this.paddleWidth)
   if(hit){
    this.drops=this.drops.filter(d=>d.id!==drop.id)
    this.collect(drop)
    if(this.phase!=='playing')return
   }
  }
  this.drops=this.drops.filter(d=>d.y<this.height+50)
 }
}
