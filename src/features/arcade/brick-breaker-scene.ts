import Phaser from 'phaser'
import {BOARD,BRICK,BrickPractice,isItem,pufferRadius,pufferFrame} from './brick-breaker-model'
import type {BrickScore,BrickImpact,DropFeedback,DropKind} from './brick-breaker-model'
import {brickViewport,dropArtwork} from './brick-breaker-artwork'

export type BrickController={start:()=>void;launch:()=>void;next:()=>void;bank:()=>void;testDrop:(kind:DropKind)=>void;pause:(paused:boolean)=>void;destroy:()=>void}
const ink=0x183f4a
const palette=[0x8bd2c5,0xf4d792,0xeaa78d,0x9eafda]

const artwork={
 'brick-background':'/arcade/brick-breaker/background-underwater.png',
 'brick-pongi':'/arcade/brick-breaker/pongi-sprite.png',
 'brick-shark':'/arcade/brick-breaker/shark-sprite.png',
 'brick-item':'/arcade/brick-breaker/item.png',
 'brick-torpedo':'/arcade/brick-breaker/torpedo.png',
 'brick-tile-1':'/arcade/brick-breaker/tile-1.png',
 'brick-tile-2':'/arcade/brick-breaker/tile-2.png',
 'brick-tile-3':'/arcade/brick-breaker/tile-3.png',
 'brick-tile-4':'/arcade/brick-breaker/tile-4.png',
 ...Object.fromEntries(Object.entries(dropArtwork).map(([kind,asset])=>['brick-'+kind,asset.src])),
} as const
function prepareTexture(scene:Phaser.Scene,key:string){
 const source=scene.textures.get(key).getSourceImage() as HTMLImageElement
 // POT render copies enable mipmaps in Phaser 4. The original PNGs stay intact;
 // filtering their fine outlines avoids shimmer when 600px frames render at 48px.
 const canvas=document.createElement('canvas')
 canvas.width=2**Math.floor(Math.log2(Math.min(1024,source.width)))
 canvas.height=2**Math.floor(Math.log2(Math.min(1024,source.height)))
 const context=canvas.getContext('2d');if(!context)return
 context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high'
 context.drawImage(source,0,0,canvas.width,canvas.height)
 scene.textures.renameTexture(key,key+':original')
 scene.textures.addCanvas(key,canvas)
 scene.textures.remove(key+':original')
}
function sheetFrames(scene:Phaser.Scene,key:string,plank=false):{x:number;y:number}[]{
 const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement
 const w=Math.floor(source.width/2),h=Math.floor(source.height/2)
 for(let frame=0;frame<4;frame++)texture.add(frame,0,(frame%2)*w,Math.floor(frame/2)*h,w,h)
 if(!plank)return []
 // Anchor each generated frame at the widest plank rows. Transparent padding
 // may differ between cells; the collision surface must stay perfectly still.
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return Array.from({length:4},()=>({x:0.5,y:0.25}))
 context.drawImage(source,0,0)
 const pixels=context.getImageData(0,0,canvas.width,canvas.height).data
 return Array.from({length:4},(_,frame)=>{
  const ox=(frame%2)*w,oy=Math.floor(frame/2)*h,rows:{x:number;y:number;width:number}[]=[]
  for(let y=0;y<h;y++){let left=w,right=-1;for(let x=0;x<w;x++)if(pixels[((oy+y)*canvas.width+ox+x)*4+3]>128){left=Math.min(left,x);right=x}if(right>=left)rows.push({x:(left+right)/2,y,width:right-left+1})}
  const widest=Math.max(...rows.map(row=>row.width)),anchor=rows.filter(row=>row.width>=widest*0.97)
  return anchor.length?{x:anchor.reduce((sum,row)=>sum+row.x,0)/anchor.length/w,y:anchor.reduce((sum,row)=>sum+row.y,0)/anchor.length/h}:{x:0.5,y:0.25}
 })
}

