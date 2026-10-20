export const BOARD={width:360,height:520,paddleY:486,paddleWidth:82,ballRadius:6} as const
export const BRICK={width:42,height:20,columns:6,gapX:4,gapY:5,left:44} as const
export type Brick={id:number;x:number;y:number;hp:number;maxHp:number}
export type BrickImpact={brickId:number;x:number;y:number;hp:number;destroyed:boolean}
export type Drop={id:number;kind:'shark'|'item';x:number;y:number;warning:number}
export type Shot={id:number;x:number;y:number}
export type BrickPhase='ready'|'playing'|'round-clear'|'over'|'banked'
export type BrickScore={phase:BrickPhase;round:number;lives:number;secured:number;pending:number;remaining:number}
export function brickDrop(roll:number):Drop['kind']|null{return roll<0.25?'shark':roll<0.4?'item':null}

/** Local practice only. No wallet, score submission, or monetary reward calls. */
export class BrickPractice {
 phase:BrickPhase='ready'
 round=1;lives=3;secured=0;pending=0;paddleX=180;invulnerable=0
 ball={x:180,y:450,vx:0,vy:0}
 bricks:Brick[]=[];drops:Drop[]=[];shots:Shot[]=[]
 height:number=BOARD.height
 get paddleY(){return this.height-(BOARD.height-BOARD.paddleY)}
 private impacts:BrickImpact[]=[]
 private serial=0
 private random:()=>number
 constructor(random:()=>number=Math.random){this.random=random;this.buildRound()}
 score():BrickScore{return {phase:this.phase,round:this.round,lives:this.lives,secured:this.secured,pending:this.pending,remaining:this.bricks.length}}
 resize(height:number){
  const previous=this.height;this.height=Math.max(280,height)
  for(const brick of this.bricks){brick.x=BRICK.left+(brick.id%BRICK.columns)*(BRICK.width+BRICK.gapX);brick.y=this.brickTop()+Math.floor(brick.id/BRICK.columns)*(BRICK.height+BRICK.gapY)}
  if(this.phase==='ready')this.resetBall()
  else{this.ball.y*=this.height/previous;for(const drop of this.drops)drop.y*=this.height/previous;for(const shot of this.shots)shot.y*=this.height/previous}
 }
 drainImpacts(){const events=this.impacts;this.impacts=[];return events}
 move(x:number){this.paddleX=Math.max(BOARD.paddleWidth/2+8,Math.min(BOARD.width-BOARD.paddleWidth/2-8,x));if(this.phase==='ready')this.ball.x=this.paddleX}
 launch(){if(this.phase!=='ready')return;this.phase='playing';this.ball.vx=105*(this.random()<0.5?-1:1);this.ball.vy=-this.speed()}
 nextRound(){if(this.phase!=='round-clear')return;this.round++;this.buildRound()}
 bank(){if(this.phase==='round-clear')this.phase='banked'}
 private speed(){return Math.min(330,225+(this.round-1)*15)}
 private buildRound(){
  this.bricks=Array.from({length:30},(_,id)=>{const row=Math.floor(id/6),col=id%6,hp=1+(row+col+this.round-1)%4;return {id,x:BRICK.left+col*(BRICK.width+BRICK.gapX),y:this.brickTop()+row*(BRICK.height+BRICK.gapY),hp,maxHp:hp}})
  this.impacts=[]
  this.drops=[];this.shots=[];this.pending=0;this.phase='ready';this.resetBall()
 }
 private brickTop(){return Math.max(34,Math.min(78,48+(this.height-230)*0.27)-BRICK.height*1.5)}
 private resetBall(){this.ball={x:this.paddleX,y:this.paddleY-16,vx:0,vy:0}}
 damage(){
  if(this.phase!=='playing'||this.invulnerable>0)return
  this.lives--;this.drops=[];this.shots=[];this.invulnerable=1.1
  if(this.lives<=0){this.phase='over';this.pending=0}else{this.phase='ready';this.resetBall()}
 }
 hitBrick(id:number){
  if(this.phase!=='playing')return
  const brick=this.bricks.find(b=>b.id===id);if(!brick)return
  brick.hp--
  this.impacts.push({brickId:id,x:brick.x+BRICK.width/2,y:brick.y+BRICK.height/2,hp:brick.hp,destroyed:brick.hp===0})
  if(this.impacts.length>64)this.impacts.shift()
  if(brick.hp>0)return
  this.bricks=this.bricks.filter(b=>b.id!==id);this.pending++
  if(!this.bricks.length){this.secured+=this.pending;this.pending=0;this.phase='round-clear';this.drops=[];this.shots=[];return}
  const kind=brickDrop(this.random());if(kind)this.drops.push({id:++this.serial,kind,x:brick.x+BRICK.width/2,y:brick.y+BRICK.height/2,warning:kind==='shark'?0.45:0})
 }
 private fire(){for(const side of [-1,1])this.shots.push({id:++this.serial,x:this.paddleX+side*32,y:this.paddleY-14})}
 step(seconds:number){
  // Small physics steps prevent tunnelling through bricks or the paddle at low FPS.
  let remaining=Math.min(0.1,Math.max(0,seconds))
  while(remaining>0){const dt=Math.min(remaining,1/120);remaining-=dt;this.tick(dt)}
 }
 private tick(dt:number){
  this.invulnerable=Math.max(0,this.invulnerable-dt)
  if(this.phase!=='playing')return
  const b=this.ball,oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt
  if(b.x<14){b.x=14;b.vx=Math.abs(b.vx)}else if(b.x>346){b.x=346;b.vx=-Math.abs(b.vx)}
  if(b.y<20){b.y=20;b.vy=Math.abs(b.vy)}
  if(b.vy>0&&oldY<=this.paddleY-11&&b.y>=this.paddleY-11&&Math.abs(b.x-this.paddleX)<BOARD.paddleWidth/2+5){
   const angle=Math.max(-1,Math.min(1,(b.x-this.paddleX)/(BOARD.paddleWidth/2)))*1.03
   const speed=this.speed()+35;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=this.paddleY-12
  }
  if(b.y>this.height+8){this.invulnerable=0;this.damage();return}
  for(const brick of this.bricks){
   if(b.x+6<brick.x||b.x-6>brick.x+BRICK.width||b.y+6<brick.y||b.y-6>brick.y+BRICK.height)continue
   if(oldX+6<=brick.x||oldX-6>=brick.x+BRICK.width){b.vx=-b.vx;b.x=oldX}else{b.vy=-b.vy;b.y=oldY}
   this.hitBrick(brick.id);break
  }
  if(this.phase!=='playing')return
  for(const shot of [...this.shots]){
   shot.y-=520*dt
   const hit=this.bricks.find(brick=>Math.abs(shot.x-(brick.x+BRICK.width/2))<=BRICK.width/2+3&&shot.y>=brick.y-5&&shot.y<=brick.y+BRICK.height+5)
   if(hit){this.shots=this.shots.filter(s=>s.id!==shot.id);this.hitBrick(hit.id)}
   if(this.phase!=='playing')return
  }
  this.shots=this.shots.filter(s=>s.y>-20)
  for(const drop of [...this.drops]){
   if(drop.warning>0){drop.warning=Math.max(0,drop.warning-dt);continue}
   drop.y+=(drop.kind==='shark'?440:145)*dt
   if(Math.abs(drop.y-this.paddleY)<(drop.kind==='shark'?30:20)&&Math.abs(drop.x-this.paddleX)<BOARD.paddleWidth/2+10){
    this.drops=this.drops.filter(d=>d.id!==drop.id)
    if(drop.kind==='shark'){this.damage();if(this.phase!=='playing')return}else this.fire()
   }
  }
  this.drops=this.drops.filter(d=>d.y<this.height+50)
 }
}