function shortPaddleTexture(scene:Phaser.Scene,origins:{x:number;y:number}[]){
 const source=scene.textures.get('brick-pongi').getSourceImage() as HTMLCanvasElement
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height
 const context=canvas.getContext('2d')!;context.drawImage(source,0,0)
 const w=canvas.width/2,h=canvas.height/2
 // Render-only copy: conceal plank ends without scaling Pongi or changing PNGs.
 for(let frame=0;frame<4;frame++){
  const ox=frame%2*w,oy=Math.floor(frame/2)*h,cx=origins[frame].x*w,cy=origins[frame].y*h
  const half=54/102*w/2,band=9/78*h
  context.clearRect(ox,oy+cy-band,cx-half,band*2)
  context.clearRect(ox+cx+half,oy+cy-band,w-cx-half,band*2)
 }
 scene.textures.addCanvas('brick-pongi-short',canvas);sheetFrames(scene,'brick-pongi-short')
}

function trimTileFrame(scene:Phaser.Scene,key:string){
 const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return
 context.drawImage(source,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data
 let left=canvas.width,top=canvas.height,right=0,bottom=0
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 if(right>=left)texture.add('tile',0,left,top,right-left+1,bottom-top+1)
}

export function createBrickGame(parent:HTMLElement,onScore:(score:BrickScore)=>void,onPause:()=>void,onReady?:()=>void,onError?:()=>void):BrickController{
 let model=new BrickPractice(),started=false,paused=false,disposed=false,lastScore=''
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
 let failed=false,generation=0,logicalHeight:number=BOARD.height
 let viewport=brickViewport(parent.clientWidth,parent.clientHeight,window.devicePixelRatio)
 const sprites=new Map<string,Phaser.GameObjects.Image>()
 let game:Phaser.Game
 class BrickScene extends Phaser.Scene{
  private paint!:Phaser.GameObjects.Graphics
  private boardPaint!:Phaser.GameObjects.Graphics
  private backgroundImage!:Phaser.GameObjects.Image
  private inkPaint!:Phaser.GameObjects.Graphics
  private hurtPaint!:Phaser.GameObjects.Graphics
  private hurtAt:number|null=null
  private effectText!:Phaser.GameObjects.Text
  private tiles=new Map<number,Phaser.GameObjects.Image>()
  private impacts=new Map<number,BrickImpact&{at:number}>()
  private explosions:(BrickImpact&{at:number})[]=[]
  private waveBursts:{x:number;y:number;at:number}[]=[]
  private feedback:(DropFeedback&{at:number;x:number;y:number})|null=null
  private feedbackText!:Phaser.GameObjects.Text
  private effectClock=0
  private generation=-1
  private paddle!:Phaser.GameObjects.Image
  private widePlank!:Phaser.GameObjects.Image
  private shieldBubble!:Phaser.GameObjects.Image
  private ball!:Phaser.GameObjects.Arc
  private extraBall!:Phaser.GameObjects.Arc
  private arrows?:Phaser.Types.Input.Keyboard.CursorKeys
  private keys?:{left:Phaser.Input.Keyboard.Key;right:Phaser.Input.Keyboard.Key;space:Phaser.Input.Keyboard.Key}
  private paddleOrigins:{x:number;y:number}[]=[]
  private pointerTarget:number|null=null
  constructor(){super('brick-breaker')}
  preload(){
   this.load.on('loaderror',()=>{failed=true;onError?.()})
   for(const [key,url] of Object.entries(artwork))this.load.image(key,url)
  }
  resizeBoard(){
   if(!this.boardPaint)return
   const zoom=viewport.pixelWidth/BOARD.width
   logicalHeight=viewport.height/(viewport.width/BOARD.width)
   this.game.canvas.style.width=`${viewport.width}px`;this.game.canvas.style.height=`${viewport.height}px`
   this.scale.updateBounds()
   if(Math.abs(logicalHeight-model.height)>0.1)model.resize(logicalHeight)
   this.cameras.main.setViewport(0,0,viewport.pixelWidth,viewport.pixelHeight).setZoom(zoom,viewport.pixelHeight/logicalHeight).centerOn(BOARD.width/2,logicalHeight/2)
   this.cameras.main.preRender()
   const frame=this.backgroundImage.frame,cover=Math.max(BOARD.width/frame.width,logicalHeight/frame.height)
   this.backgroundImage.setPosition(BOARD.width/2,logicalHeight/2).setScale(cover)
   const bg=this.boardPaint;bg.clear();bg.fillStyle(0x142d34,0.26);bg.fillRect(0,0,BOARD.width,logicalHeight)
   bg.lineStyle(1,0x45636a);bg.strokeRoundedRect(7,10,346,logicalHeight-18,12)
  }
  create(){
   if(disposed){this.game.destroy(true);return}
   if(failed)return
   for(const key of Object.keys(artwork))if(key!=='brick-background')prepareTexture(this,key)
   this.paddleOrigins=sheetFrames(this,'brick-pongi',true)
   shortPaddleTexture(this,this.paddleOrigins)
   for(const [kind,asset] of Object.entries(dropArtwork))if(asset.sheet)sheetFrames(this,'brick-'+kind)
   this.cameras.main.setBackgroundColor('#183139')
   for(let hp=1;hp<=4;hp++)trimTileFrame(this,'brick-tile-'+hp)
   trimTileFrame(this,'brick-wide')
   this.backgroundImage=this.add.image(0,0,'brick-background').setDepth(-1)
   this.boardPaint=this.add.graphics().setDepth(0)
   this.paint=this.add.graphics().setDepth(2)
   this.inkPaint=this.add.graphics().setDepth(5)
   this.hurtPaint=this.add.graphics().setDepth(8)
   this.effectText=this.add.text(17,20,'',{fontFamily:'Gowun Dodum, sans-serif',fontSize:'10px',color:'#b8d9ca',resolution:2}).setDepth(6)
   this.feedbackText=this.add.text(0,0,'',{fontFamily:'Gowun Dodum, sans-serif',fontSize:'11px',padding:{x:0,y:0},resolution:2}).setDepth(6).setVisible(false)
   this.resizeBoard()
   this.scale.on('resize',()=>this.resizeBoard())
   this.paddle=this.add.image(180,model.paddleY,'brick-pongi',0).setDisplaySize(102,78).setDepth(3)
   this.widePlank=this.add.image(180,model.paddleY,'brick-wide','tile').setDepth(3.1).setVisible(false)
   this.shieldBubble=this.add.image(180,model.paddleY,'brick-shield').setDepth(2.8).setAlpha(0.55).setVisible(false)
   this.ball=this.add.circle(180,450,6,0xffffff).setStrokeStyle(2,ink).setDepth(4)
   this.extraBall=this.add.circle(180,450,6,0xe8dfff).setStrokeStyle(2,0x86739d).setDepth(4).setVisible(false)
   this.arrows=this.input.keyboard?.createCursorKeys()
   if(this.input.keyboard)this.keys={left:this.input.keyboard.addKey('A'),right:this.input.keyboard.addKey('D'),space:this.input.keyboard.addKey('SPACE')}
   this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{if(started&&!paused)this.pointerTarget=this.cameras.main.getWorldPoint(pointer.x,pointer.y).x})
   this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(started&&!paused){this.pointerTarget=this.cameras.main.getWorldPoint(pointer.x,pointer.y).x;if(!model.balls.some(b=>b.held))model.launch()}})
   this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(started&&!paused&&model.balls.some(b=>b.held)&&pointer.getDistance()<8)model.launch()})
   this.input.keyboard?.on('keydown-SPACE',(event:KeyboardEvent)=>{if(parent.contains(document.activeElement)||document.activeElement===document.body){event.preventDefault();if(started&&!paused)model.launch()}})
   this.input.keyboard?.on('keydown-P',()=>{if(started&&model.phase==='playing'){paused=true;onPause()}})
   this.input.keyboard?.disableGlobalCapture()
   this.events.once('shutdown',()=>{sprites.clear();this.tiles.clear();this.impacts.clear();this.explosions=[]})
   onReady?.()
  }
  update(time:number,delta:number){
   if(disposed||!this.paint)return
   resizeViewport()
   if(this.generation!==generation){this.generation=generation;this.pointerTarget=null;this.impacts.clear();this.explosions=[];this.waveBursts=[];this.feedback=null;this.hurtAt=null;this.cameras.main.shakeEffect.reset();this.feedbackText.setVisible(false);for(const image of this.tiles.values())image.destroy();this.tiles.clear()}
   if(!paused)this.effectClock+=Math.min(delta,100)
   if(started&&!paused){
    const direction=(this.arrows?.right.isDown||this.keys?.right.isDown?1:0)-(this.arrows?.left.isDown||this.keys?.left.isDown?1:0)
    const inputSeconds=Math.min(delta/1000,0.05)
    if(direction){this.pointerTarget=null;model.moveInput(model.paddleX+direction*420*inputSeconds,inputSeconds)}
    else if(this.pointerTarget!==null)model.moveInput(this.pointerTarget,inputSeconds)
    model.step(delta/1000)
   }
   this.paint.clear()
   for(const wave of model.drainWaves())this.waveBursts.push({...wave,at:this.effectClock})
   for(const hit of model.drainImpacts()){
    const effect={...hit,at:this.effectClock};this.impacts.set(hit.brickId,effect)
    if(hit.source==='torpedo')this.explosions.push(effect)
   }
   const feedback=model.drainFeedback()
   if(feedback.some(event=>event.kind==='hazard')){this.hurtAt=this.effectClock;if(!reduced)this.cameras.main.shake(150,0.0025,true)}
   this.hurtPaint.clear()
   if(this.hurtAt!==null){
    const progress=(this.effectClock-this.hurtAt)/(reduced?140:260)
    if(progress>=1)this.hurtAt=null
    else{this.hurtPaint.fillStyle(0xe45255,(reduced?0.1:0.19)*(1-progress));this.hurtPaint.fillRect(-16,-16,BOARD.width+32,model.height+32)}
   }
   if(feedback.length){this.feedback={...(feedback.findLast(event=>event.kind==='hazard')??feedback[feedback.length-1]),at:this.effectClock,x:model.paddleX,y:model.paddleY};this.feedbackText.setText(this.feedback.message)
    const label=this.feedbackText,point=this.feedback
    point.x=Math.max(9,Math.min(BOARD.width-label.width-9,point.x-label.width/2))
    point.y=Math.max(8,point.y-label.height-22)}
   const aliveBricks=new Set<number>()
   for(const brick of model.bricks){
    aliveBricks.add(brick.id)
    let tile=this.tiles.get(brick.id)
    if(!tile){tile=this.add.image(0,0,'brick-tile-'+brick.hp,'tile').setDepth(1);this.tiles.set(brick.id,tile)}
    const hit=this.impacts.get(brick.id),t=hit?(this.effectClock-hit.at)/180:1,pulse=hit&&!reduced?Math.sin(Math.min(1,t)*Math.PI):0
    tile.setTexture('brick-tile-'+brick.hp,'tile').setPosition(brick.x+BRICK.width/2,brick.y+BRICK.height/2+pulse*1.5).setDisplaySize(BRICK.width*(1+pulse*0.05),BRICK.height*(1-pulse*0.1))
    if(hit&&t<1){this.paint.fillStyle(0xffffff,(1-t)*0.3);this.paint.fillRoundedRect(brick.x,brick.y,BRICK.width,BRICK.height,4)}
   }
   for(const [id,image] of this.tiles)if(!aliveBricks.has(id)){image.destroy();this.tiles.delete(id)}
   for(const [id,hit] of this.impacts){
    const t=(this.effectClock-hit.at)/(hit.destroyed?300:180)
    if(t>=1){this.impacts.delete(id);continue}
    if(reduced||hit.source==='torpedo')continue
    const radius=4+t*(hit.destroyed?25:12)
    this.paint.lineStyle(1.3,0xffffff,(1-t)*0.8);this.paint.strokeCircle(hit.x,hit.y,radius)
    for(let i=0;i<(hit.destroyed?6:3);i++){
     const angle=i*Math.PI*2/(hit.destroyed?6:3)+id*0.8,x=hit.x+Math.cos(angle)*radius,y=hit.y+Math.sin(angle)*radius*0.6
     this.paint.fillStyle(hit.destroyed?palette[(id%4)]:0xffffff,1-t);this.paint.fillRect(x-1.5,y-1.5,hit.destroyed?3:2,hit.destroyed?3:2)
    }
   }
   this.explosions=this.explosions.filter(hit=>this.effectClock-hit.at<(reduced?180:440))
   for(const hit of this.explosions){
    const t=(this.effectClock-hit.at)/(reduced?180:440),fade=1-t
    if(reduced){this.paint.fillStyle(0xffd68a,fade*0.65);this.paint.fillCircle(hit.x,hit.y,8);continue}
    const burst=Math.sin(Math.min(1,t/0.55)*Math.PI/2),radius=5+burst*19
    // Warm fireball lobes and a bright core, then a soft puff and flying sparks.
    this.paint.fillStyle(0xff994f,fade*0.18);this.paint.fillCircle(hit.x,hit.y,radius*1.5)
    for(let i=0;i<7;i++){
     const angle=i*Math.PI*2/7,reach=radius*0.48
     this.paint.fillStyle(i%2?0xffb44f:0xf47745,fade*0.85)
     this.paint.fillCircle(hit.x+Math.cos(angle)*reach,hit.y+Math.sin(angle)*reach,radius*(0.4+fade*0.15))
    }
    this.paint.fillStyle(0xffdf86,fade);this.paint.fillCircle(hit.x,hit.y,radius*0.52)
    this.paint.fillStyle(0xfffaf0,Math.max(0,1-t*2.8));this.paint.fillCircle(hit.x,hit.y,3+fade*5)
    this.paint.lineStyle(1.5,0xffd899,fade);this.paint.strokeCircle(hit.x,hit.y,6+t*33)
    for(let i=0;i<8;i++){
     const angle=i*Math.PI/4+hit.brickId*0.7,reach=9+t*38
     this.paint.lineStyle(1.6,i%2?0xffc35e:0xfff2ca,fade)
     this.paint.lineBetween(hit.x+Math.cos(angle)*(reach-4),hit.y+Math.sin(angle)*(reach-4),hit.x+Math.cos(angle)*reach,hit.y+Math.sin(angle)*reach)
    }
    if(t>0.4)for(let i=0;i<3;i++){
     this.paint.fillStyle(0x82949a,fade*0.3)
     this.paint.fillCircle(hit.x+(i-1)*(5+t*8),hit.y-t*14,3+t*5)
    }
   }
   this.waveBursts=this.waveBursts.filter(wave=>this.effectClock-wave.at<(reduced?180:430))
   for(const wave of this.waveBursts){
    const t=(this.effectClock-wave.at)/(reduced?180:430),fade=1-t
    this.paint.fillStyle(0x8de3e9,fade*0.15);this.paint.fillEllipse(wave.x,wave.y,132,72)
    this.paint.lineStyle(2,0xa3ebec,fade*0.9);this.paint.strokeEllipse(wave.x,wave.y,20+t*120,12+t*66)
    if(!reduced)for(let i=0;i<10;i++){
     const angle=i*Math.PI/5,reach=0.3+t*0.7
     this.paint.fillStyle(i%2?0xe3fff4:0x8de3e9,fade)
     this.paint.fillCircle(wave.x+Math.cos(angle)*65*reach,wave.y+Math.sin(angle)*36*reach,2)
    }
   }
   const frame=reduced?0:Math.floor(time/220)%4,origin=this.paddleOrigins[frame]
   this.widePlank.setVisible(model.wideSeconds>0||model.shrinkSeconds>0).setPosition(model.paddleX,model.paddleY).setDisplaySize(model.paddleWidth,14).setAlpha(model.invulnerable>0&&Math.floor(model.invulnerable*12)%2?0.35:1)
   this.shieldBubble.setVisible(model.shield).setPosition(model.paddleX,model.paddleY+7).setDisplaySize(model.paddleWidth+29,61)
   if(model.stickySeconds>0){
    this.paint.fillStyle(0xb6b18b,0.85);this.paint.fillRoundedRect(model.paddleX-28,model.paddleY-7,56,7,3)
    for(const [offset,length] of [[-19,10],[3,15],[21,8]])this.paint.fillRoundedRect(model.paddleX+offset,model.paddleY-4,4,length,2)
   }
   this.paddle.setTexture(model.shrinkSeconds>0?'brick-pongi-short':'brick-pongi',frame).setOrigin(origin.x,origin.y).setPosition(model.paddleX,model.paddleY).setAlpha(model.invulnerable>0&&Math.floor(model.invulnerable*12)%2?0.35:1)
   this.ball.setPosition(model.ball.x,model.ball.y).setVisible(model.phase==='playing'||model.phase==='ready')
   const extra=model.balls[1];this.extraBall.setVisible(!!extra&&model.phase==='playing');if(extra)this.extraBall.setPosition(extra.x,extra.y)
   if(model.fastSeconds>0)for(const b of model.balls){
    this.paint.lineStyle(3,0xff765e,0.55);const speed=Math.hypot(b.vx,b.vy)||1
    this.paint.lineBetween(b.x,b.y,b.x-b.vx/speed*18,b.y-b.vy/speed*18)
   }
   this.ball.setFillStyle(model.fastSeconds>0?0xffb19a:0xffffff)
   this.extraBall.setFillStyle(model.fastSeconds>0?0xffb19a:0xe8dfff)
   if(model.waveArmed)for(const b of model.balls){this.paint.lineStyle(1.5,0x97e2e6,0.9);this.paint.strokeCircle(b.x,b.y,10)}
   this.effectText.setText([
    model.wideSeconds>0?`긴 널판지 ${Math.ceil(model.wideSeconds)}초`:'',
    model.shrinkSeconds>0?`널판지 축소 ${Math.ceil(model.shrinkSeconds)}초`:'',
    model.shield?'보호막 1회':'',model.splitArmed?'분열 대기':model.balls.length>1?'공 2개':'',
    model.fastSeconds>0?`속도 ×1.5 ${Math.ceil(model.fastSeconds)}초`:'',
    model.inkSeconds>0?`먹물 ${Math.ceil(model.inkSeconds)}초`:'',
    model.stickySeconds>0?`끈끈이 ×0.5 ${Math.ceil(model.stickySeconds)}초`:'',
    model.magnetArmed?'자석 대기':model.balls.some(b=>b.held)?'발사 대기':'',model.waveArmed?'파도 장전':'',
   ].filter(Boolean).join(' · ')).setVisible(started&&model.phase==='playing')
   this.inkPaint.clear()
   if(model.inkSeconds>0)for(const patch of model.inkPatches){
    const alpha=Math.min(1,model.inkSeconds/0.5)
    this.inkPaint.fillStyle(0x191523,alpha);this.inkPaint.fillCircle(patch.x,patch.y,patch.radius)
    for(let i=0;i<7;i++){
     const angle=i*Math.PI*2/7
     this.inkPaint.fillCircle(patch.x+Math.cos(angle)*patch.radius*0.7,patch.y+Math.sin(angle)*patch.radius*0.65,patch.radius*0.45)
    }
    this.inkPaint.fillStyle(0x514263,alpha*0.5);this.inkPaint.fillEllipse(patch.x-12,patch.y-16,22,9)
   }
   const live=new Set<string>()
   const sprite=(key:string,texture:string,x:number,y:number,w:number,h:number)=>{live.add(key);let image=sprites.get(key);if(!image){image=this.add.image(x,y,texture,texture==='brick-shark'?0:undefined).setDepth(2);sprites.set(key,image)}image.setPosition(x,y).setDisplaySize(w,h);return image}
   for(const d of model.drops){
    const item=isItem(d.kind),color=item?0x55e999:0xff6269,radius=item?17:23,pulse=reduced?0:Math.sin(this.effectClock/170+d.id)*1.5
    this.paint.fillStyle(color,0.05);this.paint.fillCircle(d.x,d.y,radius+9+pulse)
    this.paint.fillStyle(color,0.11);this.paint.fillCircle(d.x,d.y,radius+3+pulse)
    this.paint.lineStyle(1.3,color,0.65);this.paint.strokeCircle(d.x,d.y,radius+pulse)
    if(!reduced)for(let i=0;i<3;i++){
     const progress=(this.effectClock/650+i/3)%1
     this.paint.fillStyle(color,(1-progress)*0.45)
     this.paint.fillCircle(d.x+Math.sin(i*2+d.id)*9,d.y-radius-progress*21,1.5+(1-progress))
    }
    if(d.warning>0){this.paint.lineStyle(2,0xff6269,0.45);this.paint.beginPath();this.paint.moveTo(d.x,d.y);this.paint.lineTo(d.x,model.paddleY);this.paint.strokePath()}
    const frame=d.kind==='puffer'?(reduced?2:pufferFrame(d.age??0)):reduced?0:Math.floor(this.effectClock/120)%4
    const size=d.kind==='puffer'?(reduced?40*pufferRadius(d.age??0)/18:40):d.kind==='shark'?48:32
    const rotation=d.kind==='puffer'?Math.atan2(-(d.vx??0),d.vy??185):d.kind==='urchin'&&!reduced?(d.rotation??0):0
    sprite('drop'+d.id,'brick-'+d.kind,d.x,d.y,size,size).setFrame(dropArtwork[d.kind].sheet?frame:'__BASE').setOrigin(0.5).setAlpha(d.warning>0?0.45:1).setRotation(rotation)
   }
   for(const s of model.shots)sprite('shot'+s.id,'brick-torpedo',s.x,s.y,26,26)
   for(const [key,image] of sprites)if(!live.has(key)){image.destroy();sprites.delete(key)}
   if(this.feedback){
    const age=this.effectClock-this.feedback.at
    if(age>=1600){this.feedback=null;this.feedbackText.setVisible(false)}
    else{
     const item=this.feedback.kind==='item',alpha=age<1100?1:1-(age-1100)/500
     const label=this.feedbackText.setVisible(true).setColor(item?'#a0f3bd':'#ffb1b5').setAlpha(alpha)
     label.setPosition(this.feedback.x,this.feedback.y)
    }
   }
   const score=model.score(),signature=JSON.stringify(score)
   if(signature!==lastScore){lastScore=signature;onScore(score)}
  }
 }
 function resizeViewport(){
  if(disposed||!game||parent.clientWidth<=0||parent.clientHeight<=0)return
  const next=brickViewport(parent.clientWidth,parent.clientHeight,window.devicePixelRatio)
  if(next.width===viewport.width&&next.height===viewport.height&&next.pixelWidth===viewport.pixelWidth&&next.pixelHeight===viewport.pixelHeight)return
  viewport=next;game.scale.setZoom(1/viewport.ratio);game.scale.resize(viewport.pixelWidth,viewport.pixelHeight)
 }
 game=new Phaser.Game({type:Phaser.AUTO,parent,width:viewport.pixelWidth,height:viewport.pixelHeight,backgroundColor:'#183139',scene:BrickScene,scale:{mode:Phaser.Scale.NONE,zoom:1/viewport.ratio},render:{antialias:true,antialiasGL:true,pixelArt:false,mipmapFilter:'LINEAR_MIPMAP_LINEAR'},input:{activePointers:2},audio:{noAudio:true},banner:false})
 game.canvas.setAttribute('aria-label','퐁이 벽돌깨기 게임 화면. 좌우 방향키 또는 화면을 드래그해 이동하고 스페이스로 공을 발사하세요.')
 game.canvas.setAttribute('role','img');game.canvas.style.touchAction='none'
 const resize=new ResizeObserver(resizeViewport);resize.observe(parent)
 return {start:()=>{model=new BrickPractice();model.resize(logicalHeight);generation++;started=true;paused=false;lastScore='';onScore(model.score())},launch:()=>model.launch(),next:()=>{model.nextRound();generation++},bank:()=>model.bank(),testDrop:kind=>{if(started){model.spawnTestDrop(kind);onScore(model.score())}},pause:value=>{paused=value},destroy:()=>{disposed=true;resize.disconnect();sprites.clear();game.destroy(true)}}
}
